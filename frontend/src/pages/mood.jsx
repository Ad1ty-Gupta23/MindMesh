import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Brain, Target, Moon, Heart, Zap, BarChart3, LineChart, Activity, Sparkles } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts';
import { db } from '../utils/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/firebase';
import Navbar from '../components/Navbar';

const MoodTimelineApp = () => {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [moodData, setMoodData] = useState([]);
  const [journalData, setJournalData] = useState([]);
  const [userData, setUserData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [insights, setInsights] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');

  // Color mappings
  const moodColors = {
    'happy': '#10B981',
    'excited': '#EC4899',
    'calm': '#8B5CF6',
    'neutral': '#6B7280',
    'anxious': '#F59E0B',
    'sad': '#3B82F6',
    'angry': '#EF4444',
    'tired': '#8B5CF6',
    'stressed': '#EF4444'
  };

  // Helper function to safely convert timestamp to Date
  const convertToDate = (timestamp) => {
    if (!timestamp) return new Date();
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firestore Timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // If it's a Firestore Timestamp with seconds and nanoseconds
    if (timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }
    
    // If it's a string or number, try to parse it
    return new Date(timestamp);
  };

  // Fetch all data from Firebase
  useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        const userId = user.uid;
        
        // Get start and end dates for selected month
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        
        // Fetch user data
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (userError) {
          console.warn('Error fetching user data:', userError);
        }

        // Fetch mood data - only filter by userId, sort in JavaScript
        try {
          const moodQuery = query(
            collection(db, 'emotions'),
            where('userId', '==', userId),
            limit(100)
          );
          const moodSnapshot = await getDocs(moodQuery);
          const moodEntries = moodSnapshot.docs
            .map(doc => {
              const data = doc.data();
              try {
                return {
                  id: doc.id,
                  ...data,
                  date: convertToDate(data.timestamp)
                };
              } catch (dateError) {
                console.warn('Error converting timestamp for mood entry:', doc.id, dateError);
                return {
                  id: doc.id,
                  ...data,
                  date: new Date() // fallback to current date
                };
              }
            })
            .filter(entry => entry.date >= startDate && entry.date <= endDate)
            .sort((a, b) => b.date - a.date); // Sort by date descending
          
          setMoodData(moodEntries);
        } catch (moodError) {
          console.error('Error fetching mood data:', moodError);
          setMoodData([]);
        }

        // Fetch journal entries - only filter by userId, sort in JavaScript
        try {
          const journalQuery = query(
            collection(db, 'journalEntries'),
            where('userId', '==', userId),
            limit(30)
          );
          const journalSnapshot = await getDocs(journalQuery);
          const journalEntries = journalSnapshot.docs
            .map(doc => {
              const data = doc.data();
              try {
                return {
                  id: doc.id,
                  ...data,
                  date: convertToDate(data.timestamp)
                };
              } catch (dateError) {
                console.warn('Error converting timestamp for journal entry:', doc.id, dateError);
                return {
                  id: doc.id,
                  ...data,
                  date: new Date() // fallback to current date
                };
              }
            })
            .filter(entry => entry.date >= startDate && entry.date <= endDate)
            .sort((a, b) => b.date - a.date); // Sort by date descending
          
          setJournalData(journalEntries);
        } catch (journalError) {
          console.error('Error fetching journal data:', journalError);
          setJournalData([]);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user, selectedMonth, selectedYear]);

  // Generate insights from the data
  const generateInsights = async () => {
    if (moodData.length < 2) {
      alert('Please track at least 2 days of mood data to generate insights');
      return;
    }
    
    setPredictionLoading(true);
    try {
      // Prepare data for API request - matching Python backend structure
      const requestData = {
        moodData: moodData.map(entry => ({
          date: entry.date.toISOString().split('T')[0],
          emotion: entry.emotion,
          intensity: entry.intensity || 5
        })),
        sleepData: [], // Empty array as we don't have sleep data
        focusData: []  // Empty array as we don't have focus data
      };

      console.log('Sending request to API:', requestData);

      // Call your FastAPI endpoint
      const response = await fetch('http://localhost:8003/api/insights', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API Result:', result);
      setInsights(result);
      
    } catch (error) {
      console.error('Error generating insights:', error);
      alert(`Failed to generate insights: ${error.message}`);
    } finally {
      setPredictionLoading(false);
    }
  };

  // Prepare timeline data for charts
  const prepareTimelineData = () => {
    const dateMap = new Map();
    
    // Combine mood and journal data by date
    [...moodData, ...journalData].forEach(entry => {
      const dateKey = entry.date.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { 
          date: entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateObj: entry.date
        });
      }
      
      // Mood data
      if ('emotion' in entry) {
        dateMap.get(dateKey).mood = entry.emotion;
        dateMap.get(dateKey).moodScore = getMoodScore(entry.emotion);
        dateMap.get(dateKey).intensity = entry.intensity;
      }
      
      // Journal data
      if ('content' in entry) {
        dateMap.get(dateKey).journal = entry.content;
        dateMap.get(dateKey).journalMood = entry.mood;
      }
    });
    
    return Array.from(dateMap.values()).sort((a, b) => 
      a.dateObj - b.dateObj
    );
  };

  const getMoodScore = (mood) => {
    const scores = {
      'happy': 9, 'excited': 8, 'calm': 7, 'neutral': 5,
      'anxious': 4, 'sad': 3, 'angry': 2, 'tired': 4, 'stressed': 3
    };
    return scores[mood?.toLowerCase()] || 5;
  };

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
      const dateKey = date.toISOString().split('T')[0];
      
      const moodEntry = moodData.find(entry => 
        entry.date.toISOString().split('T')[0] === dateKey
      );
      
      const journalEntry = journalData.find(entry => 
        entry.date.toISOString().split('T')[0] === dateKey
      );
      
      days.push(
        <div key={day} className="h-16 p-1 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
          <div className="text-sm font-medium text-gray-700">{day}</div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {moodEntry && (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: moodColors[moodEntry.emotion] || '#6B7280' }}
                title={`Mood: ${moodEntry.emotion} (Intensity: ${moodEntry.intensity})`}
              ></div>
            )}
            {journalEntry && (
              <div 
                className="w-2 h-2 rounded-full bg-blue-400"
                title="Journal entry"
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
        
        <div className="flex flex-wrap gap-4 mt-6 text-sm">
          {Object.entries(moodColors).map(([mood, color]) => (
            <div key={mood} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="capitalize">{mood}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span>Journal</span>
          </div>
        </div>
      </div>
    );
  };

  const timelineData = prepareTimelineData();

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
              <p className="text-gray-600 mt-2">
                {userData?.preferences?.darkMode ? 'Dark mode' : 'Light mode'} | 
                Language: {userData?.preferences?.language || 'en'}
              </p>
              {userData && (
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    <span className="text-sm text-gray-600">Last Mood: {userData.lastMood || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm text-gray-600">Streak: {userData.stats?.currentStreak || 0} days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm text-gray-600">Entries: {moodData.length} moods, {journalData.length} journals</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={generateInsights}
              disabled={predictionLoading || moodData.length < 2}
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
            { id: 'correlations', label: 'Patterns', icon: TrendingUp },
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
            {timelineData.length > 0 && (
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent mb-6">
                  Mood & Journal Timeline
                </h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" domain={[0, 10]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="moodScore" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }} 
                        name="Mood Score"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'correlations' && moodData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Mood Intensity Distribution */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Activity size={20} className="text-indigo-600" />
                Mood Intensity
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodData.map(entry => ({
                    mood: entry.emotion,
                    intensity: entry.intensity,
                    color: moodColors[entry.emotion] || '#6B7280'
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mood" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="intensity" name="Intensity">
                      {moodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={moodColors[entry.emotion] || '#6B7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mood Distribution */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <PieChart size={20} className="text-indigo-600" />
                Mood Distribution
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        moodData.reduce((acc, entry) => {
                          acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([mood, count]) => ({
                        name: mood,
                        value: count,
                        color: moodColors[mood] || '#6B7280'
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.entries(moodColors).map(([mood, color], index) => (
                        <Cell key={`cell-${index}`} fill={color} />
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
                    <p className="text-3xl font-bold capitalize">{insights.prediction?.nextDayMood || 'neutral'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Confidence</p>
                    <p className="text-2xl font-bold">{Math.round((insights.prediction?.confidence || 0) * 100)}%</p>
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round((insights.prediction?.confidence || 0) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Mood Trend */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" />
                Mood Trend Analysis
              </h3>
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  insights.moodTrend === 'improving' ? 'bg-green-100 text-green-800' :
                  insights.moodTrend === 'declining' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  Trend: {insights.moodTrend || 'stable'}
                </div>
                {insights.correlations && (
                  <div className="flex gap-4 text-sm">
                    <span>Sleep-Mood: {(insights.correlations.sleep_mood || 0).toFixed(2)}</span>
                    <span>Focus-Mood: {(insights.correlations.focus_mood || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-600" />
                Personalized Recommendations
              </h3>
              <div className="space-y-4">
                {insights.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-indigo-50 rounded-xl">
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <p className="text-gray-700">{rec}</p>
                  </div>
                )) || (
                  <p className="text-gray-600">No recommendations available yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && !insights && (
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50 text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain size={36} className="text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Insights Generated Yet</h3>
            <p className="text-gray-600 mb-6">Click "Generate AI Insights" to analyze your mood patterns</p>
            <button
              onClick={generateInsights}
              disabled={predictionLoading || moodData.length < 2}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50"
            >
              {predictionLoading ? 'Analyzing...' : 'Generate Insights'}
            </button>
            {moodData.length < 2 && (
              <p className="text-sm text-gray-500 mt-4">You need at least 2 days of mood data to generate insights</p>
            )}
          </div>
        )}

        {/* No Data Message */}
        {moodData.length === 0 && journalData.length === 0 && !loading && (
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={36} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Data Found</h3>
            <p className="text-gray-600 mb-4">
              No mood or journal entries found for {new Date(selectedYear, selectedMonth).toLocaleDateString('en', { month: 'long', year: 'numeric' })}.
            </p>
            <p className="text-sm text-gray-500">
              Try tracking your mood or writing a journal entry to see your data here.
            </p>
            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => window.location.href = '/mood-tracker'}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300"
              >
                Track Mood
              </button>
              <button 
                onClick={() => window.location.href = '/journal'}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
              >
                Write Journal
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {moodData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-indigo-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-2xl font-bold text-indigo-600">{moodData.length}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <BarChart3 size={24} className="text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-green-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Mood Score</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(moodData.reduce((sum, entry) => sum + getMoodScore(entry.emotion), 0) / moodData.length).toFixed(1)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Heart size={24} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-purple-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Most Common</p>
                  <p className="text-2xl font-bold text-purple-600 capitalize">
                    {moodData.length > 0 ? 
                      Object.entries(
                        moodData.reduce((acc, entry) => {
                          acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
                          return acc;
                        }, {})
                      ).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Target size={24} className="text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-blue-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Journal Entries</p>
                  <p className="text-2xl font-bold text-blue-600">{journalData.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Moon size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Entries */}
        {(moodData.length > 0 || journalData.length > 0) && (
          <div className="mt-8">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent mb-6">
                Recent Activity
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {[...moodData, ...journalData]
                  .sort((a, b) => b.date - a.date)
                  .slice(0, 10)
                  .map((entry, index) => (
                  <div key={entry.id || index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0">
                      {'emotion' in entry ? (
                        <div 
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: moodColors[entry.emotion] || '#6B7280' }}
                        ></div>
                      ) : (
                        <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {'emotion' in entry ? `Mood: ${entry.emotion}` : 'Journal Entry'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {entry.date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {'emotion' in entry && entry.intensity && (
                        <p className="text-sm text-gray-600">Intensity: {entry.intensity}/10</p>
                      )}
                      {'content' in entry && (
                        <p className="text-sm text-gray-600 truncate">{entry.content}</p>
                      )}
                      {'mood' in entry && entry.mood && (
                        <p className="text-sm text-gray-600">Journal mood: {entry.mood}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Your data is securely stored and only visible to you. 
            <span className="mx-2">•</span>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoodTimelineApp;