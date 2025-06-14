import { useEffect, useRef, useState, useCallback } from 'react';
import { useHabitBlockchain } from '../context/HabitBlockchainContext';
import { toast } from 'react-toastify';


const FRUIT_SIZE = 40;
const BASKET_WIDTH = 120;
const BASKET_HEIGHT = 35;
const FALL_SPEED = 2.5;
const FRUIT_TYPES = [
  { emoji: '🍎', points: 10, color: 'text-red-500' },
  { emoji: '🍊', points: 15, color: 'text-orange-500' },
  { emoji: '🍋', points: 12, color: 'text-yellow-500' },
  { emoji: '🍉', points: 20, color: 'text-green-500' },
  { emoji: '🍇', points: 18, color: 'text-purple-500' },
  { emoji: '🍓', points: 25, color: 'text-pink-500' },
  { emoji: '🍑', points: 30, color: 'text-red-600' },
  { emoji: '🍍', points: 35, color: 'text-yellow-600' },
  { emoji: '🥝', points: 40, color: 'text-green-600' },
  { emoji: '🥭', points: 45, color: 'text-orange-600' }
];

function getRandomX(max) {
  return Math.floor(Math.random() * (max - FRUIT_SIZE));
}

function getRandomFruit() {
  return FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
}

function createParticle(x, y, color) {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8,
    life: 1,
    color,
    size: Math.random() * 4 + 2
  };
}

