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

  // Inject font if not already there
  if (!document.getElementById("phishing-font")) {
    const link = document.createElement("link");
    link.id = "phishing-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap";
    document.head.appendChild(link);
  }

  const configs = {
    loading:    { accent: "#a855f7", bg: "#05000f", label: "■ SCANNING",    verdict: "ANALYZING EMAIL...",   icon: "⟳" },
    phishing:   { accent: "#f43f5e", bg: "#0d0005", label: "⚠ THREAT DETECTED", verdict: "// PHISHING DETECTED", icon: "⚠" },
    legitimate: { accent: "#a855f7", bg: "#05000f", label: "✓ SCAN COMPLETE",   verdict: "// TARGET CLEAN",      icon: "✓" },
    error:      { accent: "#f59e0b", bg: "#0d0800", label: "! SYSTEM ERROR",    verdict: "// ERROR",             icon: "!" }
  };

  const c = configs[type] || configs.error;

  const banner = document.createElement("div");
  banner.id = "phishing-banner";

  banner.style.cssText = `
    position: fixed;
    top: 20px; right: 20px;
    z-index: 99999;
    width: 320px;
    background: linear-gradient(135deg, #0d0020 0%, #1a0035 50%, #0a0015 100%);
    backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
    border: 1px solid ${c.accent};
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    color: ${c.accent};
    box-shadow: 0 0 24px ${c.accent}33, inset 0 0 12px ${c.accent}08;
    clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
  `;

  const reasonsHTML = reasons.length
    ? reasons.map(r => `
        <div style="padding:2px 0 2px 12px;position:relative;opacity:0.85;font-size:11px;line-height:1.4">
          <span style="position:absolute;left:0;opacity:0.6">&gt;</span>${r}
        </div>`).join("")
    : "";

  const flagsHTML = redFlags.length
    ? `<div style="border-top:1px solid ${c.accent}44;margin-top:8px;padding-top:8px">
        <div style="font-size:9px;letter-spacing:2px;opacity:0.6;margin-bottom:4px">&gt; RED FLAGS IDENTIFIED</div>
        ${redFlags.map(f => `
          <div style="padding:2px 0 2px 12px;position:relative;font-size:11px;opacity:0.9;line-height:1.4">
            <span style="position:absolute;left:0">!</span>${f}
          </div>`).join("")}
       </div>`
    : "";

  const progressBar = type === "loading"
    ? `<div style="height:2px;background:#1a0030;margin-top:10px;overflow:hidden">
         <div id="phishing-progress" style="height:100%;background:${c.accent};width:0%;animation:phish-load 1.5s ease-in-out infinite"></div>
       </div>`
    : (type !== "error"
        ? `<div style="margin-top:10px">
             <div style="font-size:9px;letter-spacing:2px;opacity:0.6;margin-bottom:4px">CONFIDENCE LEVEL</div>
             <div style="height:3px;background:#1a0030;border:1px solid ${c.accent}66;overflow:hidden">
               <div style="height:100%;background:${c.accent};width:${confidence}%;transition:width 0.6s"></div>
             </div>
             <div style="font-size:10px;text-align:right;margin-top:2px;opacity:0.7">${confidence}%</div>
           </div>`
        : "");

  banner.innerHTML = `
    <style>
      @keyframes phish-load {
        0%   { width:0%;  margin-left:0 }
        50%  { width:60%; margin-left:20% }
        100% { width:0%;  margin-left:100% }
      }
      @keyframes phish-scanline {
        0%   { background-position: 0 0 }
        100% { background-position: 0 100% }
      }
    </style>

    <div style="
      background: repeating-linear-gradient(0deg,transparent,transparent 2px,${c.accent}05 2px,${c.accent}05 4px);
      padding: 12px 14px;
      position: relative;
    ">
      <!-- corner brackets -->
      <div style="position:absolute;top:4px;left:4px;width:8px;height:8px;border-top:2px solid ${c.accent};border-left:2px solid ${c.accent}"></div>
      <div style="position:absolute;top:4px;right:4px;width:8px;height:8px;border-top:2px solid ${c.accent};border-right:2px solid ${c.accent}"></div>
      <div style="position:absolute;bottom:4px;left:4px;width:8px;height:8px;border-bottom:2px solid ${c.accent};border-left:2px solid ${c.accent}"></div>
      <div style="position:absolute;bottom:4px;right:4px;width:8px;height:8px;border-bottom:2px solid ${c.accent};border-right:2px solid ${c.accent}"></div>

      <!-- header row -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div style="font-size:9px;letter-spacing:2px;opacity:0.6;margin-bottom:2px">${c.label}</div>
          <div style="font-family:'Orbitron',monospace;font-size:13px;font-weight:900;letter-spacing:1px">${c.verdict}</div>
        </div>
        ${type !== "loading"
          ? `<div id="close-phishing-banner" style="cursor:pointer;font-size:18px;opacity:0.5;padding:0 4px;line-height:1" title="Dismiss">×</div>`
          : ""}
      </div>

      ${progressBar}

      ${reasonsHTML
        ? `<div style="border-top:1px solid ${c.accent}44;margin-top:8px;padding-top:8px">
             <div style="font-size:9px;letter-spacing:2px;opacity:0.6;margin-bottom:4px">&gt; ANALYSIS OUTPUT</div>
             ${reasonsHTML}
           </div>`
        : ""}

      ${flagsHTML}
    </div>
  `;

  document.body.appendChild(banner);

  const closeBtn = document.getElementById("close-phishing-banner");
  if (closeBtn) closeBtn.addEventListener("click", () => banner.remove());

  if (type === "legitimate") setTimeout(() => banner.remove(), 6000);
}