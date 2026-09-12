import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { enqueueEmailJob } from "../services/scheduler";
import { indexEmail } from "../services/elasticsearch";

const scheduleSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  startAt: z.string().datetime(),
  delayMs: z.number().int().nonnegative().max(3600000).default(2000),
  hourlyLimit: z.number().int().positive().max(100000).default(100),
});

export async function scheduleEmails(req: Request, res: Response) {
  const userId = req.user!.id;
  const input = scheduleSchema.parse(req.body);

  const senderEmail = req.user!.email;
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      subject: input.subject,
      body: input.body,
      senderEmail,
      startAt: new Date(input.startAt),
      delayMs: input.delayMs,
      hourlyLimit: input.hourlyLimit,
    },
  });

  const start = new Date(input.startAt).getTime();
  const emails = await prisma.$transaction(
    input.recipients.map((recipient, index) =>
      prisma.emailJob.create({
        data: {
          campaignId: campaign.id,
          userId,
          recipient,
          subject: input.subject,
          body: input.body,
          senderEmail,
          scheduledAt: new Date(start + index * input.delayMs),
        },
      }),
    ),
  );

  for (const email of emails) {
    await enqueueEmailJob(email.id, email.scheduledAt);
    try {
      await indexEmail(email);
    } catch (error) {
      console.error("Email indexing failed:", email.id, error);
    }
  }

  return res.status(201).json({
    campaignId: campaign.id,
    count: emails.length,
    emails,
  });
}

export async function listEmails(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const where: any = { userId: req.user!.id };
  if (status === "scheduled")
    where.status = { in: ["SCHEDULED", "PROCESSING"] };
  if (status === "sent") where.status = { in: ["SENT", "FAILED"] };

  const emails = await prisma.emailJob.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });

  res.json(emails);
}

export async function emailStats(req: Request, res: Response) {
  const userId = req.user!.id;
  const [total, scheduled, processing, sent, failed] = await Promise.all([
    prisma.emailJob.count({ where: { userId } }),
    prisma.emailJob.count({ where: { userId, status: "SCHEDULED" } }),
    prisma.emailJob.count({ where: { userId, status: "PROCESSING" } }),
    prisma.emailJob.count({ where: { userId, status: "SENT" } }),
    prisma.emailJob.count({ where: { userId, status: "FAILED" } }),
  ]);

  res.json({
    total,
    scheduled: scheduled + processing,
    sent,
    failed,
  });
}

export async function searchEmails(req: Request, res: Response) {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json([]);

  try {
    const { elastic, EMAIL_INDEX } = await import("../services/elasticsearch");
    const result = await elastic.search({
      index: EMAIL_INDEX,
      query: {
        bool: {
          must: {
            multi_match: {
              query: q,
              fields: ["recipient", "subject", "status"],
            },
          },
          filter: [{ term: { userId: req.user!.id } }],
        },
      },
      size: 100,
    });

    res.json(result.hits.hits.map((hit: any) => hit._source));
  } catch (error) {
    console.error(
      "Email search unavailable:",
      error instanceof Error ? error.message : "unknown error",
    );
    res
      .status(503)
      .json({ message: "Email search is temporarily unavailable" });
  }
}