export default function Game() {
  const [basketX, setBasketX] = useState(140);
  const [fruits, setFruits] = useState([]);
  const [particles, setParticles] = useState([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [spawnRate, setSpawnRate] = useState(1200);
  const [effects, setEffects] = useState([]);
  const gameAreaRef = useRef();
  const keysPressed = useRef(new Set());
  const { account, connectWallet, userData, completeTask, isLoading, loadUserData } = useHabitBlockchain();
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);


  



  // Initialize high score
  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem('fruitCatcherData') || '{"highScore": 0}');
    setHighScore(saved.highScore);
  }, []);

  useEffect(() => {
  if (account) loadUserData();
}, [account, loadUserData]);


  // Update high score and level
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      sessionStorage.setItem('fruitCatcherData', JSON.stringify({ highScore: score }));
    }
    
    const newLevel = Math.floor(score / 200) + 1;
    if (newLevel !== level) {
      setLevel(newLevel);
      setSpawnRate(Math.max(600, 1200 - (newLevel * 100)));
      showEffect('LEVEL UP!', 'text-yellow-400', 'animate-bounce');
    }
  }, [score, highScore, level]);

  // Combo system
  useEffect(() => {
    if (comboTimer > 0) {
      const timer = setTimeout(() => {
        setComboTimer(comboTimer - 1);
        if (comboTimer === 1) {
          setCombo(0);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [comboTimer]);

  const showEffect = useCallback((text, className = '', animClass = '') => {
    const id = Date.now() + Math.random();
    setEffects(prev => [...prev, { id, text, className, animClass }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== id));
    }, 2000);
  }, []);

  const addParticles = useCallback((x, y, color, count = 8) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push(createParticle(x, y, color));
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Smooth keyboard handling
  const handleKeyDown = useCallback((e) => {
    keysPressed.current.add(e.key);
    
    if (e.key === 'p' || e.key === 'P') {
      setIsPaused(prev => !prev);
    } else if (gameOver && (e.key === 'r' || e.key === 'R')) {
      resetGame();
    } else if (!gameStarted && e.key === ' ') {
      setGameStarted(true);
    }
  }, [gameOver, gameStarted]);

  const handleClaimReward = async () => {
  if (!account) {
    toast.warning("Connect your wallet to claim rewards");
    return;
  }

  if (!userData?.isActive) {
    toast.warning("Stake tokens to activate your account");
    return;
  }

  const reward = Math.floor(score / 100);
  if (reward === 0) {
    toast.info("Score too low for reward");
    return;
  }

  setIsClaiming(true); // ⏳ Start loading
  try {
    await completeTask(reward);
    await loadUserData();
    toast.success(`🎉 You earned ${reward} tokens!`);
    setRewardClaimed(true);
    setSessionComplete(false);
  } catch (err) {
    console.error(err);
    toast.error("Failed to claim reward");
  } finally {
    setIsClaiming(false); // ✅ Stop loading
  }
};


  const handleKeyUp = useCallback((e) => {
    keysPressed.current.delete(e.key);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Smooth basket movement
  useEffect(() => {
    if (gameOver || !gameStarted || isPaused) return;
    
    const moveBasket = () => {
      const speed = 8;
      let newX = basketX;
      
      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a') || keysPressed.current.has('A')) {
        newX = Math.max(newX - speed, 0);
      }
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d') || keysPressed.current.has('D')) {
        newX = Math.min(newX + speed, 400 - BASKET_WIDTH);
      }
      
      if (newX !== basketX) {
        setBasketX(newX);
      }
    };

    const interval = setInterval(moveBasket, 16);
    return () => clearInterval(interval);
  }, [basketX, gameOver, gameStarted, isPaused]);

  // Spawn fruits
  useEffect(() => {
    if (gameOver || !gameStarted || isPaused) return;
    
    const interval = setInterval(() => {
      setFruits(prev => [
        ...prev, 
        { 
          x: getRandomX(400), 
          y: -FRUIT_SIZE, 
          type: getRandomFruit(),
          rotation: Math.random() * 360,
          spinDirection: Math.random() > 0.5 ? 1 : -1,
          id: Date.now() + Math.random()
        }
      ]);
    }, spawnRate);
    return () => clearInterval(interval);
  }, [gameOver, gameStarted, isPaused, spawnRate]);

  // Update particles
  useEffect(() => {
    if (particles.length === 0) return;
    
    const interval = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02,
          vy: p.vy + 0.3
        }))
        .filter(p => p.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [particles.length]);

  // Game physics
  useEffect(() => {
    if (gameOver || !gameStarted || isPaused) return;
    
    const interval = setInterval(() => {
      setFruits(prev => {
        const updated = prev.map(fruit => ({ 
          ...fruit, 
          y: fruit.y + FALL_SPEED + (level * 0.5),
          rotation: fruit.rotation + (fruit.spinDirection * 4)
        }));
        
        const remaining = [];
        let newMissed = 0;
        
        updated.forEach(fruit => {
          const isCaught = fruit.y + FRUIT_SIZE >= 365 && 
                          fruit.x + FRUIT_SIZE/2 >= basketX && 
                          fruit.x + FRUIT_SIZE/2 <= basketX + BASKET_WIDTH;
          
          if (isCaught) {
            const points = fruit.type.points * (combo > 0 ? Math.min(combo, 5) : 1);
            setScore(s => s + points);
            setCombo(c => c + 1);
            setComboTimer(30);
            
            // Visual effects
            addParticles(fruit.x + FRUIT_SIZE/2, 365, fruit.type.color.replace('text-', ''), 12);
            showEffect(`+${points}`, fruit.type.color, 'animate-pulse');
            
            if (combo > 2) {
              showEffect(`${combo}x COMBO!`, 'text-yellow-300', 'animate-bounce');
            }
          } else if (fruit.y > 400) {
            newMissed++;
            addParticles(fruit.x + FRUIT_SIZE/2, 400, 'text-gray-400', 6);
          } else {
            remaining.push(fruit);
          }
        });
        
        if (newMissed > 0) {
          setMissed(m => m + newMissed);
          setCombo(0);
          setComboTimer(0);
        }
        
        return remaining;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [basketX, gameOver, gameStarted, isPaused, level, combo, addParticles, showEffect]);

  useEffect(() => {
  if (missed >= 5) {
    setGameOver(true);
    setSessionComplete(true); // <== ADD THIS LINE
    showEffect('GAME OVER', 'text-red-400', 'animate-pulse');
  }
}, [missed, showEffect]);


  const resetGame = () => {
    setScore(0);
    setMissed(0);
    setFruits([]);
    setParticles([]);
    setEffects([]);
    setGameOver(false);
    setGameStarted(false);
    setBasketX(140);
    setLevel(1);
    setCombo(0);
    setComboTimer(0);
    setSpawnRate(1200);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 animate-pulse">
        🍎 Fruit Catcher Deluxe 🍎
      </h1>
      
      <div
        className="relative w-[400px] h-[400px] mx-auto bg-gradient-to-b from-sky-300 via-sky-200 to-green-200 border-4 border-yellow-600 rounded-2xl overflow-hidden shadow-2xl"
        ref={gameAreaRef}
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating clouds */}
          <div className="absolute top-8 left-16 w-20 h-12 bg-white rounded-full opacity-90 animate-pulse"></div>
          <div className="absolute top-20 right-20 w-16 h-8 bg-white rounded-full opacity-80 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-12 left-1/2 w-24 h-10 bg-white rounded-full opacity-75 animate-pulse" style={{animationDelay: '2s'}}></div>
          
          {/* Sun */}
          <div className="absolute top-4 right-4 w-12 h-12 bg-yellow-400 rounded-full animate-spin" style={{animationDuration: '20s'}}>
            <div className="absolute inset-1 bg-yellow-300 rounded-full"></div>
          </div>
        </div>

        {/* Enhanced HUD */}
        <div className="absolute top-2 left-2 right-2 bg-black bg-opacity-40 backdrop-blur-sm p-3 rounded-xl shadow-lg">
          <div className="flex justify-between items-center text-white">
            <div className="flex flex-col">
              <span className="text-xl font-bold">Score: <span className="text-yellow-300">{score.toLocaleString()}</span></span>
              <span className="text-sm opacity-80">High: {highScore.toLocaleString()}</span>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold">Level {level}</span>
              {combo > 1 && (
                <div className="text-sm text-yellow-300 animate-pulse">{combo}x Combo!</div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold">Missed: 
                <span className={missed >= 3 ? 'text-red-400' : 'text-green-400'}> {missed}/5</span>
              </span>
              {isPaused && <span className="text-xs bg-yellow-500 px-2 py-1 rounded animate-pulse">PAUSED</span>}
            </div>
          </div>
        </div>

        {/* Particles */}
        {particles.map((particle, index) => (
          <div
            key={index}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color.includes('text-') ? 
                `hsl(${Math.random() * 360}, 70%, 60%)` : particle.color,
              opacity: particle.life,
              transform: `scale(${particle.life})`
            }}
          />
        ))}

        {/* Effects */}
        {effects.map(effect => (
          <div
            key={effect.id}
            className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold ${effect.className} ${effect.animClass} pointer-events-none z-50`}
          >
            {effect.text}
          </div>
        ))}

        {/* Enhanced Fruits */}
        {fruits.map(fruit => (
          <div
            key={fruit.id}
            className="absolute w-10 h-10 flex items-center justify-center text-4xl transition-all duration-100 drop-shadow-lg"
            style={{ 
              left: fruit.x, 
              top: fruit.y,
              transform: `rotate(${fruit.rotation}deg) scale(1.1)`,
              filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
            }}
          >
            {fruit.type.emoji}
          </div>
        ))}

        {/* Enhanced Basket */}
        <div className="absolute bottom-4" style={{ left: basketX }}>
          <div className="w-[120px] h-[35px] bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 rounded-lg shadow-lg border-2 border-amber-800 relative overflow-hidden">
            <div className="absolute inset-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-md"></div>
            <div className="absolute top-1 left-2 right-2 h-2 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-sm"></div>
            <div className="absolute -top-1 left-2 right-2 h-3 bg-gradient-to-r from-amber-700 to-yellow-700 rounded-t-lg border border-amber-800"></div>
          </div>
        </div>

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm text-white p-8 rounded-xl shadow-2xl border border-purple-500">
  <h2 className="text-5xl font-extrabold mb-6 text-red-500 animate-pulse drop-shadow">Game Over!</h2>

  <div className="bg-gradient-to-r from-purple-700 via-indigo-800 to-blue-900 bg-opacity-70 p-6 rounded-2xl mb-6 text-center w-72 shadow-inner border border-white/20">
    <p className="text-2xl font-bold mb-4 text-yellow-300">
  Final Score: <span className="text-white">{score.toLocaleString()}</span>
</p>

    <p className="text-lg font-medium text-blue-300">Level: <span className="text-blue-400">{level}</span></p>
    <p className="text-lg font-medium text-green-300">High Score: <span className="text-green-400">{highScore.toLocaleString()}</span></p>

    {score === highScore && score > 0 && (
      <p className="text-md text-pink-400 mt-3 font-semibold animate-bounce">🎉 New High Score! 🎉</p>
    )}
  </div>

  {!rewardClaimed && sessionComplete && (
  <button
    onClick={handleClaimReward}
    disabled={isClaiming}
    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-6 py-2 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-green-500/20 disabled:opacity-50 flex items-center justify-center mx-auto"
  >
    {isClaiming ? (
      <span className="flex items-center">
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Claiming...
      </span>
    ) : (
      `Claim ${Math.floor(score / 100)} Tokens`
    )}
  </button>
)}



<button 
  onClick={resetGame}
  className="px-10 py-3 bg-gradient-to-br from-green-500 to-lime-500 hover:from-green-600 hover:to-lime-600 text-black font-bold text-lg rounded-full transition-all duration-300 transform hover:scale-105 shadow-md"
>
  🔄 Play Again (R)
</button>

</div>

        )}

        {/* Enhanced Start Screen */}
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm text-white p-6">
            <h2 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse">
              Fruit Catcher Deluxe
            </h2>
            <div className="bg-white bg-opacity-10 p-8 rounded-xl mb-8 backdrop-blur-sm">
              <div className="grid grid-cols-1 gap-3 text-lg">
                <p>🎯 Catch falling fruits to score points</p>
                <p>⬅️➡️ Arrow keys or A/D to move</p>
                <p>⏸️ P to pause the game</p>
                <p>🔥 Build combos for bonus points</p>
                <p>📈 Each level increases difficulty</p>
                <p>❤️ Don't miss more than 5 fruits!</p>
              </div>
            </div>
            <button 
              onClick={() => setGameStarted(true)}
              className="px-12 py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-bold text-2xl transition-all duration-300 transform hover:scale-105 animate-bounce shadow-xl"
            >
              🚀 Start Game (Space) 🚀
            </button>
            {highScore > 0 && (
              <p className="mt-4 text-gray-300">Best Score: {highScore.toLocaleString()}</p>
            )}
          </div>
        )}

        {/* Enhanced Pause Screen */}
        {isPaused && gameStarted && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm text-white">
            <h2 className="text-4xl font-bold mb-6 animate-pulse">⏸️ Game Paused</h2>
            <div className="bg-white bg-opacity-10 p-6 rounded-xl text-center">
              <p className="text-xl mb-4">Press P to continue</p>
              <div className="text-lg opacity-80">
                <p>Score: {score.toLocaleString()}</p>
                <p>Level: {level}</p>
                <p>Missed: {missed}/5</p>
                {combo > 1 && <p className="text-yellow-300">Combo: {combo}x</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Controls */}
      <div className="mt-6 text-center text-gray-300 bg-black bg-opacity-30 p-4 rounded-xl backdrop-blur-sm">
        <p className="text-lg">Controls: ← → Arrow Keys or A/D | P to Pause | R to Restart</p>
        <p className="text-sm opacity-70 mt-2">Catch rare fruits for bonus points! Build combos for multipliers!</p>
      </div>
    </div>
  );
}