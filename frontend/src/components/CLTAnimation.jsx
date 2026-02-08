import React, { useState, useEffect } from 'react';

function CLTAnimation({ onComplete }) {
    const [phase, setPhase] = useState(0);
    // Phases: 0=start, 1=C animates, 2=L animates, 3=T animates, 4=combine, 5=ACADEMY text, 6=fade out

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 300),      // Start C clock animation
            setTimeout(() => setPhase(2), 1500),     // Start L graduate animation
            setTimeout(() => setPhase(3), 2700),     // Start T candles animation
            setTimeout(() => setPhase(4), 3900),     // Combine into logo
            setTimeout(() => setPhase(5), 4800),     // Show ACADEMY text
            setTimeout(() => setPhase(6), 5500),     // Start fade out
            setTimeout(() => onComplete && onComplete(), 6200), // Complete
        ];
        
        return () => timers.forEach(t => clearTimeout(t));
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[9999] overflow-hidden">
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
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-blue-400 rounded-full animate-float"
                        style={{
                            left: `${5 + (i * 4.5)}%`,
                            top: `${10 + ((i * 13) % 80)}%`,
                            animationDelay: `${i * 0.15}s`,
                            opacity: 0.3
                        }}
                    />
                ))}
            </div>

            {/* Main animation container */}
            <div 
                className="relative z-10 transition-all duration-700"
                style={{
                    opacity: phase === 0 ? 0 : phase >= 6 ? 0 : 1,
                    transform: phase === 0 ? 'scale(0.8)' : phase >= 6 ? 'scale(1.1)' : 'scale(1)'
                }}
            >
                <div className="flex items-center justify-center gap-4 mb-8">
                    {/* C - Clock Animation */}
                    <ClockC phase={phase} />
                    
                    {/* L - Graduate Animation */}
                    <GraduateL phase={phase} />
                    
                    {/* T - Trading Candles Animation */}
                    <CandlesT phase={phase} />
                </div>

                {/* ACADEMY text */}
                <div 
                    className="text-center transition-all duration-500"
                    style={{
                        opacity: phase >= 5 ? 1 : 0,
                        transform: phase >= 5 ? 'translateY(0)' : 'translateY(20px)'
                    }}
                >
                    <p className="text-2xl tracking-[0.5em] text-slate-400 font-light">ACADEMY</p>
                </div>

                {/* Loading bar */}
                <div className="mt-12 w-64 mx-auto">
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full transition-all ease-linear"
                            style={{
                                width: `${Math.min(phase * 18, 100)}%`,
                                transitionDuration: '800ms'
                            }}
                        />
                    </div>
                    <p className="text-center text-slate-500 text-sm mt-3">
                        {phase < 4 ? 'Initializing...' : phase < 5 ? 'Loading workspace...' : 'Welcome!'}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ClockC({ phase }) {
    const isActive = phase >= 1;
    const isCombined = phase >= 4;
    
    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Clock circle / C shape */}
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={isCombined ? "#ffffff" : "#3b82f6"}
                    strokeWidth="8"
                    strokeDasharray={isCombined ? "220 80" : "251"}
                    strokeDashoffset={isCombined ? "40" : "0"}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                    style={{
                        opacity: isActive ? 1 : 0,
                        transform: `rotate(${isCombined ? -90 : 0}deg)`,
                        transformOrigin: 'center'
                    }}
                />
                
                {/* Clock center dot */}
                <circle
                    cx="50"
                    cy="50"
                    r="4"
                    fill={isCombined ? "transparent" : "#3b82f6"}
                    className="transition-all duration-500"
                    style={{ opacity: isActive && !isCombined ? 1 : 0 }}
                />
                
                {/* Hour hand */}
                <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="25"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                    style={{
                        opacity: isActive && !isCombined ? 1 : 0,
                        transform: `rotate(${isActive ? 360 : 0}deg)`,
                        transformOrigin: '50px 50px',
                        transition: 'transform 1.5s ease-in-out, opacity 0.3s'
                    }}
                />
                
                {/* Minute hand */}
                <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="18"
                    stroke="#00ffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                    style={{
                        opacity: isActive && !isCombined ? 1 : 0,
                        transform: `rotate(${isActive ? 720 : 0}deg)`,
                        transformOrigin: '50px 50px',
                        transition: 'transform 1.5s ease-in-out, opacity 0.3s'
                    }}
                />
                
                {/* Clock tick marks */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
                    <line
                        key={i}
                        x1="50"
                        y1="14"
                        x2="50"
                        y2={i % 3 === 0 ? "18" : "16"}
                        stroke="#64748b"
                        strokeWidth={i % 3 === 0 ? "2" : "1"}
                        style={{
                            opacity: isActive && !isCombined ? 0.5 : 0,
                            transform: `rotate(${angle}deg)`,
                            transformOrigin: '50px 50px',
                            transition: `opacity 0.3s ${i * 0.05}s`
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

function GraduateL({ phase }) {
    const isActive = phase >= 2;
    const isCombined = phase >= 4;
    
    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Graduate figure that transforms into L */}
                
                {/* Body/Vertical line of L */}
                <rect
                    x="20"
                    y={isCombined ? "10" : "35"}
                    width="10"
                    height={isCombined ? "80" : "45"}
                    rx="2"
                    fill="#ffffff"
                    className="transition-all duration-700"
                    style={{ opacity: isActive ? 1 : 0 }}
                />
                
                {/* Horizontal line of L / Ground */}
                <rect
                    x={isCombined ? "20" : "15"}
                    y="80"
                    width={isCombined ? "50" : "40"}
                    height="10"
                    rx="2"
                    fill="#ffffff"
                    className="transition-all duration-700"
                    style={{ opacity: isActive ? 1 : 0 }}
                />
                
                {/* Graduate head */}
                <circle
                    cx="25"
                    cy="25"
                    r="12"
                    fill={isCombined ? "transparent" : "#fbbf24"}
                    className="transition-all duration-500"
                    style={{ opacity: isActive && !isCombined ? 1 : 0 }}
                />
                
                {/* Graduation cap */}
                <g 
                    className="transition-all duration-500"
                    style={{ 
                        opacity: isActive && !isCombined ? 1 : 0,
                        transform: isActive && !isCombined ? 'translateY(0)' : 'translateY(-10px)'
                    }}
                >
                    {/* Cap top */}
                    <polygon
                        points="5,18 25,8 45,18 25,22"
                        fill="#1e293b"
                        stroke="#3b82f6"
                        strokeWidth="1"
                    />
                    {/* Cap tassel */}
                    <line x1="25" y1="15" x2="40" y2="25" stroke="#fbbf24" strokeWidth="2" />
                    <circle cx="40" cy="27" r="3" fill="#fbbf24" />
                </g>
                
                {/* Arms raised in celebration */}
                <g 
                    className="transition-all duration-500"
                    style={{ opacity: isActive && !isCombined ? 1 : 0 }}
                >
                    <line x1="20" y1="45" x2="5" y2="30" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                    <line x1="30" y1="45" x2="45" y2="30" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                </g>
                
                {/* Diploma/scroll */}
                <g 
                    className="transition-all duration-700"
                    style={{ 
                        opacity: isActive && !isCombined ? 1 : 0,
                        transform: isActive ? 'rotate(0deg)' : 'rotate(-20deg)',
                        transformOrigin: '50px 35px'
                    }}
                >
                    <rect x="48" y="28" width="15" height="20" rx="2" fill="#f8fafc" />
                    <line x1="51" y1="33" x2="60" y2="33" stroke="#64748b" strokeWidth="1" />
                    <line x1="51" y1="37" x2="60" y2="37" stroke="#64748b" strokeWidth="1" />
                    <line x1="51" y1="41" x2="57" y2="41" stroke="#64748b" strokeWidth="1" />
                </g>
            </svg>
        </div>
    );
}

function CandlesT({ phase }) {
    const isActive = phase >= 3;
    const isCombined = phase >= 4;
    
    // Candle data: [x, bodyTop, bodyBottom, wickTop, wickBottom, isGreen]
    const candles = [
        [25, 25, 55, 15, 60, true],
        [40, 30, 50, 20, 58, false],
        [55, 20, 45, 10, 55, true],
        [70, 35, 60, 25, 65, false],
        [85, 28, 52, 18, 62, true],
    ];
    
    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* T shape overlay */}
                {isCombined && (
                    <>
                        {/* T horizontal bar */}
                        <rect
                            x="10"
                            y="10"
                            width="80"
                            height="10"
                            fill="#00ffff"
                            className="transition-all duration-700"
                            style={{ opacity: isCombined ? 1 : 0 }}
                        />
                        {/* T vertical bar */}
                        <rect
                            x="40"
                            y="10"
                            width="12"
                            height="80"
                            fill="#00ffff"
                            className="transition-all duration-700"
                            style={{ opacity: isCombined ? 1 : 0 }}
                        />
                    </>
                )}
                
                {/* Trading candles */}
                {candles.map((candle, i) => {
                    const [x, bodyTop, bodyBottom, wickTop, wickBottom, isGreen] = candle;
                    const color = isGreen ? "#10b981" : "#ef4444";
                    const delay = i * 0.15;
                    
                    return (
                        <g 
                            key={i}
                            className="transition-all duration-500"
                            style={{ 
                                opacity: isActive && !isCombined ? 1 : 0,
                                transform: isActive ? 'scaleY(1)' : 'scaleY(0)',
                                transformOrigin: 'center bottom',
                                transitionDelay: `${delay}s`
                            }}
                        >
                            {/* Wick */}
                            <line
                                x1={x}
                                y1={wickTop}
                                x2={x}
                                y2={wickBottom}
                                stroke={color}
                                strokeWidth="2"
                            />
                            {/* Body */}
                            <rect
                                x={x - 5}
                                y={bodyTop}
                                width="10"
                                height={bodyBottom - bodyTop}
                                fill={color}
                                rx="1"
                            />
                        </g>
                    );
                })}
                
                {/* Chart line connecting candles */}
                <polyline
                    points="25,40 40,38 55,32 70,45 85,38"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="200"
                    strokeDashoffset={isActive && !isCombined ? "0" : "200"}
                    className="transition-all duration-1000"
                    style={{ 
                        opacity: isActive && !isCombined ? 0.7 : 0,
                        transitionDelay: '0.5s'
                    }}
                />
            </svg>
        </div>
    );
}

export default CLTAnimation;
