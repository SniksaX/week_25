import express from "express";
import { chatCompletion } from "../controllers/controller.js";
import { GroqService } from "../services/groqService.js";

export const UseRouter = express.Router();

UseRouter.post("/chat", chatCompletion);

UseRouter.get("/sessions/:id", (req, res) => {
  const s = GroqService.getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "Session inconnue." });
  res.json({ id: s.id, history: s.history });
});