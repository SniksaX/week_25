import "dotenv/config";

export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
export const PORT = Number(process.env.PORT) || 3000;
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@techhelp.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";