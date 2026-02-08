import React, { useState, useEffect } from 'react';

function CLTAnimation({ onComplete }) {
    const [phase, setPhase] = useState(0);
    // Phases:
    // 0: Initial fade in
    // 1: Clock hands spinning fast (0-2s)
    // 2: Clock transforms to C (2-3s)
    // 3: Graduate appears, bows down (3-4.5s)
    // 4: Graduate wears cap, celebrates (4.5-5.5s)
    // 5: Graduate sits on chair (5.5-6.5s)
    // 6: Chair fades, forms L (6.5-7.5s)
    // 7: Trading candles animate (7.5-8.5s)
    // 8: Candles form T pattern (8.5-9s)
    // 9: ACADEMY text fades in (9-9.5s)
    // 10: Hold complete logo (9.5-10s)
    // 11: Fade out

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 200),
            setTimeout(() => setPhase(2), 2200),
            setTimeout(() => setPhase(3), 3200),
            setTimeout(() => setPhase(4), 4700),
            setTimeout(() => setPhase(5), 5700),
            setTimeout(() => setPhase(6), 6700),
            setTimeout(() => setPhase(7), 7700),
            setTimeout(() => setPhase(8), 8700),
            setTimeout(() => setPhase(9), 9200),
            setTimeout(() => setPhase(10), 9700),
            setTimeout(() => setPhase(11), 10200),
            setTimeout(() => onComplete && onComplete(), 10800),
        ];
        
        return () => timers.forEach(t => clearTimeout(t));
    }, [onComplete]);

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
                {[...Array(25)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-blue-400 rounded-full animate-float"
                        style={{
                            left: `${5 + (i * 3.8)}%`,
                            top: `${10 + ((i * 17) % 80)}%`,
                            animationDelay: `${i * 0.12}s`,
                            opacity: 0.4
                        }}
                    />
                ))}
            </div>

            {/* Main animation container */}
            <div 
                className="relative z-10 transition-all duration-700"
                style={{
                    opacity: phase === 0 ? 0 : phase >= 11 ? 0 : 1,
                    transform: phase === 0 ? 'scale(0.8)' : phase >= 11 ? 'scale(1.1)' : 'scale(1)'
                }}
            >
                <div className="flex items-center justify-center gap-8 mb-8">
                    {/* C - Clock Animation */}
                    <ClockToC phase={phase} />
                    
                    {/* L - Graduate Animation */}
                    <GraduateToL phase={phase} />
                    
                    {/* T - Trading Candles Animation */}
                    <CandlesToT phase={phase} />
                </div>

                {/* ACADEMY text */}
                <div 
                    className="text-center transition-all duration-1000 ease-out"
                    style={{
                        opacity: phase >= 9 ? 1 : 0,
                        transform: phase >= 9 ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.8)',
                        letterSpacing: phase >= 9 ? '0.5em' : '0.2em'
                    }}
                >
                    <p className="text-3xl text-slate-400 font-light tracking-widest">ACADEMY</p>
                </div>

                {/* Loading bar */}
                <div className="mt-12 w-72 mx-auto">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all ease-linear"
                            style={{
                                width: `${Math.min(phase * 9, 100)}%`,
                                transitionDuration: '600ms'
                            }}
                        />
                    </div>
                    <p className="text-center text-slate-500 text-sm mt-3">
                        {phase < 3 ? 'Initializing...' : 
                         phase < 6 ? 'Loading modules...' : 
                         phase < 9 ? 'Preparing workspace...' : 
                         'Welcome!'}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ClockToC({ phase }) {
    const isSpinning = phase >= 1 && phase < 2;
    const isTransforming = phase >= 2;
    const isComplete = phase >= 3;
    
    // Calculate rotation - very fast spinning animation
    const hourRotation = isSpinning ? 1080 : 0; // 3 full rotations
    const minuteRotation = isSpinning ? 2880 : 0; // 8 full rotations (faster)

    return (
        <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
                
                {/* Clock circle that transforms to C */}
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={isComplete ? "#ffffff" : "url(#clockGradient)"}
                    strokeWidth={isComplete ? "10" : "6"}
                    strokeDasharray={isComplete ? "220 80" : "264"}
                    strokeDashoffset={isComplete ? "40" : "0"}
                    strokeLinecap="round"
                    className="transition-all"
                    style={{
                        transitionDuration: isTransforming ? '800ms' : '300ms',
                        transform: `rotate(${isComplete ? -90 : 0}deg)`,
                        transformOrigin: 'center'
                    }}
                />
                
                {/* Clock center dot */}
                <circle
                    cx="50"
                    cy="50"
                    r={isComplete ? 0 : 5}
                    fill="#ffffff"
                    className="transition-all duration-500"
                />
                
                {/* Hour hand - spins fast */}
                <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="28"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className={isSpinning ? "animate-spin-fast" : ""}
                    style={{
                        opacity: isComplete ? 0 : 1,
                        transform: `rotate(${hourRotation}deg)`,
                        transformOrigin: '50px 50px',
                        transition: isSpinning ? 'transform 1.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.3s, opacity 0.5s'
                    }}
                />
                
                {/* Minute hand - spins even faster */}
                <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="18"
                    stroke="#00ffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{
                        opacity: isComplete ? 0 : 1,
                        transform: `rotate(${minuteRotation}deg)`,
                        transformOrigin: '50px 50px',
                        transition: isSpinning ? 'transform 1.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.3s, opacity 0.5s'
                    }}
                />
                
                {/* Second hand - spins fastest */}
                <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="14"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{
                        opacity: isSpinning ? 1 : 0,
                        transform: `rotate(${isSpinning ? 4320 : 0}deg)`,
                        transformOrigin: '50px 50px',
                        transition: isSpinning ? 'transform 1.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'opacity 0.3s'
                    }}
                />
                
                {/* Clock tick marks - fade out */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
                    <line
                        key={i}
                        x1="50"
                        y1="12"
                        x2="50"
                        y2={i % 3 === 0 ? "18" : "15"}
                        stroke="#64748b"
                        strokeWidth={i % 3 === 0 ? "2" : "1"}
                        style={{
                            opacity: isComplete ? 0 : 0.6,
                            transform: `rotate(${angle}deg)`,
                            transformOrigin: '50px 50px',
                            transition: `opacity 0.5s ${i * 0.03}s`
                        }}
                    />
                ))}
                
                {/* Speed blur effect during spinning */}
                {isSpinning && (
                    <g>
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.4" className="animate-pulse" />
                        <circle cx="50" cy="50" r="32" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3" className="animate-pulse" />
                        <circle cx="50" cy="50" r="26" fill="none" stroke="#00ffff" strokeWidth="1" opacity="0.2" className="animate-pulse" />
                    </g>
                )}
            </svg>
            
            {/* Time flying text effect */}
            {isSpinning && (
                <div className="absolute -right-2 top-0 text-xs text-cyan-400 animate-bounce">
                    ⚡
                </div>
            )}
        </div>
    );
}

