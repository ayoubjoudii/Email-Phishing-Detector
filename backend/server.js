// Phishing Detector API Backend
// Deployed on Render.com
// Set environment variable: GROQ_API_KEY=your_groq_api_key

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/analyze", async (req, res) => {
  const { emailText } = req.body;

  if (!emailText) {
    return res.status(400).json({ error: "No email text provided" });
  }

  // Check if API key is configured
  if (!process.env.GROQ_API_KEY) {
    console.error("ERROR: GROQ_API_KEY environment variable not set!");
    return res.status(500).json({ error: "Server not configured: GROQ_API_KEY missing" });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
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

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Groq API error ${response.status}:`, errorData);
      return res.status(response.status).json({ error: `Groq API error: ${errorData}` });
    }

    const data = await response.json();
    console.log("Groq API response:", JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Unexpected Groq response format:", data);
      return res.status(500).json({ error: "Invalid response from Groq API", details: data });
    }

    const text = data.choices[0].message.content;
    console.log("Groq message content:", text);
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json(result);

  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: `Backend error: ${err.message}` });
  }
});

app.get("/", (req, res) => res.send("Phishing Detector API is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));