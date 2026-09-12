import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import crypto from "crypto";
import { prisma } from "./lib/prisma";
import { env } from "./config/env";

export function configureGoogleAuth() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    console.warn("Google OAuth is not configured. Add credentials to .env.");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL
      },
      async (_accessToken, _refreshToken, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google account has no email"));

          const user = await prisma.user.upsert({
            where: { email },
            update: {
              googleId: profile.id,
              name: profile.displayName || email,
              avatar: profile.photos?.[0]?.value
            },
            create: {
              googleId: profile.id,
              email,
              name: profile.displayName || email,
              avatar: profile.photos?.[0]?.value
            }
          });
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}

export async function createSession(userId: string) {
  const id = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      id,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  return id;
}
