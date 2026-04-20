let lastAnalyzedSubject = "";

const observer = new MutationObserver(async () => {
  const emailBody = document.querySelector(".a3s.aiL");
  const emailSubject = document.querySelector(".hP");

  if (!emailBody || !emailSubject) return;

  const subject = emailSubject.innerText.trim();
  if (subject === lastAnalyzedSubject) return;
  lastAnalyzedSubject = subject;

  const old = document.getElementById("phishing-banner");
  if (old) old.remove();

  showBanner("loading");

  const emailText = `Subject: ${subject}\n\n${emailBody.innerText}`;
    try {
      const result = await analyzeWithBackend(emailText);
      showBanner(result.verdict, result.confidence, result.reasons, result.red_flags);
    } catch (err) {
      showBanner("error", null, [`API Error: ${err.message}`]);
    }
});

observer.observe(document.body, { childList: true, subtree: true });


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getEmailText") {
    const emailBody = document.querySelector(".a3s.aiL");
    const emailSubject = document.querySelector(".hP");
    if (emailBody) {
      sendResponse({ subject: emailSubject?.innerText || "(no subject)", body: emailBody.innerText });
    } else {
      sendResponse({ error: "No email open. Please open an email in Gmail first." });
    }
  }
  return true;
});

async function analyzeWithBackend(emailText) {
  console.log("[Phishing Detector] Analyzing email with backend...");
  console.log("[Phishing Detector] Backend URL:", BACKEND_URL);
  
  try {
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ emailText })
    });

    console.log("[Phishing Detector] Response status:", response.status);
    
    const data = await response.json();
    console.log("[Phishing Detector] Backend response:", data);

    if (!response.ok) {
      const errorMsg = data.error || `Backend error: ${response.status}`;
      console.error("[Phishing Detector] Backend error:", errorMsg);
      throw new Error(errorMsg);
    }

    console.log("[Phishing Detector] Analysis result:", data);
    return data;
  } catch (err) {
    console.error("[Phishing Detector] Error:", err.message);
    throw err;
  }
}

function showBanner(type, confidence, reasons = [], redFlags = []) {
  const old = document.getElementById("phishing-banner");
  if (old) old.remove();

  const banner = document.createElement("div");
  banner.id = "phishing-banner";
  banner.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 99999;
    max-width: 380px; border-radius: 12px; padding: 14px 16px;
    font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3); line-height: 1.5;
    backdrop-filter: blur(10px);
  `;

  const configs = {
    loading:    { bg: "#1a1a2e", border: "#a78bfa", icon: "🔍", title: "Analyzing email...", titleColor: "#a78bfa" },
    phishing:   { bg: "#1f0a0a", border: "#dc2626", icon: "🚨", title: `Phishing Detected — ${confidence}%`, titleColor: "#f87171" },
    legitimate: { bg: "#0a1f0f", border: "#16a34a", icon: "✅", title: `Looks Legitimate — ${confidence}%`, titleColor: "#4ade80" },
    error:      { bg: "#1a140a", border: "#d97706", icon: "⚠️", title: "Could not analyze", titleColor: "#fbbf24" }
  };

  const c = configs[type];
  banner.style.background = c.bg;
  banner.style.border = `1px solid ${c.border}`;

  const reasonsHTML = reasons.length
    ? `<ul style="margin:8px 0 0 16px;padding:0;color:#c4c4d8">${reasons.map(r => `<li style="margin:2px 0">${r}</li>`).join("")}</ul>`
    : "";

  const flagsHTML = redFlags.length
    ? `<p style="margin:8px 0 2px;color:#f87171;font-size:11px;font-weight:700">🚩 RED FLAGS</p>
       <ul style="margin:0 0 0 16px;padding:0;color:#fca5a5">${redFlags.map(f => `<li style="margin:2px 0">${f}</li>`).join("")}</ul>`
    : "";

  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <strong style="color:${c.titleColor}">${c.icon} ${c.title}</strong>
      ${type !== "loading" ? `<span id="close-phishing-banner" style="cursor:pointer;color:#6b6b8a;font-size:16px;margin-left:12px">✕</span>` : ""}
    </div>
    ${reasonsHTML}${flagsHTML}
  `;

  document.body.appendChild(banner);

  const closeBtn = document.getElementById("close-phishing-banner");
  if (closeBtn) closeBtn.addEventListener("click", () => banner.remove());

  if (type === "legitimate") setTimeout(() => banner.remove(), 6000);
}