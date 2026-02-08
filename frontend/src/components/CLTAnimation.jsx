import React, { useState, useEffect } from 'react';

function CLTAnimation({ onComplete }) {
    const [phase, setPhase] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 300),      // Scene starts
            setTimeout(() => setPhase(2), 1500),     // Books fly
            setTimeout(() => setPhase(3), 3000),     // Charts appear
            setTimeout(() => setPhase(4), 4500),     // Lightbulb moment
            setTimeout(() => setPhase(5), 6000),     // Transform begins
            setTimeout(() => setPhase(6), 7500),     // CLT forms
            setTimeout(() => setPhase(7), 8500),     // ACADEMY + celebration
            setTimeout(() => setPhase(8), 10000),    // Rocket launch
            setTimeout(() => setPhase(9), 11000),    // Fade out
            setTimeout(() => onComplete && onComplete(), 11800),
        ];
        return () => timers.forEach(t => clearTimeout(t));
    }, [onComplete]);

    // Interactive mouse tracking
    useEffect(() => {
        const handleMove = (e) => {
            setMousePos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    return (
        <div 
            className="fixed inset-0 overflow-hidden z-[9999]"
            data-testid="clt-animation"
            style={{
                background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
            }}
        >
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div 
                    className="absolute w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse"
                    style={{
                        background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
                        left: `${20 + mousePos.x * 0.1}%`,
                        top: `${10 + mousePos.y * 0.1}%`,
                        transition: 'left 0.5s, top 0.5s'
                    }}
                />
                <div 
                    className="absolute w-80 h-80 rounded-full blur-3xl opacity-25 animate-pulse"
                    style={{
                        background: 'radial-gradient(circle, #ff00ff 0%, transparent 70%)',
                        right: `${10 + (100 - mousePos.x) * 0.1}%`,
                        bottom: `${20 + (100 - mousePos.y) * 0.1}%`,
                        transition: 'right 0.5s, bottom 0.5s',
                        animationDelay: '1s'
                    }}
                />
                <div 
                    className="absolute w-64 h-64 rounded-full blur-3xl opacity-20"
                    style={{
                        background: 'radial-gradient(circle, #00ff88 0%, transparent 70%)',
                        left: '60%',
                        top: '60%',
                    }}
                />
            </div>

            {/* Grid pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-10">
                <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#00d4ff" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Floating particles */}
            <Particles phase={phase} />

            {/* Main content */}
            <div 
                className="relative z-10 flex flex-col items-center justify-center min-h-screen transition-all duration-700"
                style={{
                    opacity: phase === 0 ? 0 : phase >= 9 ? 0 : 1,
                    transform: phase === 0 ? 'scale(0.9)' : phase >= 9 ? 'scale(1.1) translateY(-50px)' : 'scale(1)'
                }}
            >
                {/* The Student Character */}
                <StudentCharacter phase={phase} />

                {/* Flying Books */}
                <FlyingBooks phase={phase} />

                {/* Trading Charts */}
                <TradingCharts phase={phase} />

                {/* Lightbulb Moment */}
                <LightbulbMoment phase={phase} />

                {/* CLT Letters Formation */}
                <CLTFormation phase={phase} />

                {/* Celebration Effects */}
                <Celebration phase={phase} />

                {/* Loading Progress */}
                <LoadingBar phase={phase} />
            </div>

            {/* Rocket at the end */}
            {phase >= 8 && <Rocket />}
        </div>
    );
}

function Particles({ phase }) {
    const particles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
        color: ['#00d4ff', '#ff00ff', '#00ff88', '#ffdd00', '#ff6b6b'][i % 5]
    }));

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        opacity: phase >= 1 ? 0.6 : 0,
                        animation: `float ${p.duration}s ease-in-out infinite`,
                        animationDelay: `${p.delay}s`,
                        boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                        transition: 'opacity 1s'
                    }}
                />
            ))}
        </div>
    );
}

