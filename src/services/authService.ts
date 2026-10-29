import { randomBytes, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "admin_token";

const adminTokens = new Set<string>();

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
};

export const checkAdminCredentials = (email: string, password: string): boolean => {
  const adminMail = process.env.ADMIN_MAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminMail || !adminPassword) return false;

  const mailOk = safeEqual(email.trim().toLowerCase(), adminMail.toLowerCase());
  const passwordOk = safeEqual(password, adminPassword);
  return mailOk && passwordOk;
};

export const createAdminToken = (): string => {
  const token = randomBytes(32).toString("hex");
  adminTokens.add(token);
  return token;
};

export const revokeAdminToken = (token: string | undefined): void => {
  if (token) adminTokens.delete(token);
};

export const isAdminToken = (token: string | undefined): boolean =>
  Boolean(token) && adminTokens.has(token as string);

// Lit le cookie à la main pour éviter d'installer cookie-parser
export const readAdminToken = (cookieHeader: string | undefined): string | undefined => {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return undefined;
};