import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Brain, Target, Moon, Heart, Zap, BarChart3, LineChart, Activity, Sparkles } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts';
import { db } from '../utils/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/firebase';
import Navbar from '../components/Navbar';

const MoodTimelineInsights = () => {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [moodData, setMoodData] = useState([]);
  const [sleepData, setSleepData] = useState([]);
  const [focusData, setFocusData] = useState([]);
  const [xpData, setXpData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [insights, setInsights] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');

  // Color mappings for mood
  const moodColors = {
    'happy': '#10B981',
    'sad': '#3B82F6',
    'anxious': '#F59E0B',
    'excited': '#EC4899',
    'calm': '#8B5CF6',
    'angry': '#EF4444',
    'neutral': '#6B7280'
  };

  const sleepQualityColors = {
    'excellent': '#10B981',
    'good': '#22C55E',
    'fair': '#F59E0B',
    'poor': '#EF4444'
  };

  // Fetch data from Firebase
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get start and end dates for selected month
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        
        // Fetch mood data
        const moodQuery = query(
          collection(db, 'emotions'),
          where('userId', '==', user.uid),
          limit(100)
        );
        const moodSnapshot = await getDocs(moodQuery);
        const moodEntries = moodSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: new Date(doc.data().timestamp?.seconds * 1000 || doc.data().timestamp)
        })).filter(entry => {
          const entryDate = entry.date;
          return entryDate >= startDate && entryDate <= endDate;
        });

        // Fetch sleep data (simulated - you'd have this collection)
        const sleepEntries = generateSampleSleepData(startDate, endDate);
        
        // Fetch focus data (simulated)
        const focusEntries = generateSampleFocusData(startDate, endDate);
        
        // Fetch XP data (from user activities)
        const xpEntries = generateSampleXPData(startDate, endDate);

        setMoodData(moodEntries);
        setSleepData(sleepEntries);
        setFocusData(focusEntries);
        setXpData(xpEntries);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedMonth, selectedYear]);

  // Generate sample data (replace with real Firebase queries)
  const generateSampleSleepData = (startDate, endDate) => {
    const data = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      data.push({
        date: new Date(current),
        hours: Math.random() * 4 + 5, // 5-9 hours
        quality: ['poor', 'fair', 'good', 'excellent'][Math.floor(Math.random() * 4)]
      });
      current.setDate(current.getDate() + 1);
    }
    return data;
  };

  const generateSampleFocusData = (startDate, endDate) => {
    const data = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      if (Math.random() > 0.3) { // Some days have no focus data
        data.push({
          date: new Date(current),
          score: Math.random() * 5 + 5, // 5-10 focus score
          duration: Math.random() * 120 + 30 // 30-150 minutes
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return data;
  };

  const generateSampleXPData = (startDate, endDate) => {
    const data = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      if (Math.random() > 0.2) {
        data.push({
          date: new Date(current),
          xp: Math.floor(Math.random() * 50 + 10) // 10-60 XP per day
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return data;
  };

  // Generate AI insights
  const generateInsights = async () => {
    if (!moodData.length || !sleepData.length) return;
    
    setPredictionLoading(true);
    try {
      // Simulate API call to FastAPI backend
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moodData: moodData.slice(-14), // Last 14 days
          sleepData: sleepData.slice(-14),
          focusData: focusData.slice(-14),
          xpData: xpData.slice(-14)
        })
      });
      
      // For demo, generate mock insights
      const mockInsights = {
        moodTrend: Math.random() > 0.5 ? 'improving' : 'declining',
        sleepCorrelation: (Math.random() * 0.6 + 0.4).toFixed(2),
        focusCorrelation: (Math.random() * 0.5 + 0.3).toFixed(2),
        prediction: {
          nextDayMood: ['happy', 'calm', 'neutral'][Math.floor(Math.random() * 3)],
          confidence: (Math.random() * 0.3 + 0.7).toFixed(2)
        },
        recommendations: [
          "Your mood improves with 7+ hours of sleep",
          "Focus sessions boost your mood by 15%",
          "Weekend mood dips - consider self-care activities"
        ]
      };
      
      setInsights(mockInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setPredictionLoading(false);
    }
  };

  // Prepare chart data
  const prepareTimelineData = () => {
    const dateMap = new Map();
    
    moodData.forEach(entry => {
      const dateKey = entry.date.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: entry.date.toLocaleDateString() });
      }
      dateMap.get(dateKey).mood = entry.emotion;
      dateMap.get(dateKey).moodScore = getMoodScore(entry.emotion);
    });
    
    sleepData.forEach(entry => {
      const dateKey = entry.date.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: entry.date.toLocaleDateString() });
      }
      dateMap.get(dateKey).sleep = entry.hours;
      dateMap.get(dateKey).sleepQuality = entry.quality;
    });
    
    focusData.forEach(entry => {
      const dateKey = entry.date.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: entry.date.toLocaleDateString() });
      }
      dateMap.get(dateKey).focus = entry.score;
    });
    
    xpData.forEach(entry => {
      const dateKey = entry.date.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: entry.date.toLocaleDateString() });
      }
      dateMap.get(dateKey).xp = entry.xp;
    });
    
    return Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getMoodScore = (mood) => {
    const scores = {
      'happy': 9, 'excited': 8, 'calm': 7, 'neutral': 5,
      'anxious': 4, 'sad': 3, 'angry': 2
    };
    return scores[mood] || 5;
  };

  const timelineData = prepareTimelineData();

  // Calendar view component
  const CalendarView = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-16"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const moodEntry = moodData.find(entry => 
        entry.date.toDateString() === date.toDateString()
      );
      const sleepEntry = sleepData.find(entry => 
        entry.date.toDateString() === date.toDateString()
      );
      
      days.push(
        <div key={day} className="h-16 p-1 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
          <div className="text-sm font-medium text-gray-700">{day}</div>
          <div className="flex gap-1 mt-1">
            {moodEntry && (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: moodColors[moodEntry.emotion] }}
                title={`Mood: ${moodEntry.emotion}`}
              ></div>
            )}
            {sleepEntry && (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: sleepQualityColors[sleepEntry.quality] }}
                title={`Sleep: ${sleepEntry.hours.toFixed(1)}h (${sleepEntry.quality})`}
              ></div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-indigo-200/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Mood Calendar
          </h2>
          <div className="flex gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i} value={i}>
                  {new Date(2024, i).toLocaleDateString('en', { month: 'long' })}
                </option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[2023, 2024, 2025].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
        
        <div className="flex gap-4 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Positive Mood</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Neutral/Sad</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Anxious</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Low Mood</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-indigo-600 font-medium">Loading your insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl mb-8 border border-indigo-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                Mood Timeline & Insights
              </h1>
              <p className="text-gray-600 mt-2">Visualize patterns and get AI-powered insights</p>
            </div>
            <button
              onClick={generateInsights}
              disabled={predictionLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50"
            >
              {predictionLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Brain size={20} />
              )}
              Generate AI Insights
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'timeline', label: 'Timeline', icon: Calendar },
            { id: 'correlations', label: 'Correlations', icon: TrendingUp },
            { id: 'insights', label: 'AI Insights', icon: Sparkles }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-white shadow-lg text-indigo-600 border border-indigo-200'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-8">
            <CalendarView />
            
            {/* Timeline Chart */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent mb-6">
                Mood & Activity Timeline
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Line type="monotone" dataKey="moodScore" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }} />
                    <Line type="monotone" dataKey="sleep" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }} />
                    <Line type="monotone" dataKey="focus" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'correlations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sleep vs Mood Correlation */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Moon size={20} className="text-indigo-600" />
                Sleep vs Mood
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sleep" type="number" domain={[4, 10]} name="Sleep Hours" />
                    <YAxis dataKey="moodScore" type="number" domain={[1, 10]} name="Mood Score" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="moodScore" fill="#6366f1" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Focus vs XP Correlation */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Target size={20} className="text-indigo-600" />
                Focus vs XP
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="focus" type="number" domain={[4, 11]} name="Focus Score" />
                    <YAxis dataKey="xp" type="number" domain={[0, 70]} name="XP Gained" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="xp" fill="#22c55e" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Patterns */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-600" />
                Weekly Mood Patterns
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { day: 'Mon', mood: 6.2 },
                    { day: 'Tue', mood: 6.8 },
                    { day: 'Wed', mood: 7.1 },
                    { day: 'Thu', mood: 6.9 },
                    { day: 'Fri', mood: 7.5 },
                    { day: 'Sat', mood: 7.8 },
                    { day: 'Sun', mood: 6.5 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="mood" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mood Distribution */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Activity size={20} className="text-indigo-600" />
                Mood Distribution
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Happy', value: 35, color: '#10B981' },
                        { name: 'Calm', value: 25, color: '#8B5CF6' },
                        { name: 'Neutral', value: 20, color: '#6B7280' },
                        { name: 'Anxious', value: 12, color: '#F59E0B' },
                        { name: 'Sad', value: 8, color: '#3B82F6' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { color: '#10B981' },
                        { color: '#8B5CF6' },
                        { color: '#6B7280' },
                        { color: '#F59E0B' },
                        { color: '#3B82F6' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && insights && (
          <div className="space-y-8">
            {/* AI Prediction */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-8 shadow-2xl text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Brain size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">AI Mood Prediction</h2>
                  <p className="opacity-90">Based on your recent patterns</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm opacity-90">Tomorrow's Predicted Mood</p>
                    <p className="text-3xl font-bold capitalize">{insights.prediction.nextDayMood}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Confidence</p>
                    <p className="text-2xl font-bold">{(insights.prediction.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${insights.prediction.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Correlation Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  Sleep-Mood Correlation
                </h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">
                    {(insights.sleepCorrelation * 100).toFixed(0)}%
                  </div>
                  <p className="text-gray-600">
                    Strong correlation between sleep quality and mood
                  </p>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Zap size={20} className="text-indigo-600" />
                  Focus-Mood Correlation
                </h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">
                    {(insights.focusCorrelation * 100).toFixed(0)}%
                  </div>
                  <p className="text-gray-600">
                    Focus sessions positively impact mood
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-600" />
                Personalized Recommendations
              </h3>
              <div className="space-y-4">
                {insights.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-indigo-50 rounded-xl">
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <p className="text-gray-700">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodTimelineInsights;