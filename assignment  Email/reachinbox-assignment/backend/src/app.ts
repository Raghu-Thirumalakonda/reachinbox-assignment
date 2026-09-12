import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import passport from "passport";
import { Queue } from "bullmq";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { emailQueue } from "./queue";
import { env } from "./config/env";
import { configureGoogleAuth } from "./auth";
import authRoutes from "./routes/authRoutes";
import emailRoutes from "./routes/emailRoutes";
import { ensureEmailIndex } from "./services/elasticsearch";

configureGoogleAuth();
ensureEmailIndex();

const app = express();
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(passport.initialize());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/api/emails", emailRoutes);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter
});
app.use("/admin/queues", serverAdapter.getRouter());

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: error?.message ?? "Internal server error" });
});

export default app;
