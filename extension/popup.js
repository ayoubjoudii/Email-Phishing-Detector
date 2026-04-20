document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  const loading = document.getElementById("loading");

  resultDiv.innerHTML = "";
  loading.style.display = "block";


  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  
  chrome.tabs.sendMessage(tab.id, { action: "getEmailText" }, async (response) => {
    if (!response || response.error) {
      loading.style.display = "none";
      resultDiv.innerHTML = `<p style="color:red;">⚠️ ${response?.error || "Could not read email."}</p>`;
      return;
    }

    const emailText = `Subject: ${response.subject}\n\n${response.body}`;

    try {
      const aiResult = await analyzeWithClaude(emailText);
      loading.style.display = "none";
      displayResult(aiResult, resultDiv);
    } catch (err) {
      loading.style.display = "none";
      resultDiv.innerHTML = `<p style="color:red;">❌ API Error: ${err.message}</p>`;
    }
  });
});

async function analyzeWithClaude(emailText) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a cybersecurity expert. Analyze this email for phishing.
Return ONLY a JSON object with:
- "verdict": "phishing" or "legitimate"
- "confidence": number 0-100
- "reasons": array of short strings explaining why
- "red_flags": array of specific suspicious elements (empty if none)

Email:
"""
${emailText}
"""

JSON only, no extra text.`
      }]
    })
  });

  const data = await response.json();
  return JSON.parse(data.content[0].text);
}

function displayResult(result, container) {
  const isPhishing = result.verdict === "phishing";
  const emoji = isPhishing ? "🚨" : "✅";
  const label = isPhishing ? "PHISHING DETECTED" : "Looks Legitimate";
  const cssClass = isPhishing ? "phishing" : "safe";

  const reasonsHTML = result.reasons.map(r => `<li>${r}</li>`).join("");
  const flagsHTML = result.red_flags.length > 0
    ? `<p><strong>🚩 Red flags:</strong></p><ul>${result.red_flags.map(f => `<li>${f}</li>`).join("")}</ul>`
    : "";

  container.innerHTML = `
    <div class="${cssClass}">
      <strong>${emoji} ${label}</strong> — ${result.confidence}% confidence
      <div class="reason"><ul>${reasonsHTML}</ul>${flagsHTML}</div>
    </div>
  `;
}