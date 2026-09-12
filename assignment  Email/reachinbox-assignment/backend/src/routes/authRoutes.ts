import { Router } from "express";
import passport from "passport";
import axios from "axios";
import { requireAuth } from "../middleware/auth";
import { createSession } from "../auth";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${env.FRONTEND_URL}/login?error=oauth`,
    session: false,
  }),
  async (req, res) => {
    const sessionId = await createSession(req.user!.id);
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(env.FRONTEND_URL);
  },
);

router.get("/me", requireAuth, (req, res) => {
  const { id, name, email, avatar } = req.user!;
  res.json({ id, name, email, avatar });
});

router.post("/logout", async (req, res) => {
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
    res.clearCookie("sessionId");
  }
  res.json({ ok: true });
});

router.get("/slack", requireAuth, (req, res) => {
  if (
    !env.SLACK_CLIENT_ID ||
    !env.SLACK_CLIENT_SECRET ||
    !env.SLACK_REDIRECT_URI
  ) {
    return res.status(503).json({ message: "Slack OAuth is not configured" });
  }

  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    redirect_uri: env.SLACK_REDIRECT_URI,
    user_scope: "chat:write",
  });

  res.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
});

router.get("/slack/callback", requireAuth, async (req, res) => {
  const code = String(req.query.code ?? "");
  if (
    !code ||
    !env.SLACK_CLIENT_ID ||
    !env.SLACK_CLIENT_SECRET ||
    !env.SLACK_REDIRECT_URI
  ) {
    return res.redirect(`${env.FRONTEND_URL}?slack=error`);
  }

  try {
    const response = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    if (response.data?.ok !== true) {
      console.error(
        "Slack OAuth failed:",
        response.data?.error ?? "unknown Slack API error",
      );
      return res.redirect(`${env.FRONTEND_URL}?slack=error`);
    }

    const accessToken =
      response.data.authed_user?.access_token ?? response.data.access_token;
    if (!accessToken) {
      console.error("Slack OAuth failed: no access token returned");
      return res.redirect(`${env.FRONTEND_URL}?slack=error`);
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        slackAccessToken: accessToken,
        slackTeamId: response.data.team?.id ?? null,
      },
    });

    return res.redirect(`${env.FRONTEND_URL}?slack=connected`);
  } catch (error) {
    console.error(
      "Slack OAuth request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return res.redirect(`${env.FRONTEND_URL}?slack=error`);
  }
});

router.get("/slack/status", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json({ connected: Boolean(user?.slackAccessToken) });
});

router.post("/slack/disconnect", requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { slackAccessToken: null, slackTeamId: null },
  });
  res.json({ connected: false });
});

export default router;
