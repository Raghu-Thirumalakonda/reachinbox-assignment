import type { EmailJob, User } from "./types";

export const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export type EmailStats = {
  total: number;
  scheduled: number;
  sent: number;
  failed: number;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Request failed");
  }

  return response.json();
}

export const api = {
  me: () => request<User>("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  scheduled: () => request<EmailJob[]>("/api/emails?status=scheduled"),
  sent: () => request<EmailJob[]>("/api/emails?status=sent"),
  stats: () => request<EmailStats>("/api/emails/stats"),
  search: (q: string) =>
    request<EmailJob[]>(`/api/emails/search?q=${encodeURIComponent(q)}`),
  schedule: (payload: {
    subject: string;
    body: string;
    recipients: string[];
    startAt: string;
    delayMs: number;
    hourlyLimit: number;
  }) =>
    request("/api/emails/schedule", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  parseCsv: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API}/api/emails/parse-csv`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!response.ok) throw new Error("Could not parse file");
    return response.json() as Promise<{ count: number; emails: string[] }>;
  },
  slackStatus: () => request<{ connected: boolean }>("/auth/slack/status"),
  disconnectSlack: () => request("/auth/slack/disconnect", { method: "POST" }),
};
