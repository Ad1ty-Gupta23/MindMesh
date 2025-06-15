import React, { useEffect, useRef, useState } from 'react';
import Navbar from './Navbar';



const EyeDetectionTimer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eyesBlinkedCount, setEyesBlinkedCount] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [eyesClosed, setEyesClosed] = useState(false);
  
  const timerRef = useRef(null);
  const eyesClosedRef = useRef(0);
  const eyesBlinkedCounterRef = useRef(0);
  const animationRef = useRef(null);

  // Load external scripts
  useEffect(() => {
    const loadScripts = async () => {
      // Check if scripts are already loaded
      if (window.faceLandmarksDetection) {
        initializeApp();
        return;
      }

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

      initializeApp();
    };

    loadScripts();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      await setupCamera();
      const loadedModel = await loadFaceLandmarkDetectionModel();
      setModel(loadedModel);
      setIsLoading(false);
      renderPrediction(loadedModel);
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const setupCamera = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          video.width = videoWidth;
          video.height = videoHeight;
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          resolve(video);
        };
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const loadFaceLandmarkDetectionModel = async () => {
    return window.faceLandmarksDetection.load(
      window.faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: 1 }
    );
  };

  const startTimer = () => {
    if (!isTimerActive) {
      setIsTimerActive(true);
      setTimerSeconds(0);
      
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerActive(false);
    setTimerSeconds(0);
  };

  const detectBlinkingEyes = (predictions) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#8b5cf6"; // indigo-400
    
    if (predictions.length > 0) {
      predictions.forEach(prediction => {
        const rightEyeUpper0 = prediction.annotations.rightEyeUpper0;
        const rightEyeLower0 = prediction.annotations.rightEyeLower0;
        const leftEyeUpper0 = prediction.annotations.leftEyeUpper0;
        const leftEyeLower0 = prediction.annotations.leftEyeLower0;
        
        const eyeOutlinePoints = rightEyeUpper0.concat(rightEyeLower0, leftEyeUpper0, leftEyeLower0);
        
        let rightEyeCenterPointDistance = Math.abs(rightEyeUpper0[3][1] - rightEyeLower0[4][1]);
        let leftEyeCenterPointDistance = Math.abs(leftEyeUpper0[3][1] - leftEyeLower0[4][1]);
        
        // Check if eyes are closed
        if (rightEyeCenterPointDistance < 7 || leftEyeCenterPointDistance < 7) {
          if (eyesClosedRef.current === 0) {
            // Eyes just closed, start timer
            startTimer();
            setEyesClosed(true);
          }
          eyesClosedRef.current = 1;
        }
        
        // Check if eyes opened after being closed
        if (eyesClosedRef.current === 1 && (rightEyeCenterPointDistance > 9 && leftEyeCenterPointDistance > 9)) {
          eyesBlinkedCounterRef.current++;
          eyesClosedRef.current = 0;
          setEyesBlinkedCount(eyesBlinkedCounterRef.current);
          setEyesClosed(false);
          
          // Reset timer when eyes open
          resetTimer();
        }
        
        // Draw eye outline points
        eyeOutlinePoints.forEach(point => {
          ctx.beginPath();
          ctx.rect(point[0], point[1], 3, 3);
          ctx.fill();
        });
      });
    }
  };

  const renderPrediction = async (currentModel) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!currentModel || !video || !canvas) return;
    
    try {
      const predictions = await currentModel.estimateFaces({ input: video });
      
      ctx.drawImage(
        video, 0, 0, video.width, video.height,
        0, 0, canvas.width, canvas.height
      );
      
      detectBlinkingEyes(predictions);
      
      animationRef.current = requestAnimationFrame(() => renderPrediction(currentModel));
    } catch (error) {
      console.error('Error in prediction:', error);
      animationRef.current = requestAnimationFrame(() => renderPrediction(currentModel));
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timerSeconds >= 300) return 'text-red-500'; // 5 minutes
    if (timerSeconds >= 240) return 'text-orange-500'; // 4 minutes
    if (timerSeconds >= 180) return 'text-yellow-500'; // 3 minutes
    return 'text-indigo-600';
  };

  const getTimerBgColor = () => {
    if (timerSeconds >= 300) return 'bg-red-50 border-red-200'; // 5 minutes
    if (timerSeconds >= 240) return 'bg-orange-50 border-orange-200'; // 4 minutes
    if (timerSeconds >= 180) return 'bg-yellow-50 border-yellow-200'; // 3 minutes
    return 'bg-indigo-50 border-indigo-200';
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-indigo-900 mb-2">
              Eye Detection Timer
            </h1>
            <p className="text-indigo-600 text-lg">
              Advanced face mesh detection with real-time monitoring
            </p>
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent absolute top-0 left-0"></div>
              </div>
              <p className="text-center mt-4 text-indigo-700 font-medium">
                Loading face detection model...
              </p>
            </div>
          )}
          
          {/* Stats Dashboard */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Blinks Counter */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200 transform hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-800 mb-1">Blinks Detected</h3>
                      <p className="text-3xl font-bold text-indigo-600">{eyesBlinkedCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">👁️</span>
                    </div>
                  </div>
                </div>
                
                {/* Eye Status */}
                <div className={`p-6 rounded-xl border transform hover:scale-105 transition-all duration-200 ${
                  eyesClosed 
                    ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
                    : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold mb-1 ${
                        eyesClosed ? 'text-red-800' : 'text-green-800'
                      }`}>
                        Eyes Status
                      </h3>
                      <p className={`text-3xl font-bold ${
                        eyesClosed ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {eyesClosed ? 'CLOSED' : 'OPEN'}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      eyesClosed ? 'bg-red-600' : 'bg-green-600'
                    }`}>
                      <span className="text-white text-xl">
                        {eyesClosed ? '😴' : '👀'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Timer */}
                <div className={`p-6 rounded-xl border transform hover:scale-105 transition-all duration-200 ${getTimerBgColor()}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold mb-1 ${
                        timerSeconds >= 300 ? 'text-red-800' : 
                        timerSeconds >= 240 ? 'text-orange-800' : 
                        timerSeconds >= 180 ? 'text-yellow-800' : 'text-indigo-800'
                      }`}>
                        Close Timer
                      </h3>
                      <p className={`text-3xl font-bold ${getTimerColor()}`}>
                        {formatTime(timerSeconds)}
                      </p>
                      {timerSeconds >= 300 && (
                        <p className="text-sm text-red-600 font-semibold animate-pulse mt-1">
                          ⚠️ 5 MINUTES REACHED!
                        </p>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      timerSeconds >= 300 ? 'bg-red-600' : 
                      timerSeconds >= 240 ? 'bg-orange-500' : 
                      timerSeconds >= 180 ? 'bg-yellow-500' : 'bg-indigo-600'
                    }`}>
                      <span className="text-white text-xl">⏱️</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Video Feed */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-indigo-800">Live Video Feed</h3>
                <p className="text-indigo-600 text-sm">Indigo dots indicate detected eye landmarks</p>
              </div>
              
              <div className="relative bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-xl overflow-hidden shadow-inner mx-auto" style={{ maxWidth: '640px' }}>
                <canvas 
                  ref={canvasRef}
                  className="block transform scale-x-[-1] w-full h-auto rounded-xl"
                  style={{ maxWidth: '640px', maxHeight: '640px' }}
                />
                <video 
                  ref={videoRef}
                  autoPlay
                  muted
                  className="absolute top-0 left-0 invisible transform scale-x-[-1]"
                  width="640"
                  height="640"
                />
                
                {/* Status Overlay */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isTimerActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-sm font-medium">
                      {isTimerActive ? 'Monitoring' : 'Ready'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
              <h3 className="text-xl font-semibold text-indigo-800 mb-4 text-center">
                How It Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-2">⏰ Timer System</h4>
                  <ul className="text-sm text-indigo-700 space-y-1">
                    <li>• Timer starts when eyes are detected as closed</li>
                    <li>• Automatically resets to 0 when eyes open</li>
                    <li>• Color changes based on duration</li>
                  </ul>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-2">👁️ Detection System</h4>
                  <ul className="text-sm text-indigo-700 space-y-1">
                    <li>• Indigo dots show eye landmarks</li>
                    <li>• Blink counter tracks eye open/close cycles</li>
                    <li>• Real-time face mesh analysis</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl border border-indigo-200">
                <h4 className="font-semibold text-indigo-800 mb-2">⚠️ Alert System</h4>
                <p className="text-sm text-indigo-700">
                  Timer background and text change color as time progresses: 
                  <span className="ml-1 font-medium">
                    Indigo (normal) → Yellow (3min) → Orange (4min) → Red (5min+)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EyeDetectionTimer;