# Email Phishing Detector

A Chrome extension that automatically detects phishing emails in Gmail using AI (Groq LLaMA 3) running on a backend server.

## Features

- 🔍 **Auto-detects** phishing when you open emails in Gmail
- 🤖 **AI-powered** using Groq's LLaMA 3 model
- 🚨 **Color-coded results** (red for phishing, green for legitimate)
- ⚡ **No setup needed** for users - just install and go
- 🔐 **Secure** - API key stored server-side, not in code
- 📊 Shows confidence %, reasons, and red flags

## Quick Start

**See [SETUP.md](SETUP.md) for complete deployment instructions**

### TL;DR

1. Deploy `backend/` to Render.com
2. Add Render URL to `extension/config.js`
3. Load extension in Chrome (`chrome://extensions`)
4. Open Gmail → emails analyzed automatically!

## Project Structure

```
├── backend/              ← Node.js server (calls Groq API)
│   ├── server.js
│   ├── package.json
│   └── .gitignore
│
├── extension/            ← Chrome extension
│   ├── manifest.json     ← Extension config
│   ├── config.js         ← 👈 Update with Render URL
│   ├── popup.html
│   ├── popup.js
│   ├── content.js        ← Gmail integration
│   └── icon.png
│
└── SETUP.md              ← Detailed setup guide
```

## Technologies

- **Backend:** Node.js + Express
- **AI:** Groq API (LLaMA 3.3-70b)
- **Extension:** Chrome Manifest V3
- **Hosting:** Render.com (free tier)

## How It Works

1. **Auto-detection** - When you open an email in Gmail, `content.js` reads it
2. **Sends to backend** - Email text sent to your Render server
3. **AI analysis** - Backend calls Groq API with your API key (hidden)
4. **Results** - Detection returned as verdict + confidence + reasons
5. **Display** - Banner shows on Gmail showing result

## API Key

Your Groq API key is stored **on the Render server only** - never in:

- ✅ Not in code
- ✅ Not in Chrome storage
- ✅ Not transmitted to Gmail
- ✅ Safe to publish on GitHub

## Configuration

Edit `extension/config.js`:

```javascript
const BACKEND_URL = "https://your-render-url.onrender.com";
```

## Installation

1. **Load unpacked extension:**
   - Chrome → `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select `extension/` folder

2. **Using the extension:**
   - Open Gmail
   - Click email → auto-analyzed in ~2 seconds
   - Or click 🛡️ icon → **Analyze Current Email**

## Troubleshooting

| Issue                    | Solution                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| No analysis appears      | Check `config.js` has correct Render URL                         |
| Backend error            | Visit `https://your-render-url.onrender.com` to check if running |
| Import errors in console | Make sure `config.js` is loaded first (it is in `manifest.json`) |

## Example Output

**Phishing Email:**

```
🚨 Phishing Detected — 95%

Analysis:
› Sender email domain mismatch
› Suspicious urgency language
› Multiple redirection links

🚩 RED FLAGS
› Sender claims to be PayPal but email from mailsystem@fake-bank.com
› Contains link shorteners (bit.ly)
› Asks for password click
```

**Legitimate Email:**

```
✅ Looks Legitimate — 88%

Analysis:
› Proper company domain
› Professional formatting
› Clear purpose and CTA
```

## Publish to Chrome Web Store

1. Create Google Developer account (~$5)
2. Zip `extension/` folder
3. Upload to [Chrome Web Store](https://chrome.google.com/webstore/category/extensions)
4. Share with friends!

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Groq API Docs](https://groq.com/openapi/)
- [Render Deployment](https://render.com/docs)
- [Gmail Labs API](https://developers.google.com/gmail/api)

## Contributing

Feel free to fork and improve!

Potential enhancements:

- Add phishing database lookup (Have I Been Pwned)
- Regex patterns for common phishing tactics
- Per-email history tracking
- Multiple language support

## License

Use freely!