function StudentCharacter({ phase }) {
    const isVisible = phase >= 1 && phase < 6;
    const isExcited = phase >= 4;
    const isTransforming = phase >= 5;

    if (!isVisible) return null;

    return (
        <div 
            className="absolute transition-all duration-700"
            style={{
                left: '50%',
                top: '45%',
                transform: `translate(-50%, -50%) scale(${isTransforming ? 0 : 1}) rotate(${isTransforming ? 360 : 0}deg)`,
                opacity: isTransforming ? 0 : 1
            }}
        >
            <svg width="120" height="160" viewBox="0 0 120 160">
                {/* Desk */}
                <rect x="10" y="110" width="100" height="8" rx="2" fill="#4a5568" />
                <rect x="20" y="118" width="8" height="35" fill="#2d3748" />
                <rect x="92" y="118" width="8" height="35" fill="#2d3748" />
                
                {/* Laptop */}
                <rect x="35" y="95" width="50" height="15" rx="2" fill="#1a1a2e" />
                <rect x="30" y="75" width="60" height="40" rx="3" fill="#2d3748" />
                <rect x="34" y="79" width="52" height="32" rx="2" fill="#0f0f1a">
                    {/* Screen glow */}
                    {phase >= 3 && (
                        <animate attributeName="fill" values="#0f0f1a;#1a3a2e;#0f0f1a" dur="2s" repeatCount="indefinite" />
                    )}
                </rect>
                {/* Chart on screen */}
                {phase >= 3 && (
                    <polyline 
                        points="40,100 50,95 55,98 65,88 75,92 80,85" 
                        fill="none" 
                        stroke="#00ff88" 
                        strokeWidth="2"
                        strokeLinecap="round"
                    >
                        <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
                    </polyline>
                )}

                {/* Character body */}
                <ellipse cx="60" cy="65" rx="20" ry="15" fill="#6366f1" />
                
                {/* Head */}
                <circle cx="60" cy="35" r="20" fill="#fcd34d" />
                
                {/* Face */}
                <circle cx="53" cy="32" r="3" fill="#1a1a2e" />
                <circle cx="67" cy="32" r="3" fill="#1a1a2e" />
                
                {/* Mouth - changes based on phase */}
                {phase < 4 ? (
                    // Bored/thinking
                    <ellipse cx="60" cy="42" rx="5" ry="3" fill="#1a1a2e" />
                ) : (
                    // Excited!
                    <path d="M 52 40 Q 60 50 68 40" fill="none" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" />
                )}

                {/* Arms */}
                <line 
                    x1="45" y1="60" x2={isExcited ? "25" : "35"} y2={isExcited ? "40" : "75"} 
                    stroke="#fcd34d" strokeWidth="8" strokeLinecap="round"
                    style={{ transition: 'all 0.3s' }}
                />
                <line 
                    x1="75" y1="60" x2={isExcited ? "95" : "85"} y2={isExcited ? "40" : "75"} 
                    stroke="#fcd34d" strokeWidth="8" strokeLinecap="round"
                    style={{ transition: 'all 0.3s' }}
                />

                {/* Thought bubble when bored */}
                {phase < 3 && (
                    <g className="animate-bounce">
                        <circle cx="95" cy="15" r="4" fill="white" opacity="0.8" />
                        <circle cx="102" cy="8" r="3" fill="white" opacity="0.6" />
                        <text x="85" y="0" fontSize="16">💭</text>
                        <text x="80" y="-10" fontSize="10">📈?</text>
                    </g>
                )}

                {/* Stars when excited */}
                {isExcited && (
                    <g>
                        <text x="20" y="20" fontSize="16" className="animate-ping">⭐</text>
                        <text x="90" y="15" fontSize="14" className="animate-ping" style={{ animationDelay: '0.2s' }}>✨</text>
                        <text x="30" y="55" fontSize="12" className="animate-ping" style={{ animationDelay: '0.4s' }}>💡</text>
                    </g>
                )}
            </svg>
        </div>
    );
}

function FlyingBooks({ phase }) {
    const isActive = phase >= 2 && phase < 6;
    
    const books = [
        { x: -50, y: 30, targetX: 25, targetY: 40, color: '#ff6b6b', emoji: '📕', delay: 0 },
        { x: 150, y: 20, targetX: 75, targetY: 35, color: '#4ecdc4', emoji: '📗', delay: 0.2 },
        { x: -30, y: 70, targetX: 20, targetY: 55, color: '#ffe66d', emoji: '📙', delay: 0.4 },
        { x: 130, y: 60, targetX: 80, targetY: 50, color: '#6366f1', emoji: '📘', delay: 0.6 },
    ];

    return (
        <>
            {books.map((book, i) => (
                <div
                    key={i}
                    className="absolute text-4xl transition-all duration-1000 ease-out"
                    style={{
                        left: isActive ? `${book.targetX}%` : `${book.x}%`,
                        top: isActive ? `${book.targetY}%` : `${book.y}%`,
                        opacity: isActive ? 1 : 0,
                        transform: `rotate(${isActive ? 0 : (i % 2 ? 45 : -45)}deg) scale(${isActive ? 1 : 0.5})`,
                        transitionDelay: `${book.delay}s`,
                        filter: isActive ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none'
                    }}
                >
                    {book.emoji}
                </div>
            ))}
        </>
    );
}

