import { generateChatAnswer } from "../services/groqService.js";

export async function chatCompletion(req, res) {
  const { prompt } = req.body ?? {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Le champ prompt est obligatoire." });
  }

  try {
    const answer = await generateChatAnswer(prompt.trim(), 0.3, 700);
    return res.json({ answer });
  } catch (error) {
    console.error("Erreur lors de l'appel à Groq :", error);
    return res.status(error.status || 500).json({
      error: error.status === 502
        ? "Le modèle n'a retourné aucune réponse."
        : "Une erreur est survenue lors de la génération de la réponse.",
    });
  }
}