function GraduateToL({ phase }) {
    const isVisible = phase >= 3;
    const isBowing = phase >= 3 && phase < 4;
    const hasCapOn = phase >= 4;
    const isCelebrating = phase >= 4 && phase < 5;
    const isSitting = phase >= 5;
    const chairFading = phase >= 6;
    const isLetter = phase >= 6;
    
    // Calculate body rotation for bowing
    const bodyRotation = isBowing ? 25 : 0;
    const bodyY = isSitting ? 20 : 0;
    
    return (
        <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {/* L Letter (appears when chair fades) */}
                <g style={{ 
                    opacity: isLetter ? 1 : 0, 
                    transition: 'opacity 0.8s',
                    transform: isLetter ? 'scale(1)' : 'scale(0.8)',
                }}>
                    {/* Vertical bar of L */}
                    <rect
                        x="20"
                        y="10"
                        width="12"
                        height="80"
                        rx="2"
                        fill="#ffffff"
                    />
                    {/* Horizontal bar of L */}
                    <rect
                        x="20"
                        y="78"
                        width="55"
                        height="12"
                        rx="2"
                        fill="#ffffff"
                    />
                </g>
                
                {/* Chair - appears during sitting phase */}
                <g style={{
                    opacity: isSitting && !chairFading ? 1 : 0,
                    transform: isSitting ? 'scale(1)' : 'scale(0.8)',
                    transition: 'all 0.6s ease-out'
                }}>
                    {/* Chair back */}
                    <rect x="25" y="45" width="8" height="35" rx="2" fill="#475569" />
                    {/* Chair seat */}
                    <rect x="25" y="70" width="45" height="8" rx="2" fill="#64748b" />
                    {/* Chair legs */}
                    <line x1="30" y1="78" x2="25" y2="95" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                    <line x1="65" y1="78" x2="70" y2="95" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                </g>
                
                {/* Graduate figure */}
                <g 
                    style={{ 
                        opacity: isVisible && !isLetter ? 1 : 0,
                        transform: `rotate(${bodyRotation}deg) translateY(${bodyY}px)`,
                        transformOrigin: '50px 85px',
                        transition: 'all 0.8s ease-in-out'
                    }}
                >
                    {/* Gown/Body */}
                    <path
                        d="M 35 48 L 40 80 L 60 80 L 65 48 Q 50 42 35 48"
                        fill="#1e40af"
                        stroke="#1e3a8a"
                        strokeWidth="1"
                    />
                    
                    {/* Head */}
                    <circle
                        cx="50"
                        cy="32"
                        r="14"
                        fill="#fcd34d"
                    />
                    
                    {/* Face features */}
                    <circle cx="45" cy="30" r="2.5" fill="#1e293b" />
                    <circle cx="55" cy="30" r="2.5" fill="#1e293b" />
                    {/* Smile */}
                    <path 
                        d={isCelebrating ? "M 44 36 Q 50 42 56 36" : "M 46 36 Q 50 39 54 36"} 
                        fill="none" 
                        stroke="#1e293b" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                    />
                    
                    {/* Arms */}
                    <g style={{
                        transform: isCelebrating ? 'translateY(-5px)' : 'translateY(0)',
                        transition: 'transform 0.3s ease-out'
                    }}>
                        {/* Left arm */}
                        <line 
                            x1="38" 
                            y1="52" 
                            x2={isCelebrating ? "20" : "30"} 
                            y2={isCelebrating ? "35" : "65"} 
                            stroke="#fcd34d" 
                            strokeWidth="6" 
                            strokeLinecap="round" 
                            style={{ transition: 'all 0.4s ease-out' }}
                        />
                        {/* Right arm */}
                        <line 
                            x1="62" 
                            y1="52" 
                            x2={isCelebrating ? "80" : "70"} 
                            y2={isCelebrating ? "35" : "65"} 
                            stroke="#fcd34d" 
                            strokeWidth="6" 
                            strokeLinecap="round"
                            style={{ transition: 'all 0.4s ease-out' }}
                        />
                    </g>
                    
                    {/* Hands with diploma */}
                    {isCelebrating && (
                        <g>
                            {/* Diploma scroll */}
                            <rect x="75" y="30" width="15" height="12" rx="2" fill="#f8fafc" />
                            <line x1="78" y1="34" x2="87" y2="34" stroke="#94a3b8" strokeWidth="1" />
                            <line x1="78" y1="38" x2="85" y2="38" stroke="#94a3b8" strokeWidth="1" />
                        </g>
                    )}
                    
                    {/* Legs */}
                    <g style={{
                        transform: isSitting ? 'rotate(60deg)' : 'rotate(0deg)',
                        transformOrigin: '50px 78px',
                        transition: 'transform 0.6s ease-out'
                    }}>
                        <line x1="45" y1="78" x2="38" y2="95" stroke="#1e40af" strokeWidth="6" strokeLinecap="round" />
                        <line x1="55" y1="78" x2="62" y2="95" stroke="#1e40af" strokeWidth="6" strokeLinecap="round" />
                    </g>
                    
                    {/* Graduation cap - drops down onto head */}
                    <g style={{
                        opacity: hasCapOn ? 1 : 0,
                        transform: hasCapOn ? 'translateY(0)' : 'translateY(-30px)',
                        transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)' // bouncy effect
                    }}>
                        <polygon
                            points="28,22 50,10 72,22 50,28"
                            fill="#1e293b"
                        />
                        <rect x="47" y="10" width="6" height="6" fill="#1e293b" />
                        {/* Tassel */}
                        <line x1="50" y1="19" x2="70" y2="32" stroke="#fbbf24" strokeWidth="2" />
                        <circle cx="70" cy="34" r="4" fill="#fbbf24" />
                    </g>
                </g>
                
                {/* Celebration particles */}
                {isCelebrating && (
                    <g className="animate-pulse">
                        <circle cx="30" cy="25" r="2" fill="#fbbf24" />
                        <circle cx="70" cy="20" r="2" fill="#fbbf24" />
                        <circle cx="25" cy="40" r="1.5" fill="#3b82f6" />
                        <circle cx="75" cy="45" r="1.5" fill="#3b82f6" />
                        <text x="15" y="30" fontSize="10">🎉</text>
                        <text x="72" y="25" fontSize="10">🎓</text>
                    </g>
                )}
            </svg>
        </div>
    );
}