function TradingCharts({ phase }) {
    const isActive = phase >= 3 && phase < 6;

    return (
        <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
            style={{
                opacity: isActive ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${isActive ? 1 : 0.5})`,
            }}
        >
            {/* Floating chart cards */}
            <div className="relative">
                {/* Green candle chart */}
                <div 
                    className="absolute -left-40 -top-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/30"
                    style={{
                        animation: isActive ? 'float 3s ease-in-out infinite' : 'none',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-emerald-400 text-sm font-bold">BTC/USD</span>
                        <span className="text-emerald-400 text-xs">+12.4%</span>
                        <span className="text-lg">🚀</span>
                    </div>
                    <svg width="100" height="50" viewBox="0 0 100 50">
                        <polyline 
                            points="0,40 20,35 40,25 60,30 80,15 100,10" 
                            fill="none" 
                            stroke="#10b981" 
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <circle cx="100" cy="10" r="4" fill="#10b981" className="animate-ping" />
                    </svg>
                </div>

                {/* Red candle chart */}
                <div 
                    className="absolute -right-44 top-0 bg-gradient-to-br from-rose-500/20 to-rose-600/10 backdrop-blur-sm rounded-xl p-4 border border-rose-500/30"
                    style={{
                        animation: isActive ? 'float 3.5s ease-in-out infinite' : 'none',
                        animationDelay: '0.5s'
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-rose-400 text-sm font-bold">ETH/USD</span>
                        <span className="text-rose-400 text-xs">-3.2%</span>
                        <span className="text-lg">📉</span>
                    </div>
                    <svg width="100" height="50" viewBox="0 0 100 50">
                        <polyline 
                            points="0,15 25,20 45,35 65,25 85,40 100,38" 
                            fill="none" 
                            stroke="#ef4444" 
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>

                {/* Candlestick pattern */}
                <div 
                    className="absolute left-32 -bottom-24 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30"
                    style={{
                        animation: isActive ? 'float 4s ease-in-out infinite' : 'none',
                        animationDelay: '1s'
                    }}
                >
                    <div className="text-cyan-400 text-xs mb-2 font-mono">PATTERN: 📊 BULLISH</div>
                    <svg width="120" height="40" viewBox="0 0 120 40">
                        {[15, 35, 55, 75, 95].map((x, i) => {
                            const isGreen = [0, 2, 4].includes(i);
                            const height = [20, 15, 25, 12, 30][i];
                            return (
                                <g key={i}>
                                    <line x1={x} y1={5} x2={x} y2={35} stroke={isGreen ? '#10b981' : '#ef4444'} strokeWidth="1" />
                                    <rect x={x-4} y={20-height/2} width="8" height={height} fill={isGreen ? '#10b981' : '#ef4444'} rx="1" />
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        </div>
    );
}

function LightbulbMoment({ phase }) {
    const isActive = phase >= 4 && phase < 6;

    if (!isActive) return null;

    return (
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
                {/* Giant lightbulb */}
                <div 
                    className="text-8xl animate-bounce"
                    style={{
                        filter: 'drop-shadow(0 0 30px #ffd700)',
                        animation: 'pulse 0.5s ease-in-out infinite'
                    }}
                >
                    💡
                </div>
                
                {/* Rays */}
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute left-1/2 top-1/2 w-1 bg-gradient-to-t from-yellow-400 to-transparent"
                        style={{
                            height: '60px',
                            transform: `rotate(${i * 45}deg) translateY(-80px)`,
                            transformOrigin: 'center bottom',
                            animation: 'pulse 1s ease-in-out infinite',
                            animationDelay: `${i * 0.1}s`
                        }}
                    />
                ))}

                {/* Text bubbles */}
                <div className="absolute -left-32 top-0 bg-white/10 backdrop-blur rounded-lg px-3 py-1 text-sm text-white animate-bounce">
                    Aha! 🎯
                </div>
                <div className="absolute -right-28 top-4 bg-white/10 backdrop-blur rounded-lg px-3 py-1 text-sm text-white animate-bounce" style={{ animationDelay: '0.2s' }}>
                    Got it! 🧠
                </div>
            </div>
        </div>
    );
}

function CLTFormation({ phase }) {
    const isForming = phase >= 5;
    const isComplete = phase >= 6;

    return (
        <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
            style={{
                opacity: isForming ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${isComplete ? 1 : 0.8})`
            }}
        >
            <div className="flex items-center gap-4">
                {/* C */}
                <svg width="100" height="120" viewBox="0 0 100 120" className="transition-all duration-700" style={{ transform: isComplete ? 'rotate(0deg)' : 'rotate(-180deg)' }}>
                    <defs>
                        <linearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00d4ff" />
                            <stop offset="100%" stopColor="#0051ff" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M 85 25 A 45 45 0 1 0 85 95"
                        fill="none"
                        stroke="url(#cGrad)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        style={{
                            filter: isComplete ? 'drop-shadow(0 0 20px #00d4ff)' : 'none',
                            strokeDasharray: 200,
                            strokeDashoffset: isComplete ? 0 : 200,
                            transition: 'stroke-dashoffset 1s ease-out'
                        }}
                    />
                </svg>

                {/* L */}
                <svg width="80" height="120" viewBox="0 0 80 120" className="transition-all duration-700" style={{ transform: isComplete ? 'translateY(0)' : 'translateY(-50px)', transitionDelay: '0.2s' }}>
                    <defs>
                        <linearGradient id="lGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff00ff" />
                            <stop offset="100%" stopColor="#ff6b6b" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M 15 10 L 15 100 L 70 100"
                        fill="none"
                        stroke="url(#lGrad)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            filter: isComplete ? 'drop-shadow(0 0 20px #ff00ff)' : 'none',
                            strokeDasharray: 200,
                            strokeDashoffset: isComplete ? 0 : 200,
                            transition: 'stroke-dashoffset 1s ease-out 0.3s'
                        }}
                    />
                </svg>

                {/* T */}
                <svg width="90" height="120" viewBox="0 0 90 120" className="transition-all duration-700" style={{ transform: isComplete ? 'translateY(0)' : 'translateY(50px)', transitionDelay: '0.4s' }}>
                    <defs>
                        <linearGradient id="tGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00ff88" />
                            <stop offset="100%" stopColor="#00d4ff" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M 10 15 L 80 15 M 45 15 L 45 105"
                        fill="none"
                        stroke="url(#tGrad)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        style={{
                            filter: isComplete ? 'drop-shadow(0 0 20px #00ff88)' : 'none',
                            strokeDasharray: 200,
                            strokeDashoffset: isComplete ? 0 : 200,
                            transition: 'stroke-dashoffset 1s ease-out 0.5s'
                        }}
                    />
                </svg>
            </div>

            {/* ACADEMY text */}
            <div 
                className="text-center mt-6 transition-all duration-700"
                style={{
                    opacity: phase >= 7 ? 1 : 0,
                    transform: phase >= 7 ? 'translateY(0)' : 'translateY(20px)'
                }}
            >
                <span 
                    className="text-3xl font-light tracking-[0.4em] bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                    style={{
                        textShadow: '0 0 40px rgba(0,212,255,0.5)'
                    }}
                >
                    ACADEMY
                </span>
            </div>
        </div>
    );
}

