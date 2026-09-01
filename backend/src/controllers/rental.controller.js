/**
 * Rental Controller
 */

import * as rentalService from "../services/rental.service.js";
import { logAdminActivity } from "../services/adminActivity.service.js";

const getIo = (req) => req.app.locals.io;

export const getAllRentals = async (req, res) => {
  const result = await rentalService.getAllRentals(req.query);
  res.json({ status: "success", ...result });
};

export const getMyRentals = async (req, res) => {
  const result = await rentalService.getMyRentals(req.user.id, req.query, {
    studentProfileId: req.authContext?.activePersona === "STUDENT" ? req.authContext.studentProfileId : null,
  });
  res.json({ status: "success", ...result });
};

export const getRental = async (req, res) => {
  const rental = await rentalService.getRentalById(req.params.id, req.user);
  res.json({ status: "success", data: { rental } });
};

export const borrowBook = async (req, res) => {
  const rental = await rentalService.borrowBook(req.user.id, req.body, getIo(req), {
    actorUserId: req.user.id,
    studentProfileId: req.authContext?.activePersona === "STUDENT" ? req.authContext.studentProfileId : null,
    allowDebtSettlement: req.body?.allow_debt_settlement,
  });

  res.status(201).json({ status: "success", data: { rental } });
};

export const returnBook = async (req, res) => {
  const { returned_condition, damage_type, notes, evidence_url, waive_penalty } = req.body || {};
  const result = await rentalService.returnBookWithInspection(
    req.params.id,
    {
      inspectorId: req.user.id,
      returnedCondition: returned_condition,
      damageType: damage_type,
      notes,
      evidenceUrl: evidence_url,
      waivePenalty: waive_penalty,
    },
    getIo(req),
  );
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "RETURN_INSPECTION",
    entityType: "RENTAL",
    entityId: req.params.id,
    description: `Processed inspection return for "${result.user?.name || "Student"}" - Book: "${result.physical_book?.title || "Book"}" (Condition: ${result.returned_condition || "GOOD"})`,
    metadata: { status: result.newStatus, fine: result.fine ?? 0, damagePenalty: result.damagePenalty ?? 0 },
    req,
  });
  res.json({ status: "success", data: result });
};

export const getOverdueRentals = async (req, res) => {
  const result = await rentalService.getOverdueRentals(req.query);
  res.json({ status: "success", ...result });
};

export const getOverdueRanking = async (req, res) => {
  const result = await rentalService.getOverdueRanking(req.query);
  res.json({ status: "success", ...result });
};

export const sendOverdueReminders = async (req, res) => {
  const result = await rentalService.sendOverdueReminders(getIo(req), req.body?.rentalIds);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "REMIND",
    entityType: "RENTAL",
    description: `Sent ${result.remindersSent} overdue reminder notification(s).`,
    metadata: result,
    req,
  });
  res.json({ status: "success", data: result });
};

export const extendRental = async (req, res) => {
  const result = await rentalService.extendRental(req.params.id, req.body, getIo(req));
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "EXTEND",
    entityType: "RENTAL",
    entityId: req.params.id,
    description: `Extended rental for "${result.user.name}" - Book: "${result.physical_book.title}" by ${req.body?.extra_days || 0} day(s).`,
    metadata: { due_date: result.due_date },
    req,
  });
  res.json({ status: "success", data: { rental: result } });
};

export const settleRentalFine = async (req, res) => {
  const { method, notes } = req.body || {};
  const result = await rentalService.settleRentalFine(
    req.params.id,
    { method, notes },
    req.user.id,
    getIo(req),
  );
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "SETTLE_FINE",
    entityType: "RENTAL",
    entityId: req.params.id,
    description: `Settled fine of ${Number(result.fine || 0).toFixed(2)} ETB for "${result.user?.name}" (${method || "CASH"})`,
    metadata: { method, fine: result.fine },
    req,
  });
  res.json({ status: "success", data: { rental: result } });
};

