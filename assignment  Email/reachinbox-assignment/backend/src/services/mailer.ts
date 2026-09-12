import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.ETHEREAL_HOST,
  port: env.ETHEREAL_PORT,
  secure: false,
  auth: env.ETHEREAL_USER && env.ETHEREAL_PASS
    ? { user: env.ETHEREAL_USER, pass: env.ETHEREAL_PASS }
    : undefined
});

export async function sendEmail(input: {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
}) {
  if (!env.ETHEREAL_USER || !env.ETHEREAL_PASS) {
    throw new Error("Ethereal credentials are not configured");
  }

  const info = await transporter.sendMail({
    from: `"${input.fromName}" <${input.from}>`,
    to: input.to,
    subject: input.subject,
    html: input.html
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) ?? null
  };
}
