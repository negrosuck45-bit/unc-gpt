"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Check, Trash2, Wand2, LogOut, Settings, Shield, ShieldCheck, Loader2, Bug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface FeedbackItem {
  id: string;
  reason: string;
  messageId: string;
  timestamp: number;
  fixed?: boolean;
  fixContent?: string;
}

const supabase = createClient();

export default function FeedbackPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isFixing, setIsFixing] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load feedback from Supabase
  const loadFeedback = useCallback(async () => {
    console.log('[FeedbackPage] Loading from Supabase...');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('type', 'dislike')
        .eq('dismissed', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[FeedbackPage] Supabase error:', error);
        setFeedbackItems([]);
        return;
      }

      console.log('[FeedbackPage] Supabase data:', data);

      const items: FeedbackItem[] = (data || []).map((f: any) => ({
        id: f.id,
        reason: f.reason || f.content?.slice(0, 500) + (f.content?.length > 500 ? '...' : '') || 'No reason provided',
        messageId: f.message_id,
        timestamp: new Date(f.created_at).getTime(),
        fixed: false,
      }));

      console.log('[FeedbackPage] Mapped items:', items.length);
      setFeedbackItems(items);
    } catch (err) {
      console.error('[FeedbackPage] Exception:', err);
      setFeedbackItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedback();

    const auth = localStorage.getItem("feedback_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }

    const setup = localStorage.getItem("feedback_setup");
    if (setup === "true") {
      setIsSetup(true);
    }
  }, [loadFeedback]);

  // Dismiss feedback - deletes from Supabase
  const dismissFeedback = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('message_feedback')
        .update({ dismissed: true })
        .eq('id', itemId);

      if (error) {
        console.error('[FeedbackPage] Error dismissing:', error);
        return;
      }

      setFeedbackItems((prev) => prev.filter((f) => f.id !== itemId));
    } catch (err) {
      console.error('[FeedbackPage] Dismiss exception:', err);
    }
  };

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize camera for face detection
  useEffect(() => {
    if (!isAuthenticated || !isSetup) {
      const startCamera = async () => {
        try {
          setCameraError(null);
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        } catch (err: any) {
          console.error("Camera error:", err);
          setCameraError(err.message || "Could not access camera");
        }
      };

      startCamera();

      return () => {
        stopCamera();
      };
    }
  }, [isAuthenticated, isSetup, stopCamera]);

  // Face detection using canvas - with proper mirroring to match video
  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!videoRef.current.videoWidth) {
      setCameraError("Camera not ready yet. Please wait a moment and try again.");
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setCameraError(null);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 5, 90));
      }, 100);

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      // Flip canvas horizontally to match the mirrored video
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let skinPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
          skinPixels++;
        }
      }

      const skinRatio = skinPixels / (canvas.width * canvas.height);
      const faceDetected = skinRatio > 0.05;

      clearInterval(progressInterval);
      setScanProgress(100);
      setIsFaceDetected(faceDetected);

      if (faceDetected) {
        localStorage.setItem("feedback_auth", "true");
        setIsAuthenticated(true);
        localStorage.setItem("feedback_setup", "true");
        setIsSetup(true);

        setTimeout(() => {
          stopCamera();
        }, 500);
      } else {
        setCameraError("No face detected. Please make sure your face is clearly visible and well-lit.");
      }
    } catch (err: any) {
      setCameraError(err.message || "Error during face scan");
    } finally {
      setIsScanning(false);
    }
  };

  // Fix issue using Claude
  const fixIssue = async (itemId: string) => {
    const item = feedbackItems.find((f) => f.id === itemId);
    if (!item) return;

    setIsFixing(itemId);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `User feedback: "${item.reason}". Please provide a detailed fix or improvement suggestion for this issue.`,
            },
          ],
          preferredProvider: "puter",
          preferredModel: "claude-opus",
        }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        if (reader) {
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

          setFeedbackItems((prev) =>
            prev.map((f) =>
              f.id === itemId
                ? { ...f, fixed: true, fixContent: fullContent }
                : f
            )
          );

          alert(`Fix suggestion:\n\n${fullContent}`);
        }
      }
    } catch (err) {
      alert("Error generating fix suggestion");
    } finally {
      setIsFixing(null);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("feedback_auth");
    localStorage.removeItem("feedback_setup");
    setIsAuthenticated(false);
    setIsSetup(false);
    setIsFaceDetected(false);
    stopCamera();
  };

  // Debug: add test feedback directly to Supabase
  const addTestFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('message_feedback')
        .insert({
          message_id: `test-${Date.now()}`,
          type: 'dislike',
          content: 'Test content',
          reason: 'This is a test feedback item to verify Supabase is working.',
          issue_type: 'Other',
          dismissed: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[FeedbackPage] Test insert error:', error);
        return;
      }

      console.log('[FeedbackPage] Test item inserted:', data);
      loadFeedback();
    } catch (err) {
      console.error('[FeedbackPage] Test exception:', err);
    }
  };

  // ============ AUTH / SETUP PHASE ============
  if (!isSetup || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-4xl"
        >
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            {/* Two column layout: Camera on RIGHT */}
            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">

              {/* RIGHT SIDE: Camera */}
              <div className="w-full md:w-1/2 flex flex-col items-center space-y-4">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {isFaceDetected && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 border-2 border-green-500 rounded-xl"
                    />
                  )}

                  {isScanning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/30 flex items-center justify-center"
                    >
                      <div className="text-center space-y-2">
                        <Loader2 className="h-8 w-8 text-white animate-spin mx-auto" />
                        <p className="text-sm text-white font-medium">Scanning...</p>
                        <div className="w-32 h-1 bg-white/20 rounded-full mx-auto overflow-hidden">
                          <motion.div 
                            className="h-full bg-white rounded-full"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-32 h-32 border-2 border-dashed border-white/20 rounded-full"
                      />
                    </div>
                  )}

                  {cameraError && !isScanning && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-0 left-0 right-0 bg-red-500/90 backdrop-blur-sm p-3"
                    >
                      <p className="text-xs text-white text-center">{cameraError}</p>
                    </motion.div>
                  )}
                </div>

                <Button
                  onClick={detectFace}
                  disabled={isScanning || !!cameraError?.includes("not ready")}
                  className="w-full bg-white text-black hover:bg-white/90 h-11 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      {!isSetup ? "Start Face Recognition Setup" : "Verify Face"}
                    </>
                  )}
                </Button>

                {isFaceDetected && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center w-full"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-400" />
                      <p className="text-sm text-green-200 font-medium">
                        Face recognized! Access granted...
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* LEFT SIDE: Info text */}
              <div className="w-full md:w-1/2 space-y-6">
                <div className="text-center md:text-left space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto md:mx-0 mb-3 border border-white/10">
                    <Shield className="h-6 w-6 text-white/70" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">
                    {!isSetup ? "Feedback Setup" : "Authentication Required"}
                  </h1>
                  <p className="text-sm text-white/60">
                    {!isSetup 
                      ? "Set up face recognition for secure feedback access" 
                      : "Please verify your identity to access feedback"}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                      <span className="text-xs text-white/50">1</span>
                    </div>
                    <p className="text-sm text-white/50">Position your face in the camera frame on the right</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                      <span className="text-xs text-white/50">2</span>
                    </div>
                    <p className="text-sm text-white/50">Click the button to start face recognition</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                      <span className="text-xs text-white/50">3</span>
                    </div>
                    <p className="text-sm text-white/50">Access will be granted automatically upon verification</p>
                  </div>
                </div>

                <p className="text-xs text-white/30">
                  Camera data is processed locally and never uploaded to any server.
                </p>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ MAIN FEEDBACK PAGE ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Feedback Center</h1>
            <p className="text-xs text-white/50 mt-1">
              {feedbackItems.length} item{feedbackItems.length !== 1 ? "s" : ""} pending
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white"
              onClick={loadFeedback}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white"
              onClick={addTestFeedback}
            >
              <Bug className="h-4 w-4 mr-1" />
              Add Test
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-b border-white/10 bg-black/40 backdrop-blur-md"
          >
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
              <p className="text-sm text-white/70">
                Authenticated as: <span className="text-white font-medium">Admin User</span>
              </p>
              <p className="text-xs text-white/40">
                Face recognition is active. Click logout to re-authenticate.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 text-white/40 animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading feedback...</p>
          </div>
        ) : feedbackItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-white/40" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">All Caught Up!</h2>
            <p className="text-white/60">No feedback items to review</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {feedbackItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "p-4 rounded-xl border backdrop-blur-sm transition-all",
                  item.fixed
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-white">
                        {item.fixed ? "✓ Fixed" : "Feedback"}
                      </p>
                      <span className="text-xs text-white/50">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-white/80 break-words whitespace-pre-wrap">{item.reason}</p>

                    {item.fixContent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10"
                      >
                        <p className="text-xs text-green-400 font-medium mb-1">Fix Suggestion:</p>
                        <p className="text-sm text-white/70 whitespace-pre-wrap">{item.fixContent}</p>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!item.fixed && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        onClick={() => fixIssue(item.id)}
                        disabled={isFixing === item.id}
                      >
                        {isFixing === item.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Fixing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-3.5 w-3.5" />
                            Fix
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-white/70 border-white/20 hover:text-white hover:border-white/40 gap-1"
                      onClick={() => dismissFeedback(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}