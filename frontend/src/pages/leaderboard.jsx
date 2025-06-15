import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, Zap, TrendingUp, Users, Award, Flame, Target, Brain, Heart, RefreshCw, Calendar, Activity } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../utils/firebase';
import Navbar from '../components/Navbar';

const WellnessLeaderboard = () => {
  const [user] = useAuthState(auth);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('xp');
  const [animationTrigger, setAnimationTrigger] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchLeaderboardData();
  }, [activeTab, timeFilter]);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      let q;
      
      // Create query based on active tab
      switch (activeTab) {
        case 'xp':
          q = query(
            collection(db, 'users'),
            orderBy('xpPoints', 'desc'),
            limit(50)
          );
          break;
        case 'streak':
          q = query(
            collection(db, 'users'),
            orderBy('currentStreak', 'desc'),
            limit(50)
          );
          break;
        case 'habits':
          q = query(
            collection(db, 'users'),
            orderBy('totalHabits', 'desc'),
            limit(50)
          );
          break;
        case 'longest':
          q = query(
            collection(db, 'users'),
            orderBy('longestStreak', 'desc'),
            limit(50)
          );
          break;
        default:
          q = query(
            collection(db, 'users'),
            orderBy('xpPoints', 'desc'),
            limit(50)
          );
      }

      const querySnapshot = await getDocs(q);
      const userData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.username && data.xpPoints !== undefined) {
          userData.push({
            uid: doc.id,
            ...data
          });
        }
      });

      // Filter by time if needed
      let filteredData = userData;
      if (timeFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (timeFilter) {
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
          case 'today':
            filterDate.setDate(now.getDate() - 1);
            break;
        }
        
        filteredData = userData.filter(user => {
          const lastActivity = new Date(user.updatedAt || user.createdAt);
          return lastActivity >= filterDate;
        });
      }

      setUsers(filteredData);
      setAnimationTrigger(prev => !prev);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchLeaderboardData();
    setRefreshing(false);
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-400 to-blue-400 flex items-center justify-center text-white text-sm font-bold">{rank}</div>;
    }
  };

  const getRankBg = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 via-yellow-50 to-amber-100 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-100 via-slate-50 to-gray-100 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border-amber-300';
      default:
        return 'bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border-indigo-200';
    }
  };

  const getStatValue = (userData, tab) => {
    switch (tab) {
      case 'xp':
        return userData.xpPoints || 0;
      case 'streak':
        return userData.currentStreak || 0;
      case 'habits':
        return userData.totalHabits || 0;
      case 'longest':
        return userData.longestStreak || 0;
      default:
        return userData.xpPoints || 0;
    }
  };

  const getStatLabel = (tab) => {
    switch (tab) {
      case 'xp':
        return 'XP';
      case 'streak':
        return 'Days';
      case 'habits':
        return 'Habits';
      case 'longest':
        return 'Days';
      default:
        return 'XP';
    }
  };

  const getCurrentUserRank = () => {
    if (!user) return null;
    const userIndex = users.findIndex(u => u.uid === user.uid);
    return userIndex !== -1 ? userIndex + 1 : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <div className="relative">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-indigo-500 animate-pulse" />
            <div className="absolute -top-2 -right-2">
              <Star className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Loading Leaderboard...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Wellness Champions
                </h1>
                <p className="text-gray-600 flex items-center mt-1">
                  <Users className="w-4 h-4 mr-1" />
                  {users.length} active members competing
                </p>
              </div>
            </div>
            
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Current User Stats */}
          {user && getCurrentUserRank() && (
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-2xl p-4 text-white mb-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Crown className="w-6 h-6 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Your Rank: #{getCurrentUserRank()}</h3>
                    <p className="text-white/80">Keep pushing forward!</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{getStatValue(users.find(u => u.uid === user.uid) || {}, activeTab)}</div>
                  <div className="text-white/80 text-sm">{getStatLabel(activeTab)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: 'xp', label: 'XP Points', icon: <Zap className="w-4 h-4" />, color: 'from-yellow-500 to-orange-500' },
              { id: 'streak', label: 'Current Streak', icon: <Flame className="w-4 h-4" />, color: 'from-red-500 to-pink-500' },
              { id: 'habits', label: 'Total Habits', icon: <Target className="w-4 h-4" />, color: 'from-green-500 to-emerald-500' },
              { id: 'longest', label: 'Longest Streak', icon: <TrendingUp className="w-4 h-4" />, color: 'from-purple-500 to-indigo-500' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all transform hover:scale-105 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'bg-white/60 text-gray-700 hover:bg-white/80'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Time Filter */}
          <div className="flex space-x-2">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'month', label: 'This Month' },
              { id: 'week', label: 'This Week' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setTimeFilter(filter.id)}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  timeFilter === filter.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/60 text-gray-600 hover:bg-white/80'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {users.map((userData, index) => {
            const rank = index + 1;
            const isCurrentUser = user && userData.uid === user.uid;
            const level = Math.floor((userData.xpPoints || 0) / 100) + 1;
            
            return (
              <div
                key={userData.uid}
                className={`${getRankBg(rank)} ${isCurrentUser ? 'ring-2 ring-indigo-400 ring-offset-2' : ''} 
                  rounded-2xl border-2 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animation: animationTrigger ? 'fadeInUp 0.6s ease-out forwards' : 'none'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Rank */}
                    <div className="flex items-center space-x-2">
                      {getRankIcon(rank)}
                      {rank <= 3 && (
                        <div className="flex space-x-1">
                          {[...Array(4 - rank)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                        rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                        rank === 3 ? 'bg-gradient-to-r from-amber-400 to-orange-600' :
                        'bg-gradient-to-r from-indigo-400 to-blue-500'
                      }`}>
                        {userData.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-lg text-gray-800">
                            {userData.username}
                            {isCurrentUser && (
                              <span className="ml-2 text-sm bg-indigo-500 text-white px-2 py-1 rounded-full">You</span>
                            )}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Brain className="w-3 h-3 mr-1" />
                            Level {level}
                          </span>
                          <span className="flex items-center">
                            <Activity className="w-3 h-3 mr-1" />
                            {userData.totalHabits || 0} habits
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {userData.currentStreak || 0} day streak
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                      {getStatValue(userData, activeTab).toLocaleString()}
                    </div>
                    <div className="text-gray-600 text-sm font-medium">{getStatLabel(activeTab)}</div>
                    
                    {/* Progress indicators */}
                    <div className="mt-2 flex justify-end space-x-1">
                      {userData.xpPoints >= 1000 && <Zap className="w-4 h-4 text-yellow-500" />}
                      {(userData.currentStreak || 0) >= 7 && <Flame className="w-4 h-4 text-red-500" />}
                      {(userData.totalHabits || 0) >= 20 && <Target className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Champions Yet</h3>
            <p className="text-gray-500">Be the first to appear on the leaderboard!</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
    </>
  );
};

export default WellnessLeaderboard;