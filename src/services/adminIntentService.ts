import { readFile, writeFile } from "node:fs/promises";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions.js";
import { GROQ_MODEL } from "../config.ts";
import { groq } from "./groqService.ts";
import { clearFaqCache, type FaqEntry } from "./faqService.ts";

const FAQ_FILE = new URL("../data/faq.json", import.meta.url).pathname;

const PROMPT_FAQ = `
Tu es un moteur d'extraction chargé de transformer une conversation en une entrée
FAQ structurée pour la base de connaissances du support informatique TechHelp.

# RÔLE
L'administrateur vient de discuter d'une procédure ou d'une FAQ avec l'assistant.
À partir de la demande de l'administrateur ET de l'historique de conversation,
tu dois extraire la procédure discutée et la formater en entrée FAQ.
Tu ne converses pas : tu produis uniquement une sortie JSON.

FORMAT DE SORTIE — STRICT
Tu réponds EXCLUSIVEMENT avec un objet JSON valide, sans texte avant ou après,
sans balises Markdown, sans commentaires. Le schéma est le suivant :

{
  "id": "string (uuid ou slug court)",
  "categorie": "string",
  "mots_cles": ["string", "string"],
  "question": "string",
  "reponse_llm": "string (texte d'introduction)",
  "etapes": ["string", "string"],
  "escalade_technicien": boolean,
  "message_escalade": "string | null"
}

# RÈGLES
1. "id" est un slug court en minuscules (ex. "vpn_02") ou un uuid.
2. "categorie" est un libellé court décrivant le domaine (ex. "Wi-Fi", "VPN").
3. "mots_cles" contient 3 à 8 mots ou expressions courts pour la recherche.
4. "question" est la question type de l'utilisateur, reformulée de façon autonome.
5. "reponse_llm" est un texte d'introduction court et professionnel.
6. "etapes" est une liste d'étapes claires et actionnables, dans l'ordre.
7. "escalade_technicien" est true si la procédure prévoit de rediriger vers un
   technicien humain en cas d'échec.
8. "message_escalade" est le message d'escalade exact si escalade_technicien est
   true, sinon null.
9. N'invente aucune étape absente de la conversation. Si la procédure discutée
   est trop vague pour être extraite, renvoie :
   { "id": null, "categorie": null, "mots_cles": [], "question": null,
     "reponse_llm": null, "etapes": [], "escalade_technicien": false,
     "message_escalade": null }
10. La langue des valeurs suit celle de la conversation.
`;

const FAQ_TRIGGERS = [
  "save", "remember", "faq", "procedure", "procédure", "ajoute", "ajouter",
  "enregistre", "sauvegarde", "mémorise", "memorise", "retiens",
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function detectAdminFaqIntent(prompt: string): boolean {
  const text = norm(prompt);
  console.log("[admin] détection d'intention FAQ sur le prompt");
  return FAQ_TRIGGERS.some((w) => text.includes(norm(w)));
}

export async function extractAndSaveFaq(
  prompt: string,
  history: ChatCompletionMessageParam[],
): Promise<FaqEntry | null> {
  console.log("[admin] extraction de la FAQ en cours");

  const historyText = history
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"} : ${m.content}`)
    .join("\n");

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: PROMPT_FAQ },
      {
        role: "user",
        content: `Demande de l'administrateur :\n${prompt}\n\nHistorique de la conversation :\n${historyText || "(aucun historique)"}`,
      },
    ],
    temperature: 0.2,
    max_completion_tokens: 800,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    const err: any = new Error("Le modèle n'a retourné aucune réponse.");
    err.status = 502;
    throw err;
  }

  let data: {
    id?: unknown;
    categorie?: unknown;
    mots_cles?: unknown;
    question?: unknown;
    reponse_llm?: unknown;
    etapes?: unknown;
    escalade_technicien?: unknown;
    message_escalade?: unknown;
  };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    const err: any = new Error("Réponse JSON invalide.");
    err.status = 502;
    throw err;
  }

  if (!data.id || !data.question || !data.categorie) {
    console.log("[admin] aucune FAQ extractible détectée");
    return null;
  }

  const entry: FaqEntry = {
    id: typeof data.id === "string" ? data.id : "faq_" + Date.now(),
    categorie: typeof data.categorie === "string" ? data.categorie : "Général",
    mots_cles: Array.isArray(data.mots_cles)
      ? data.mots_cles.filter((k): k is string => typeof k === "string")
      : [],
    question: typeof data.question === "string" ? data.question : "",
    reponse_llm: typeof data.reponse_llm === "string" ? data.reponse_llm : "",
    etapes: Array.isArray(data.etapes)
      ? data.etapes.filter((e): e is string => typeof e === "string")
      : [],
    escalade_technicien: data.escalade_technicien === true,
    message_escalade:
      typeof data.message_escalade === "string" ? data.message_escalade : null,
  };

  let faqList: FaqEntry[] = [];
  try {
    const rawFile = await readFile(FAQ_FILE, "utf8");
    const parsed: unknown = JSON.parse(rawFile);
    if (Array.isArray(parsed)) faqList = parsed as FaqEntry[];
  } catch (e) {
    console.error("[admin] erreur de lecture de faq.json:", e);
  }

  faqList.push(entry);
  await writeFile(FAQ_FILE, JSON.stringify(faqList, null, 2), "utf8");
  clearFaqCache();
  console.log("[admin] FAQ saved successfully:", entry.id);
  return entry;
}
