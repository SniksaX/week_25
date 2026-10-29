const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const ticketsList = document.querySelector("#tickets-list");
const noTickets = document.querySelector("#no-tickets");
const btnLogout = document.querySelector("#btn-logout");

let token = localStorage.getItem("adminToken");
let eventSource = null;

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    
    try {
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) throw new Error("Identifiants invalides");

        const data = await res.json();
        token = data.token;
        localStorage.setItem("adminToken", token);
        showDashboard();
    } catch (err) {
        loginError.textContent = err.message;
        loginError.classList.remove("hidden");
    }
});

btnLogout.addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    token = null;
    if (eventSource) eventSource.close();
    dashboardView.classList.add("hidden");
    loginView.classList.remove("hidden");
    ticketsList.innerHTML = "";
});

async function showDashboard() {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    loginError.classList.add("hidden");

    try {
        const res = await fetch("/api/admin/tickets", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.status === 403) {
            btnLogout.click();
            return;
        }

        const tickets = await res.json();
        if (tickets.length > 0) noTickets.classList.add("hidden");
        
        tickets.reverse().forEach(ticket => renderTicket(ticket));
    } catch (err) {
        console.error("Erreur chargement tickets:", err);
    }

    eventSource = new EventSource(`/api/admin/stream?token=${token}`);
    
    eventSource.onmessage = (event) => {
        const newTicket = JSON.parse(event.data);
        noTickets.classList.add("hidden");
        renderTicket(newTicket, true);
    };

    eventSource.onerror = () => {
        eventSource.close();
    };
}

function renderTicket(ticket, prepend = false) {
    const card = document.createElement("div");
    card.className = "ticket-card";
    const date = new Date(ticket.createdAt).toLocaleString("fr-FR");
    
    card.innerHTML = `
        <div class="ticket-header">
            <span class="badge">${ticket.userEmail}</span>
            <span class="date">${date}</span>
        </div>
        <div class="ticket-body">
            <p><strong>Contexte :</strong> ${ticket.context}</p>
            <p><strong>Proposé par l'IA :</strong> <em>${ticket.proposed}</em></p>
            <p><strong>Pourquoi ça n'a pas marché :</strong> <span class="reason">${ticket.reason}</span></p>
        </div>
    `;

    if (prepend && ticketsList.firstChild) {
        ticketsList.insertBefore(card, ticketsList.firstChild);
    } else {
        ticketsList.appendChild(card);
    }
}

if (token) {
    showDashboard();
}