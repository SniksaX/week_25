import {readFile, writeFile, mkdir} from "node:fs/promises"
import { dirname } from "node:path";
import { groq } from "./groqService.js";

const FILE = new URL("../../memory.json", import.meta.url).pathname;

const PROMPT_INTENT= `
Tu es un moteur d'extraction d'informations chargé de transformer une demande
utilisateur en une entrée de mémoire structurée.

# RÔLE
Analyser le message de l'utilisateur et en extraire l'information qu'il souhaite
faire mémoriser. Tu ne converses pas : tu produis uniquement une sortie JSON.

FORMAT DE SORTIE — STRICT
Tu réponds EXCLUSIVEMENT avec un objet JSON valide, sans texte avant ou après,
sans balises Markdown, sans commentaires. Le schéma est le suivant :

{
  "trigger":       string,   // ce qui a déclenché la mémorisation, formulé comme un fait
  "information":   string,   // l'information à retenir, reformulée clairement
  "additional_info": string | null   // complément éventuel, sinon null
}

# RÈGLES
1. "trigger" décrit le déclencheur à la troisième personne (ex. « L'utilisateur
   demande à mémoriser son prénom »).
2. "information" reformule le fait de façon autonome, compréhensible hors contexte
   (ex. « Le prénom de l'utilisateur est Siraj »).
3. "additional_info" contient uniquement un complément réellement fourni par
   l'utilisateur ; en l'absence d'information, la valeur est null (jamais "NULL",
   jamais une chaîne vide, jamais une supposition).
4. N'invente aucune donnée. N'extrapole pas. Si une valeur est incertaine, elle
   est absente → null.
5. Si le message ne contient aucune information mémorisable, renvoie :
   { "trigger": null, "information": null, "additional_info": null }
6. La langue des valeurs suit celle de l'utilisateur.

# EXEMPLE
Entrée  : « Retiens que je m'appelle Siraj, je suis grand. »
Sortie  :
{
  "trigger": "L'utilisateur demande à mémoriser son prénom et sa taille.",
  "information": "Le prénom de l'utilisateur est Siraj.",
  "additional_info": "L'utilisateur se décrit comme grand."
}

# EXEMPLE (information absente)
Entrée  : « Retiens que je m'appelle Siraj. »
Sortie  :
{
  "trigger": "L'utilisateur demande à mémoriser son prénom.",
  "information": "Le prénom de l'utilisateur est Siraj.",
  "additional_info": null
}
`

export const createFileINE = async (prompt) => {


    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: PROMPT_INTENT },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_completion_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) {
      const err = new Error("Le modèle n'a retourné aucune réponse.");
      err.status = 502;
      throw err;
    }

      await saveInfo(answer);

    return answer;
    

}

const saveInfo = async (info) => {

   const answer = JSON.parse(info);
   
   if (!answer.trigger && !answer.information && !answer.additional_info) {
      return;
   }

   const fileData = {
      trigger: answer.trigger,
      information: answer.information,
      additional_info: answer.additional_info
   }

   try {
      await  writeFile( FILE, JSON.stringify(fileData, null, 2), 'utf8');
      console.log("Fichier data.json créé avec succès !");
   } catch (error) {
      console.error("Erreur lors de l'écriture du fichier :", error);
   }
}

const intentService = {
   createFileINE
}


