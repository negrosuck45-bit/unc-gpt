"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Settings, X, Loader, Globe, Send, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const LANGUAGES = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧" },
  { code: "es-ES", name: "Spanish", flag: "🇪🇸" },
  { code: "fr-FR", name: "French", flag: "🇫🇷" },
  { code: "de-DE", name: "German", flag: "🇩🇪" },
  { code: "it-IT", name: "Italian", flag: "🇮🇹" },
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
  { code: "zh-CN", name: "Chinese", flag: "🇨🇳" },
  { code: "ko-KR", name: "Korean", flag: "🇰🇷" },
];

function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function CameraTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [iosDevice, setIosDevice] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  // Detect iOS on mount
  useEffect(() => {
    setIosDevice(isIOS());
  }, []);

  // Initialize camera stream
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        setError("Camera access denied");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionConstructor) return;

      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript("");
        setError("");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        setInterimTranscript(interim);

        if (final.trim()) {
          handleUserMessage(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLanguage]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Capture and analyze
  const captureAndAnalyze = useCallback(async (userQuery: string) => {
    let imageData: string | null = null;

    if (canvasRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        imageData = canvas.toDataURL("image/jpeg", 0.5);
      }
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: userQuery,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsProcessing(true);
    setError("");

    try {
      const payload: any = {
        messages: [
          {
            role: "user",
            content: imageData
              ? [
                  { type: "text", text: userQuery },
                  { type: "image_url", image_url: { url: imageData } },
                ]
              : userQuery,
          },
        ],
        preferredProvider: "groq",
        preferredModel: "llama-3.2-11b-vision-instant",
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = sseBuffer.indexOf("\n\n")) !== -1) {
          const event = sseBuffer.slice(0, boundary);
          sseBuffer = sseBuffer.slice(boundary + 2);

          for (const line of event.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) fullContent += parsed.content;
            } catch (e) {}
          }
        }
      }

      if (!fullContent) throw new Error("No response");

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: fullContent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (voiceEnabled) {
        await speakText(fullContent, selectedLanguage);
      }
    } catch (err: any) {
      setError(err.message || "Error");
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, [voiceEnabled, selectedLanguage]);

  const handleUserMessage = useCallback(
    (text: string) => {
      if (text.trim()) {
        captureAndAnalyze(text);
      }
    },
    [captureAndAnalyze]
  );

  // Robust TTS
  const speakText = async (text: string, lang: string): Promise<void> => {
    if (!text || isSpeakingRef.current) return;

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    try {
      const cleanText = stripForSpeech(text);
      if (!cleanText) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        return;
      }

      // Try browser speech synthesis first
      try {
        const synth = window.speechSynthesis;
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.rate = 0.9;  // Slightly slower for clarity
        utterance.pitch = 0.95; // Slightly lower pitch for softness
        utterance.volume = 0.9; // Slightly lower volume for softness

        const voices = synth.getVoices();
        let selectedVoice = null;

        if (iosDevice) {
          selectedVoice = voices[0];
        } else {
          selectedVoice =
            voices.find(v => v.name.includes("Ava")) ||
            voices.find(v => v.name.includes("Amy")) ||
            voices.find(v => v.lang.startsWith(lang)) ||
            voices[0];
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        return new Promise<void>((resolve) => {
          utterance.onend = () => {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            resolve();
          };

          utterance.onerror = () => {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            resolve();
          };

          synth.speak(utterance);
        });
      } catch (err) {
      }

      // Fallback to remote TTS
      const ttsUrls = [
        `https://tts.travisvn.com/api/tts?text=${encodeURIComponent(cleanText.slice(0, 500))}`,
        `https://api.streamelements.com/kappa/v2/speech?text=${encodeURIComponent(cleanText.slice(0, 500))}`,
      ];

      for (const ttsUrl of ttsUrls) {
        try {
          const audio = new Audio(ttsUrl);
          audioRef.current = audio;

          return new Promise<void>((resolve) => {
            audio.onended = () => {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              resolve();
            };

            audio.onerror = () => {
              resolve();
            };

            audio.play().catch(() => {
              resolve();
            });
          });
        } catch (err) {}
      }

      setIsSpeaking(false);
      isSpeakingRef.current = false;
    } catch (err) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing) {
      try {
        recognitionRef.current.start();
      } catch (err) {
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && !isProcessing) {
      captureAndAnalyze(textInput);
      setTextInput("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden font-sans">
      {/* Full-screen video */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: cameraActive ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
          />
          <span className="text-white/90 text-xs font-medium tracking-wider uppercase">Live Vision</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9"
            onClick={() => setFacingMode(facingMode === "user" ? "environment" : "user")}
            title="Switch camera"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9"
            onClick={() => window.history.back()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat overlay */}
      <div className="absolute bottom-32 left-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 z-20 max-h-48 overflow-y-auto">
        <div className="space-y-3">
          {messages.slice(-3).map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-3 py-2 rounded-lg text-xs ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-white/90"
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Processing indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-20"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-10 w-10 border-2 border-white/20 border-t-white rounded-full"
              />
              <p className="text-white/90 text-xs font-medium tracking-widest uppercase">Processing</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-28 left-4 right-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 z-30 max-h-96 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-white text-sm font-semibold">Settings</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/50 hover:text-white h-6 w-6"
                onClick={() => setShowSettings(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/10">
              <span className="text-white text-xs font-medium">Voice Response</span>
              <Button
                variant="outline"
                size="sm"
                className={voiceEnabled ? "bg-white text-black border-white" : "text-white/50 border-white/10"}
                onClick={() => setVoiceEnabled(!voiceEnabled)}
              >
                {voiceEnabled ? "On" : "Off"}
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-white text-xs font-medium mb-2">
                <Globe className="h-3.5 w-3.5" />
                <span>Language</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedLanguage === lang.code
                        ? "bg-white text-black shadow-lg"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <span className="mr-1">{lang.flag}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-4 right-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 z-20"
          >
            <p className="text-red-200 text-xs">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interim Transcript */}
      <AnimatePresence>
        {interimTranscript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-20 left-0 right-0 px-8 text-center z-10"
          >
            <p className="text-white/60 text-sm italic font-medium tracking-tight">
              "{interimTranscript}..."
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 z-20 space-y-3">
        {/* Text input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder="Type your question..."
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
          />
          <Button
            size="icon"
            className="bg-white text-black hover:bg-white/90"
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isProcessing}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Voice controls */}
        <div className="flex items-center justify-center gap-8">
          <Button
            size="lg"
            className={`rounded-full h-16 w-16 transition-all duration-300 ${
              isListening
                ? "bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
          >
            {isListening ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>

          <Button
            size="lg"
            variant="ghost"
            className={`rounded-full h-16 w-16 border border-white/5 ${
              isSpeaking ? "text-white" : "text-white/20"
            }`}
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
              }
              window.speechSynthesis?.cancel();
              setIsSpeaking(false);
              isSpeakingRef.current = false;
            }}
            disabled={!isSpeaking}
          >
            {isSpeaking ? (
              <Volume2 className="h-6 w-6 animate-pulse" />
            ) : (
              <VolumeX className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Status text */}
      <div className="absolute bottom-28 left-0 right-0 text-center z-10">
        <span className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">
          {isListening ? "Listening" : isProcessing ? "Processing" : isSpeaking ? "Speaking" : "Ready"}
        </span>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
