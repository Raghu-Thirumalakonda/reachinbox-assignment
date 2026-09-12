import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";

export const elastic = new Client({ node: env.ELASTICSEARCH_URL });
export const EMAIL_INDEX = "reachinbox-emails";

export async function ensureEmailIndex() {
  try {
    const exists = await elastic.indices.exists({ index: EMAIL_INDEX });
    if (!exists) {
      await elastic.indices.create({
        index: EMAIL_INDEX,
        mappings: {
          properties: {
            id: { type: "keyword" },
            recipient: { type: "text" },
            subject: { type: "text" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
            userId: { type: "keyword" }
          }
        }
      });
    }
  } catch (error) {
    console.error("Elasticsearch index initialization failed:", error);
  }
}

export async function indexEmail(email: {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  userId: string;
}) {
  await elastic.index({
    index: EMAIL_INDEX,
    id: email.id,
    document: {
      ...email,
      scheduledAt: email.scheduledAt.toISOString(),
      sentAt: email.sentAt?.toISOString() ?? null
    },
    refresh: "wait_for"
  });
}
