import type { Request, Response, NextFunction } from "express";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../config.ts";
import { addSseClient, getAllTickets } from "../services/ticketService.ts";

export function adminLogin(req: Request, res: Response) {
  console.log("[admin] tentative de connexion");
  const { email, password } = req.body ?? {};
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    console.log("[admin] connexion réussie");
    return res.json({ token: "admin-super-secret-token" });
  }
  console.log("[admin] identifiants invalides -> 401");
  return res.status(401).json({ error: "Identifiants invalides." });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.query.token;
  
  if (token !== "admin-super-secret-token") {
    console.log("[admin] token invalide -> 403");
    return res.status(403).json({ error: "Accès refusé." });
  }
  next();
}

export async function getTickets(req: Request, res: Response) {
  const tickets = await getAllTickets();
  console.log("[admin] liste des tickets renvoyée:", tickets.length, "ticket(s)");
  res.json(tickets);
}

export function streamTickets(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  addSseClient(res);
  console.log("[admin] nouveau client SSE connecté");
}
