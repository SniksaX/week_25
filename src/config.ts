import "dotenv/config";

export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
export const PORT = Number(process.env.PORT) || 3000;
