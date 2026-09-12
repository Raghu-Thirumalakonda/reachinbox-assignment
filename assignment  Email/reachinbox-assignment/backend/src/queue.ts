import { Queue } from "bullmq";
import { redis } from "./lib/redis";

export const EMAIL_QUEUE = "email-scheduler";

export const emailQueue = new Queue(EMAIL_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 86400, count: 10000 },
    removeOnFail: { age: 604800, count: 10000 }
  }
});
