import React, { useState, useEffect, useRef } from 'react';
import { Eye, Activity, Coffee, Brain, Target, TrendingUp, Play, Pause, BarChart3, Timer } from 'lucide-react';

const FocusProductivityTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [focusLevel, setFocusLevel] = useState(85);
  const [blinkRate, setBlinkRate] = useState(15);
  const [typingSpeed, setTypingSpeed] = useState(0);
  const [mouseActivity, setMouseActivity] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [sessionData, setSessionData] = useState([]);
  const [xpPoints, setXpPoints] = useState(420);
  const [currentStreak, setCurrentStreak] = useState(5);
  
  const sessionRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [keystrokes, setKeystrokes] = useState(0);
  const [mouseClicks, setMouseClicks] = useState(0);

  // Initialize camera and tracking
  useEffect(() => {
    if (isTracking) {
      startTracking();
      sessionRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
        updateFocusMetrics();
      }, 1000);
    } else {
      if (sessionRef.current) {
        clearInterval(sessionRef.current);
      }
    }

    return () => {
      if (sessionRef.current) {
        clearInterval(sessionRef.current);
      }
    };
  }, [isTracking]);

  // Track keyboard and mouse activity
  useEffect(() => {
    const handleKeyPress = () => {
      setKeystrokes(prev => prev + 1);
      setTypingSpeed(prev => Math.min(prev + 2, 100));
    };

    const handleMouseMove = () => {
      setMouseActivity(prev => Math.min(prev + 1, 100));
    };

    const handleMouseClick = () => {
      setMouseClicks(prev => prev + 1);
    };

    if (isTracking) {
      document.addEventListener('keypress', handleKeyPress);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('click', handleMouseClick);
    }

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleMouseClick);
    };
  }, [isTracking]);

  const startTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  };

  const updateFocusMetrics = () => {
    // Simulate focus level calculation based on activity
    const activityScore = (typingSpeed + mouseActivity) / 2;
    const newFocusLevel = Math.max(20, Math.min(100, activityScore + Math.random() * 20 - 10));
    setFocusLevel(Math.round(newFocusLevel));
    
    // Simulate blink rate (normal: 12-20 blinks/min)
    setBlinkRate(Math.round(12 + Math.random() * 8));
    
    // Decay activity over time
    setTypingSpeed(prev => Math.max(0, prev - 1));
    setMouseActivity(prev => Math.max(0, prev - 1));
  };

  const getAISuggestions = async () => {
    const sessionStats = {
      focus_level: focusLevel,
      blink_rate: blinkRate,
      typing_speed: typingSpeed,
      session_duration: sessionTime
    };

    try {
      // Simulate AI response (replace with actual API call)
      const mockSuggestions = [
        {
          type: focusLevel < 50 ? 'break' : 'focus_sprint',
          message: focusLevel < 50 ? 
            'Your focus is dropping. Time for a 5-minute break! 🧘' :
            'Great focus! Continue this sprint for 15 more minutes. 🔥',
          action: focusLevel < 50 ? 'Take Break' : 'Continue Sprint'
        }
      ];
      
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  };

  const endSession = () => {
    const session = {
      id: Date.now(),
      duration: sessionTime,
      focusLevel,
      blinkRate,
      keystrokes,
      mouseClicks,
      timestamp: new Date().toISOString(),
      xpEarned: Math.round(sessionTime / 60 * 5) // 5 XP per minute
    };

    setSessionData(prev => [...prev, session]);
    setXpPoints(prev => prev + session.xpEarned);
    
    // Reset session
    setIsTracking(false);
    setSessionTime(0);
    setKeystrokes(0);
    setMouseClicks(0);
    setTypingSpeed(0);
    setMouseActivity(0);
    
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFocusColor = (level) => {
    if (level >= 80) return 'text-green-600 bg-green-100';
    if (level >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Focus & Productivity Tracker
                </h1>
                <p className="text-sm text-gray-600">AI-powered focus monitoring • {xpPoints} XP • {currentStreak} day streak</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-bold text-indigo-600">{formatTime(sessionTime)}</div>
                <div className="text-xs text-gray-500">Session Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Tracking Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Camera Feed & Controls */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-indigo-500" />
                  Focus Monitor
                </h2>
                <button
                  onClick={isTracking ? endSession : () => setIsTracking(true)}
                  className={`px-6 py-2 rounded-xl font-medium transition-all ${
                    isTracking
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:shadow-lg text-white'
                  }`}
                >
                  {isTracking ? (
                    <>
                      <Pause className="w-4 h-4 inline mr-2" />
                      End Session
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 inline mr-2" />
                      Start Tracking
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Video Feed */}
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-48 bg-gray-900 rounded-lg object-cover"
                    muted
                    style={{ display: isTracking ? 'block' : 'none' }}
                  />
                  {!isTracking && (
                    <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Camera feed will appear here</p>
                      </div>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Real-time Metrics */}
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${getFocusColor(focusLevel)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Focus Level</span>
                      <span className="text-lg font-bold">{focusLevel}%</span>
                    </div>
                    <div className="w-full bg-white/50 rounded-full h-2 mt-2">
                      <div 
                        className="bg-current h-2 rounded-full transition-all duration-500"
                        style={{ width: `${focusLevel}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-100 text-blue-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Blink Rate</span>
                      <span className="text-lg font-bold">{blinkRate}/min</span>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-100 text-purple-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Activity</span>
                      <span className="text-lg font-bold">{Math.round((typingSpeed + mouseActivity) / 2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-indigo-500" />
                  AI Suggestions
                </h3>
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                    <p className="text-gray-800 mb-3">{suggestion.message}</p>
                    <button
                      onClick={() => suggestion.type === 'break' ? console.log('Taking break') : console.log('Continuing sprint')}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg text-sm hover:shadow-md transition-all"
                    >
                      {suggestion.action}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Session History */}
            {sessionData.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
                  Recent Sessions
                </h3>
                <div className="space-y-3">
                  {sessionData.slice(-3).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{formatTime(session.duration)}</div>
                        <div className="text-sm text-gray-600">Focus: {session.focusLevel}% • {session.keystrokes} keystrokes</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-indigo-600">+{session.xpEarned} XP</div>
                        <div className="text-xs text-gray-500">{new Date(session.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={getAISuggestions}
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:shadow-md transition-all"
                >
                  Get AI Insights
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Session Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                Session Stats
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
                  <span className="text-gray-700">Keystrokes</span>
                  <span className="font-bold text-indigo-600">{keystrokes}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <span className="text-gray-700">Mouse Clicks</span>
                  <span className="font-bold text-blue-600">{mouseClicks}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                  <span className="text-gray-700">Avg Focus</span>
                  <span className="font-bold text-indigo-600">{focusLevel}%</span>
                </div>
              </div>
            </div>

            {/* Productivity Tips */}
            <div className="bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl shadow-xl text-white p-6">
              <div className="text-center">
                <Coffee className="w-8 h-8 mx-auto mb-3 opacity-80" />
                <h4 className="font-semibold mb-2">Pro Tip</h4>
                <p className="text-sm opacity-90">
                  Take a 5-minute break every 25 minutes to maintain optimal focus levels.
                </p>
              </div>
            </div>

            {/* Weekly Progress */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                This Week
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sessions</span>
                  <span className="font-bold">{sessionData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Focus Time</span>
                  <span className="font-bold">{Math.round(sessionData.reduce((acc, s) => acc + s.duration, 0) / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">XP Earned</span>
                  <span className="font-bold text-indigo-600">+{sessionData.reduce((acc, s) => acc + s.xpEarned, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusProductivityTracker;