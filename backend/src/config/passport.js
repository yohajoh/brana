import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../prisma.js";
import crypto from "crypto";
import { hashPassword } from "../utils/password.utils.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email provided by Google"), null);
        }
        const displayName = profile.displayName || email.split("@")[0];

        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          // Existing user: login (reject if blocked)
          if (user.is_blocked) {
            return done(new Error("Your account is blocked. Please contact admin."), null);
          }
          // If user signed up manually and hasn't confirmed, treat Google as verification
          if (!user.is_confirmed) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { is_confirmed: true, confirmation_token: null },
            });
          }
          return done(null, user);
        }

        // New user: register and login (no email confirmation required for Google OAuth)
        const generatedPassword = crypto.randomBytes(32).toString("hex");
        const hashedPassword = await hashPassword(generatedPassword);
        user = await prisma.user.create({
          data: {
            name: displayName,
            email,
            password_hash: hashedPassword,
            is_confirmed: true,
          },
        });
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user["id"]);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
