import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useHabitBlockchain } from '../context/HabitBlockchainContext';
import { toast } from 'react-toastify';


const CosmicDefender = () => {
  const canvasRef = useRef(null);
  const gameStateRef = useRef({
    bullets: [],
    enemies: [],
    powerUps: [],
    particles: [],
    boss: null,
    frame: 0,
    shootCooldown: 0,
    enemySpawnRate: 80,
    nextBossScore: 500,
    keys: {},
    animationId: null
  });
  const { account, completeTask, userData } = useHabitBlockchain();
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [showStart, setShowStart] = useState(true);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('cosmicDefenderHighScore');
    return saved ? parseInt(saved) : 0;
  });

  const playerRef = useRef({ 
    x: 400, y: 520, width: 50, height: 40, speed: 8, 
    health: 100, maxHealth: 100, shield: 0, rapidFire: 0 
  });

  // Key event handlers
  const handleKeyDown = useCallback((e) => {
    gameStateRef.current.keys[e.code] = true;
    gameStateRef.current.keys[e.key.toLowerCase()] = true;
    
    if (e.code === 'KeyP' || e.key.toLowerCase() === 'p') {
      setPaused(prev => !prev);
    }
    
    e.preventDefault();
  }, []);

  const handleClaimReward = async () => {
  if (!account) {
    toast.warning("Connect wallet to claim tokens.");
    return;
  }
  if (!userData?.isActive) {
    toast.warning("Stake tokens to activate your account.");
    return;
  }
  if (rewardClaimed) {
    toast.info("Tokens already claimed for this game!");
    return;
  }
  
  setIsClaimingReward(true); // Add this line
  
  try {
    const tokens = Math.floor(score / 100);
    if (tokens === 0) {
      toast.info("Score too low for reward.");
      setIsClaimingReward(false); // Add this line
      return;
    }
    await completeTask(tokens);
    toast.success(`🎉 You earned ${tokens} tokens!`);
    setRewardClaimed(true);
  } catch (err) {
    console.error(err);
    toast.error("Failed to claim tokens.");
  } finally {
    setIsClaimingReward(false); // Add this line
  }
};


  const handleKeyUp = useCallback((e) => {
    gameStateRef.current.keys[e.code] = false;
    gameStateRef.current.keys[e.key.toLowerCase()] = false;
    e.preventDefault();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('cosmicDefenderHighScore', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || showStart) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 900;
    canvas.height = 650;

    const player = playerRef.current;
    const gameState = gameStateRef.current;

    // Reset game state
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 80;
    player.health = 100;
    player.shield = 0;
    player.rapidFire = 0;
    
    gameState.bullets = [];
    gameState.enemies = [];
    gameState.powerUps = [];
    gameState.particles = [];
    gameState.boss = null;
    gameState.frame = 0;
    gameState.shootCooldown = 0;

    const isKeyPressed = (key) => {
      return gameState.keys[key] || 
             gameState.keys[key.toLowerCase()] || 
             gameState.keys[`Key${key.toUpperCase()}`] ||
             gameState.keys[`Arrow${key.charAt(0).toUpperCase() + key.slice(1)}`];
    };

    const shoot = () => {
      const bulletCount = player.rapidFire > 0 ? 3 : 1;
      const spreadAngle = bulletCount > 1 ? 0.3 : 0;
      
      for (let i = 0; i < bulletCount; i++) {
        const angle = (i - (bulletCount - 1) / 2) * spreadAngle;
        gameState.bullets.push({
          x: player.x + player.width / 2 - 3,
          y: player.y,
          width: 6,
          height: 15,
          speed: 12,
          angle: angle,
          color: player.rapidFire > 0 ? '#ffff00' : '#00ffff',
          type: 'player'
        });
      }
    };

    const createEnemy = () => {
      const types = [
        { name: 'basic', color: '#00ff00', speed: 2, health: 1, size: 35, points: 20 },
        { name: 'fast', color: '#ff00ff', speed: 4, health: 1, size: 30, points: 30 },
        { name: 'heavy', color: '#ff8800', speed: 1.5, health: 3, size: 50, points: 50 },
        { name: 'zigzag', color: '#ffff00', speed: 2.5, health: 2, size: 40, points: 40 }
      ];
      
      const type = types[Math.floor(Math.random() * types.length)];
      const enemy = {
        x: Math.random() * (canvas.width - type.size),
        y: -type.size,
        width: type.size,
        height: type.size,
        speed: type.speed + level * 0.5,
        health: type.health,
        maxHealth: type.health,
        type: type.name,
        color: type.color,
        points: type.points,
        shootTimer: Math.random() * 100,
        zigzagTimer: 0,
        direction: Math.random() > 0.5 ? 1 : -1
      };
      gameState.enemies.push(enemy);
    };

    const createBoss = () => {
      gameState.boss = {
        x: canvas.width / 2 - 100,
        y: -150,
        width: 200,
        height: 120,
        speed: 1.5,
        health: 25 + level * 8,
        maxHealth: 25 + level * 8,
        shootTimer: 0,
        moveTimer: 0,
        direction: 1,
        phase: 1,
        specialTimer: 0
      };
    };

    const createPowerUp = (x, y) => {
      if (Math.random() < 0.4) {
        const types = ['health', 'shield', 'rapidFire', 'multiShot'];
        const type = types[Math.floor(Math.random() * types.length)];
        gameState.powerUps.push({
          x: x - 15, y: y, width: 30, height: 30,
          type: type, speed: 2, timer: 0, pulse: 0
        });
      }
    };

    const createParticle = (x, y, color = '#ffff00', count = 10) => {
      for (let i = 0; i < count; i++) {
        gameState.particles.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 40 + Math.random() * 20,
          maxLife: 60,
          color: color,
          size: Math.random() * 4 + 2
        });
      }
    };

    const checkCollision = (a, b) => {
      return a.x < b.x + b.width && 
             a.x + a.width > b.x && 
             a.y < b.y + b.height && 
             a.y + a.height > b.y;
    };

    const update = () => {
      if (paused || gameOver) return;

      gameState.frame++;

      // Player movement with smooth controls
      const moveSpeed = player.speed;
      if (isKeyPressed('a') || isKeyPressed('ArrowLeft')) {
        player.x = Math.max(0, player.x - moveSpeed);
      }
      if (isKeyPressed('d') || isKeyPressed('ArrowRight')) {
        player.x = Math.min(canvas.width - player.width, player.x + moveSpeed);
      }
      if (isKeyPressed('w') || isKeyPressed('ArrowUp')) {
        player.y = Math.max(0, player.y - moveSpeed);
      }
      if (isKeyPressed('s') || isKeyPressed('ArrowDown')) {
        player.y = Math.min(canvas.height - player.height, player.y + moveSpeed);
      }

      // Shooting
      if ((isKeyPressed(' ') || isKeyPressed('Space')) && gameState.shootCooldown <= 0) {
        shoot();
        gameState.shootCooldown = player.rapidFire > 0 ? 6 : 12;
      }
      if (gameState.shootCooldown > 0) gameState.shootCooldown--;

      // Power-up timers
      if (player.shield > 0) player.shield--;
      if (player.rapidFire > 0) player.rapidFire--;

      // Update bullets
      gameState.bullets.forEach((bullet, i) => {
        if (bullet.type === 'player') {
          bullet.y -= bullet.speed;
          bullet.x += Math.sin(bullet.angle) * 2;
        } else {
          bullet.y += bullet.speed;
        }
      });
      gameState.bullets = gameState.bullets.filter(b => 
        b.y > -b.height && b.y < canvas.height + b.height && 
        b.x > -b.width && b.x < canvas.width + b.width
      );

      // Spawn enemies
      if (gameState.frame % Math.max(15, gameState.enemySpawnRate - level * 3) === 0) {
        createEnemy();
      }

      // Boss logic
      if (score >= gameState.nextBossScore && !gameState.boss) {
        createBoss();
        gameState.nextBossScore += 1000 + level * 200;
      }

      if (gameState.boss) {
        const boss = gameState.boss;
        boss.y = Math.min(80, boss.y + boss.speed);
        
        boss.moveTimer++;
        if (boss.moveTimer > 80) {
          boss.direction *= -1;
          boss.moveTimer = 0;
        }
        boss.x += boss.direction * 3;
        boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));

        boss.shootTimer++;
        boss.specialTimer++;
        
        if (boss.shootTimer > 25) {
          // Boss shooting pattern
          for (let i = 0; i < 3; i++) {
            gameState.bullets.push({
              x: boss.x + boss.width / 2 - 4 + (i - 1) * 30,
              y: boss.y + boss.height,
              width: 8, height: 12,
              speed: 6, color: '#ff0000',
              type: 'enemy'
            });
          }
          boss.shootTimer = 0;
        }

        // Special attack
        if (boss.specialTimer > 200) {
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            gameState.particles.push({
              x: boss.x + boss.width / 2,
              y: boss.y + boss.height / 2,
              vx: Math.cos(angle) * 8,
              vy: Math.sin(angle) * 8,
              life: 60, maxLife: 60,
              color: '#ff00ff', size: 6
            });
          }
          boss.specialTimer = 0;
        }
      }

      // Update enemies
      gameState.enemies.forEach((enemy, i) => {
        enemy.y += enemy.speed;
        
        if (enemy.type === 'zigzag') {
          enemy.zigzagTimer++;
          enemy.x += Math.sin(enemy.zigzagTimer * 0.1) * enemy.direction * 2;
        }

        enemy.shootTimer++;
        if (enemy.shootTimer > 80 + Math.random() * 40 && enemy.type !== 'enemy') {
          gameState.bullets.push({
            x: enemy.x + enemy.width / 2 - 3,
            y: enemy.y + enemy.height,
            width: 6, height: 10,
            speed: 4 + level, color: '#ff4444',
            type: 'enemy'
          });
          enemy.shootTimer = 0;
        }

        // Player collision
        if (checkCollision(enemy, player)) {
          if (player.shield <= 0) {
            player.health -= 25;
            createParticle(player.x + player.width/2, player.y + player.height/2, '#ff0000');
            if (player.health <= 0) {
              setLives(prev => {
                const newLives = prev - 1;
                if (newLives <= 0) {
                  setGameOver(true);
                } else {
                  player.health = player.maxHealth;
                }
                return newLives;
              });
            }
          }
          gameState.enemies.splice(i, 1);
        }
      });

      // Bullet collisions
      gameState.bullets.forEach((bullet, bi) => {
        if (bullet.type === 'player') {
          // Player bullets vs enemies
          gameState.enemies.forEach((enemy, ei) => {
            if (checkCollision(bullet, enemy)) {
              enemy.health--;
              gameState.bullets.splice(bi, 1);
              createParticle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#00ff00');
              
              if (enemy.health <= 0) {
                setScore(prev => prev + enemy.points * level);
                createPowerUp(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                createParticle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, 15);
                gameState.enemies.splice(ei, 1);
              }
            }
          });

          // Player bullets vs boss
          if (gameState.boss && checkCollision(bullet, gameState.boss)) {
            gameState.boss.health--;
            gameState.bullets.splice(bi, 1);
            createParticle(bullet.x, bullet.y, '#ffff00');
            
            if (gameState.boss.health <= 0) {
              setScore(prev => prev + 500 * level);
              setLevel(prev => prev + 1);
              createParticle(gameState.boss.x + gameState.boss.width/2, gameState.boss.y + gameState.boss.height/2, '#ff00ff', 25);
              gameState.boss = null;
            }
          }
        } else if (bullet.type === 'enemy') {
          // Enemy bullets vs player
          if (checkCollision(bullet, player)) {
            if (player.shield <= 0) {
              player.health -= 15;
              createParticle(player.x + player.width/2, player.y + player.height/2, '#ff0000');
              if (player.health <= 0) {
                setLives(prev => {
                  const newLives = prev - 1;
                  if (newLives <= 0) {
                    setGameOver(true);
                  } else {
                    player.health = player.maxHealth;
                  }
                  return newLives;
                });
              }
            }
            gameState.bullets.splice(bi, 1);
          }
        }
      });

      // Update power-ups
      gameState.powerUps.forEach((powerUp, i) => {
        powerUp.y += powerUp.speed;
        powerUp.pulse += 0.2;
        
        if (checkCollision(powerUp, player)) {
          switch (powerUp.type) {
            case 'health':
              player.health = Math.min(player.maxHealth, player.health + 40);
              break;
            case 'shield':
              player.shield = 200;
              break;
            case 'rapidFire':
              player.rapidFire = 400;
              break;
            case 'multiShot':
              player.rapidFire = 300;
              break;
          }
          createParticle(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, '#00ffff', 12);
          gameState.powerUps.splice(i, 1);
        }
      });

      // Update particles
      gameState.particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life--;
        if (particle.life <= 0) {
          gameState.particles.splice(i, 1);
        }
      });

      // Clean up off-screen entities
      gameState.enemies = gameState.enemies.filter(e => e.y <= canvas.height + 100);
      gameState.powerUps = gameState.powerUps.filter(p => p.y <= canvas.height + 50);
    };

    const draw = () => {
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#000011');
      gradient.addColorStop(1, '#000033');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated starfield
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 200; i++) {
        const x = (i * 53 + gameState.frame * 0.5) % canvas.width;
        const y = (i * 97 + gameState.frame * 1.2) % canvas.height;
        const size = Math.sin(i + gameState.frame * 0.01) * 1.5 + 1.5;
        ctx.fillRect(x, y, size, size);
      }

      // Player with glow effect
      if (player.shield > 0) {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = player.shield > 0 ? '#00ffff' : '#0088ff';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      
      if (player.shield > 0) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x - 8, player.y - 8, player.width + 16, player.height + 16);
      }
      ctx.shadowBlur = 0;

      // Health bar with better styling
      const healthPercent = player.health / player.maxHealth;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(15, 15, 250, 25);
      ctx.fillStyle = '#333';
      ctx.fillRect(20, 20, 240, 15);
      ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.2 ? '#ffff00' : '#ff0000';
      ctx.fillRect(20, 20, 240 * healthPercent, 15);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(20, 20, 240, 15);

      // Bullets with glow
      gameState.bullets.forEach(bullet => {
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 5;
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });
      ctx.shadowBlur = 0;

      // Enemies with health bars
      gameState.enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        if (enemy.maxHealth > 1) {
          const healthPercent = enemy.health / enemy.maxHealth;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(enemy.x, enemy.y - 12, enemy.width, 6);
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(enemy.x, enemy.y - 12, enemy.width * healthPercent, 6);
        }
      });

      // Boss with enhanced visuals
      if (gameState.boss) {
        const boss = gameState.boss;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#800000';
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        
        // Boss health bar
        const bHealthPercent = boss.health / boss.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(boss.x, boss.y - 25, boss.width, 15);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(boss.x, boss.y - 25, boss.width * bHealthPercent, 15);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(boss.x, boss.y - 25, boss.width, 15);
      }
      ctx.shadowBlur = 0;

      // Power-ups with pulsing effect
      gameState.powerUps.forEach(powerUp => {
        const colors = { 
          health: '#00ff00', 
          shield: '#00ffff', 
          rapidFire: '#ffff00', 
          multiShot: '#ff00ff' 
        };
        const pulseSize = Math.sin(powerUp.pulse) * 4 + 4;
        ctx.shadowColor = colors[powerUp.type];
        ctx.shadowBlur = pulseSize;
        ctx.fillStyle = colors[powerUp.type];
        ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
      });
      ctx.shadowBlur = 0;

      // Enhanced particles
      gameState.particles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      });
      ctx.globalAlpha = 1;

      // UI with better styling
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Score: ${score}`, 20, 70);
      ctx.fillText(`Level: ${level}`, 20, 100);
      ctx.fillText(`Lives: ${lives}`, 20, 130);
      ctx.fillText(`High: ${highScore}`, canvas.width - 150, 30);

      // Power-up status indicators
      let statusY = 160;
      if (player.shield > 0) {
        ctx.fillStyle = '#00ffff';
        ctx.fillText(`Shield: ${Math.ceil(player.shield / 60)}s`, 20, statusY);
        statusY += 30;
      }
      if (player.rapidFire > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`Rapid Fire: ${Math.ceil(player.rapidFire / 60)}s`, 20, statusY);
      }

      if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);
        ctx.font = 'bold 28px Arial';
        ctx.fillText('Press P to continue', canvas.width/2, canvas.height/2 + 60);
        ctx.textAlign = 'left';
      }
    };

    const gameLoop = () => {
      if (gameOver) return;
      update();
      draw();
      gameStateRef.current.animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (gameStateRef.current.animationId) {
        cancelAnimationFrame(gameStateRef.current.animationId);
      }
    };
  }, [gameOver, showStart, paused, lives, score, level]);

  const startGame = () => {
  setShowStart(false);
  setGameOver(false);
  setScore(0);
  setLevel(1);
  setLives(3);
  setPaused(false);
  setRewardClaimed(false);
  setIsClaimingReward(false); // Add this line
};

  const restartGame = () => {
  setGameOver(false);
  setScore(0);
  setLevel(1);
  setLives(3);
  setPaused(false);
  setRewardClaimed(false);
  setIsClaimingReward(false); // Add this line
  playerRef.current.health = 100;
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 animate-pulse">
        🚀 COSMIC DEFENDER
      </h1>
      
      {showStart ? (
        <div className="text-center bg-black bg-opacity-70 p-10 rounded-2xl backdrop-blur-md border-2 border-purple-500 shadow-2xl">
          <h2 className="text-3xl mb-6 text-cyan-400">🌟 Elite Space Combat 🌟</h2>
          <div className="text-left mb-8 space-y-3 text-lg">
            <p>🎮 <strong className="text-yellow-400">WASD / Arrow Keys:</strong> Navigate your ship</p>
            <p>🔫 <strong className="text-yellow-400">SPACEBAR:</strong> Fire weapons</p>
            <p>⏸️ <strong className="text-yellow-400">P:</strong> Pause / Resume</p>
            <div className="mt-4 pt-4 border-t border-purple-500">
              <p className="text-cyan-300 mb-2">💎 <strong>Power-ups:</strong></p>
              <p className="ml-4">🟢 Health Boost • 🔵 Energy Shield • 🟡 Rapid Fire • 🟣 Multi-Shot</p>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-500">
              <p className="text-red-300 mb-2">👾 <strong>Enemy Types:</strong></p>
              <p className="ml-4">Basic • Fast • Heavy • Zigzag Attackers</p>
            </div>
            <p className="text-center text-xl text-pink-400 mt-6">🏆 <strong>Boss Battle every 500 points!</strong></p>
          </div>
          <button 
            onClick={startGame}
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-700 hover:via-pink-700 hover:to-cyan-700 px-12 py-4 rounded-full font-bold text-xl transition-all duration-300 transform hover:scale-110 hover:shadow-2xl border-2 border-transparent hover:border-white"
          >
            🚀 LAUNCH MISSION
          </button>
          {highScore > 0 && (
            <p className="mt-6 text-2xl text-yellow-400 animate-bounce">
              🏆 High Score: {highScore}
            </p>
          )}
        </div>
      ) : (
        <div className="relative">
          <canvas 
            ref={canvasRef} 
            className="border-4 border-cyan-400 rounded-xl shadow-2xl bg-black"
            tabIndex={0}
          />
          {gameOver && (
  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 rounded-xl">
    <div className="text-center p-8 bg-red-900 bg-opacity-50 rounded-2xl border-2 border-red-500">
      <h2 className="text-5xl font-bold text-red-400 mb-6 animate-pulse">💥 MISSION FAILED 💥</h2>
      <p className="text-2xl mb-3 text-cyan-300">
        Final Score: <span className="text-yellow-400">{score}</span>
      </p>
      <p className="text-xl mb-3 text-cyan-300">
        Level Reached: <span className="text-pink-400">{level}</span>
      </p>
      {score === highScore && (
        <p className="text-lg mb-4 text-yellow-400 animate-bounce">🎉 NEW HIGH SCORE! 🎉</p>
      )}

      {!rewardClaimed ? (
  <button
    onClick={handleClaimReward}
    disabled={isClaimingReward} // Add this line
    className={`mt-4 px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 ${
      isClaimingReward 
        ? 'bg-gray-500 cursor-not-allowed opacity-50' 
        : 'bg-gradient-to-r from-yellow-400 to-green-400 hover:from-yellow-500 hover:to-green-500 text-black'
    }`}
  >
    {isClaimingReward ? '⏳ Claiming...' : '🎁 Claim Token Reward'}
  </button>
) : (
  <p className="mt-4 text-green-300 text-lg font-semibold animate-pulse">✅ Tokens Claimed!</p>
)}

      <button
        onClick={restartGame}
        className="mt-6 bg-gradient-to-r from-red-600 via-purple-600 to-pink-600 hover:from-red-700 hover:via-purple-700 hover:to-pink-700 px-8 py-4 rounded-full font-bold text-xl transition-all duration-300 transform hover:scale-110 border-2 border-transparent hover:border-white"
      >
        🔄 RETRY MISSION
      </button>
    </div>
  </div>
)}
          <div className="text-center mt-4 text-lg opacity-90 bg-black bg-opacity-50 rounded-lg p-2">
            <p><strong>WASD/Arrows:</strong> Move | <strong>SPACE:</strong> Shoot | <strong>P:</strong> Pause</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmicDefender;