import React, { useState, useEffect } from 'react';

function CLTAnimation({ onComplete }) {
    const [phase, setPhase] = useState(0);
    const [exitProgress, setExitProgress] = useState(0);
    // Phases:
    // 0: Initial fade in
    // 1-6: All animations running simultaneously (0-7 seconds)
    // 7: Transform to CLT letters
    // 8: ACADEMY fades in
    // 9: Exit animation with bearish arrow
    // 10: Complete

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 200),      // Start all animations
            setTimeout(() => setPhase(2), 1200),     // Progress phase
            setTimeout(() => setPhase(3), 2400),     // Progress phase
            setTimeout(() => setPhase(4), 3600),     // Progress phase
            setTimeout(() => setPhase(5), 4800),     // Progress phase
            setTimeout(() => setPhase(6), 6000),     // Progress phase
            setTimeout(() => setPhase(7), 7000),     // Transform to letters
            setTimeout(() => setPhase(8), 7800),     // ACADEMY appears
            setTimeout(() => setPhase(9), 9000),     // Start exit animation
            setTimeout(() => setPhase(10), 10500),   // Complete
            setTimeout(() => onComplete && onComplete(), 11000),
        ];
        
        return () => timers.forEach(t => clearTimeout(t));
    }, [onComplete]);

    // Exit animation progress
    useEffect(() => {
        if (phase === 9) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 0.02;
                setExitProgress(Math.min(progress, 1));
                if (progress >= 1) clearInterval(interval);
            }, 30);
            return () => clearInterval(interval);
        }
    }, [phase]);

    const isAnimating = phase >= 1 && phase < 7;
    const isTransformed = phase >= 7;
    const showAcademy = phase >= 8;
    const isExiting = phase >= 9;

    // Calculate exit position using parabolic curve
    const exitX = isExiting ? exitProgress * 120 : 0; // Move right
    const exitY = isExiting ? -exitProgress * 80 + (exitProgress * exitProgress * 40) : 0; // Parabolic up then down
    const exitScale = isExiting ? 1 - exitProgress * 0.5 : 1;
    const exitOpacity = isExiting ? 1 - exitProgress : 1;

    return (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[9999] overflow-hidden" data-testid="clt-animation">
            {/* Background grid */}
            <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#3b82f6" strokeWidth="0.3"/>
                        </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#grid)" />
                </svg>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-blue-400 rounded-full animate-float"
                        style={{
                            left: `${5 + (i * 3.2)}%`,
                            top: `${10 + ((i * 17) % 80)}%`,
                            animationDelay: `${i * 0.1}s`,
                            opacity: 0.4
                        }}
                    />
                ))}
            </div>

            {/* Main animation container */}
            <div 
                className="relative z-10 transition-all"
                style={{
                    opacity: phase === 0 ? 0 : exitOpacity,
                    transform: `translate(${exitX}%, ${exitY}%) scale(${exitScale})`,
                    transition: phase === 0 ? 'opacity 0.5s' : 'none'
                }}
            >
                <div className="flex items-center justify-center gap-6 mb-8">
                    {/* C - Clock Animation */}
                    <ClockAnimation phase={phase} isAnimating={isAnimating} isTransformed={isTransformed} />
                    
                    {/* L - Graduate Animation */}
                    <GraduateAnimation phase={phase} isAnimating={isAnimating} isTransformed={isTransformed} />
                    
                    {/* T - Trading Candles Animation */}
                    <TradingAnimation phase={phase} isAnimating={isAnimating} isTransformed={isTransformed} />
                </div>

                {/* ACADEMY text */}
                <div 
                    className="text-center transition-all duration-1000 ease-out"
                    style={{
                        opacity: showAcademy ? 1 : 0,
                        transform: showAcademy ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.8)',
                    }}
                >
                    <p className="text-3xl text-slate-400 font-light tracking-[0.5em]">ACADEMY</p>
                </div>

                {/* Loading bar */}
                <div className="mt-10 w-72 mx-auto">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all ease-linear"
                            style={{
                                width: `${Math.min((phase / 10) * 100, 100)}%`,
                                transitionDuration: '500ms'
                            }}
                        />
                    </div>
                    <p className="text-center text-slate-500 text-sm mt-3">
                        {phase < 7 ? 'Initializing CLT Academy...' : 
                         phase < 8 ? 'Loading workspace...' : 
                         'Welcome!'}
                    </p>
                </div>
            </div>

            {/* Green Bearish Arrow - appears during exit */}
            {isExiting && (
                <BearishArrow progress={exitProgress} />
            )}
        </div>
    );
}

