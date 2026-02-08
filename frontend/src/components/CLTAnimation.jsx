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
    
    // Calculate rotation based on phase - fast spinning
    const getHandRotation = (isMinute) => {
        if (!isSpinning) return isMinute ? 0 : 0;
        // Multiple full rotations during spin phase
        return isMinute ? 2160 : 720; // Minute hand spins 6x, hour hand 2x
    };

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
                
                {/* Hour hand */}
                <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="28"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{
                        opacity: isComplete ? 0 : 1,
                        transform: `rotate(${getHandRotation(false)}deg)`,
                        transformOrigin: '50px 50px',
                        transition: isSpinning ? 'transform 2s ease-in-out' : 'transform 0.3s, opacity 0.5s'
                    }}
                />
                
                {/* Minute hand */}
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
                        transform: `rotate(${getHandRotation(true)}deg)`,
                        transformOrigin: '50px 50px',
                        transition: isSpinning ? 'transform 2s ease-in-out' : 'transform 0.3s, opacity 0.5s'
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
                
                {/* Speed lines during spinning */}
                {isSpinning && (
                    <g className="animate-pulse">
                        <circle cx="50" cy="50" r="35" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
                        <circle cx="50" cy="50" r="30" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.2" />
                    </g>
                )}
            </svg>
        </div>
    );
}

function GraduateToL({ phase }) {
    const isVisible = phase >= 3;
    const isBowing = phase >= 3 && phase < 4;
    const hasCapOn = phase >= 4;
    const isSitting = phase >= 5;
    const chairFading = phase >= 6;
    const isLetter = phase >= 6;
    
    return (
        <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {/* L Letter (appears when chair fades) */}
                <g style={{ opacity: isLetter ? 1 : 0, transition: 'opacity 0.8s' }}>
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
                
                {/* Graduate figure */}
                <g 
                    style={{ 
                        opacity: isVisible && !isLetter ? 1 : 0,
                        transform: isBowing ? 'rotate(15deg)' : isSitting ? 'translateY(15px)' : 'translateY(0)',
                        transformOrigin: '50px 80px',
                        transition: 'all 0.8s ease-in-out'
                    }}
                >
                    {/* Body */}
                    <rect
                        x="42"
                        y="45"
                        width="16"
                        height="35"
                        rx="4"
                        fill="#fbbf24"
                    />
                    
                    {/* Head */}
                    <circle
                        cx="50"
                        cy="32"
                        r="14"
                        fill="#fcd34d"
                    />
                    
                    {/* Face features */}
                    <circle cx="45" cy="30" r="2" fill="#1e293b" />
                    <circle cx="55" cy="30" r="2" fill="#1e293b" />
                    <path d="M 46 36 Q 50 40 54 36" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                    
                    {/* Arms */}
                    <g style={{
                        transform: hasCapOn && !isSitting ? 'rotate(-20deg)' : 'rotate(0deg)',
                        transformOrigin: '42px 50px',
                        transition: 'transform 0.5s'
                    }}>
                        <line x1="42" y1="50" x2="28" y2={hasCapOn && !isSitting ? "35" : "60"} stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
                    </g>
                    <g style={{
                        transform: hasCapOn && !isSitting ? 'rotate(20deg)' : 'rotate(0deg)',
                        transformOrigin: '58px 50px',
                        transition: 'transform 0.5s'
                    }}>
                        <line x1="58" y1="50" x2="72" y2={hasCapOn && !isSitting ? "35" : "60"} stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
                    </g>
                    
                    {/* Legs */}
                    <line x1="46" y1="78" x2="40" y2="95" stroke="#1e40af" strokeWidth="6" strokeLinecap="round" 
                        style={{
                            transform: isSitting ? 'rotate(45deg)' : 'rotate(0deg)',
                            transformOrigin: '46px 78px',
                            transition: 'transform 0.6s'
                        }}
                    />
                    <line x1="54" y1="78" x2="60" y2="95" stroke="#1e40af" strokeWidth="6" strokeLinecap="round"
                        style={{
                            transform: isSitting ? 'rotate(-45deg)' : 'rotate(0deg)',
                            transformOrigin: '54px 78px',
                            transition: 'transform 0.6s'
                        }}
                    />
                    
                    {/* Graduation cap */}
                    <g style={{
                        opacity: hasCapOn ? 1 : 0,
                        transform: hasCapOn ? 'translateY(0)' : 'translateY(-20px)',
                        transition: 'all 0.5s ease-out'
                    }}>
                        <polygon
                            points="30,22 50,12 70,22 50,28"
                            fill="#1e293b"
                        />
                        <rect x="48" y="12" width="4" height="4" fill="#1e293b" />
                        <line x1="50" y1="20" x2="68" y2="30" stroke="#fbbf24" strokeWidth="2" />
                        <circle cx="68" cy="32" r="4" fill="#fbbf24" />
                    </g>
                </g>
                
                {/* Chair */}
                <g style={{
                    opacity: isSitting && !chairFading ? 1 : 0,
                    transition: 'opacity 0.8s'
                }}>
                    {/* Chair seat */}
                    <rect x="32" y="75" width="36" height="6" rx="2" fill="#64748b" />
                    {/* Chair back */}
                    <rect x="32" y="55" width="6" height="26" rx="2" fill="#64748b" />
                    {/* Chair legs */}
                    <line x1="35" y1="81" x2="30" y2="95" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
                    <line x1="65" y1="81" x2="70" y2="95" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
                </g>
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
