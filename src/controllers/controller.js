import { GroqService } from "../services/groqService.js";

export async function chatCompletion(req, res) {
  const { prompt, sessionId } = req.body ?? {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Le champ prompt est obligatoire." });
  }

  let session = sessionId ? GroqService.getSession(sessionId) : null;
  if (sessionId && !session) {
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
    return res.status(error.status || 500).json({
      error:
        error.status === 502
          ? "Le modèle n'a retourné aucune réponse."
          : "Une erreur est survenue lors de la génération de la réponse.",
    });
  }
}