function ClockAnimation({ phase, isAnimating, isTransformed }) {
    // Continuous rotation during animation phase
    const rotation = isAnimating ? (phase * 720) : 0;
    
    return (
        <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
                
                {/* Clock circle / C letter */}
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={isTransformed ? "#ffffff" : "url(#clockGrad)"}
                    strokeWidth={isTransformed ? "12" : "6"}
                    strokeDasharray={isTransformed ? "220 80" : "264"}
                    strokeDashoffset={isTransformed ? "40" : "0"}
                    strokeLinecap="round"
                    style={{
                        transform: `rotate(${isTransformed ? -90 : 0}deg)`,
                        transformOrigin: 'center',
                        transition: 'all 0.8s ease-out'
                    }}
                />
                
                {/* Clock hands - only visible during animation */}
                {!isTransformed && (
                    <>
                        {/* Center dot */}
                        <circle cx="50" cy="50" r="4" fill="#ffffff" />
                        
                        {/* Hour hand */}
                        <line
                            x1="50" y1="50" x2="50" y2="28"
                            stroke="#ffffff" strokeWidth="4" strokeLinecap="round"
                            style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: '50px 50px',
                                transition: 'transform 1s linear'
                            }}
                        />
                        
                        {/* Minute hand */}
                        <line
                            x1="50" y1="50" x2="50" y2="20"
                            stroke="#00ffff" strokeWidth="3" strokeLinecap="round"
                            style={{
                                transform: `rotate(${rotation * 2}deg)`,
                                transformOrigin: '50px 50px',
                                transition: 'transform 1s linear'
                            }}
                        />
                        
                        {/* Second hand */}
                        <line
                            x1="50" y1="50" x2="50" y2="15"
                            stroke="#ef4444" strokeWidth="2" strokeLinecap="round"
                            style={{
                                transform: `rotate(${rotation * 4}deg)`,
                                transformOrigin: '50px 50px',
                                transition: 'transform 1s linear'
                            }}
                        />
                        
                        {/* Tick marks */}
                        {[0, 90, 180, 270].map((angle, i) => (
                            <line
                                key={i}
                                x1="50" y1="12" x2="50" y2="18"
                                stroke="#64748b" strokeWidth="2"
                                style={{ transform: `rotate(${angle}deg)`, transformOrigin: '50px 50px' }}
                            />
                        ))}
                        
                        {/* Speed effect rings */}
                        <circle cx="50" cy="50" r="35" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3" className="animate-ping" />
                    </>
                )}
            </svg>
            
            {/* Label */}
            {!isTransformed && (
                <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-xs text-cyan-400 font-mono">TIME</span>
                </div>
            )}
        </div>
    );
}

