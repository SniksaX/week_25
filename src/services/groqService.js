import "dotenv/config";
import Groq from "groq-sdk";
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

// Rajouter une méthode qui permet de contextualiser / recup des donnée clée 

const conversations = new Map();

export class GroqService {  
  constructor(temp = 0.3, max_tok = 700) {
    this.id      = uuidv4();
    this.history = [];
    this.temp    = temp;
    this.max_tok = max_tok;
    conversations.set(this.id, this);
  }

  async generateAnswer(prompt) {
    this.history.push({ role: "user", content: prompt });

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...this.history,
      ],
      temperature: this.temp,
      max_completion_tokens: this.max_tok,
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) {
      this.history.pop();
      const err = new Error("Le modèle n'a retourné aucune réponse.");
      err.status = 502;
      throw err;
    }
    this.history.push({ role: "assistant", content: answer });

    /* 10 est l'equivalent de 5 message car il prend en compte le role de l'utilisateur et celui de l'assistant
    qui fait 2 messages pour 1 question.*/
   if (this.history.length > 4) {
      this.history = this.history.slice(-4);
    }

    return answer;
  }

  static getSession(uuid) {
    return conversations.get(uuid) ?? null;
  }
}