// No API key setup needed - backend handles authentication

document.getElementById("analyzeBtn").addEventListener("click", () => {
  const loading = document.getElementById("loading");
  const resultCard = document.getElementById("resultCard");
  const analyzeBtn = document.getElementById("analyzeBtn");

  resultCard.style.display = "none";
  loading.style.display = "block";
  analyzeBtn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    
    chrome.tabs.sendMessage(tab.id, { action: "getEmailText" }, (response) => {
      // Handle chrome.runtime.lastError
      if (chrome.runtime.lastError) {
        loading.style.display = "none";
        analyzeBtn.disabled = false;
        showError("Make sure Gmail page is open. Refresh and try again.");
        return;
      }
      
      if (!response || response.error) {
        loading.style.display = "none";
        analyzeBtn.disabled = false;
        showError(response?.error || "Could not read email. Make sure an email is open in Gmail.");
        return;
      }

      // Got email text, now analyze it
      analyzeAndDisplay(response, loading, analyzeBtn);
    });
  });
});

async function analyzeAndDisplay(response, loading, analyzeBtn) {
  try {
    const result = await analyzeWithBackend(
      `Subject: ${response.subject}\n\n${response.body}`
    );
    loading.style.display = "none";
    analyzeBtn.disabled = false;
    displayResult(result);
  } catch (err) {
    loading.style.display = "none";
    analyzeBtn.disabled = false;
    showError("API Error: " + err.message);
  }
}

async function analyzeWithBackend(emailText) {
  console.log("[Popup] Analyzing email with backend...");
  console.log("[Popup] Backend URL:", BACKEND_URL);
  
  try {
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ emailText })
    });

    console.log("[Popup] Response status:", response.status);
    
    const data = await response.json();
    console.log("[Popup] Backend response:", data);

    if (!response.ok) {
      const errorMsg = data.error || `Backend error: ${response.status}`;
      console.error("[Popup] Backend error:", errorMsg);
      throw new Error(errorMsg);
    }

    console.log("[Popup] Analysis result:", data);
    return data;
  } catch (err) {
    console.error("[Popup] Error:", err.message);
    throw err;
  }
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