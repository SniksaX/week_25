import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { Response } from "express";

export interface Ticket {
  id: string;
  userEmail: string;
  context: string;
  proposed: string;
  reason: string;
  createdAt: string;
}

const FILE = new URL("../../tickets.json", import.meta.url).pathname;
const sseClients: Set<Response> = new Set();

export function addSseClient(res: Response) {
  sseClients.add(res);
  res.on("close", () => sseClients.delete(res));
}

function emitTicket(ticket: Ticket) {
  const data = `data: ${JSON.stringify(ticket)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
  console.log(`[ticket] ticket ${ticket.id} diffusé à ${sseClients.size} client(s) SSE`);
}

async function loadTickets(): Promise<Ticket[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as Ticket[];
  } catch {
    return [];
  }
}

export async function getAllTickets(): Promise<Ticket[]> {
  return await loadTickets();
}

export async function createTicket(
  context: string,
  proposed: string,
  reason: string
): Promise<Ticket> {
  console.log("[ticket] création d'un nouveau ticket");
  const tickets = await loadTickets();
  const randomNum = Math.floor(Math.random() * 900) + 100;
  const domains = ["gmail.com", "hotmail.fr", "yahoo.fr", "outlook.com"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  const ticket: Ticket = {
    id: uuidv4(),
    userEmail: `user${randomNum}@${domain}`,
    context,
    proposed,
    reason,
    createdAt: new Date().toISOString(),
  };

  tickets.push(ticket);
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(tickets, null, 2), "utf8");
  console.log(`[ticket] ticket ${ticket.id} sauvegardé dans tickets.json`);
  
  emitTicket(ticket);
  return ticket;
}
