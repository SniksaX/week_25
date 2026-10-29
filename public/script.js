let currentSessionId = null;
let isLoading = false;

const app = document.querySelector("#app");
const sidebar = document.querySelector("#sidebar");
const overlay = document.querySelector("#overlay");
const menuButton = document.querySelector("#menu-button");
const themeSelect = document.querySelector("#theme-select");
const conversationEl = document.querySelector("#conversation");
const messagesEl = document.querySelector("#messages");
const form = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const sendButton = document.querySelector("#send-button");
const adminLoginButton = document.querySelector("#admin-login-button");
const adminLogoutButton = document.querySelector("#admin-logout-button");
const ticketsButton = document.querySelector("#tickets-button");
const ticketsBadge = document.querySelector("#tickets-badge");
const contactSupportButton = document.querySelector("#contact-support-button");
const profileAvatar = document.querySelector("#profile-avatar");
const profileName = document.querySelector("#profile-name");
const profileCompany = document.querySelector("#profile-company");

const loginDialog = document.querySelector("#login-dialog");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const loginCancel = document.querySelector("#login-cancel");
const ticketsDialog = document.querySelector("#tickets-dialog");
const ticketsClose = document.querySelector("#tickets-close");
const ticketList = document.querySelector("#ticket-list");

const TICKET_QUESTION = "Créer un ticket de support";

let isAdmin = false;
let lastUserPrompt = "";

const QUICK_QUESTIONS = [
  "Je ne peux plus me connecter",
  "Mon ordinateur est très lent",
  "Créer un ticket de support",
];

let quickQuestionsEl = null;

function getTime() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
  conversationEl.scrollTo({ top: conversationEl.scrollHeight, behavior: "smooth" });
}

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = "message-row" + (role === "user" ? " message-row--user" : "");

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "N";
    row.append(avatar);
  }

  const wrap = document.createElement("div");
  wrap.className = "message-wrap";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  const time = document.createElement("p");
  time.className = "message-time";
  time.textContent = getTime();

  wrap.append(bubble, time);
  row.append(wrap);
  messagesEl.append(row);
  scrollToBottom();
  return row;
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "message-row";
  row.innerHTML = `
    <div class="message-avatar">N</div>
    <div class="typing"><span></span><span></span><span></span></div>
  `;
  messagesEl.append(row);
  scrollToBottom();
  return row;
}

function showQuickQuestions() {
  quickQuestionsEl = document.createElement("div");
  quickQuestionsEl.className = "quick-questions";

  QUICK_QUESTIONS.forEach((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = question;
    button.addEventListener("click", () => {
      if (question === TICKET_QUESTION) {
        addMessage("user", question);
        createSupportTicket();
      } else {
        sendMessage(question);
      }
    });
    quickQuestionsEl.append(button);
  });

  messagesEl.append(quickQuestionsEl);
}

function updateSendState() {
  sendButton.disabled = isLoading || !promptInput.value.trim();
}

async function sendMessage(text) {
  const prompt = text.trim();
  lastUserPrompt = prompt;
  if (!prompt || isLoading) return;

  isLoading = true;
  quickQuestionsEl?.remove();
  quickQuestionsEl = null;

  addMessage("user", prompt);
  promptInput.value = "";
  updateSendState();

  const typing = showTyping();

  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sessionId: currentSessionId }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");

    currentSessionId = data.sessionId;
    addMessage("assistant", data.answer);
  } catch (error) {
    addMessage("assistant", error.message);
  } finally {
    typing.remove();
    isLoading = false;
    updateSendState();
    promptInput.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(promptInput.value);
});

promptInput.addEventListener("input", updateSendState);

function applyTheme(theme) {
  app.dataset.theme = theme;
  themeSelect.value = theme;
  localStorage.setItem("theme", theme);
}

themeSelect.addEventListener("change", (event) => applyTheme(event.target.value));
applyTheme(localStorage.getItem("theme") || "blue");

function toggleSidebar(open) {
  sidebar.classList.toggle("is-open", open);
}
menuButton.addEventListener("click", () => toggleSidebar(true));
overlay.addEventListener("click", () => toggleSidebar(false));

