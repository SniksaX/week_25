import express from "express";
import { chatCompletion, escalateTicket } from "../controllers/controller.ts";
import { GroqService } from "../services/groqService.ts";

export const UseRouter = express.Router();

UseRouter.post("/chat", chatCompletion);
UseRouter.post("/escalate", escalateTicket);

UseRouter.get("/sessions/:id", (req, res) => {
  const s = GroqService.getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "Session inconnue." });
  res.json({ id: s.id, history: s.history });
});