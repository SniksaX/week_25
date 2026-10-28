import {readFile, writeFile, mkdir} from "node:fs/promises"
import { dirname } from "node:path";

const FILE = new URL("../../memory.json", import.meta.url).pathname;

const PROMPT_INTENT= `
Tu es un moteur d'extraction d'informations chargé de transformer une demande
utilisateur en une entrée de mémoire structurée.

RÔLE
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

RÈGLES
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

EXEMPLE
Entrée  : « Retiens que je m'appelle Siraj, je suis grand. »
Sortie  :
{
  "trigger": "L'utilisateur demande à mémoriser son prénom et sa taille.",
  "information": "Le prénom de l'utilisateur est Siraj.",
  "additional_info": "L'utilisateur se décrit comme grand."
}

EXEMPLE (information absente)
Entrée  : « Retiens que je m'appelle Siraj. »
Sortie  :
{
  "trigger": "L'utilisateur demande à mémoriser son prénom.",
  "information": "Le prénom de l'utilisateur est Siraj.",
  "additional_info": null
}
`

const createFileINE = (file) => {
    try {
     
    } catch {

    }
}

const saveInfo = () => {

}