import React from 'react';

// CLT Logo with SYNAPSE text below (replacing ACADEMY)
// Original colors: Black text/shapes, Red accents, White background
// Dark mode: White text/shapes, Red accents, Transparent background
function CLTLogo({ className, isDark }) {
    const mainColor = isDark ? '#ffffff' : '#000000';
    const accentColor = '#ff0000';  // Red in both light and dark mode
    
    return (
        <svg 
            className={className}
            viewBox="270 180 260 230"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* C Letter */}
            <path 
                d="M366.67 349.56c-5.51 0-10.57-.92-15.16-2.76s-8.56-4.47-11.89-7.9-5.93-7.55-7.79-12.38-2.79-10.26-2.79-16.3.93-11.47 2.79-16.3 4.47-8.96 7.79-12.38 7.3-6.05 11.89-7.9 9.65-2.76 15.16-2.76c3.32 0 6.42.3 9.31.92s5.51 1.46 7.87 2.53 4.47 2.38 6.35 3.91 3.53 3.22 4.94 5.05l-10.42 9.04c-2.21-2.76-4.86-4.86-7.94-6.28s-6.58-2.14-10.5-2.14c-3.32 0-6.35.61-9.08 1.84s-5.09 2.95-7.07 5.16-3.53 4.86-4.63 7.94-1.66 6.47-1.66 10.15.55 7.03 1.66 10.11 2.64 5.7 4.63 7.9 4.32 3.91 7.03 5.12 5.7 1.82 8.96 1.82c2.03 0 3.95-.2 5.77-.59s3.53-.97 5.12-1.72 3.07-1.68 4.43-2.79 2.6-2.38 3.72-3.79l10.8 8.66c-1.57 2.03-3.38 3.87-5.43 5.51s-4.36 3.05-6.92 4.24-5.39 2.11-8.47 2.76-6.39.97-9.94.97z" 
                fill={mainColor}
            />
            {/* L Letter */}
            <path 
                d="M419.06 271.04h16.68v62.31h39.27v15.32h-55.95v-77.63z" 
                fill={mainColor}
            />
            {/* T Letter */}
            <path 
                d="M513.25 286.35h-25.34v-15.32h67.36v15.32h-25.34v62.31h-16.68v-62.31z" 
                fill={mainColor}
            />
            {/* Red Arrow */}
            <path 
                d="M542.23 230.39l-22.98 35.97h45.95l-22.97-35.97z" 
                fill={accentColor}
            />
            <path 
                d="M533.56 264.81h17.34v24.25h-17.34v-24.25z" 
                fill={accentColor}
            />
            
            {/* SYNAPSE Text - centered below CLT */}
            <text 
                x="400" 
                y="390" 
                textAnchor="middle" 
                fill={mainColor}
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                fontSize="28"
                letterSpacing="8"
            >
                SYNAPSE
            </text>
        </svg>
    );
}

export default CLTLogo;
