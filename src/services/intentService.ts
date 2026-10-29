import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { GROQ_MODEL } from "../config.ts";
import { groq } from "./groqService.ts";

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

interface MemoryEntry {
  trigger: string | null;
  information: string | null;
  additional_info: string | null;
  createdAt: string;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function detectMemoryIntent(prompt: string): boolean {
  const text = norm(prompt);
  return MEMORY_TRIGGERS.some((w) => text.includes(norm(w)));
}

async function loadMemory(): Promise<MemoryEntry[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoryEntry[]) : [parsed as MemoryEntry];
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function appendMemory(entry: MemoryEntry): Promise<MemoryEntry[]> {
  const existing = await loadMemory();
  existing.push(entry);
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(existing, null, 2), "utf8");
  return existing;
}

export async function extractAndSaveMemory(
  prompt: string,
): Promise<MemoryEntry | null> {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
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
    const err: any = new Error("Le modèle n'a retourné aucune réponse.");
    err.status = 502;
    throw err;
  }

  let data: {
    trigger?: unknown;
    information?: unknown;
    additional_info?: unknown;
  };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    const err: any = new Error("Réponse JSON invalide.");
    err.status = 502;
    throw err;
  }

  if (!data.trigger && !data.information && !data.additional_info) {
    return null;
  }

  const entry: MemoryEntry = {
    trigger:         typeof data.trigger === "string" ? data.trigger : null,
    information:     typeof data.information === "string" ? data.information : null,
    additional_info: typeof data.additional_info === "string" ? data.additional_info : null,
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
