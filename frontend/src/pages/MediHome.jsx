import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const meditationOptions = [
  {
    id: 'eye-meditation',
    title: 'Eye Focus Meditation',
    description: 'Practice mindfulness while keeping your gaze steady. Great for concentration and reducing screen fatigue.',
    category: 'Mindfulness',
    difficulty: 'Easy',
    players: '1 Player',
    rating: 4.6,
    plays: 6823,
    tags: ['Meditation', 'Focus', 'Eye Movement'],
    gradient: 'from-indigo-400 to-purple-600',
    icon: '👁️',
    route: '/meditate',
    features: ['Eye-Tracking Timer', 'Relaxing Visuals', 'Focus Stats'],
    screenshots: ['👁️🕒🌿', '📈📊🧘‍♀️'],
    isNew: true,
    isPopular: true
  },
 
  {
    id: 'forest-focus',
    title: 'Forest Focus Timer',
    description: 'Stay focused and grow your virtual forest. Earn tokens for every completed focus session!',
    category: 'Productivity',
    difficulty: 'Medium',
    players: '1 Player',
    rating: 4.8,
    plays: 14231,
    tags: ['Focus', 'Pomodoro', 'Nature'],
    gradient: 'from-green-400 to-emerald-600',
    icon: '🌲',
    route: '/focus',
    features: ['Custom Timer', 'Virtual Trees', 'Earn Tokens'],
    screenshots: ['🌲⏳💎', '📅🍃🎯'],
    isNew: false,
    isPopular: true
  }
];

const MeditationHome = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // After successful login:
  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} user={user} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-10 text-center">🧘‍♂️ Meditation Hub</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {meditationOptions.map(option => (
              <Link
                key={option.id}
                to={option.route}
                className={`bg-gradient-to-r ${option.gradient} rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-transform duration-300`}
              >
                <div className="text-5xl mb-4">{option.icon}</div>
                <h2 className="text-2xl font-bold mb-2">{option.title}</h2>
                <p className="text-white/90 mb-4">{option.description}</p>
                <div className="text-sm text-white/70">
                  <p><strong>Category:</strong> {option.category}</p>
                  <p><strong>Difficulty:</strong> {option.difficulty}</p>
                  <p><strong>Rating:</strong> ⭐ {option.rating}</p>
                  <p><strong>Plays:</strong> {option.plays.toLocaleString()}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {option.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white/20 text-white text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MeditationHome;