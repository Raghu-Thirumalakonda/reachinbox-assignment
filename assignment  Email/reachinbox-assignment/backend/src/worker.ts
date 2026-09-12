import { Worker, Job } from "bullmq";
import { redis } from "./lib/redis";
import { prisma } from "./lib/prisma";
import { emailQueue } from "./queue";
import { env } from "./config/env";
import { sendEmail } from "./services/mailer";
import { reserveHourlySlot, reserveMinimumDelay } from "./services/rateLimiter";
import { sendSlackRateLimitNotification } from "./services/slack";
import { indexEmail } from "./services/elasticsearch";

async function processEmail(job: Job<{ emailId: string }>) {
  const email = await prisma.emailJob.findUnique({
    where: { id: job.data.emailId },
    include: { campaign: true },
  });

  if (!email) return;
  if (email.status === "SENT") return;

  const claimed = await prisma.emailJob.updateMany({
    where: { id: email.id, status: "SCHEDULED" },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });

  if (claimed.count === 0) return;

  const reservation = await reserveHourlySlot(
    email.senderEmail,
    Math.min(email.campaign.hourlyLimit, env.MAX_EMAILS_PER_HOUR),
  );

  if (!reservation.allowed) {
    try {
      await sendSlackRateLimitNotification(
        email.userId,
        email.senderEmail,
        Math.min(email.campaign.hourlyLimit, env.MAX_EMAILS_PER_HOUR),
      );
    } catch (error) {
      console.error(
        "Slack rate-limit notification failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }

    await prisma.emailJob.update({
      where: { id: email.id },
      data: {
        scheduledAt: reservation.nextHour,
        status: "SCHEDULED",
      },
    });

    await emailQueue.add(
      "send-email",
      { emailId: email.id },
      {
        jobId: `email-${email.id}-retry-${reservation.nextHour.getTime()}`,
        delay: Math.max(1000, reservation.nextHour.getTime() - Date.now()),
      },
    );

    return;
  }

  try {
    const waitMs = await reserveMinimumDelay(
      email.senderEmail,
      env.MIN_DELAY_MS,
    );
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const result = await sendEmail({
      from: email.senderEmail,
      fromName: env.DEFAULT_SENDER_NAME,
      to: email.recipient,
      subject: email.subject,
      html: email.body.replace(/\n/g, "<br />"),
    });

    const sent = await prisma.emailJob.update({
      where: { id: email.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        messageId: result.messageId,
        previewUrl: result.previewUrl || null,
      },
    });

    try {
      await indexEmail(sent);
    } catch (error) {
      console.error("Email indexing failed after send:", sent.id, error);
    }
    console.log(
      `Sent ${email.recipient}${result.previewUrl ? ` -> ${result.previewUrl}` : ""}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await prisma.emailJob.update({
      where: { id: email.id },
      data: {
        status: finalAttempt ? "FAILED" : "SCHEDULED",
        lastError: message,
      },
    });
    try {
      await indexEmail({
        ...email,
        status: finalAttempt ? "FAILED" : "SCHEDULED",
        sentAt: null,
      });
    } catch (indexError) {
      console.error("Failed email indexing failed:", email.id, indexError);
    }
    throw error;
  }
}

const worker = new Worker("email-scheduler", processEmail, {
  connection: redis,
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("completed", (job) => console.log(`Job completed: ${job.id}`));
worker.on("failed", (job, err) =>
  console.error(`Job failed: ${job?.id}`, err.message),
);

console.log(`Worker started with concurrency=${env.WORKER_CONCURRENCY}`);