function GraduateAnimation({ phase, isAnimating, isTransformed }) {
    // Animation states based on phase
    const isBowing = phase >= 2 && phase < 3;
    const hasCapOn = phase >= 3;
    const isCelebrating = phase >= 4 && phase < 5;
    const isSitting = phase >= 5 && phase < 7;
    
    return (
        <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {/* L Letter - appears when transformed */}
                {isTransformed && (
                    <g style={{ opacity: 1, transition: 'opacity 0.5s' }}>
                        <rect x="22" y="10" width="14" height="80" rx="3" fill="#ffffff" />
                        <rect x="22" y="76" width="56" height="14" rx="3" fill="#ffffff" />
                    </g>
                )}
                
                {/* Chair - appears during sitting */}
                {!isTransformed && isSitting && (
                    <g className="animate-fade-in">
                        <rect x="20" y="60" width="8" height="25" rx="2" fill="#475569" />
                        <rect x="20" y="78" width="50" height="8" rx="2" fill="#64748b" />
                        <line x1="25" y1="86" x2="20" y2="98" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                        <line x1="65" y1="86" x2="70" y2="98" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                    </g>
                )}
                
                {/* Graduate figure */}
                {!isTransformed && (
                    <g style={{
                        transform: `rotate(${isBowing ? 20 : 0}deg) translateY(${isSitting ? 15 : 0}px)`,
                        transformOrigin: '50px 90px',
                        transition: 'all 0.6s ease-out'
                    }}>
                        {/* Gown */}
                        <path
                            d="M 38 50 L 42 82 L 58 82 L 62 50 Q 50 44 38 50"
                            fill="#1e40af"
                        />
                        
                        {/* Head */}
                        <circle cx="50" cy="35" r="14" fill="#fcd34d" />
                        
                        {/* Face */}
                        <circle cx="45" cy="33" r="2" fill="#1e293b" />
                        <circle cx="55" cy="33" r="2" fill="#1e293b" />
                        <path 
                            d={isCelebrating ? "M 44 40 Q 50 46 56 40" : "M 46 39 Q 50 42 54 39"} 
                            fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" 
                        />
                        
                        {/* Arms */}
                        <line 
                            x1="40" y1="55" 
                            x2={isCelebrating ? "20" : "32"} 
                            y2={isCelebrating ? "35" : "70"} 
                            stroke="#fcd34d" strokeWidth="6" strokeLinecap="round"
                            style={{ transition: 'all 0.4s' }}
                        />
                        <line 
                            x1="60" y1="55" 
                            x2={isCelebrating ? "80" : "68"} 
                            y2={isCelebrating ? "35" : "70"} 
                            stroke="#fcd34d" strokeWidth="6" strokeLinecap="round"
                            style={{ transition: 'all 0.4s' }}
                        />
                        
                        {/* Diploma when celebrating */}
                        {isCelebrating && (
                            <g>
                                <rect x="76" y="28" width="14" height="12" rx="2" fill="#f8fafc" />
                                <line x1="79" y1="32" x2="87" y2="32" stroke="#94a3b8" strokeWidth="1" />
                                <line x1="79" y1="36" x2="85" y2="36" stroke="#94a3b8" strokeWidth="1" />
                            </g>
                        )}
                        
                        {/* Legs */}
                        <line x1="46" y1="80" x2={isSitting ? "35" : "42"} y2={isSitting ? "90" : "98"} 
                            stroke="#1e40af" strokeWidth="6" strokeLinecap="round"
                            style={{ transition: 'all 0.4s' }}
                        />
                        <line x1="54" y1="80" x2={isSitting ? "65" : "58"} y2={isSitting ? "90" : "98"} 
                            stroke="#1e40af" strokeWidth="6" strokeLinecap="round"
                            style={{ transition: 'all 0.4s' }}
                        />
                        
                        {/* Graduation cap */}
                        <g style={{
                            opacity: hasCapOn ? 1 : 0,
                            transform: hasCapOn ? 'translateY(0)' : 'translateY(-25px)',
                            transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                        }}>
                            <polygon points="28,26 50,14 72,26 50,32" fill="#1e293b" />
                            <rect x="47" y="14" width="6" height="6" fill="#1e293b" />
                            <line x1="50" y1="23" x2="70" y2="35" stroke="#fbbf24" strokeWidth="2" />
                            <circle cx="70" cy="37" r="4" fill="#fbbf24" />
                        </g>
                    </g>
                )}
                
                {/* Celebration effects */}
                {!isTransformed && isCelebrating && (
                    <g>
                        <text x="12" y="30" fontSize="12">🎉</text>
                        <text x="75" y="25" fontSize="12">🎓</text>
                        <circle cx="25" cy="45" r="2" fill="#fbbf24" className="animate-ping" />
                        <circle cx="75" cy="50" r="2" fill="#3b82f6" className="animate-ping" />
                    </g>
                )}
            </svg>
            
            {/* Label */}
            {!isTransformed && (
                <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-xs text-yellow-400 font-mono">LEARNING</span>
                </div>
            )}
        </div>
    );
}

