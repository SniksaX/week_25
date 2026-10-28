import { readFile, writeFile, mkdir } from "node:fs/promises";
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
  "trigger":       string,   
  "information":   string,   
  "additional_info": string | null   
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

const MEMORY_TRIGGERS = [
  "enregistre", "sauvegarde", "sauvgarde", "souviens", "souviens-toi",
  "souviens toi", "rappel toi", "rappelle", "mémorise", "memorise",
  "retiens", "note que", "garde en mémoire",
];

const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function detectMemoryIntent(prompt) {
  const text = norm(prompt);
  return MEMORY_TRIGGERS.some((w) => text.includes(norm(w)));
}

async function loadMemory() {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    if (e.code === "ENOENT") return [];   
    throw e;
  }
}

async function appendMemory(entry) {
  const existing = await loadMemory();          
  existing.push(entry);                         
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(existing, null, 2), "utf8");
  return existing;
}

export async function extractAndSaveMemory(prompt) {
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    messages: [
      { role: "system", content: PROMPT_INTENT },
      { role: "user",   content: prompt },
    ],
    temperature: 0.2,
    max_completion_tokens: 500,
    response_format: { type: "json_object" },   
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    const err = new Error("Le modèle n'a retourné aucune réponse.");
    err.status = 502;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const err = new Error("Réponse JSON invalide.");
    err.status = 502;
    throw err;
  }

  
  if (!data.trigger && !data.information && !data.additional_info) {
    return null;
  }

  const entry = {
    trigger:         data.trigger         ?? null,
    information:     data.information     ?? null,
    additional_info: data.additional_info ?? null,
    createdAt:       new Date().toISOString(),
  };

  await appendMemory(entry);
  return entry;
}


export async function getMemoryAsText() {
  const memory = await loadMemory();
  if (memory.length === 0) return null;

  return memory
    .map((m, i) => {
      const extra = m.additional_info ? ` — ${m.additional_info}` : "";
      return `${i + 1}. ${m.information ?? m.trigger}${extra}`;
    })
    .join("\n");
}