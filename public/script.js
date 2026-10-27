const form = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const statusElement = document.querySelector("#status");
const answerElement = document.querySelector("#answer");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  statusElement.textContent = "Génération en cours...";
  answerElement.textContent = "";

  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Une erreur est survenue.");
    }

    answerElement.textContent = data.answer;
    statusElement.textContent = "";
  } catch (error) {
    statusElement.textContent = "";
    answerElement.textContent = error.message;
  }
});
