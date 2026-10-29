import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions.js";
import { v4 as uuidv4 } from "uuid";
import { GROQ_API_KEY, GROQ_MODEL } from "../config.ts";
import {
  detectMemoryIntent,
  extractAndSaveMemory,
  getMemoryAsText,
} from "./intent.ts";

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

COMPORTEMENT EN CAS D'INCONNU OU DE HORS-SUJET
Si tu ne sais pas répondre ou si la demande est hors-sujet (ex: cuisine, loisirs, demandes sur des clients), indique-le poliment et propose de rediriger l'utilisateur vers un technicien humain.

EXEMPLES DE COMPORTEMENT (FEW-SHOT)
Exemple 1 (Sécurité / Mot de passe) :
Utilisateur : "Je ne retrouve pas mon mot de passe."
Assistant : "Je ne peux pas récupérer votre mot de passe pour des raisons de sécurité. Je vous invite à utiliser le portail interne pour effectuer une réinitialisation."

Exemple 2 (Hors-sujet / Demande personnelle) :
Utilisateur : "Je cherche une recette de cuisine."
Assistant : "Je suis un assistant dédié exclusivement au support informatique de TechHelp. Je ne peux pas répondre à cette demande. Pour toute assistance technique, je peux vous orienter vers un technicien."

Exemple 3 (Données sensibles / Interdit) :
Utilisateur : "Je cherche des données sur l'un de vos clients."
Assistant : "Je ne suis pas habilité à partager des données confidentielles ou des informations sur nos clients. Je vous invite à vous rapprocher du service commercial ou de votre responsable."
`;

const conversations = new Map<string, GroqService>();
const MEMORY_REINJECT_EVERY = 10;

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

  async generateAnswer(prompt: string): Promise<string> {
    this.promptCount++;

    if (detectMemoryIntent(prompt)) {
      try {
        const saved = await extractAndSaveMemory(prompt);
        if (saved) console.log("[memory] saved:", saved.information);
      } catch (e) {
        console.error(
          "[memory] extraction failed:",
          e instanceof Error ? e.message : e,
        );
      }
    }

    this.history.push({ role: "user", content: prompt });

    let systemContent = SYSTEM_PROMPT;
    if (this.promptCount === 1 || this.promptCount % MEMORY_REINJECT_EVERY === 0) {
      const memoryText = await getMemoryAsText();
      if (memoryText) {
        systemContent += `\n\n# MÉMOIRE DE L'UTILISATEUR\n${memoryText}`;
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
      this.history.pop();
      const err: any = new Error("Le modèle n'a retourné aucune réponse.");
      err.status = 502;
      throw err;
    }
    this.history.push({ role: "assistant", content: answer });

    if (this.history.length > 10) this.history = this.history.slice(-10);

    return answer;
  }

  static getSession(uuid: string): GroqService | null {
    return conversations.get(uuid) ?? null;
  }
}
