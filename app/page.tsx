"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, CheckCircle, BarChart3, Globe } from "lucide-react";

// --- DICTIONNAIRE DE TRADUCTION ---
const translations = {
  en: {
    title: "VibeCheck",
    subtitle: "The Future of Feedback (Powered by Groq)",
    listening: "Listening...",
    analyzing: "AI is thinking...",
    clickToSpeak: "Click to speak",
    finished: "Analysis complete.",
    scoreTitle: "Sentiment Score",
    summaryTitle: "AI Summary",
    categoryTitle: "Category Detected",
    actionTitle: "Recommended Action",
    sentMessage: "Data successfully sent to SurveyMonkey API",
    promptSystem: "You are an API expert. Reply ONLY in valid JSON. No text before or after.",
    promptUser: (text: string) => `Analyze this feedback: "${text}".
      Return a JSON object with the content strictly in ENGLISH:
      {
        "summary": "Short summary",
        "sentiment": "Positive" or "Neutral" or "Negative",
        "score": number (1-10),
        "category": "Service" or "Product" or "Pricing" or "Other",
        "action_item": "Recommended action"
      }`
  },
  fr: {
    title: "VibeCheck",
    subtitle: "Le futur du feedback (Propulsé par Groq)",
    listening: "Je vous écoute...",
    analyzing: "L'IA réfléchit...",
    clickToSpeak: "Cliquez pour parler",
    finished: "Analyse terminée.",
    scoreTitle: "Score de Sentiment",
    summaryTitle: "Résumé IA",
    categoryTitle: "Catégorie Détectée",
    actionTitle: "Action Recommandée",
    sentMessage: "Données envoyées avec succès à SurveyMonkey",
    promptSystem: "Tu es un expert API. Réponds UNIQUEMENT en JSON valide. Pas de texte avant ni après.",
    promptUser: (text: string) => `Analyse ce feedback : "${text}".
      Retourne un objet JSON avec le contenu strictement en FRANÇAIS :
      {
        "summary": "Résumé court",
        "sentiment": "Positif" ou "Neutre" ou "Négatif",
        "score": chiffre (1-10),
        "category": "Service" ou "Produit" ou "Prix" ou "Autre",
        "action_item": "Action recommandée"
      }`
  }
};

export default function Home() {
  // --- ÉTATS ---
  const [lang, setLang] = useState<"en" | "fr">("en"); // Par défaut en Anglais
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);

  // --- RECONNAISSANCE VOCALE ---
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // On définit la langue au démarrage, mais on la mettra à jour avant de start
      recognition.lang = lang === "en" ? "en-US" : "fr-FR";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          finalTranscript += event.results[i][0].transcript;
        }
        setTranscript(finalTranscript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Met à jour la langue du micro quand on change le switch
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang === "en" ? "en-US" : "fr-FR";
    }
  }, [lang]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      analyzeFeedback(transcript);
    } else {
      setTranscript("");
      setAnalysis(null);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const toggleLang = () => {
    setLang((prev) => (prev === "en" ? "fr" : "en"));
    setAnalysis(null);
    setTranscript("");
  };

  // --- IA GROQ ---
  const analyzeFeedback = async (text: string) => {
    if (!text) return;
    setLoading(true);

    try {
      const API_KEY = ""; 
      
      const t = translations[lang]; // On charge les textes de la bonne langue

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", 
          messages: [
            { role: "system", content: t.promptSystem },
            { role: "user", content: t.promptUser(text) }
          ]
        })
      });

      if (!response.ok) throw new Error("Erreur Groq");

      const data = await response.json();
      let content = data.choices[0].message.content;
      console.log("RÉPONSE IA:", content);

      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = content.substring(firstBrace, lastBrace + 1);
        setAnalysis(JSON.parse(jsonString));
      } else {
        throw new Error("No JSON found");
      }

    } catch (error) {
      console.error(error);
      alert("Error analysis.");
    } finally {
      setLoading(false);
    }
  };

  const t = translations[lang]; // Helper pour le rendu

  // --- RENDU ---
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 relative">
      
      {/* BOUTON LANGUE (En haut à droite) */}
      <button 
        onClick={toggleLang}
        className="absolute top-6 right-6 flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 transition-all font-bold"
      >
        <Globe size={18} />
        {lang === "en" ? "🇺🇸 English" : "🇫🇷 Français"}
      </button>

      <div className="absolute top-10 text-center">
        <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 mb-2">
          {t.title}
        </h1>
        <p className="text-gray-400">{t.subtitle}</p>
      </div>

      <div className="relative group mt-10">
        <div className={`absolute -inset-1 bg-gradient-to-r from-green-400 to-blue-600 rounded-full blur opacity-75 transition duration-1000 group-hover:opacity-100 ${isListening ? "animate-pulse" : ""}`}></div>
        <button
          onClick={toggleListening}
          className="relative w-40 h-40 bg-black rounded-full flex items-center justify-center border-4 border-slate-800 hover:scale-105 transition-all shadow-2xl z-10"
        >
          {isListening ? (
            <Square size={48} className="text-red-500 fill-red-500 animate-pulse" />
          ) : (
            <Mic size={48} className="text-white" />
          )}
        </button>
      </div>

      <p className="mt-8 text-xl font-light h-8 text-center max-w-2xl">
        {isListening ? t.listening : transcript ? t.finished : t.clickToSpeak}
      </p>

      {transcript && (
        <div className="mt-6 p-6 bg-white/10 backdrop-blur-md rounded-2xl max-w-2xl w-full border border-white/20 shadow-lg">
          <p className="text-gray-200 italic">"{transcript}"</p>
        </div>
      )}

      {loading && (
        <div className="mt-8 flex items-center gap-2 text-green-400">
          <Loader2 className="animate-spin" />
          <span>{t.analyzing}</span>
        </div>
      )}

      {analysis && !loading && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-green-500 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="text-green-400" />
              <h3 className="text-gray-400 uppercase text-sm font-bold">{t.scoreTitle}</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-white">{analysis.score}/10</span>
              <span className={`text-xl mb-1 ${analysis.sentiment === "Positif" || analysis.sentiment === "Positive" ? "text-green-400" : "text-red-400"}`}>
                {analysis.sentiment}
              </span>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-blue-500 shadow-xl">
             <h3 className="text-gray-400 uppercase text-sm font-bold mb-2">{t.summaryTitle}</h3>
             <p className="text-lg text-white">{analysis.summary}</p>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-purple-500 shadow-xl md:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-400 uppercase text-sm font-bold">{t.categoryTitle}</h3>
                <span className="inline-block bg-purple-900 text-purple-200 px-3 py-1 rounded-full text-sm mt-1">
                  {analysis.category}
                </span>
              </div>
              <div className="text-right">
                <h3 className="text-gray-400 uppercase text-sm font-bold">{t.actionTitle}</h3>
                <p className="text-white font-medium mt-1">{analysis.action_item}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2 text-xs text-green-500 opacity-70">
              <CheckCircle size={14} />
              <span>{t.sentMessage}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}