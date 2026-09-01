import { prisma } from "../prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

/**
 * Calculates user standing based on trust score and unresolved damage incidents.
 * @param {number} trustScore - Current trust score (0 to 100)
 * @param {number} unresolvedDamageCount - Number of unresolved damage incidents
 * @returns {"GOOD_STANDING" | "YELLOW_FLAG" | "RED_FLAG" | "SUSPENDED"}
 */
export const calculateStanding = (trustScore, unresolvedDamageCount = 0) => {
  if (trustScore < 20) return "SUSPENDED";
  if (trustScore < 40 || unresolvedDamageCount > 1) return "RED_FLAG";
  if (trustScore < 70 || unresolvedDamageCount === 1) return "YELLOW_FLAG";
  return "GOOD_STANDING";
};

/**
 * Recalculate user trust score & standing after a rental transaction.
 * Wrapped inside transaction operations.
 */
export const recalculateUserTrustScore = async (userId, tx = prisma) => {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, trust_score: true, standing: true, standing_note: true },
  });
  if (!user) return null;

  // Unresolved damage incidents count
  const unresolvedIncidents = await tx.damageIncident.count({
    where: { user_id: userId, penalty_status: "PENDING" },
  });

  const computedStanding = calculateStanding(user.trust_score, unresolvedIncidents);

  // If user has a manual note, retain or update standing unless manually locked
  const newStanding = user.standing === "SUSPENDED" && user.trust_score >= 20 ? computedStanding : computedStanding;

  await tx.user.update({
    where: { id: userId },
    data: {
      standing: newStanding,
      standing_updated_at: new Date(),
    },
  });

  return { trust_score: user.trust_score, standing: newStanding };
};

/**
 * Apply trust score delta for an event
 */
export const applyTrustScoreDelta = async (userId, delta, reason, tx = prisma) => {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { trust_score: true },
  });
  if (!user) return null;

  const currentScore = user.trust_score ?? 100;
  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  const unresolvedIncidents = await tx.damageIncident.count({
    where: { user_id: userId, penalty_status: "PENDING" },
  });

  const newStanding = calculateStanding(newScore, unresolvedIncidents);

  await tx.user.update({
    where: { id: userId },
    data: {
      trust_score: newScore,
      standing: newStanding,
      standing_updated_at: new Date(),
    },
  });

  return { oldScore: currentScore, newScore, standing: newStanding };
};

/**
 * Admin Moderation Action Sheet handler
 */
export const moderateUserStanding = async (adminUserId, targetUserId, { standing, standing_note, is_blocked, max_concurrent_loans_override }) => {
  if (!standing_note || !standing_note.trim()) {
    throw new AppError("A mandatory justification note is required for moderation changes.", 400);
  }

  const validStandings = ["GOOD_STANDING", "YELLOW_FLAG", "RED_FLAG", "SUSPENDED"];
  if (standing && !validStandings.includes(standing)) {
    throw new AppError(`Invalid standing tier: ${standing}`, 400);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { trust_score: true, standing: true },
  });
  if (!currentUser) throw new AppError("User not found", 404);

  // Synchronize numerical trust score based on admin standing selection
  let nextTrustScore = currentUser.trust_score ?? 100;
  if (standing === "GOOD_STANDING") {
    nextTrustScore = Math.max(nextTrustScore, 90);
  } else if (standing === "YELLOW_FLAG") {
    nextTrustScore = 60;
  } else if (standing === "RED_FLAG") {
    nextTrustScore = 35;
  } else if (standing === "SUSPENDED") {
    nextTrustScore = 15;
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    // If admin resets student to GOOD_STANDING, waive pending damage penalty incidents so old incidents don't re-suspend them
    if (standing === "GOOD_STANDING") {
      await tx.damageIncident.updateMany({
        where: { user_id: targetUserId, penalty_status: "PENDING" },
        data: {
          penalty_status: "WAIVED",
          notes: `Penalty waived by admin desk reset: ${standing_note.trim()}`,
        },
      });
    }

    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: {
        ...(standing ? { standing, trust_score: nextTrustScore } : {}),
        ...(standing_note ? { standing_note: standing_note.trim() } : {}),
        ...(typeof is_blocked === "boolean" ? { is_blocked } : {}),
        ...(typeof max_concurrent_loans_override !== "undefined"
          ? { max_concurrent_loans_override: max_concurrent_loans_override ? Number(max_concurrent_loans_override) : null }
          : {}),
        standing_updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        trust_score: true,
        standing: true,
        standing_note: true,
        standing_updated_at: true,
        is_blocked: true,
        max_concurrent_loans_override: true,
      },
    });

    return updated;
  });

  // Log admin activity
  await prisma.adminActivityLog.create({
    data: {
      admin_user_id: adminUserId,
      action: "USER_MODERATION",
      entity_type: "USER",
      entity_id: targetUserId,
      description: `Updated standing for ${updatedUser.name} (${updatedUser.email}) to ${standing || updatedUser.standing} (Trust Score: ${updatedUser.trust_score}). Note: ${standing_note.trim()}`,
      metadata: { standing, trust_score: updatedUser.trust_score, is_blocked, max_concurrent_loans_override, standing_note: standing_note.trim() },
    },
  });

  return updatedUser;
};

/**
 * Waive or Enforce Damage Incident Penalty
 */
export const updateDamagePenaltyStatus = async (adminUserId, incidentId, { penalty_status, notes }) => {
  const incident = await prisma.damageIncident.findUnique({
    where: { id: incidentId },
    include: { rental: true, user: true, copy: { include: { book: true } } },
  });

  if (!incident) throw new AppError("Damage incident record not found", 404);

  const updatedIncident = await prisma.$transaction(async (tx) => {
    const updated = await tx.damageIncident.update({
      where: { id: incidentId },
      data: {
        penalty_status,
        ...(notes ? { notes: `${incident.notes}\n[Admin Note]: ${notes}` } : {}),
      },
    });

    if (penalty_status === "WAIVED") {
      // Recover portion of trust score (+15)
      await applyTrustScoreDelta(incident.user_id, 15, "Waived damage incident penalty", tx);
    } else if (penalty_status === "PAID") {
      // Recover portion of trust score (+10)
      await applyTrustScoreDelta(incident.user_id, 10, "Paid damage incident penalty", tx);
    }

    // Sync parent Rental status if attached
    if (incident.rental_id) {
      const remainingPendingCount = await tx.damageIncident.count({
        where: {
          rental_id: incident.rental_id,
          id: { not: incidentId },
          penalty_status: "PENDING",
        },
      });

      if (remainingPendingCount === 0 && incident.rental && incident.rental.status === "PENDING") {
        await tx.rental.update({
          where: { id: incident.rental_id },
          data: { status: "COMPLETED" },
        });
      }
    }

    return updated;
  });

  // Log admin activity
  await prisma.adminActivityLog.create({
    data: {
      admin_user_id: adminUserId,
      action: "DAMAGE_PENALTY_UPDATE",
      entity_type: "DAMAGE_INCIDENT",
      entity_id: incidentId,
      description: `Updated damage penalty status for ${incident.user.name} on book "${incident.copy.book.title}" (${incident.copy.copy_code}) to ${penalty_status}.`,
      metadata: { penalty_status, notes },
    },
  });

  return updatedIncident;
};
