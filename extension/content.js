// Listens for a message from popup.js asking for the email text
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getEmailText") {
    // Gmail stores the email body in this element
    const emailBody = document.querySelector(".a3s.aiL");
    const emailSubject = document.querySelector(".hP");

    if (emailBody) {
      sendResponse({
        subject: emailSubject ? emailSubject.innerText : "(no subject)",
        body: emailBody.innerText
      });
    } else {
      sendResponse({ error: "No email open. Please open an email first." });
    }
  }
  return true; // needed for async response
});