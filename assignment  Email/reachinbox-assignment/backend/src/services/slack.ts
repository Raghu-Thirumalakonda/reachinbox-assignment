import axios from "axios";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

export async function sendSlackRateLimitNotification(
  userId: string,
  sender: string,
  limit: number,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.slackAccessToken) return;
  if (!env.SLACK_CHANNEL_ID) {
    throw new Error("Slack notification channel is not configured");
  }

  try {
    const response = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: env.SLACK_CHANNEL_ID,
        text: `ReachInbox rate limit reached: sender ${sender} has reached ${limit} emails in the current hour. Remaining emails were rescheduled.`,
      },
      { headers: { Authorization: `Bearer ${user.slackAccessToken}` } },
    );

    if (response.data?.ok !== true) {
      throw new Error(
        `Slack notification failed: ${response.data?.error ?? "unknown Slack API error"}`,
      );
    }

    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Slack notification failed:")
    ) {
      throw error;
    }

    throw new Error("Slack notification request failed");
  }
}

export function slackConfigured() {
  return Boolean(
    env.SLACK_CLIENT_ID &&
    env.SLACK_CLIENT_SECRET &&
    env.SLACK_REDIRECT_URI &&
    env.SLACK_CHANNEL_ID,
  );
}
