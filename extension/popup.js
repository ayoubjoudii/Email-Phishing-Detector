chrome.storage.local.get("groqApiKey", ({ groqApiKey }) => {
  if (groqApiKey) {
    document.getElementById("apiKeyInput").value = groqApiKey;
    document.getElementById("keyStatus").textContent = "✅ API key saved.";
    document.getElementById("keyStatus").classList.add("ok");
  }
});

document.getElementById("saveKeyBtn").addEventListener("click", () => {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) return;
  chrome.storage.local.set({ groqApiKey: key }, () => {
    const status = document.getElementById("keyStatus");
    status.textContent = "✅ API key saved!";
    status.classList.add("ok");
  });
});

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const { groqApiKey } = await chrome.storage.local.get("groqApiKey");

  if (!groqApiKey) {
    showError("Please enter and save your Groq API key first.");
    return;
  }

  const loading = document.getElementById("loading");
  const resultCard = document.getElementById("resultCard");
  const analyzeBtn = document.getElementById("analyzeBtn");

  resultCard.style.display = "none";
  loading.style.display = "block";
  analyzeBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: "getEmailText" }, async (response) => {
    if (!response || response.error) {
      loading.style.display = "none";
      analyzeBtn.disabled = false;
      showError(response?.error || "Could not read email. Make sure an email is open in Gmail.");
      return;
    }

    try {
      const result = await analyzeWithGroq(
        `Subject: ${response.subject}\n\n${response.body}`,
        groqApiKey
      );
      loading.style.display = "none";
      analyzeBtn.disabled = false;
      displayResult(result);
    } catch (err) {
      loading.style.display = "none";
      analyzeBtn.disabled = false;
      showError("API Error: " + err.message);
    }
  });
});

async function analyzeWithGroq(emailText, apiKey) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a cybersecurity expert. Analyze this email for phishing.
Return ONLY a JSON object with:
- "verdict": "phishing" or "legitimate"
- "confidence": number 0-100
- "reasons": array of short explanation strings
- "red_flags": array of specific suspicious elements (empty array if none)

Email:
"""
${emailText}
"""

JSON only, no extra text.`
      }]
    })
  });

  const data = await response.json();
  const text = data.choices[0].message.content;
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function displayResult(result) {
  const isPhishing = result.verdict === "phishing";
  const card = document.getElementById("resultCard");

  card.className = `result-card ${isPhishing ? "phishing" : "legitimate"}`;
  document.getElementById("verdictLabel").textContent = isPhishing ? "🚨 Phishing Detected" : "✅ Looks Legitimate";
  document.getElementById("confidenceBadge").textContent = `${result.confidence}% confidence`;

  const reasonsList = document.getElementById("reasonsList");
  reasonsList.innerHTML = result.reasons.map(r => `<li>${r}</li>`).join("");

  const redFlagsSection = document.getElementById("redFlagsSection");
  const redFlagsList = document.getElementById("redFlagsList");
  if (result.red_flags && result.red_flags.length > 0) {
    redFlagsList.innerHTML = result.red_flags.map(f => `<li>${f}</li>`).join("");
    redFlagsSection.style.display = "block";
  } else {
    redFlagsSection.style.display = "none";
  }

  card.style.display = "block";
}

function showError(msg) {
  const card = document.getElementById("resultCard");
  card.className = "result-card error";
  document.getElementById("verdictLabel").textContent = "⚠️ Error";
  document.getElementById("confidenceBadge").textContent = "";
  document.getElementById("reasonsList").innerHTML = `<li>${msg}</li>`;
  document.getElementById("redFlagsSection").style.display = "none";
  card.style.display = "block";
}