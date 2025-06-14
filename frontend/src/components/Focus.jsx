import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../utils/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import Navbar from './Navbar';

const FocusTracker = () => {
  // Timer States
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // work, shortBreak, longBreak
  const [cycleCount, setCycleCount] = useState(0);
  const [customWorkTime, setCustomWorkTime] = useState(25); // Custom work time in minutes
  const [customBreakTime, setCustomBreakTime] = useState(5); // Custom break time in minutes
  
  // Focus Detection States
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [focusLevel, setFocusLevel] = useState(100);
  const [gazeDetected, setGazeDetected] = useState(true);
  const [idleTime, setIdleTime] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);
  
  // Eye Tracking States
  const [eyesClosed, setEyesClosed] = useState(false);
  const [eyesClosedTime, setEyesClosedTime] = useState(0);
  const [eyesBlinkedCount, setEyesBlinkedCount] = useState(0);
  const [eyeClosureXpThreshold, setEyeClosureXpThreshold] = useState(3); // Seconds needed for XP gain
  const [xpPerEyeClosureInterval, setXpPerEyeClosureInterval] = useState(2); // XP per threshold interval
  const eyesClosedRef = useRef(0);
  const eyesBlinkedCounterRef = useRef(0);
  const eyesClosedTimerRef = useRef(null);
  
  // Recommendation States
  const [recommendations, setRecommendations] = useState([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // Gamification States
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false);
  
  // User Auth
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const faceModelRef = useRef(null);
  const animationRef = useRef(null);
  
  // Initialize Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        const result = await signInAnonymously(auth);
        setUser(result.user);
        await loadUserData(result.user.uid);
      } catch (error) {
        console.error('Auth error:', error);
      }
    };
    initAuth();
  }, []);

  // Fetch personalized recommendations using Groq API
  const fetchRecommendations = async () => {
    setIsLoadingRecommendations(true);
    try {
      const response = await fetch('http://localhost:8000/focus-tips');
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      const data = await response.json();
      setRecommendations(data.tips || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Fallback recommendations
      setRecommendations([
        {
          title: "20-20-20 Rule",
          description: "Every 20 minutes, look at something 20 feet away for 20 seconds.",
          duration_minutes: 1
        },
        {
          title: "Deep Breathing",
          description: "Take 3 deep breaths to reset your focus when distracted.",
          duration_minutes: 1
        }
      ]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Apply custom time settings
  const applyCustomTimeSettings = () => {
    if (mode === 'work') {
      setMinutes(customWorkTime);
    } else {
      setMinutes(customBreakTime);
    }
    setSeconds(0);
    saveUserData();
  };

  // Handle timer mode change
  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'work') {
      setMinutes(customWorkTime);
    } else if (newMode === 'shortBreak') {
      setMinutes(customBreakTime);
    } else if (newMode === 'longBreak') {
      setMinutes(customBreakTime * 2);
    }
    setSeconds(0);
  };

  // Load user data from Firebase
  const loadUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setXp(data.xp || 0);
        setLevel(data.level || 1);
        setStreak(data.streak || 0);
        setCustomWorkTime(data.customWorkTime || 25);
        setCustomBreakTime(data.customBreakTime || 5);
      }
      // Fetch recommendations after loading user data
      fetchRecommendations();
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Save user data to Firebase
  const saveUserData = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        xp,
        level,
        streak,
        customWorkTime,
        customBreakTime,
        lastSession: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  // Initialize webcam and face detection
  useEffect(() => {
    const initializeWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsWebcamActive(true);
          loadFaceDetection();
        }
      } catch (error) {
        console.error('Webcam access denied:', error);
      }
    };

    if (isRunning) {
      initializeWebcam();
    }

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);

  // Load face detection model
  const loadFaceDetection = async () => {
    // Check if TensorFlow.js and face-landmarks-detection are already loaded
    if (window.faceLandmarksDetection) {
      const loadedModel = await loadFaceLandmarkDetectionModel();
      faceModelRef.current = loadedModel;
      renderPrediction(loadedModel);
      return;
    }
    
    try {
      // Load TensorFlow.js and face-landmarks-detection scripts
      const scripts = [
        'https://unpkg.com/@tensorflow/tfjs-core@2.4.0/dist/tf-core.js',
        'https://unpkg.com/@tensorflow/tfjs-converter@2.4.0/dist/tf-converter.js',
        'https://unpkg.com/@tensorflow/tfjs-backend-webgl@2.4.0/dist/tf-backend-webgl.js',
        'https://unpkg.com/@tensorflow-models/face-landmarks-detection@0.0.1/dist/face-landmarks-detection.js'
      ];

      for (const src of scripts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const loadedModel = await loadFaceLandmarkDetectionModel();
      faceModelRef.current = loadedModel;
      renderPrediction(loadedModel);
    } catch (error) {
      console.error('Error loading face detection:', error);
    }
  };

  const loadFaceLandmarkDetectionModel = async () => {
    return window.faceLandmarksDetection.load(
      window.faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: 1 }
    );
  };

  // Face detection for gaze tracking and eye state detection
  const renderPrediction = async (currentModel) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!currentModel || !video || !canvas) return;
    
    try {
      const predictions = await currentModel.estimateFaces({ input: video });
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        video, 0, 0, video.width, video.height,
        0, 0, canvas.width, canvas.height
      );
      
      detectFacesAndEyes(predictions, ctx);
      
      animationRef.current = requestAnimationFrame(() => renderPrediction(currentModel));
    } catch (error) {
      console.error('Error in prediction:', error);
      animationRef.current = requestAnimationFrame(() => renderPrediction(currentModel));
    }
  };

  // Combined face and eye detection
  const detectFacesAndEyes = (predictions, ctx) => {
    if (predictions.length > 0) {
      // Face is detected
      setGazeDetected(true);
      setFocusLevel(prev => Math.min(100, prev + 2));
      
      // Eye detection
      predictions.forEach(prediction => {
        const rightEyeUpper0 = prediction.annotations.rightEyeUpper0;
        const rightEyeLower0 = prediction.annotations.rightEyeLower0;
        const leftEyeUpper0 = prediction.annotations.leftEyeUpper0;
        const leftEyeLower0 = prediction.annotations.leftEyeLower0;
        
        // Draw eye landmarks
        ctx.fillStyle = "red";
        const eyeOutlinePoints = rightEyeUpper0.concat(rightEyeLower0, leftEyeUpper0, leftEyeLower0);
        eyeOutlinePoints.forEach(point => {
          ctx.beginPath();
          ctx.rect(point[0], point[1], 2, 2);
          ctx.fill();
        });
        
        // Calculate eye openness
        let rightEyeCenterPointDistance = Math.abs(rightEyeUpper0[3][1] - rightEyeLower0[4][1]);
        let leftEyeCenterPointDistance = Math.abs(leftEyeUpper0[3][1] - leftEyeLower0[4][1]);
        
        // Check if eyes are closed
        if (rightEyeCenterPointDistance < 7 || leftEyeCenterPointDistance < 7) {
          if (eyesClosedRef.current === 0) {
            // Eyes just closed, start timer
            startEyesClosedTimer();
            setEyesClosed(true);
          }
          eyesClosedRef.current = 1;
        } else {
          // Eyes are open
          if (eyesClosedRef.current === 1) {
            eyesBlinkedCounterRef.current++;
            setEyesBlinkedCount(eyesBlinkedCounterRef.current);
            
            // Check if eyes were closed for a significant time (more than threshold seconds)
            if (eyesClosedTime >= eyeClosureXpThreshold) {
              // Award XP for taking an eye break
              const earnedXP = Math.min(Math.floor(eyesClosedTime / eyeClosureXpThreshold) * xpPerEyeClosureInterval, 10); // Cap at 10 XP
              setXp(prev => prev + earnedXP);
              saveUserData();
            }
            
            // Reset eyes closed timer
            resetEyesClosedTimer();
            setEyesClosed(false);
          }
          eyesClosedRef.current = 0;
        }
      });
    } else {
      // No face detected
      setGazeDetected(false);
      setFocusLevel(prev => Math.max(0, prev - 5));
      setDistractionCount(prev => prev + 1);
    }
  };

  // Start timer for eyes closed duration
  const startEyesClosedTimer = () => {
    setEyesClosedTime(0);
    eyesClosedTimerRef.current = setInterval(() => {
      setEyesClosedTime(prev => prev + 1);
    }, 1000);
  };

  // Reset timer for eyes closed duration
  const resetEyesClosedTimer = () => {
    if (eyesClosedTimerRef.current) {
      clearInterval(eyesClosedTimerRef.current);
      eyesClosedTimerRef.current = null;
    }
    setEyesClosedTime(0);
  };

  // Idle detection
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      setIdleTime(0);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, []);

  // Idle timer
  useEffect(() => {
    if (isRunning) {
      idleTimerRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceActivity = Math.floor((now - lastActivityRef.current) / 1000);
        setIdleTime(timeSinceActivity);
        
        if (timeSinceActivity > 30) {
          setFocusLevel(prev => Math.max(0, prev - 3));
        }
      }, 1000);
    }

    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [isRunning]);

  // Main timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev === 0) {
            if (minutes === 0) {
              handleTimerComplete();
              return 0;
            }
            setMinutes(m => m - 1);
            return 59;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, minutes]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    setSessionComplete(true);
    
    if (mode === 'work') {
      const newCycleCount = cycleCount + 1;
      setCycleCount(newCycleCount);
      
      // Award XP based on focus quality
      const focusBonus = Math.floor(focusLevel / 10);
      const baseXP = 50;
      const earnedXP = baseXP + focusBonus - Math.floor(distractionCount / 2);
      
      setXp(prev => prev + earnedXP);
      setStreak(prev => prev + 1);
      
      // Level up check
      const newLevel = Math.floor(xp / 1000) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
      }
      
      // Save session data
      saveSessionData(earnedXP);
      
      // Determine next mode
      if (newCycleCount % 4 === 0) {
        setMode('longBreak');
        setMinutes(15);
      } else {
        setMode('shortBreak');
        setMinutes(5);
      }
      
      setShowBreakSuggestion(true);
    } else {
      setMode('work');
      setMinutes(25);
      setShowBreakSuggestion(false);
    }
    
    setSeconds(0);
    setFocusLevel(100);
    setDistractionCount(0);
    setIdleTime(0);
  };

  const saveSessionData = async (earnedXP) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        date: new Date().toISOString(),
        duration: 25,
        focusLevel,
        distractionCount,
        eyesBlinkedCount,
        xpEarned: earnedXP,
        mode
      });
      
      await saveUserData();
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    setSessionComplete(false);
    lastActivityRef.current = Date.now();
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSessionComplete(false);
    setMinutes(mode === 'work' ? 25 : mode === 'shortBreak' ? 5 : 15);
    setSeconds(0);
    setFocusLevel(100);
    setDistractionCount(0);
    setIdleTime(0);
  };

  const formatTime = (m, s) => {
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getFocusColor = () => {
    if (focusLevel >= 80) return 'text-green-500';
    if (focusLevel >= 60) return 'text-yellow-500';
    if (focusLevel >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBreakSuggestion = () => {
    const suggestions = [
      "Take a 5-minute walk outside 🚶‍♂️",
      "Do some deep breathing exercises 🧘‍♀️",
      "Stretch your neck and shoulders 🤸‍♂️",
      "Drink a glass of water 💧",
      "Look at something 20 feet away for 20 seconds 👁️",
      "Do 10 jumping jacks 🏃‍♂️"
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          🧠 AI Focus Tracker
        </h1>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-center">
            <h3 className="text-sm font-semibold text-blue-300">Level</h3>
            <p className="text-2xl font-bold text-blue-400">{level}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-center">
            <h3 className="text-sm font-semibold text-green-300">XP</h3>
            <p className="text-2xl font-bold text-green-400">{xp}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-center">
            <h3 className="text-sm font-semibold text-orange-300">Streak</h3>
            <p className="text-2xl font-bold text-orange-400">{streak}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-center">
            <h3 className="text-sm font-semibold text-purple-300">Cycles</h3>
            <p className="text-2xl font-bold text-purple-400">{cycleCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timer Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 capitalize">
              {mode === 'work' ? '⏱️ Work Session' : 
               mode === 'shortBreak' ? '☕ Short Break' : '🛋️ Long Break'}
            </h2>
            
            <div className="text-6xl font-mono font-bold mb-6">
              {formatTime(minutes, seconds)}
            </div>

            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={startTimer}
                disabled={isRunning}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-2 rounded-lg font-semibold"
              >
                Start
              </button>
              <button
                onClick={pauseTimer}
                disabled={!isRunning}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 px-6 py-2 rounded-lg font-semibold"
              >
                Pause
              </button>
              <button
                onClick={resetTimer}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-semibold"
              >
                Reset
              </button>
            </div>

            {/* Focus Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-300">Focus Level</h4>
                <p className={`text-xl font-bold ${getFocusColor()}`}>
                  {focusLevel}%
                </p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-300">Idle Time</h4>
                <p className="text-xl font-bold text-gray-300">{idleTime}s</p>
              </div>
            </div>
          </div>

          {/* Focus Detection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-center">
              👁️ Focus Detection
            </h2>

            {/* Webcam Feed */}
            <div className="relative mb-4">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-48 bg-black rounded-lg object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-48"
              />
              
              {/* Status Indicators */}
              <div className="absolute top-2 left-2 flex gap-2">
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  isWebcamActive ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  📹 {isWebcamActive ? 'Active' : 'Inactive'}
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  gazeDetected ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  👀 {gazeDetected ? 'Focused' : 'Distracted'}
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  eyesClosed ? 'bg-yellow-500' : 'bg-green-500'
                }`}>
                  👁️ {eyesClosed ? `Closed (${eyesClosedTime}s)` : 'Open'}
                </div>
              </div>
            </div>

            {/* Eye Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-black/20 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-300">Blinks</h4>
                <p className="text-xl font-bold text-blue-400">{eyesBlinkedCount}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-300">Eye Breaks</h4>
                <p className="text-xl font-bold text-green-400">{Math.floor(eyesBlinkedCount / 10)}</p>
              </div>
            </div>

            {/* Eye Break Settings */}
            <div className="bg-black/20 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">Eye Break Settings</h4>
              <div className="flex flex-col space-y-3">
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Seconds for XP gain: {eyeClosureXpThreshold}s</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={eyeClosureXpThreshold} 
                    onChange={(e) => setEyeClosureXpThreshold(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1">XP per interval: {xpPerEyeClosureInterval} XP</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={xpPerEyeClosureInterval} 
                    onChange={(e) => setXpPerEyeClosureInterval(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Custom Time Settings */}
            <div className="bg-black/20 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">Custom Time Settings</h4>
              <div className="flex flex-col space-y-3">
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Work Time: {customWorkTime} minutes</label>
                  <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    step="5"
                    value={customWorkTime} 
                    onChange={(e) => setCustomWorkTime(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Break Time: {customBreakTime} minutes</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    value={customBreakTime} 
                    onChange={(e) => setCustomBreakTime(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <button 
                  onClick={applyCustomTimeSettings}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded text-sm font-semibold"
                >
                  Apply Settings
                </button>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-black/20 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-blue-300">AI Recommendations</h4>
                <button 
                  onClick={fetchRecommendations}
                  className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs font-semibold flex items-center"
                  disabled={isLoadingRecommendations}
                >
                  {isLoadingRecommendations ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {recommendations.length > 0 ? (
                <div className="space-y-2">
                  {recommendations.map((tip, index) => (
                    <div key={index} className="bg-black/30 p-2 rounded">
                      <h5 className="text-sm font-semibold text-yellow-300">{tip.title}</h5>
                      <p className="text-xs text-gray-300">{tip.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Duration: {tip.duration_minutes} min</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No recommendations available. Click refresh to get personalized tips.</p>
              )}
            </div>

            {/* Alerts */}
            {distractionCount > 0 && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">
                  ⚠️ {distractionCount} distractions detected
                </p>
              </div>
            )}

            {idleTime > 30 && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3 mb-4">
                <p className="text-yellow-300 text-sm">
                  💤 You've been idle for {idleTime} seconds
                </p>
              </div>
            )}

            {eyesClosedTime >= 20 && (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-4">
                <p className="text-green-300 text-sm">
                  ✅ Great job! You've been resting your eyes for {eyesClosedTime} seconds
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Break Suggestion Modal */}
        {showBreakSuggestion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 max-w-md mx-4 text-center">
              <h2 className="text-2xl font-bold mb-4">🎉 Great Work!</h2>
              <p className="text-lg mb-2">You earned {Math.floor(focusLevel / 10) + 50} XP!</p>
              <p className="text-gray-300 mb-6">Time for a break:</p>
              <p className="text-xl text-green-400 mb-6">{getBreakSuggestion()}</p>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setShowBreakSuggestion(false);
                    startTimer();
                  }}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold"
                >
                  Start Break
                </button>
                <button
                  onClick={() => setShowBreakSuggestion(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-semibold"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-white/5 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">📋 How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-300 mb-2">🎯 Focus Detection</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Camera tracks your gaze and presence</li>
                <li>• Focus level decreases with distractions</li>
                <li>• Idle detection monitors activity</li>
                <li>• Real-time alerts for focus breaks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-300 mb-2">🏆 Gamification</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Earn XP based on focus quality</li>
                <li>• Get bonus XP for eye breaks (closing eyes for 3+ seconds)</li>
                <li>• Level up every 1000 XP</li>
                <li>• Build focus streaks</li>
                <li>• AI break suggestions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default FocusTracker;