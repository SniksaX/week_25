import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions.js";
import { v4 as uuidv4 } from "uuid";
import { GROQ_API_KEY, GROQ_MODEL } from "../config.ts";
import { detectAdminFaqIntent, extractAndSaveFaq } from "./adminIntentService.ts";
import { searchFaq } from "./faqService.ts";

export const groq = new Groq({ apiKey: GROQ_API_KEY });

const SYSTEM_PROMPT = `
Tu es l'assistant virtuel officiel du support informatique de l'entreprise TechHelp.

RÔLE ET CONTEXTE
Tu es un assistant technique destiné à aider les employés et utilisateurs de TechHelp.
Ton rôle est de résoudre ou d'orienter face aux problèmes informatiques du quotidien.

OBJECTIFS
Fournir des réponses claires, utiles, professionnelles, courtoises et concises.

LIMITES ET INTERDICTIONS STRICTES
Ne demande JAMAIS le mot de passe d'un utilisateur.
Ne prétends JAMAIS agir à distance sur les postes.
N'invente JAMAIS de solution technique si tu n'es pas sûr.
Ne fournis JAMAIS d'informations sensibles ou confidentielles (données clients, secrets d'entreprise, etc.).
Ne sors JAMAIS de ton cadre d'assistance informatique TechHelp.

RÈGLES DE RÉSOLUTION
Si une "SOLUTION OFFICIELLE" t'est fournie dans le contexte, tu DOIS l'utiliser pour répondre. 
Présente les étapes sous forme de liste numérotée claire. 
N'invente pas d'autres étapes.

COMPORTEMENT EN CAS D'INCONNU OU DE HORS-SUJET
Si tu ne sais pas répondre ou si la demande est hors-sujet (ex: cuisine, loisirs, demandes sur des clients), indique-le poliment et propose de rediriger l'utilisateur vers un technicien humain.
`;

const conversations = new Map<string, GroqService>();

export class GroqService {
  id: string;
  history: ChatCompletionMessageParam[];
  temp: number;
  max_tok: number;
  promptCount: number;

  constructor(temp = 0.3, max_tok = 700) {
    this.id          = uuidv4();
    this.history     = [];
    this.temp        = temp;
    this.max_tok     = max_tok;
    this.promptCount = 0;
    conversations.set(this.id, this);
  }

  async generateAnswer(prompt: string, isAdmin: boolean = false): Promise<string> {
    this.promptCount++;
    console.log(`[groq] génération de la réponse (prompt n°${this.promptCount}, session ${this.id}, admin=${isAdmin})`);

    if (isAdmin && detectAdminFaqIntent(prompt)) {
      try {
        const saved = await extractAndSaveFaq(prompt, this.history);
        if (saved) {
          console.log("[admin] FAQ saved successfully:", saved.id);
          this.history.push({ role: "user", content: prompt });
          const confirmation = `La FAQ a bien été enregistrée dans la base de connaissances.\n\n- Catégorie : ${saved.categorie}\n- Question : ${saved.question}\n- Mots-clés : ${saved.mots_cles.join(", ")}\n- Étapes : ${saved.etapes.length}`;
          this.history.push({ role: "assistant", content: confirmation });
          return confirmation;
        }
      } catch (e) {
        console.error(
          "[admin] FAQ extraction failed:",
          e instanceof Error ? e.message : e,
        );
      }
    }

    this.history.push({ role: "user", content: prompt });

    let systemContent = SYSTEM_PROMPT;

    const faqMatch = await searchFaq(prompt);
    if (faqMatch) {
      console.log("[groq] correspondance FAQ trouvée:", faqMatch.question);
      systemContent += `\n\n# SOLUTION OFFICIELLE (TECHHELP)\n`;
      systemContent += `Problème : ${faqMatch.question}\n`;
      systemContent += `Introduction : ${faqMatch.reponse_llm}\n`;
      systemContent += `Étapes à faire suivre :\n${faqMatch.etapes.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n`;
      
      if (faqMatch.escalade_technicien && faqMatch.message_escalade) {
        systemContent += `\nImportant : Si cela ne marche pas, tu DOIS inclure ce message d'escalade : "${faqMatch.message_escalade}"`;
      }
    }

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemContent },
        ...this.history,
      ],
      temperature: this.temp,
      max_completion_tokens: this.max_tok,
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) {
      console.log("[groq] aucune réponse du modèle -> 502");
      this.history.pop();
      const err: any = new Error("Le modèle n'a retourné aucune réponse.");
      err.status = 502;
      throw err;
    }
    this.history.push({ role: "assistant", content: answer });
    console.log("[groq] réponse ajoutée à l'historique");

    if (this.history.length > 10) this.history = this.history.slice(-10);

    return answer;
  }

  static getSession(uuid: string): GroqService | null {
    return conversations.get(uuid) ?? null;
  }
}