# VibeCheck - Conversational AI Feedback

A next-generation feedback platform that replaces boring forms with real-time voice conversation. Powered by Groq (Llama 3), Next.js, and monitored by Sentry.

🌐 [Live Experience](https://ton-lien-vercel-ici.app)

---

## 💎 The Vision

**VibeCheck** makes static survey forms obsolete. 

Instead of forcing customers to click checkboxes, we listen to them. Using advanced Speech-to-Text and Generative AI, we transform raw voice audio into structured business data (Sentiment, Category, Actionable Insights) instantly.

## 🚀 Technical Excellence

*   **🗣️ Conversational Engine:** Uses browser-native Speech Recognition combined with Groq's Llama 3 model for <500ms latency responses.
*   **🧠 Context-Aware AI:** The system doesn't just analyze; it *responds* vocally to the user with empathy using Speech Synthesis.
*   **🛡️ AI Observability:** Integrated with **Sentry** to capture not just code errors, but **User Transcripts** during crashes. This allows for prompt engineering debugging in production.
*   **🌍 Bilingual Core:** Fully dynamic English/French switching (UI, Voice Recognition, and AI Synthesis).
*   **🔌 Real-time Webhook:** Instantly dispatches structured JSON payloads to external backends (simulating SurveyMonkey integration).

## 🛠️ Tech Stack

*   **Frontend:** Next.js 14 (App Router), React, Tailwind CSS.
*   **AI Model:** Llama-3.3-70b via Groq API.
*   **Monitoring:** Sentry (Custom Context & User Feedback Widget).
*   **Motion:** Lucide React for iconography & CSS Animations.


---

*Built by Rayan Saadani Hassani*