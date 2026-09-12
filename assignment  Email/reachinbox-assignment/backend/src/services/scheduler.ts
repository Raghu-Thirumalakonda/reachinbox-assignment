import { prisma } from "../lib/prisma";
import { emailQueue } from "../queue";

export async function enqueueEmailJob(emailId: string, scheduledAt: Date) {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());

  await emailQueue.add(
    "send-email",
    { emailId },
    {
      jobId: `email-${emailId}`,
      delay,
    },
  );
}

export async function recoverMissingQueueJobs() {
  const processing = await prisma.emailJob.findMany({
    where: { status: "PROCESSING" },
    select: { id: true },
  });
  const queueJobs = await emailQueue.getJobs([
    "waiting",
    "active",
    "delayed",
    "prioritized",
  ]);
  const queuedEmailIds = new Set(
    queueJobs
      .map((job) => job.data?.emailId)
      .filter((emailId): emailId is string => Boolean(emailId)),
  );
  const orphanedIds = processing
    .map((email) => email.id)
    .filter((emailId) => !queuedEmailIds.has(emailId));

  if (orphanedIds.length > 0) {
    await prisma.emailJob.updateMany({
      where: { id: { in: orphanedIds }, status: "PROCESSING" },
      data: { status: "SCHEDULED" },
    });
  }

  const scheduled = await prisma.emailJob.findMany({
    where: {
      status: "SCHEDULED",
    },
    orderBy: { scheduledAt: "asc" },
  });

  for (const email of scheduled) {
    try {
      await enqueueEmailJob(email.id, email.scheduledAt);
    } catch (error) {
      // A duplicate BullMQ job is safe to ignore during recovery.
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes("jobid")) {
        console.error("Queue recovery failed:", email.id, error);
      }
    }
  }
}
