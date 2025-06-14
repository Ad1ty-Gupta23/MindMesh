import { useState, useEffect } from 'react';
import { Play, Star, Clock, Trophy, Users, Gamepad2, Zap, Target, Sparkles, ChevronRight, Search, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';

const GAMES_DATA = [
  {
    id: 'fruit-catcher',
    title: 'Fruit Catcher Deluxe',
    description: 'Catch falling fruits, build combos, and achieve high scores in this addictive arcade game with smooth controls and particle effects!',
    category: 'Arcade',
    difficulty: 'Easy',
    players: '1 Player',
    rating: 4.8,
    plays: 15420,
    tags: ['Arcade', 'Casual', 'High Score', 'Family Friendly'],
    gradient: 'from-orange-400 to-red-500',
    icon: '🍎',
    route: '/fruit',
    features: ['Combo System', 'Level Progression', 'Particle Effects', 'Smooth Controls'],
    screenshots: ['🍎🍊🍋', '🎯⭐💫', '🏆🎮🔥'],
    isNew: false,
    isPopular: true
  },
  
  {
    id: 'space-shooter',
    title: 'Cosmic Defender',
    description: 'Defend Earth from alien invaders in this fast-paced space shooter with power-ups and epic boss battles!',
    category: 'Action',
    difficulty: 'Medium',
    players: '1 Player',
    rating: 4.6,
    plays: 8932,
    tags: ['Action', 'Shooter', 'Sci-Fi', 'Power-ups'],
    gradient: 'from-purple-500 to-blue-600',
    icon: '🚀',
    route: 'cosmic',
    features: ['Multiple Weapons', 'Boss Battles', 'Power-ups', 'Endless Mode'],
    screenshots: ['🚀👾🌟', '💥⚡🎆', '🛸🌍🔫'],
    isNew: true,
    isPopular: false
  },
  {
    id: 'puzzle-master',
    title: 'Puzzle Master',
    description: 'Challenge your mind with increasingly complex puzzles and brain teasers that will test your logic skills!',
    category: 'Puzzle',
    difficulty: 'Hard',
    players: '1 Player',
    rating: 4.7,
    plays: 12543,
    tags: ['Puzzle', 'Brain Training', 'Logic', 'Educational'],
    gradient: 'from-green-400 to-emerald-600',
    icon: '🧩',
    route: null,
    features: ['100+ Levels', 'Hint System', 'Daily Challenges', 'Leaderboards'],
    screenshots: ['🧩🔢🎲', '🧠💡⚡', '🎯🏆📊'],
    isNew: false,
    isPopular: false
  },
  {
    id: 'racing-fury',
    title: 'Racing Fury',
    description: 'Experience high-speed racing with stunning visuals, realistic physics, and competitive multiplayer action!',
    category: 'Racing',
    difficulty: 'Medium',
    players: '1-4 Players',
    rating: 4.5,
    plays: 9876,
    tags: ['Racing', 'Multiplayer', '3D', 'Competition'],
    gradient: 'from-red-500 to-yellow-500',
    icon: '🏎️',
    route: null,
    features: ['Realistic Physics', 'Multiple Tracks', 'Car Customization', 'Online Multiplayer'],
    screenshots: ['🏎️💨🏁', '🛣️🌆🎮', '🏆🥇⚡'],
    isNew: false,
    isPopular: false
  },
  {
    id: 'tower-defense',
    title: 'Tower Defense Pro',
    description: 'Strategically place towers to defend your base from waves of enemies in this tactical defense game!',
    category: 'Strategy',
    difficulty: 'Hard',
    players: '1 Player',
    rating: 4.4,
    plays: 6754,
    tags: ['Strategy', 'Tower Defense', 'Tactical', 'Wave Survival'],
    gradient: 'from-indigo-500 to-purple-600',
    icon: '🏰',
    route: null,
    features: ['25+ Tower Types', 'Epic Boss Fights', 'Upgrade System', 'Campaign Mode'],
    screenshots: ['🏰⚔️👾', '💥🎯🛡️', '⭐🏆💎'],
    isNew: false,
    isPopular: false
  }
];

const CATEGORIES = ['All', 'Arcade', 'Action', 'Strategy', 'Puzzle', 'Racing'];

export default function GamesHub() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredGame, setFeaturedGame] = useState(GAMES_DATA[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // After successful login:
  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };


  // Rotate featured game between available games
  useEffect(() => {
    const availableGames = GAMES_DATA.filter(game => game.route);
    const interval = setInterval(() => {
      setFeaturedGame(prev => {
        const currentIndex = availableGames.findIndex(game => game.id === prev.id);
        const nextIndex = (currentIndex + 1) % availableGames.length;
        return availableGames[nextIndex];
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const filteredGames = GAMES_DATA.filter(game => {
    const matchesCategory = selectedCategory === 'All' || game.category === selectedCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'plays':
        return b.plays - a.plays;
      case 'name':
        return a.title.localeCompare(b.title);
      default: // popular
        return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
    }
  });

  const playGame = (game) => {
    if (game.route) {
      window.location.href = game.route;
    } else {
      // Show coming soon message for unavailable games
      alert(`${game.title} is coming soon! Stay tuned for updates.`);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-400/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'Hard': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  return (
    <>
    <Navbar isLoggedIn={isLoggedIn} user={user} />
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <header className="relative bg-black/30 backdrop-blur-xl border-b border-white/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Gamepad2 className="w-10 h-10 text-yellow-400 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                  GameHub
                </h1>
                <p className="text-sm text-gray-300">Your Ultimate Gaming Destination</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-full text-xs font-bold animate-bounce">
                  ARCADE
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full text-xs font-bold">
                  NEW GAMES
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-white">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Users className="w-5 h-5 text-green-400" />
                <span className="font-semibold">1,247 Online</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">Level 15</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative container mx-auto px-4 py-8">
        {/* Featured Game Hero Section */}
        <div className={`relative rounded-3xl p-8 mb-12 overflow-hidden bg-gradient-to-r ${featuredGame.gradient} shadow-2xl`}>
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
          
          <div className="relative z-10 flex items-center justify-between text-white">
            <div className="flex-1 max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-yellow-300 animate-spin" style={{animationDuration: '3s'}} />
                <span className="text-lg font-semibold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  ⭐ Featured Game
                </span>
                {featuredGame.isNew && (
                  <span className="text-sm font-bold bg-green-500 px-2 py-1 rounded-full animate-pulse">NEW!</span>
                )}
              </div>
              
              <h2 className="text-6xl font-bold mb-4 drop-shadow-lg">{featuredGame.title}</h2>
              <p className="text-xl mb-6 opacity-90 leading-relaxed">{featuredGame.description}</p>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Star className="w-5 h-5 text-yellow-300 fill-current" />
                  <span className="font-semibold">{featuredGame.rating}/5</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">{featuredGame.plays.toLocaleString()} plays</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Target className="w-5 h-5" />
                  <span className="font-semibold">{featuredGame.difficulty}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">{featuredGame.players}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {featuredGame.features.map((feature, index) => (
                  <span key={index} className="px-3 py-1 bg-white/10 rounded-full text-sm backdrop-blur-sm">
                    ✨ {feature}
                  </span>
                ))}
              </div>
              
              <button
                onClick={() => playGame(featuredGame)}
                className={`px-10 py-4 bg-white text-black rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 flex items-center gap-3 group shadow-2xl ${
                  !featuredGame.route ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-3xl'
                }`}
                disabled={!featuredGame.route}
              >
                <Play className="w-6 h-6 group-hover:scale-110 transition-transform fill-current" />
                {featuredGame.route ? 'Play Now' : 'Coming Soon'}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="text-[12rem] opacity-20 animate-bounce" style={{animationDuration: '3s'}}>
              {featuredGame.icon}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl text-white placeholder-gray-400 border border-white/20 focus:border-blue-400 focus:outline-none transition-all"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl text-white border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/70">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white border border-white/20 focus:outline-none"
              >
                <option value="popular">Popular</option>
                <option value="rating">Rating</option>
                <option value="plays">Most Played</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGames.map(game => (
            <div
              key={game.id}
              className="group relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              {/* Game Status Badges */}
              <div className="absolute top-4 right-4 flex gap-2">
                {game.isNew && (
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                    NEW
                  </span>
                )}
                {game.isPopular && (
                  <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
                    HOT
                  </span>
                )}
                {!game.route && (
                  <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded-full">
                    SOON
                  </span>
                )}
              </div>

              {/* Game Icon */}
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {game.icon}
              </div>

              {/* Game Info */}
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
                {game.title}
              </h3>
              
              <p className="text-gray-300 mb-4 leading-relaxed line-clamp-3">
                {game.description}
              </p>

              {/* Game Stats */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white font-semibold">{game.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm">{game.plays.toLocaleString()}</span>
                  </div>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDifficultyColor(game.difficulty)}`}>
                  {game.difficulty}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {game.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-white/10 text-white text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Play Button */}
              <button
                onClick={() => playGame(game)}
                className={`w-full py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                  game.route
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:shadow-lg'
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
                disabled={!game.route}
              >
                <Play className="w-5 h-5" />
                {game.route ? 'Play Game' : 'Coming Soon'}
              </button>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredGames.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold text-white mb-2">No games found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-16 bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-yellow-400">{GAMES_DATA.length}</div>
              <div className="text-gray-300">Total Games</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">{GAMES_DATA.filter(g => g.route).length}</div>
              <div className="text-gray-300">Available Now</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">
                {GAMES_DATA.reduce((sum, game) => sum + game.plays, 0).toLocaleString()}
              </div>
              <div className="text-gray-300">Total Plays</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">
                {(GAMES_DATA.reduce((sum, game) => sum + game.rating, 0) / GAMES_DATA.length).toFixed(1)}
              </div>
              <div className="text-gray-300">Average Rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}