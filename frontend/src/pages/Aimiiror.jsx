import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Brain,
  Heart,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";

const Aimirror = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState({
    emotion: "neutral",
    confidence: 0,
    face_detected: false,
  });
  const [speechAnalysis, setSpeechAnalysis] = useState(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [transcript, setTranscript] = useState("");

  // API Base URL
  const API_BASE = "http://localhost:8002";

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          analyzeSpeech(finalTranscript);
        }
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Start video stream
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVideoActive(true);
        startAnalyzing();
      }
    } catch (error) {
      console.error("Error starting video:", error);
      alert(
        "Unable to access camera. Please ensure camera permissions are granted."
      );
    }
  };

  // Stop video stream
  const stopVideo = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsVideoActive(false);
    setIsAnalyzing(false);
  };

  // Start/stop audio
  const toggleAudio = () => {
    if (!isAudioActive && recognition) {
      recognition.start();
      setIsAudioActive(true);
    } else if (recognition) {
      recognition.stop();
      setIsAudioActive(false);
    }
  };

  // Capture frame from video
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.8);
    });
  }, []);

  // Analyze frame for emotions
  const analyzeFrame = useCallback(async () => {
    if (!isVideoActive || !videoRef.current) return;

    try {
      const blob = await captureFrame();
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      const response = await fetch(`${API_BASE}/analyze-frame`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentEmotion(result);

        // Add to history
        setEmotionHistory((prev) => [
          ...prev.slice(-19),
          {
            ...result,
            timestamp: Date.now(),
          },
        ]);

        // Get AI feedback occasionally
        if (Math.random() < 0.1) {
          // 10% chance
          getAIFeedback(result.emotion, result.confidence);
        }
      }
    } catch (error) {
      console.error("Error analyzing frame:", error);
    }
  }, [isVideoActive, captureFrame]);

  // Analyze speech
  const analyzeSpeech = async (text) => {
    try {
      const response = await fetch(`${API_BASE}/analyze-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const result = await response.json();
        setSpeechAnalysis(result);
      }
    } catch (error) {
      console.error("Error analyzing speech:", error);
    }
  };

  // Get AI feedback
  const getAIFeedback = async (emotion, confidence, context = "") => {
    try {
      const response = await fetch(`${API_BASE}/get-ai-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emotion, confidence, context }),
      });

      if (response.ok) {
        const result = await response.json();
        setAiFeedback(result.feedback);
      }
    } catch (error) {
      console.error("Error getting AI feedback:", error);
    }
  };

  // Start analyzing frames
  const startAnalyzing = () => {
    setIsAnalyzing(true);
  };

  // Frame analysis loop
  useEffect(() => {
    let interval;
    if (isAnalyzing && isVideoActive) {
      interval = setInterval(analyzeFrame, 2000); // Analyze every 2 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing, isVideoActive, analyzeFrame]);

  // Get emotion color
  const getEmotionColor = (emotion) => {
    const colors = {
      happy: "text-green-500",
      sad: "text-blue-500",
      angry: "text-red-500",
      surprised: "text-yellow-500",
      fearful: "text-purple-500",
      neutral: "text-gray-500",
    };
    return colors[emotion] || "text-gray-500";
  };

  // Get emotion emoji
  const getEmotionEmoji = (emotion) => {
    const emojis = {
      happy: "😊",
      sad: "😢",
      angry: "😠",
      surprised: "😲",
      fearful: "😰",
      neutral: "😐",
    };
    return emojis[emotion] || "😐";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            AI Mirror
          </h1>
          <p className="text-gray-300">
            Real-Time Socio-Emotional Insight Engine
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Live Analysis
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={isVideoActive ? stopVideo : startVideo}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isVideoActive
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {isVideoActive ? (
                      <VideoOff className="w-4 h-4" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                    {isVideoActive ? "Stop" : "Start"}
                  </button>
                  <button
                    onClick={toggleAudio}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isAudioActive
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                    disabled={!recognition}
                  >
                    {isAudioActive ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    {isAudioActive ? "Stop Audio" : "Start Audio"}
                  </button>
                </div>
              </div>

              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Emotion Overlay */}
                {currentEmotion.face_detected && (
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">
                        {getEmotionEmoji(currentEmotion.emotion)}
                      </span>
                      <span
                        className={`font-semibold capitalize ${getEmotionColor(
                          currentEmotion.emotion
                        )}`}
                      >
                        {currentEmotion.emotion}
                      </span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2 w-20">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentEmotion.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300">
                      {Math.round(currentEmotion.confidence * 100)}% confidence
                    </span>
                  </div>
                )}

                {/* Analysis Status */}
                {isAnalyzing && (
                  <div className="absolute top-4 right-4 bg-green-500/20 backdrop-blur-sm rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs">Analyzing...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="space-y-6">
            {/* Current Analysis */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Current State
              </h3>

              <div className="space-y-4">
                {/* Facial Emotion */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">
                      Facial Emotion
                    </span>
                    <span
                      className={`font-semibold capitalize ${getEmotionColor(
                        currentEmotion.emotion
                      )}`}
                    >
                      {currentEmotion.emotion}
                    </span>
                  </div>
                  <div className="bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentEmotion.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {/* Speech Analysis */}
                {speechAnalysis && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-300">
                        Speech Sentiment
                      </span>
                      <span
                        className={`font-semibold capitalize ${
                          speechAnalysis.sentiment === "positive"
                            ? "text-green-500"
                            : speechAnalysis.sentiment === "negative"
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        {speechAnalysis.sentiment}
                      </span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          speechAnalysis.sentiment === "positive"
                            ? "bg-green-500"
                            : speechAnalysis.sentiment === "negative"
                            ? "bg-red-500"
                            : "bg-gray-500"
                        }`}
                        style={{ width: `${speechAnalysis.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Feedback */}
            {aiFeedback && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  AI Feedback
                </h3>
                <p className="text-gray-300 leading-relaxed">{aiFeedback}</p>
              </div>
            )}

            {/* Emotion Trends */}
            {emotionHistory.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Emotions
                </h3>
                <div className="space-y-2">
                  {emotionHistory
                    .slice(-5)
                    .reverse()
                    .map((emotion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>{getEmotionEmoji(emotion.emotion)}</span>
                          <span className="capitalize">{emotion.emotion}</span>
                        </div>
                        <span className="text-gray-400">
                          {Math.round(emotion.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Recent Speech
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {transcript}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <div className="text-2xl font-bold">{emotionHistory.length}</div>
            <div className="text-sm text-gray-300">Analyses Completed</div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 text-center">
            <Brain className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold">
              {currentEmotion.face_detected ? "Active" : "Waiting"}
            </div>
            <div className="text-sm text-gray-300">Face Detection</div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <div className="text-2xl font-bold">Real-time</div>
            <div className="text-sm text-gray-300">Processing</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aimirror;