// Démarrage
addMessage("assistant", "Bonjour Thomas, je suis Nova, votre assistante support. Comment puis-je vous aider aujourd'hui ?");
showQuickQuestions();

async function createSupportTicket() {
  if (!currentSessionId) {
    addMessage(
      "assistant",
      "Décrivez d'abord votre problème en une phrase, puis je transmettrai votre demande à un technicien."
    );
    return;
  }

  try {
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: currentSessionId, message: lastUserPrompt }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Impossible de créer le ticket.");

    addMessage(
      "assistant",
      data.created
        ? "J'ai transmis votre demande à un technicien. Il reviendra vers vous rapidement."
        : "Votre demande est déjà en cours de traitement par un technicien."
    );
  } catch (error) {
    addMessage("assistant", error.message);
  }
}

contactSupportButton.addEventListener("click", createSupportTicket);

function setAdminMode(enabled) {
  isAdmin = enabled;
  ticketsButton.hidden = !enabled;
  adminLoginButton.hidden = enabled;
  adminLogoutButton.hidden = !enabled;

  profileAvatar.textContent = enabled ? "AD" : "TM";
  profileName.textContent = enabled ? "Administrateur" : "Thomas Martin";
  profileCompany.textContent = enabled ? "TechHelp Support" : "Ardent Groupe";

  if (enabled) {
    refreshTicketsBadge();
  } else {
    ticketsBadge.textContent = "0";
    ticketsDialog.close();
  }
}

async function checkAdminSession() {
  try {
    const response = await fetch("/api/admin/me");
    const data = await response.json();
    setAdminMode(Boolean(data.isAdmin));
  } catch {
    setAdminMode(false);
  }
}

adminLoginButton.addEventListener("click", () => {
  loginError.textContent = "";
  loginDialog.showModal();
});

loginCancel.addEventListener("click", () => loginDialog.close());

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.querySelector("#admin-email").value,
        password: document.querySelector("#admin-password").value,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Connexion impossible.");

    loginForm.reset();
    loginDialog.close();
    setAdminMode(true);
  } catch (error) {
    loginError.textContent = error.message;
  }
});

adminLogoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  setAdminMode(false);
});

async function loadTickets() {
  const response = await fetch("/api/admin/tickets");

  if (response.status === 401) {
    setAdminMode(false);
    throw new Error("Session administrateur expirée, reconnectez-vous.");
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Impossible de charger les tickets.");
  return data.tickets;
}

function renderTickets(tickets) {
  ticketList.replaceChildren();

  if (tickets.length === 0) {
    const empty = document.createElement("li");
    empty.className = "ticket-empty";
    empty.textContent = "Aucun ticket pour le moment.";
    ticketList.append(empty);
    return;
  }

  for (const ticket of tickets) {
    const item = document.createElement("li");
    item.className = "ticket-item";

    const session = document.createElement("p");
    session.className = "ticket-session";
    session.textContent = `Session : ${ticket.sessionId}`;

    const message = document.createElement("p");
    message.className = "ticket-message";
    message.textContent = ticket.message || "Aucun message fourni.";

    const date = document.createElement("p");
    date.className = "ticket-date";
    date.textContent = new Date(ticket.createdAt).toLocaleString("fr-FR");

    item.append(session, message, date);
    ticketList.append(item);
  }
}

async function refreshTicketsBadge() {
  try {
    const tickets = await loadTickets();
    ticketsBadge.textContent = tickets.length;
  } catch {
    // Silencieux : le badge se mettra à jour au prochain passage
  }
}

async function openTickets() {
  ticketsDialog.showModal();
  try {
    const tickets = await loadTickets();
    renderTickets(tickets);
    ticketsBadge.textContent = tickets.length;
  } catch (error) {
    ticketList.textContent = error.message;
  }
}

ticketsButton.addEventListener("click", openTickets);
ticketsClose.addEventListener("click", () => ticketsDialog.close());

checkAdminSession();
setInterval(() => {
  if (isAdmin) refreshTicketsBadge();
}, 15000);