let currentSessionId = null;
let lastPrompt = "";
let lastAnswer = "";

const form = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const statusElement = document.querySelector("#status");
const answerElement = document.querySelector("#answer");
const escalateContainer = document.querySelector("#escalate-container");
const btnEscalate = document.querySelector("#btn-escalate");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  lastPrompt = prompt;
  statusElement.textContent = "Génération en cours...";
  answerElement.textContent = "";
  escalateContainer.classList.add("hidden");

  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sessionId: currentSessionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Une erreur est survenue.");
    }

    currentSessionId = data.sessionId; 
    lastAnswer = data.answer;

    answerElement.textContent = data.answer;
    statusElement.textContent = "";
    
    escalateContainer.classList.remove("hidden");
  } catch (error) {
    statusElement.textContent = "";
    answerElement.textContent = error.message;
  }
});

btnEscalate.addEventListener("click", async () => {
  const reason = window.prompt("Pourquoi les solutions proposées n'ont pas fonctionné ?");
  if (!reason || !reason.trim()) return;

  btnEscalate.disabled = true;
  btnEscalate.textContent = "Envoi du ticket en cours...";

  try {
    const response = await fetch("/api/ai/escalate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: lastPrompt,
        proposed: lastAnswer,
        reason: reason.trim(),
      }),
    });

    if (!response.ok) throw new Error("Erreur lors de la création du ticket.");

    escalateContainer.innerHTML = "<p style='color: green; font-weight: bold;'>Un technicien a été notifié et prendra contact avec vous.</p>";
  } catch (error) {
    alert(error.message);
    btnEscalate.disabled = false;
    btnEscalate.textContent = "Transférer à un technicien humain";
  }
});