export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
};

export type EmailJob = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";
  lastError?: string | null;
  previewUrl?: string | null;
};
