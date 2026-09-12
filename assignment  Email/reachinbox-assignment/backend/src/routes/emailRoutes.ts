import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import {
  scheduleEmails,
  listEmails,
  searchEmails,
  emailStats,
} from "../controllers/emailController";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});
const router = Router();

router.post("/schedule", requireAuth, scheduleEmails);
router.get("/stats", requireAuth, emailStats);
router.post("/parse-csv", requireAuth, upload.single("file"), (req, res) => {
  const text = req.file?.buffer.toString("utf8") ?? "";
  const emails = Array.from(
    new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []),
  );
  res.json({ count: emails.length, emails });
});
router.get("/", requireAuth, listEmails);
router.get("/search", requireAuth, searchEmails);

export default router;
