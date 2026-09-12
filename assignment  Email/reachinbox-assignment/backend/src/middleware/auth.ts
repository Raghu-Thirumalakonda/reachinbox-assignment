import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) return res.status(401).json({ message: "Authentication required" });

  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return res.status(401).json({ message: "Session expired" });
  }

  req.user = session.user;
  next();
}
