import { readFile } from "node:fs/promises";

export interface FaqEntry {
  id: string;
  categorie: string;
  mots_cles: string[];
  question: string;
  reponse_llm: string;
  etapes: string[];
  escalade_technicien: boolean;
  message_escalade: string | null;
}

const FAQ_FILE = new URL("../data/faq.json", import.meta.url).pathname;
let faqCache: FaqEntry[] | null = null;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function clearFaqCache() {
  faqCache = null;
  console.log("[faq] cache FAQ vidé");
}

export async function searchFaq(prompt: string): Promise<FaqEntry | null> {
  if (!faqCache) {
    try {
      const raw = await readFile(FAQ_FILE, "utf8");
      faqCache = JSON.parse(raw) as FaqEntry[];
      console.log(`[faq] faq.json chargé (${faqCache.length} entrée(s))`);
    } catch (e) {
      console.error("Erreur chargement faq.json", e);
      return null;
    }
  }

  const text = norm(prompt);
  
  const match = faqCache.find((entry) =>
    entry.mots_cles.some((keyword) => text.includes(norm(keyword)))
  );

  if (match) {
    console.log("[faq] correspondance trouvée:", match.question);
  } else {
    console.log("[faq] aucune correspondance trouvée");
  }
  return match ?? null;
}
