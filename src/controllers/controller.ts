import type { Request, Response } from "express";
import { GroqService } from "../services/groqService.ts";
import { createTicket } from "../services/ticketService.ts";

export async function chatCompletion(req: Request, res: Response) {
  const { prompt, sessionId } = (req.body ?? {}) as {
    prompt?: unknown;
    sessionId?: unknown;
  };

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Le champ prompt est obligatoire." });
  }

  let session =
    typeof sessionId === "string" ? GroqService.getSession(sessionId) : null;
  if (typeof sessionId === "string" && !session) {
    return res.status(404).json({ error: "Session inconnue." });
  }
  if (!session) {
    session = new GroqService(0.3, 700);
  }

  try {
    const answer = await session.generateAnswer(prompt);
    return res.json({ sessionId: session.id, answer });
  } catch (error) {
    console.error("Erreur lors de l'appel à Groq :", error);
    const status =
      error instanceof Error &&
      typeof (error as unknown as { status?: unknown }).status === "number"
        ? (error as unknown as { status: number }).status
        : 500;
    return res.status(status).json({
      error:
        status === 502
          ? "Le modèle n'a retourné aucune réponse."
          : "Une erreur est survenue lors de la génération de la réponse.",
    });
  }
}

export async function escalateTicket(req: Request, res: Response) {
  const { context, proposed, reason } = (req.body ?? {}) as {
    context?: unknown;
    proposed?: unknown;
    reason?: unknown;
  };

  if (typeof context !== "string" || typeof reason !== "string") {
    return res.status(400).json({ error: "Le contexte et la raison sont requis." });
  }

  try {
    const ticket = await createTicket(
      context,
      typeof proposed === "string" ? proposed : "Non spécifié",
      reason
    );
    return res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error("Erreur création ticket :", error);
    return res.status(500).json({ error: "Erreur lors de la création du ticket." });
  }
}