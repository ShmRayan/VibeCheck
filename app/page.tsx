"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, CheckCircle, BarChart3, Globe, Volume2, FileText, Bug } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

const translations = {
  en: {
    title: "VibeCheck",
    subtitle: "Conversational Feedback AI",
    listening: "Listening...",
    analyzing: "AI is analyzing & formulating a response...",
    clickToSpeak: "Click to speak",
    finished: "Analysis complete.",
    scoreTitle: "Sentiment Score",
    voiceTitle: "AI Voice Response",
    summaryTitle: "Executive Summary",
    categoryTitle: "Category",
    actionTitle: "Recommended Action",
    sentMessage: "Data synced with SurveyMonkey (Webhook)",
    promptSystem: "You are an empathy engine. Reply ONLY in JSON.",
    promptUser: (text: string) => `Analyze this feedback: "${text}".
      Return a JSON object in ENGLISH:
      {
        "summary": "One concise sentence summarizing the feedback",
        "sentiment": "Positive" or "Neutral" or "Negative",
        "score": number (1-10),
        "category": "Service" or "Product" or "Pricing",
        "action_item": "Recommended action",
        "voice_response": "A short, empathetic, direct sentence (max 15 words) to say back to the user."
      }`
  },
  fr: {
    title: "VibeCheck",
    subtitle: "IA de Feedback Conversationnelle",
    listening: "Je vous écoute...",
    analyzing: "L'IA analyse et prépare une réponse...",
    clickToSpeak: "Cliquez pour parler",
    finished: "Analyse terminée.",
    scoreTitle: "Score Sentiment",
    voiceTitle: "Réponse Vocale IA",
    summaryTitle: "Résumé Exécutif",
    categoryTitle: "Catégorie",
    actionTitle: "Action Recommandée",
    sentMessage: "Données synchronisées avec SurveyMonkey (Webhook)",
    promptSystem: "Tu es un moteur d'empathie. Réponds UNIQUEMENT en JSON.",
    promptUser: (text: string) => `Analyse ce feedback : "${text}".
      Retourne un JSON en FRANÇAIS :
      {
        "summary": "Une phrase concise résumant le feedback",
        "sentiment": "Positif" ou "Neutre" ou "Négatif",
        "score": chiffre (1-10),
        "category": "Service" ou "Produit" ou "Prix",
        "action_item": "Action recommandée",
        "voice_response": "Une phrase courte, empathique et directe (max 15 mots) à dire oralement à l'utilisateur."
      }`
  }
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "fr">("en"); 
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    Sentry.setUser({ email: "judge@uottahack.com", id: "judge-001" });

    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
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

  useEffect(() => {
    if (recognitionRef.current) recognitionRef.current.lang = lang === "en" ? "en-US" : "fr-FR";
    Sentry.addBreadcrumb({
      category: "ui",
      message: `Language changed to ${lang}`,
      level: "info",
    });
  }, [lang]);

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "en" ? "en-US" : "fr-FR";
      utterance.rate = 1.0; 
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      Sentry.addBreadcrumb({ category: "user-action", message: "Stop Listening", level: "info" });
      analyzeFeedback(transcript);
    } else {
      setTranscript("");
      setAnalysis(null);
      window.speechSynthesis.cancel(); 
      recognitionRef.current?.start();
      setIsListening(true);
      Sentry.addBreadcrumb({ category: "user-action", message: "Start Listening", level: "info" });
    }
  };

  const toggleLang = () => {
    setLang((prev) => (prev === "en" ? "fr" : "en"));
    setAnalysis(null);
    setTranscript("");
  };

  const analyzeFeedback = async (text: string) => {
    if (!text) return;
    setLoading(true);

    Sentry.setContext("AI Context", {
      user_transcript: text,
      current_language: lang
    });

    try {
      const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
      const t = translations[lang];

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
        const jsonResult = JSON.parse(jsonString);
        
        setAnalysis(jsonResult);

        if (jsonResult.voice_response) {
            speakResponse(jsonResult.voice_response);
        }

        fetch("https://webhook.site/f5fb9dc2-e0b3-44eb-9b93-7e5fa36a4c26", {
            method: "POST",
            mode: 'no-cors',
            headers: { "Content-Type": "application/json" },
            body: jsonString
        });

      } else {
        throw new Error("No JSON found");
      }

    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
      alert("Error analysis.");
    } finally {
      setLoading(false);
    }
  };

  const triggerSentryError = () => {
    try {
      throw new Error("Sentry Test Error: AI Module Failed to Load");
    } catch (error) {
      const eventId = Sentry.captureException(error);
      const dialogOptions = lang === "en" ? {
        title: "Oops! VibeCheck Crashed",
        subtitle: "Our dev team has been notified. Please tell us what happened:",
        subtitle2: "",
        labelName: "Name",
        labelEmail: "Email",
        labelComments: "What happened?",
        labelSubmit: "Submit Report",
        errorGeneric: "An unknown error occurred while submitting your report. Please try again.",
        errorFormEntry: "Some fields were invalid. Please correct the errors and try again.",
        successMessage: "Your feedback has been sent. Thank you!"
      } : {
        title: "Oups ! VibeCheck a planté",
        subtitle: "Notre équipe a été notifiée. Dites-nous ce qu'il s'est passé :",
        subtitle2: "",
        labelName: "Nom",
        labelEmail: "Email",
        labelComments: "Que s'est-il passé ?",
        labelSubmit: "Envoyer le rapport",
        errorGeneric: "Une erreur inconnue est survenue.",
        errorFormEntry: "Veuillez corriger les erreurs.",
        successMessage: "Votre rapport a été envoyé. Merci !"
      };

      Sentry.showReportDialog({ 
        eventId: eventId, 
        ...dialogOptions 
      });
    }
  };

  const getColorStatus = (sentiment: string) => {
    if (!sentiment) return { color: "text-gray-400", border: "border-gray-500" };
    const s = sentiment.toLowerCase();
    if (s.includes("positi")) return { color: "text-green-400", border: "border-green-500" };
    if (s.includes("négati") || s.includes("negati")) return { color: "text-red-500", border: "border-red-500" };
    return { color: "text-blue-400", border: "border-blue-500" }; 
  };

  const t = translations[lang];
  const status = analysis ? getColorStatus(analysis.sentiment) : { color: "", border: "" };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 relative">
      
      <button 
        onClick={toggleLang}
        className="absolute top-6 right-6 flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 transition-all font-bold z-50"
      >
        <Globe size={18} />
        {lang === "en" ? "🇺🇸 English" : "🇫🇷 Français"}
      </button>

      <div className="absolute top-10 text-center">
        <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 mb-2">
          {t.title}
        </h1>
        <p className="text-gray-400 tracking-widest uppercase text-sm font-semibold">{t.subtitle}</p>
      </div>

      <div className="relative group mt-10">
        <div className={`absolute -inset-1 bg-gradient-to-r from-green-400 to-blue-600 rounded-full blur opacity-75 transition duration-1000 group-hover:opacity-100 ${isListening ? "animate-pulse" : ""}`}></div>
        <button
          onClick={toggleListening}
          className={`relative w-40 h-40 bg-black rounded-full flex items-center justify-center border-4 hover:scale-105 transition-all shadow-2xl z-10 ${isListening ? "border-red-500" : "border-slate-800"}`}
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
          
          {/* 1. SCORE */}
          <div className={`bg-slate-800 p-6 rounded-xl border-l-4 shadow-xl ${status.border} flex flex-col justify-between`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className={status.color} />
              <h3 className="text-gray-400 uppercase text-sm font-bold">{t.scoreTitle}</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-white">{analysis.score}/10</span>
              <span className={`text-xl mb-1 font-bold ${status.color}`}>
                {analysis.sentiment}
              </span>
            </div>
          </div>

          {/* 2. RÉPONSE VOCALE (JARVIS) */}
          <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-gray-500 shadow-xl">
             <div className="flex items-center gap-2 mb-2">
                <Volume2 className="text-blue-400" size={20} />
                <h3 className="text-gray-400 uppercase text-sm font-bold">{t.voiceTitle}</h3>
             </div>
             <p className="text-lg text-white italic">"{analysis.voice_response}"</p>
          </div>

          {/* 3. RÉSUMÉ EXÉCUTIF */}
          <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-blue-500 shadow-xl md:col-span-2">
             <div className="flex items-center gap-2 mb-2">
                <FileText className="text-blue-300" size={20} />
                <h3 className="text-gray-400 uppercase text-sm font-bold">{t.summaryTitle}</h3>
             </div>
             <p className="text-lg text-white">{analysis.summary}</p>
          </div>

          {/* 4. CATÉGORIE & ACTION */}
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

      {/* BOUTON SENTRY FINAL */}
      <button 
        onClick={triggerSentryError} 
        className="fixed bottom-6 left-6 z-[9999] flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 border border-white/10 hover:border-red-500/50 rounded-full transition-all duration-300 text-xs font-medium backdrop-blur-md cursor-pointer"
        title="Trigger Sentry Error"
      >
        <Bug size={14} />
        <span>Debug Mode</span>
      </button>

    </main>
  );
}