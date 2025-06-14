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
  const [mode, setMode] = useState('work');
  const [cycleCount, setCycleCount] = useState(0);
  
  // Custom Timer Settings
  const [customDurations, setCustomDurations] = useState({
    work: 25,
    shortBreak: 5,
    longBreak: 15
  });
  const [showSettings, setShowSettings] = useState(false);
  const [tempDurations, setTempDurations] = useState({
    work: 25,
    shortBreak: 5,
    longBreak: 15
  });
  
  // Focus Detection States
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [focusLevel, setFocusLevel] = useState(100);
  const [gazeDetected, setGazeDetected] = useState(true);
  const [distractionCount, setDistractionCount] = useState(0);
  
  // Eye Tracking States
  const [eyesClosed, setEyesClosed] = useState(false);
  const [eyesClosedTime, setEyesClosedTime] = useState(0);
  const [eyesBlinkedCount, setEyesBlinkedCount] = useState(0);
  const eyesClosedRef = useRef(0);
  const eyesBlinkedCounterRef = useRef(0);
  const eyesClosedTimerRef = useRef(null);
  
  // Gamification States
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  
  // User Auth
  const [user, setUser] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
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

  // Load user data from Firebase (including custom durations)
  const loadUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setXp(data.xp || 0);
        setLevel(data.level || 1);
        setStreak(data.streak || 0);
        
        // Load custom timer durations
        if (data.customDurations) {
          setCustomDurations(data.customDurations);
          setTempDurations(data.customDurations);
          setMinutes(data.customDurations.work);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Save user data to Firebase (including custom durations)
  const saveUserData = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        xp, level, streak,
        customDurations,
        lastSession: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  // Timer Settings Functions
  const openSettings = () => {
    setTempDurations(customDurations);
    setShowSettings(true);
  };

  const saveSettings = () => {
    setCustomDurations(tempDurations);
    
    // Update current timer if not running
    if (!isRunning) {
      const currentModeDuration = tempDurations[mode];
      setMinutes(currentModeDuration);
      setSeconds(0);
    }
    
    setShowSettings(false);
    saveUserData();
  };

  const cancelSettings = () => {
    setTempDurations(customDurations);
    setShowSettings(false);
  };

  const resetToDefaults = () => {
    const defaults = { work: 25, shortBreak: 5, longBreak: 15 };
    setTempDurations(defaults);
  };

  const updateTempDuration = (modeType, value) => {
    const numValue = Math.max(1, Math.min(120, parseInt(value) || 1));
    setTempDurations(prev => ({
      ...prev,
      [modeType]: numValue
    }));
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
    if (window.faceLandmarksDetection) {
      const loadedModel = await loadFaceLandmarkDetectionModel();
      faceModelRef.current = loadedModel;
      renderPrediction(loadedModel);
      return;
    }
    
    try {
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

  // Combined face and eye detection (simplified from EyeMonitor)
  const detectFacesAndEyes = (predictions, ctx) => {
    ctx.fillStyle = "red";
    
    if (predictions.length > 0) {
      setGazeDetected(true);
      setFocusLevel(prev => Math.min(100, prev + 2));
      
      predictions.forEach(prediction => {
        const rightEyeUpper0 = prediction.annotations.rightEyeUpper0;
        const rightEyeLower0 = prediction.annotations.rightEyeLower0;
        const leftEyeUpper0 = prediction.annotations.leftEyeUpper0;
        const leftEyeLower0 = prediction.annotations.leftEyeLower0;
        
        // Draw eye landmarks
        const eyeOutlinePoints = rightEyeUpper0.concat(rightEyeLower0, leftEyeUpper0, leftEyeLower0);
        eyeOutlinePoints.forEach(point => {
          ctx.beginPath();
          ctx.rect(point[0], point[1], 2, 2);
          ctx.fill();
        });
        
        // Calculate eye openness
        let rightEyeDistance = Math.abs(rightEyeUpper0[3][1] - rightEyeLower0[4][1]);
        let leftEyeDistance = Math.abs(leftEyeUpper0[3][1] - leftEyeLower0[4][1]);
        
        // Eye closure detection
        if (rightEyeDistance < 7 || leftEyeDistance < 7) {
          if (eyesClosedRef.current === 0) {
            startEyesClosedTimer();
            setEyesClosed(true);
          }
          eyesClosedRef.current = 1;
        } else {
          if (eyesClosedRef.current === 1) {
            eyesBlinkedCounterRef.current++;
            setEyesBlinkedCount(eyesBlinkedCounterRef.current);
            
            // Award XP for eye breaks (3+ seconds)
            if (eyesClosedTime >= 3) {
              setXp(prev => prev + 2);
              saveUserData();
            }
            
            resetEyesClosedTimer();
            setEyesClosed(false);
          }
          eyesClosedRef.current = 0;
        }
      });
    } else {
      setGazeDetected(false);
      setFocusLevel(prev => Math.max(0, prev - 5));
      setDistractionCount(prev => prev + 1);
    }
  };

  // Eye closure timer functions
  const startEyesClosedTimer = () => {
    setEyesClosedTime(0);
    eyesClosedTimerRef.current = setInterval(() => {
      setEyesClosedTime(prev => prev + 1);
    }, 1000);
  };

  const resetEyesClosedTimer = () => {
    if (eyesClosedTimerRef.current) {
      clearInterval(eyesClosedTimerRef.current);
      eyesClosedTimerRef.current = null;
    }
    setEyesClosedTime(0);
  };

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
      const newLevel = Math.floor((xp + earnedXP) / 1000) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
      }
      
      saveSessionData(earnedXP);
      
      // Switch to break mode with custom durations
      const nextMode = newCycleCount % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setMinutes(customDurations[nextMode]);
    } else {
      setMode('work');
      setMinutes(customDurations.work);
    }
    
    setSeconds(0);
    setFocusLevel(100);
    setDistractionCount(0);
  };

  const saveSessionData = async (earnedXP) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        date: new Date().toISOString(),
        duration: customDurations[mode],
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

  // Timer controls
  const startTimer = () => {
    setIsRunning(true);
    setSessionComplete(false);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSessionComplete(false);
    setMinutes(customDurations[mode]);
    setSeconds(0);
    setFocusLevel(100);
    setDistractionCount(0);
  };

  // Utility functions
  const formatTime = (m, s) => {
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getFocusColor = () => {
    if (focusLevel >= 80) return 'text-green-500';
    if (focusLevel >= 60) return 'text-yellow-500';
    if (focusLevel >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getModeTitle = () => {
    switch(mode) {
      case 'work': return '⏱️ Work Session';
      case 'shortBreak': return '☕ Short Break';
      case 'longBreak': return '🛋️ Long Break';
      default: return '⏱️ Work Session';
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">
            🧠 AI Focus Tracker
          </h1>

          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {getModeTitle()}
                </h2>
                <button
                  onClick={openSettings}
                  disabled={isRunning}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 p-2 rounded-lg"
                  title="Timer Settings"
                >
                  ⚙️
                </button>
              </div>
              
              <div className="text-6xl font-mono font-bold mb-2">
                {formatTime(minutes, seconds)}
              </div>
              
              <p className="text-sm text-gray-300 mb-6">
                Duration: {customDurations[mode]} minutes
              </p>

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
                  <h4 className="text-sm font-semibold text-gray-300">Distractions</h4>
                  <p className="text-xl font-bold text-red-400">{distractionCount}</p>
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
                <div className="absolute top-2 left-2 flex flex-wrap gap-2">
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

              {/* Alerts */}
              {distractionCount > 0 && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                  <p className="text-red-300 text-sm">
                    ⚠️ {distractionCount} distractions detected
                  </p>
                </div>
              )}

              {eyesClosedTime >= 10 && (
                <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-4">
                  <p className="text-green-300 text-sm">
                    ✅ Great eye break! {eyesClosedTime} seconds
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timer Settings Modal */}
          {showSettings && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 max-w-md mx-4 w-full">
                <h2 className="text-2xl font-bold mb-6 text-center">⚙️ Timer Settings</h2>
                
                <div className="space-y-6">
                  {/* Work Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-blue-300 mb-2">
                      Work Session (minutes)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateTempDuration('work', tempDurations.work - 1)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={tempDurations.work}
                        onChange={(e) => updateTempDuration('work', e.target.value)}
                        className="bg-black/20 border border-gray-600 rounded-lg px-3 py-2 text-center w-20"
                      />
                      <button
                        onClick={() => updateTempDuration('work', tempDurations.work + 1)}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Short Break Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-green-300 mb-2">
                      Short Break (minutes)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateTempDuration('shortBreak', tempDurations.shortBreak - 1)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={tempDurations.shortBreak}
                        onChange={(e) => updateTempDuration('shortBreak', e.target.value)}
                        className="bg-black/20 border border-gray-600 rounded-lg px-3 py-2 text-center w-20"
                      />
                      <button
                        onClick={() => updateTempDuration('shortBreak', tempDurations.shortBreak + 1)}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Long Break Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-purple-300 mb-2">
                      Long Break (minutes)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateTempDuration('longBreak', tempDurations.longBreak - 1)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={tempDurations.longBreak}
                        onChange={(e) => updateTempDuration('longBreak', e.target.value)}
                        className="bg-black/20 border border-gray-600 rounded-lg px-3 py-2 text-center w-20"
                      />
                      <button
                        onClick={() => updateTempDuration('longBreak', tempDurations.longBreak + 1)}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="border-t border-gray-600 pt-4">
                    <p className="text-sm text-gray-300 mb-3">Quick Presets:</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setTempDurations({ work: 25, shortBreak: 5, longBreak: 15 })}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                      >
                        Classic (25/5/15)
                      </button>
                      <button
                        onClick={() => setTempDurations({ work: 50, shortBreak: 10, longBreak: 30 })}
                        className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
                      >
                        Extended (50/10/30)
                      </button>
                      <button
                        onClick={() => setTempDurations({ work: 15, shortBreak: 3, longBreak: 10 })}
                        className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-sm"
                      >
                        Quick (15/3/10)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="flex gap-4 justify-center mt-8">
                  <button
                    onClick={saveSettings}
                    className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={resetToDefaults}
                    className="bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded-lg font-semibold"
                  >
                    Reset Defaults
                  </button>
                  <button
                    onClick={cancelSettings}
                    className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FocusTracker;
          