function CandlesToT({ phase }) {
    const isVisible = phase >= 7;
    const isAnimating = phase >= 7 && phase < 8;
    const isForming = phase >= 8;
    const isLetter = phase >= 8;
    
    // Candle data: [x, initialY, height, isGreen, finalX, finalY, finalHeight]
    const candles = [
        { x: 15, y: 50, h: 30, green: true, fx: 10, fy: 10, fh: 10 },
        { x: 30, y: 45, h: 35, green: false, fx: 30, fy: 10, fh: 10 },
        { x: 45, y: 40, h: 40, green: true, fx: 50, fy: 10, fh: 80 }, // Becomes vertical bar
        { x: 60, y: 48, h: 28, green: false, fx: 70, fy: 10, fh: 10 },
        { x: 75, y: 42, h: 38, green: true, fx: 90, fy: 10, fh: 10 },
    ];
    
    return (
        <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* T Letter overlay */}
                <g style={{ opacity: isLetter ? 1 : 0, transition: 'opacity 0.5s 0.3s' }}>
                    {/* T horizontal bar */}
                    <rect
                        x="10"
                        y="10"
                        width="80"
                        height="12"
                        rx="2"
                        fill="#00ffff"
                    />
                    {/* T vertical bar */}
                    <rect
                        x="44"
                        y="10"
                        width="12"
                        height="80"
                        rx="2"
                        fill="#00ffff"
                    />
                </g>
                
                {/* Trading candles */}
                {candles.map((candle, i) => {
                    const isCenter = i === 2;
                    const targetX = isForming ? candle.fx : candle.x;
                    const targetY = isForming ? candle.fy : candle.y;
                    const targetH = isForming ? candle.fh : candle.h;
                    
                    return (
                        <g 
                            key={i}
                            style={{
                                opacity: isVisible && !isLetter ? 1 : 0,
                                transition: `all 0.6s ease-in-out ${i * 0.1}s`
                            }}
                        >
                            {/* Wick */}
                            <line
                                x1={targetX}
                                y1={targetY - 8}
                                x2={targetX}
                                y2={targetY + targetH + 8}
                                stroke={candle.green ? "#10b981" : "#ef4444"}
                                strokeWidth="2"
                                style={{
                                    opacity: isForming ? 0 : 1,
                                    transition: 'opacity 0.3s'
                                }}
                            />
                            {/* Candle body */}
                            <rect
                                x={targetX - 6}
                                y={targetY}
                                width="12"
                                height={targetH}
                                rx="2"
                                fill={isForming && isCenter ? "#00ffff" : candle.green ? "#10b981" : "#ef4444"}
                                style={{
                                    transition: 'all 0.6s ease-in-out',
                                    transform: isAnimating ? `scaleY(${1 + Math.sin(i) * 0.2})` : 'scaleY(1)',
                                    transformOrigin: 'center bottom'
                                }}
                            />
                        </g>
                    );
                })}
                
                {/* Chart line connecting candles */}
                <polyline
                    points="15,55 30,50 45,45 60,52 75,47"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="150"
                    strokeDashoffset={isVisible && !isForming ? "0" : "150"}
                    style={{
                        opacity: isForming ? 0 : isVisible ? 0.8 : 0,
                        transition: 'stroke-dashoffset 1s ease-out, opacity 0.5s'
                    }}
                />
                
                {/* Price movement effect */}
                {isAnimating && (
                    <g className="animate-pulse">
                        <text x="80" y="25" fill="#10b981" fontSize="10" fontWeight="bold">+2.4%</text>
                        <path d="M 78 30 L 85 20 L 92 30" fill="none" stroke="#10b981" strokeWidth="2" />
                    </g>
                )}
            </svg>
        </div>
    );
}

export default CLTAnimation;
