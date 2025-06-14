import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, BookOpen, Brain, Target, Sparkles, MessageCircle, TrendingUp, Award, Zap } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/firebase';

const AIMentalWellnessApp = () => {
  const [user, loading, error] = useAuthState(auth);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState('neutral');
  const [userStats, setUserStats] = useState({
    xpPoints: 0,
    streakDays: 0,
    totalHabits: 0,
    currentStreak: 0,
    longestStreak: 0
  });
  const [wellnessTips, setWellnessTips] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [journalEntry, setJournalEntry] = useState('');
  const [emotionHistory, setEmotionHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const userId = user?.uid;
  const userName = user?.displayName || 'Guest';

  const API_BASE_URL = 'http://localhost:8001';

  useEffect(() => {
    if (user && userId) {
      initializeUser();
      setMessages([{
        type: 'ai',
        content: `Hello ${userName}! I'm Luna, your AI mental wellness companion. 💜 How are you feeling today?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [user, userId, userName]);

  const initializeUser = async () => {
    if (!userId) return;
    
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserStats({
          xpPoints: userData.xpPoints || 0,
          streakDays: userData.currentStreak || 0,
          totalHabits: userData.totalHabits || 0,
          currentStreak: userData.currentStreak || 0,
          longestStreak: userData.longestStreak || 0
        });
        setCurrentMood(userData.lastMood || 'neutral');
      } else {
        // Create new user document with default values
        const defaultUserData = {
          uid: userId,
          username: userName,
          xpPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalHabits: 0,
          lastMood: 'neutral',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(userDocRef, defaultUserData);
        setUserStats({
          xpPoints: 0,
          streakDays: 0,
          totalHabits: 0,
          currentStreak: 0,
          longestStreak: 0
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateUserStats = async (newStats) => {
    if (!userId) return;
    
    try {
      const userDocRef = doc(db, 'users', userId);
      const updateData = {
        ...newStats,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(userDocRef, updateData);
      setUserStats(prev => ({ ...prev, ...newStats }));
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  const addXP = async (points) => {
    if (!userId) return;
    
    const newXP = userStats.xpPoints + points;
    await updateUserStats({ xpPoints: newXP });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !userId) return;

    const userMessage = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const chatData = {
        message: inputMessage,
        user_state: {
          user_id: userId,
          current_mood: currentMood,
          xp_points: userStats.xpPoints,
          streak_days: userStats.streakDays,
          last_activity: new Date().toISOString()
        },
        emotion_history: emotionHistory
      };

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData)
      });

      const data = await response.json();
      
      const aiMessage = {
        type: 'ai',
        content: data.ai_response,
        timestamp: data.timestamp,
        wellnessTips: data.wellness_tips
      };

      setMessages(prev => [...prev, aiMessage]);
      setWellnessTips(data.wellness_tips || []);
      
      await addXP(5);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'ai',
        content: "I'm having trouble connecting right now, but I'm still here for you. 💜",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const saveJournalEntry = async () => {
    if (!journalEntry.trim() || !userId) return;

    try {
      const entry = {
        userId,
        content: journalEntry,
        mood: currentMood,
        timestamp: new Date().toISOString(),
        username: userName
      };

      // Save to journalEntries collection
      await addDoc(collection(db, 'journalEntries'), entry);
      
      // Add XP points
      await addXP(10);
      
      setJournalEntry('');
      alert('Journal entry saved! +10 XP earned 🌟');

    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert('Sorry, there was an error saving your journal entry.');
    }
  };

  const logEmotion = async (emotion, intensity) => {
    if (!userId) return;
    
    const emotionData = {
      emotion,
      intensity,
      timestamp: new Date().toISOString(),
      userId,
      username: userName
    };

    try {
      // Save emotion to Firebase
      await addDoc(collection(db, 'emotions'), emotionData);
      
      // Update user's last mood
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { 
        lastMood: emotion,
        updatedAt: new Date().toISOString()
      });

      setEmotionHistory(prev => [...prev, emotionData]);
      setCurrentMood(emotion);
      await addXP(3);

      // Also send to your API if needed
      await fetch(`${API_BASE_URL}/emotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emotionData)
      });

    } catch (error) {
      console.error('Error logging emotion:', error);
    }
  };

  const emotions = [
    { name: 'happy', emoji: '😊', color: 'bg-green-100 text-green-800' },
    { name: 'calm', emoji: '😌', color: 'bg-indigo-100 text-indigo-800' },
    { name: 'excited', emoji: '🤗', color: 'bg-yellow-100 text-yellow-800' },
    { name: 'neutral', emoji: '😐', color: 'bg-gray-100 text-gray-800' },
    { name: 'tired', emoji: '😴', color: 'bg-purple-100 text-purple-800' },
    { name: 'anxious', emoji: '😰', color: 'bg-orange-100 text-orange-800' },
    { name: 'sad', emoji: '😢', color: 'bg-blue-200 text-blue-900' },
    { name: 'stressed', emoji: '😤', color: 'bg-red-100 text-red-800' }
  ];

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-indigo-500 animate-spin" />
          <p className="text-gray-600">Loading your wellness companion...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center max-w-md">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Luna</h1>
          <p className="text-gray-600 mb-6">Your AI mental wellness companion is waiting for you. Please sign in to continue your wellness journey.</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  const level = Math.floor(userStats.xpPoints / 100) + 1;
  const xpToNextLevel = 100 - (userStats.xpPoints % 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Luna - Your AI Wellness Companion
                </h1>
                <p className="text-sm text-gray-600">Welcome back, {userName} • Level {level} • {userStats.xpPoints} XP</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-bold text-indigo-600">{userStats.streakDays}</div>
                <div className="text-xs text-gray-500">day streak</div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          {/* XP Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Level {level}</span>
              <span>{xpToNextLevel} XP to next level</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((userStats.xpPoints % 100) / 100) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 mb-6">
          {[
            { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
            { id: 'mood', label: 'Mood', icon: <Heart className="w-4 h-4" /> },
            { id: 'journal', label: 'Journal', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'tips', label: 'Tips', icon: <Target className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'chat' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
                  <h2 className="text-lg font-semibold flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Chat with Luna
                  </h2>
                </div>
                
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl px-4 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="p-4 border-t border-indigo-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Share what's on your mind..."
                      className="flex-1 px-4 py-2 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mood' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Heart className="w-6 h-6 mr-2 text-indigo-500" />
                  How are you feeling?
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {emotions.map(emotion => (
                    <button
                      key={emotion.name}
                      onClick={() => logEmotion(emotion.name, 7)}
                      className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                        currentMood === emotion.name
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{emotion.emoji}</div>
                      <div className="text-sm font-medium capitalize">{emotion.name}</div>
                    </button>
                  ))}
                </div>
                
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
                  <h3 className="font-semibold text-indigo-800 mb-2">Current Mood: {currentMood}</h3>
                  <p className="text-indigo-700 text-sm">You've logged {emotionHistory.length} emotions! Keep it up! 🌟</p>
                </div>
              </div>
            )}

            {activeTab === 'journal' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <BookOpen className="w-6 h-6 mr-2 text-indigo-500" />
                  Daily Journal
                </h2>
                
                <div className="space-y-4">
                  <textarea
                    value={journalEntry}
                    onChange={(e) => setJournalEntry(e.target.value)}
                    placeholder="Dear Journal, today I feel..."
                    className="w-full h-48 px-4 py-3 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {journalEntry.length} characters
                    </div>
                    <button
                      onClick={saveJournalEntry}
                      disabled={!journalEntry.trim()}
                      className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Entry (+10 XP)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tips' && wellnessTips.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {wellnessTips.map((tip, index) => (
                  <div key={index} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-200 p-5">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">{tip.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{tip.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {tip.duration_minutes} minutes
                          </span>
                          <button className="text-xs bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-3 py-1 rounded-full hover:shadow-md transition-all">
                            Start Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                Your Progress
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
                  <span className="text-gray-700">XP Points</span>
                  <span className="font-bold text-indigo-600">{userStats.xpPoints}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <span className="text-gray-700">Current Level</span>
                  <span className="font-bold text-blue-600">{level}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                  <span className="text-gray-700">Streak Days</span>
                  <span className="font-bold text-indigo-600">{userStats.streakDays}</span>
                </div>
              </div>
            </div>

            {/* Motivational Quote */}
            <div className="bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl shadow-xl text-white p-6">
              <div className="text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-80" />
                <p className="text-sm italic mb-2">
                  "Every small step you take toward wellness is a victory worth celebrating."
                </p>
                <p className="text-xs opacity-80">- Luna, your AI companion</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMentalWellnessApp;