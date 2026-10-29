import type { Request, Response } from "express";
import {
  COOKIE_NAME,
  checkAdminCredentials,
  createAdminToken,
  isAdminToken,
  readAdminToken,
  revokeAdminToken,
} from "../services/authService.ts";
import { createTicket, listTickets } from "../services/ticketService.ts";

const EIGHT_HOURS = 1000 * 60 * 60 * 8;

export const login = (req: Request, res: Response): void => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !checkAdminCredentials(email, password)
  ) {
    res.status(401).json({ error: "Identifiants incorrects." });
    return;
  }

  res.cookie(COOKIE_NAME, createAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: EIGHT_HOURS,
  });
  res.json({ ok: true });
};

export const logout = (req: Request, res: Response): void => {
  revokeAdminToken(readAdminToken(req.headers.cookie));
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
};

export const me = (req: Request, res: Response): void => {
  res.json({ isAdmin: isAdminToken(readAdminToken(req.headers.cookie)) });
};

export const postTicket = (req: Request, res: Response): void => {
  const { sessionId, message } = req.body ?? {};

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    res.status(400).json({ error: "Aucune conversation à transmettre au support." });
    return;
  }

  const cleanMessage = typeof message === "string" ? message.trim().slice(0, 500) : "";
  const { ticket, created } = createTicket(sessionId.trim(), cleanMessage);
  res.status(created ? 201 : 200).json({ ticket, created });
};

export const getTickets = (_req: Request, res: Response): void => {
  res.json({ tickets: listTickets() });
};