function Celebration({ phase }) {
    const isActive = phase >= 7;

    if (!isActive) return null;

    const emojis = ['🎉', '🎊', '💰', '📈', '🏆', '⭐', '🚀', '💎', '🔥', '✨'];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {emojis.map((emoji, i) => (
                <div
                    key={i}
                    className="absolute text-3xl"
                    style={{
                        left: `${10 + (i * 9)}%`,
                        animation: `confetti 2s ease-out forwards`,
                        animationDelay: `${i * 0.1}s`
                    }}
                >
                    {emoji}
                </div>
            ))}

            {/* Coins falling */}
            {[...Array(15)].map((_, i) => (
                <div
                    key={`coin-${i}`}
                    className="absolute text-2xl"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                        animation: `fall 3s ease-in forwards`,
                        animationDelay: `${i * 0.15}s`
                    }}
                >
                    🪙
                </div>
            ))}

            {/* Success message */}
            <div 
                className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 backdrop-blur-sm px-6 py-3 rounded-full animate-bounce"
            >
                <span className="text-white font-bold text-lg">🎓 Ready to Trade! 📊</span>
            </div>

            <style jsx>{`
                @keyframes confetti {
                    0% { transform: translateY(100vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(-20vh) rotate(720deg); opacity: 0; }
                }
                @keyframes fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(120vh) rotate(360deg); opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}

function Rocket() {
    return (
        <div 
            className="absolute text-6xl"
            style={{
                animation: 'rocketLaunch 2s ease-in forwards'
            }}
        >
            🚀
            <style jsx>{`
                @keyframes rocketLaunch {
                    0% { bottom: 20%; right: 20%; transform: rotate(45deg); }
                    100% { bottom: 120%; right: -20%; transform: rotate(45deg); }
                }
            `}</style>
        </div>
    );
}

function LoadingBar({ phase }) {
    const progress = Math.min((phase / 9) * 100, 100);
    const messages = [
        'Initializing...',
        'Loading books...',
        'Analyzing markets...',
        'Processing insights...',
        'Building knowledge...',
        'Forming CLT...',
        'Almost ready...',
        'Let\'s trade! 🚀',
        'Welcome!',
        'Welcome!'
    ];

    return (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-80">
            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #00d4ff, #ff00ff, #00ff88)',
                        boxShadow: '0 0 20px rgba(0,212,255,0.5)'
                    }}
                />
            </div>
            
            {/* Message */}
            <p className="text-center text-white/60 text-sm mt-3 font-light tracking-wide">
                {messages[phase] || messages[0]}
            </p>
        </div>
    );
}

export default CLTAnimation;
