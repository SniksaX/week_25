let currentSessionId = null;
let isLoading = false;
let isAdmin = false;
let lastUserPrompt = "";
let lastAiAnswer = "";
let eventSource = null;

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
  
  // Markdown parsing for assistant, plain text for user
  if (role === "assistant") {
    bubble.innerHTML = marked.parse(text);
  } else {
    bubble.textContent = text;
  }

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
    const headers = { "Content-Type": "application/json" };
    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) {
      headers["Authorization"] = "Bearer " + adminToken;
    }
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ prompt, sessionId: currentSessionId }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");

    currentSessionId = data.sessionId;
    lastAiAnswer = data.answer;
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

addMessage("assistant", "Bonjour Thomas, je suis Nova, votre assistante support. Comment puis-je vous aider aujourd'hui ?");
showQuickQuestions();

async function createSupportTicket() {
  const reason = window.prompt("Pourquoi les solutions proposées n'ont pas fonctionné ?");
  if (!reason || !reason.trim()) return;

  try {
    const response = await fetch("/api/ai/escalate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: lastUserPrompt || "Problème signalé par l'utilisateur",
        proposed: lastAiAnswer || "Aucune solution proposée",
        reason: reason.trim()
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Impossible de créer le ticket.");

    addMessage("assistant", "J'ai transmis votre demande à un technicien. Il reviendra vers vous rapidement.");
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
    if (ticketsDialog.open) ticketsDialog.close();
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }
}

function checkAdminSession() {
  const token = localStorage.getItem("adminToken");
  setAdminMode(Boolean(token));
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

    localStorage.setItem("adminToken", data.token);
    loginForm.reset();
    loginDialog.close();
    setAdminMode(true);

    window.location.reload(); 

  } catch (error) {
    loginError.textContent = error.message;
  }
});

adminLogoutButton.addEventListener("click", () => {
  localStorage.removeItem("adminToken");
  setAdminMode(false);
  window.location.reload(); 
});

async function loadTickets() {
  const token = localStorage.getItem("adminToken");
  const response = await fetch("/api/admin/tickets", {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (response.status === 403) {
    localStorage.removeItem("adminToken");
    setAdminMode(false);
    throw new Error("Session administrateur expirée, reconnectez-vous.");
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Impossible de charger les tickets.");
  return data;
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

    const email = document.createElement("p");
    email.className = "ticket-session";
    email.textContent = ticket.userEmail;

    const context = document.createElement("p");
    context.className = "ticket-message";
    context.innerHTML = `<strong>Contexte :</strong> ${ticket.context}`;

    const proposed = document.createElement("p");
    proposed.className = "ticket-message";
    proposed.innerHTML = `<strong>Proposé :</strong> <em>${ticket.proposed}</em>`;

    const reason = document.createElement("p");
    reason.className = "ticket-message";
    reason.innerHTML = `<strong>Pourquoi ça n'a pas marché :</strong> ${ticket.reason}`;

    const date = document.createElement("p");
    date.className = "ticket-date";
    date.textContent = new Date(ticket.createdAt).toLocaleString("fr-FR");

    item.append(email, context, proposed, reason, date);
    ticketList.append(item);
  }
}

async function refreshTicketsBadge() {
  try {
    const tickets = await loadTickets();
    ticketsBadge.textContent = tickets.length;
  } catch {
  }
}

async function openTickets() {
  ticketsDialog.showModal();
  try {
    const tickets = await loadTickets();
    renderTickets(tickets.reverse());
    ticketsBadge.textContent = tickets.length;

    if (!eventSource) {
      const token = localStorage.getItem("adminToken");
      eventSource = new EventSource(`/api/admin/stream?token=${token}`);
      eventSource.onmessage = (e) => {
        const newTicket = JSON.parse(e.data);
        ticketsBadge.textContent = parseInt(ticketsBadge.textContent) + 1;
        
        if (ticketList.firstChild?.classList.contains("ticket-empty")) {
          ticketList.replaceChildren();
        }

        const item = document.createElement("li");
        item.className = "ticket-item";
        item.innerHTML = `
          <p class="ticket-session">${newTicket.userEmail}</p>
          <p class="ticket-message"><strong>Contexte :</strong> ${newTicket.context}</p>
          <p class="ticket-message"><strong>Proposé :</strong> <em>${newTicket.proposed}</em></p>
          <p class="ticket-message"><strong>Pourquoi ça n'a pas marché :</strong> ${newTicket.reason}</p>
          <p class="ticket-date">${new Date(newTicket.createdAt).toLocaleString("fr-FR")}</p>
        `;
        ticketList.prepend(item);
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        eventSource = null;
      };
    }
  } catch (error) {
    ticketList.innerHTML = `<li class="ticket-empty">${error.message}</li>`;
  }
}

ticketsButton.addEventListener("click", openTickets);
ticketsClose.addEventListener("click", () => ticketsDialog.close());

checkAdminSession();
setInterval(() => {
  if (isAdmin && ticketsDialog.open) refreshTicketsBadge();
}, 15000);