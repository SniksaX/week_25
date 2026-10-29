import { randomUUID } from "node:crypto";

export type Ticket = {
  id: string;
  sessionId: string;
  message: string;
  status: "open";
  createdAt: string;
};

const tickets: Ticket[] = [];

export const createTicket = (
  sessionId: string,
  message: string
): { ticket: Ticket; created: boolean } => {
  const existing = tickets.find((ticket) => ticket.sessionId === sessionId);
  if (existing) return { ticket: existing, created: false };

  const ticket: Ticket = {
    id: randomUUID(),
    sessionId,
    message,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  tickets.push(ticket);
  return { ticket, created: true };
};

// Les plus récents d'abord
export const listTickets = (): Ticket[] => [...tickets].reverse();