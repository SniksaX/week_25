import type { Request, Response } from "express";
import { GroqService } from "../services/groqService.ts";

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
