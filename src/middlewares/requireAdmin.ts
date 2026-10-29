import type { NextFunction, Request, Response } from "express";
import { isAdminToken, readAdminToken } from "../services/authService.ts";

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const token = readAdminToken(req.headers.cookie);
  if (!isAdminToken(token)) {
    res.status(401).json({ error: "Accès réservé à l'administrateur." });
    return;
  }
  next();
};