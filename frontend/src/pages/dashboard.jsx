import React, { useState, useEffect } from 'react';
import { User, Trophy, Flame, Target, Calendar, Star, Award, TrendingUp, Zap, Heart, BookOpen, Brain } from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/firebase';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [user, loading, error] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [journalEntries, setJournalEntries] = useState([]);
  const [emotionLogs, setEmotionLogs] = useState([]);
  const [wellnessStats, setWellnessStats] = useState({
    totalJournalEntries: 0,
    totalEmotionLogs: 0,
    averageMood: 'neutral',
    lastActivity: null
  });
  
  // Calculate level from XP
  const calculateLevel = (xp = 0) => Math.floor(xp / 100) + 1;
  const calculateXPForNextLevel = (xp = 0) => (Math.floor(xp / 100) + 1) * 100;
  const calculateXPProgress = (xp = 0) => xp % 100;

  // Helper function to safely get timestamp value
  const getTimestampValue = (timestamp) => {
    if (!timestamp) return 0;
    if (timestamp.seconds) return timestamp.seconds * 1000; // Firestore timestamp
    if (timestamp instanceof Date) return timestamp.getTime();
    return timestamp; // Assume it's already a number
  };

  // Firebase data fetch - UPDATED TO AVOID INDEX REQUIREMENTS
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      setDataError('User not authenticated');
      setDataLoading(false);
      return;
    }

    const fetchAllData = async () => {
      try {
        setDataLoading(true);
        setDataError(null);
        
        // Fetch user data
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          setDataError('User data not found. Please complete your profile.');
          return;
        }

        const userDataFromDB = userDocSnap.data();
        setUserData(userDataFromDB);

        // Fetch journal entries - WITHOUT orderBy to avoid index requirements
        const journalQuery = query(
          collection(db, 'journalEntries'),
          where('userId', '==', user.uid),
          limit(50) // Get more entries to ensure we have enough after client-side sorting
        );
        const journalSnapshot = await getDocs(journalQuery);
        const allJournalData = journalSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        // Sort client-side by timestamp (most recent first)
        const sortedJournalData = allJournalData
          .sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp))
          .slice(0, 5); // Take only the 5 most recent
        setJournalEntries(sortedJournalData);

        // Fetch emotion logs - WITHOUT orderBy to avoid index requirements
        const emotionQuery = query(
          collection(db, 'emotions'),
          where('userId', '==', user.uid),
          limit(50) // Get more entries to ensure we have enough after client-side sorting
        );
        const emotionSnapshot = await getDocs(emotionQuery);
        const allEmotionData = emotionSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        // Sort client-side by timestamp (most recent first)
        const sortedEmotionData = allEmotionData
          .sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp))
          .slice(0, 10); // Take only the 10 most recent
        setEmotionLogs(sortedEmotionData);

        // Calculate wellness stats using all data
        const stats = {
          totalJournalEntries: allJournalData.length,
          totalEmotionLogs: allEmotionData.length,
          averageMood: sortedEmotionData.length > 0 ? sortedEmotionData[0].emotion : 'neutral',
          lastActivity: sortedJournalData.length > 0 ? sortedJournalData[0].timestamp : null
        };
        setWellnessStats(stats);

      } catch (error) {
        console.error("Error fetching data:", error);
        setDataError('Failed to load dashboard data. Please try again.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchAllData();
  }, [user, loading]);

  const StatCard = ({ icon: Icon, title, value, subtitle, gradient, pulse = false }) => (
    <div className={`group p-6 rounded-3xl bg-gradient-to-br ${gradient} text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer relative overflow-hidden ${pulse ? 'animate-pulse' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
          <Icon size={24} className="text-white" />
        </div>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
    </div>
  );

  const XPProgressBar = ({ level, currentXPProgress, totalXP }) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-indigo-200/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {level}
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <Star size={12} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-2xl text-gray-800">Level {level}</h3>
            <p className="text-gray-600 flex items-center gap-2">
              <Zap size={16} className="text-indigo-500" />
              {totalXP || 0} XP Total
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Next Reward</p>
          <p className="font-bold text-indigo-600">{100 - currentXPProgress} XP</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm font-medium text-gray-700">
          <span>Progress to Level {level + 1}</span>
          <span>{currentXPProgress}/100 XP</span>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
            <div 
              className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 h-4 rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden"
              style={{ width: `${currentXPProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const AchievementSection = ({ userData }) => {
    const achievements = [
      { 
        name: "First Steps", 
        desc: "Started your wellness journey", 
        earned: userData && (userData.xpPoints || 0) > 0, 
        icon: Target 
      },
      { 
        name: "Mood Tracker", 
        desc: "Logged your first emotion", 
        earned: emotionLogs.length > 0, 
        icon: Heart 
      },
      { 
        name: "Journal Writer", 
        desc: "Created your first journal entry", 
        earned: journalEntries.length > 0, 
        icon: BookOpen 
      },
      { 
        name: "Consistent User", 
        desc: "Maintain a 3-day streak", 
        earned: userData && (userData.currentStreak || 0) >= 3, 
        icon: Flame 
      },
      { 
        name: "Wellness Warrior", 
        desc: "Reach 500 XP points", 
        earned: userData && (userData.xpPoints || 0) >= 500, 
        icon: Trophy 
      }
    ];

    return (
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-200/50">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-2">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Recent Achievements
          </h2>
          <div className="text-sm text-gray-500">
            {userData && (userData.xpPoints || 0) > 0 ? 'Keep going!' : 'Start your journey'}
          </div>
        </div>
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4">
          {achievements.map((achievement, idx) => (
            <div 
              key={idx}
              className={`min-w-56 sm:min-w-64 p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                achievement.earned 
                  ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 via-indigo-50 to-white shadow-lg' 
                  : 'border-gray-200 bg-gray-50/80 opacity-60'
              }`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full mb-3 sm:mb-4 flex items-center justify-center ${
                achievement.earned 
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg' 
                  : 'bg-gray-300'
              }`}>
                <achievement.icon size={18} className="text-white" />
              </div>
              <h4 className="font-bold text-sm sm:text-base mb-2">{achievement.name}</h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{achievement.desc}</p>
              {achievement.earned && (
                <div className="mt-2 sm:mt-3 text-xs text-indigo-600 font-medium">✓ Achieved!</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const RecentActivity = () => {
    // Helper function to format timestamp for display
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return 'Unknown date';
      
      let date;
      if (timestamp.seconds) {
        // Firestore timestamp
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleDateString();
    };

    return (
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-200/50">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent mb-6">
          Recent Activity
        </h2>
        
        <div className="space-y-4">
          {journalEntries.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500" />
                Latest Journal Entries
              </h3>
              <div className="space-y-2">
                {journalEntries.slice(0, 3).map((entry, idx) => (
                  <div key={entry.id} className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {entry.content ? entry.content.substring(0, 100) + '...' : 'No content available'}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">
                      {formatTimestamp(entry.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {emotionLogs.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Heart size={18} className="text-indigo-500" />
                Recent Mood Logs
              </h3>
              <div className="flex flex-wrap gap-2">
                {emotionLogs.slice(0, 5).map((emotion, idx) => (
                  <div key={emotion.id} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                    {emotion.emotion} • {formatTimestamp(emotion.timestamp)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {journalEntries.length === 0 && emotionLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen size={24} className="text-gray-400" />
              </div>
              <p className="font-medium mb-2">No activity yet</p>
              <p className="text-sm">Start by creating your first journal entry or logging your mood!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle authentication loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-indigo-600 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Handle authentication error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
          <p className="text-red-600 font-medium mb-2">Authentication Error</p>
          <p className="text-gray-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Handle no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <User size={24} className="text-yellow-600" />
          </div>
          <p className="text-gray-600 font-medium mb-2">Please log in to continue</p>
          <p className="text-gray-500 text-sm">You need to be authenticated to access the dashboard</p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-indigo-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
          <p className="text-red-600 font-medium mb-2">Error loading dashboard</p>
          <p className="text-gray-600 text-sm">{dataError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No user data found. Please complete your profile.</p>
        </div>
      </div>
    );
  }

  const level = calculateLevel(userData.xpPoints);
  const currentXPProgress = calculateXPProgress(userData.xpPoints);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-indigo-100 to-white">
      {/* Subtle background pattern */}
      <Navbar/>
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6">
        {/* Enhanced Header */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 sm:p-8 shadow-2xl mb-6 sm:mb-8 border border-indigo-200/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-xl">
                  {userData.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                  Welcome back, {userData.username || user?.email?.split('@')[0] || 'User'}!
                </h1>
                <p className="text-gray-600 flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <Calendar size={16} />
                  Member since {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                <TrendingUp size={16} />
                Level {level}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* XP Progress */}
          <XPProgressBar 
            level={level} 
            currentXPProgress={currentXPProgress} 
            totalXP={userData.xpPoints || 0} 
          />
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              icon={Flame}
              title="Current Streak"
              value={userData.currentStreak || 0}
              subtitle={`${userData.longestStreak || 0} longest streak`}
              gradient="from-orange-400 via-red-500 to-pink-500"
              pulse={(userData.currentStreak || 0) > 0}
            />
            <StatCard
              icon={Heart}
              title="Mood Logs"
              value={wellnessStats.totalEmotionLogs}
              subtitle={`Last: ${wellnessStats.averageMood}`}
              gradient="from-indigo-400 via-indigo-500 to-indigo-600"
            />
            <StatCard
              icon={BookOpen}
              title="Journal Entries"
              value={wellnessStats.totalJournalEntries}
              subtitle="personal reflections"
              gradient="from-blue-400 via-cyan-500 to-indigo-500"
            />
            <StatCard
              icon={Award}
              title="Total XP"
              value={userData.xpPoints || 0}
              subtitle="experience points"
              gradient="from-purple-400 via-violet-500 to-indigo-500"
            />
          </div>

          {/* Achievement Badges */}
          <AchievementSection userData={userData} />

          {/* Recent Activity */}
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;