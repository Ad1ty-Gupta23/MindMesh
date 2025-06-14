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
    ctx.fillStyle = "red";
    
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
          ctx.rect(point[0], point[1], 2, 2);
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
    if (timerSeconds >= 300) return 'text-red-600'; // 5 minutes
    if (timerSeconds >= 240) return 'text-orange-500'; // 4 minutes
    if (timerSeconds >= 180) return 'text-yellow-500'; // 3 minutes
    return 'text-blue-600';
  };

  return (
    <>
    <Navbar />
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Eye Detection Timer with Face Mesh
      </h1>
      
      {isLoading && (
        <div className="mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-2 text-gray-600">Loading face detection model...</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800">Blinks Detected</h3>
            <p className="text-2xl font-bold text-blue-600">{eyesBlinkedCount}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800">Eyes Status</h3>
            <p className={`text-2xl font-bold ${eyesClosed ? 'text-red-600' : 'text-green-600'}`}>
              {eyesClosed ? 'CLOSED' : 'OPEN'}
            </p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800">Timer</h3>
            <p className={`text-2xl font-bold ${getTimerColor()}`}>
              {formatTime(timerSeconds)}
            </p>
            {timerSeconds >= 300 && (
              <p className="text-sm text-red-600 font-semibold animate-pulse">
                5 MINUTES REACHED!
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
        <canvas 
          ref={canvasRef}
          className="block transform scale-x-[-1]"
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
      </div>
      
      <div className="mt-6 text-center text-gray-600 max-w-2xl">
        <h3 className="text-lg font-semibold mb-2">How it works:</h3>
        <ul className="text-sm space-y-1">
          <li>• Timer starts automatically when your eyes are detected as closed</li>
          <li>• Timer resets to 0 when your eyes open</li>
          <li>• Red dots show detected eye landmarks</li>
          <li>• Blink counter increases each time you open your eyes after closing them</li>
          <li>• Timer turns red when you reach 5 minutes with eyes closed</li>
        </ul>
      </div>
    </div>
    </>
  );
};

export default EyeDetectionTimer;