function TradingAnimation({ phase, isAnimating, isTransformed }) {
    // Candle heights animate based on phase
    const getHeight = (baseHeight, index) => {
        if (!isAnimating) return baseHeight;
        const wave = Math.sin((phase * 2 + index) * 0.8) * 15;
        return baseHeight + wave;
    };
    
    const candles = [
        { x: 18, base: 30, green: true },
        { x: 34, base: 40, green: false },
        { x: 50, base: 35, green: true },
        { x: 66, base: 45, green: false },
        { x: 82, base: 38, green: true },
    ];
    
    return (
        <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* T Letter - appears when transformed */}
                {isTransformed && (
                    <g style={{ opacity: 1, transition: 'opacity 0.5s' }}>
                        <rect x="10" y="10" width="80" height="14" rx="3" fill="#00ffff" />
                        <rect x="43" y="10" width="14" height="80" rx="3" fill="#00ffff" />
                    </g>
                )}
                
                {/* Trading candles */}
                {!isTransformed && candles.map((candle, i) => {
                    const height = getHeight(candle.base, i);
                    const y = 75 - height;
                    
                    return (
                        <g key={i}>
                            {/* Wick */}
                            <line
                                x1={candle.x} y1={y - 8}
                                x2={candle.x} y2={y + height + 8}
                                stroke={candle.green ? "#10b981" : "#ef4444"}
                                strokeWidth="2"
                            />
                            {/* Body */}
                            <rect
                                x={candle.x - 6} y={y}
                                width="12" height={height}
                                rx="2"
                                fill={candle.green ? "#10b981" : "#ef4444"}
                                style={{ transition: 'all 0.3s' }}
                            />
                        </g>
                    );
                })}
                
                {/* Chart line */}
                {!isTransformed && (
                    <polyline
                        points="18,50 34,42 50,48 66,35 82,40"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="150"
                        strokeDashoffset={isAnimating ? "0" : "150"}
                        style={{ transition: 'stroke-dashoffset 2s' }}
                    />
                )}
                
                {/* Price indicator */}
                {!isTransformed && phase >= 3 && (
                    <g className="animate-bounce">
                        <rect x="70" y="15" width="28" height="16" rx="3" fill="#10b981" opacity="0.9" />
                        <text x="74" y="27" fill="white" fontSize="10" fontWeight="bold">+4.2%</text>
                    </g>
                )}
            </svg>
            
            {/* Label */}
            {!isTransformed && (
                <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-xs text-emerald-400 font-mono">TRADING</span>
                </div>
            )}
        </div>
    );
}

function BearishArrow({ progress }) {
    // Parabolic path for the arrow
    const startX = 50;
    const startY = 50;
    const endX = 95;
    const endY = 95;
    
    // Calculate current position on parabolic curve
    const t = progress;
    const controlX = 80;
    const controlY = 20;
    
    // Quadratic bezier formula
    const x = (1-t)*(1-t)*startX + 2*(1-t)*t*controlX + t*t*endX;
    const y = (1-t)*(1-t)*startY + 2*(1-t)*t*controlY + t*t*endY;
    
    // Calculate arrow rotation based on curve tangent
    const dx = 2*(1-t)*(controlX-startX) + 2*t*(endX-controlX);
    const dy = 2*(1-t)*(controlY-startY) + 2*t*(endY-controlY);
    const angle = Math.atan2(dy, dx) * (180/Math.PI);
    
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Trail effect */}
            <svg className="absolute inset-0 w-full h-full">
                <defs>
                    <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                    </linearGradient>
                </defs>
                <path
                    d={`M ${startX}% ${startY}% Q ${controlX}% ${controlY}% ${x}% ${y}%`}
                    fill="none"
                    stroke="url(#arrowGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
            </svg>
            
            {/* Arrow head */}
            <div
                className="absolute"
                style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                }}
            >
                <svg width="40" height="40" viewBox="0 0 40 40">
                    <polygon
                        points="40,20 10,5 15,20 10,35"
                        fill="#10b981"
                    />
                    {/* Glow effect */}
                    <polygon
                        points="40,20 10,5 15,20 10,35"
                        fill="#10b981"
                        opacity="0.5"
                        filter="blur(4px)"
                    />
                </svg>
            </div>
            
            {/* Sparkles along trail */}
            {[0.2, 0.4, 0.6, 0.8].map((p, i) => {
                if (p > progress) return null;
                const sx = (1-p)*(1-p)*startX + 2*(1-p)*p*controlX + p*p*endX;
                const sy = (1-p)*(1-p)*startY + 2*(1-p)*p*controlY + p*p*endY;
                return (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-ping"
                        style={{
                            left: `${sx}%`,
                            top: `${sy}%`,
                            transform: 'translate(-50%, -50%)',
                            opacity: 1 - (progress - p) * 2
                        }}
                    />
                );
            })}
        </div>
    );
}

export default CLTAnimation;
