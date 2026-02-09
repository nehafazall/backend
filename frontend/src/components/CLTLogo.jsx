import React from 'react';

// CLT Logo as inline SVG for proper theme handling
// Original colors: Black text/shapes, Red accents, White background
// Dark mode: White text/shapes, Red accents (same as light mode), Transparent background
function CLTLogo({ className, isDark }) {
    const mainColor = isDark ? '#ffffff' : '#000000';
    const accentColor = '#ff0000';  // Red in both light and dark mode
    
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 810 810" 
            className={className}
            style={{ background: 'transparent' }}
        >
            {/* C Letter */}
            <path 
                d="M365.8 322.06v-18.43c0-35.9-29.11-65.02-65.02-65.02s-65.02 29.11-65.02 65.02v104.77c0 35.91 29.11 65.02 65.02 65.02 17.95 0 34.21-7.28 45.98-19.05s19.05-28.03 19.05-45.98v-35L325.59 373.42v35.07c0 14.09-11.42 25.51-25.52 25.51-7.04 0-13.43-2.85-18.04-7.48s-7.48-10.99-7.48-18.04v-105.92c0-14.09 11.43-25.52 25.52-25.52 7.05 0 13.43 2.86 18.04 7.49s7.48 11 7.48 18.04v19.5h40.22z" 
                fill={mainColor}
            />
            {/* L Letter - Main vertical */}
            <path 
                d="M380.3 243.73h40.79v184.48H380.3V243.73zm0 184.49h117.08v40.22H380.3v-40.22z" 
                fill={mainColor}
            />
            {/* L Letter - Red triangle accent */}
            <path 
                d="M421.09 307.34L380.3 372.95V238.43h40.79v68.91z" 
                fill={accentColor}
            />
            {/* T Letter - Red diagonal */}
            <path 
                d="M433.32 423.77l128.9-130.73v-21L518.68 272.05 433.32 423.77z" 
                fill={accentColor}
            />
            {/* T Letter - Red top bar */}
            <path 
                d="M522.46 262.46l16.49 10.56H441.68v-33.63h154.27v76.74l-21.34-22.63v-34.87h-52.2l.05 3.4z" 
                fill={accentColor}
            />
            {/* T Letter - Red vertical stem */}
            <path 
                d="M555.41 468.45h-36.73V348.04l36.73-37.37v157.78z" 
                fill={accentColor}
            />
            
            {/* SYNAPSE Text - using same font style as original ACADEMY */}
            <text 
                x="405" 
                y="520" 
                textAnchor="middle" 
                dominantBaseline="middle"
                fill={mainColor}
                fontFamily="Arial Black, Arial, sans-serif"
                fontWeight="900"
                fontSize="38"
                letterSpacing="6"
            >
                SYNAPSE
            </text>
        </svg>
    );
}

export default CLTLogo;
