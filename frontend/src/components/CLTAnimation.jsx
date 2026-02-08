import React, { useEffect, useMemo, useRef } from "react";

/**
 * CLT Academy — Animated Logo Reveal (React)
 * - Pure SVG + Web Animations API (no deps)
 * - Duration ~13s (slowed down)
 * - Red/Green candlesticks, Green support lines, Red trend arrow
 * - Uses actual CLT Academy logo
 */
export default function CLTAnimation({
  width = "min(980px, 96vw)",
  loop = false,
  className = "",
  onComplete = null,
}) {
  const svgRef = useRef(null);
  const timeouts = useRef([]);

  const ids = useMemo(
    () => ({
      wickIds: ["wick1", "wick2", "wick3", "wick4", "wick5", "wick6", "wick7", "wick8"],
      bodyIds: ["body1", "body2", "body3", "body4", "body5", "body6", "body7", "body8"],
      gridIds: [
        "grid1", "grid2", "grid3", "grid4", "grid5",
        "grid6", "grid7", "grid8", "grid9", "grid10",
      ],
    }),
    []
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const $ = (id) => svg.querySelector(`#${CSS.escape(id)}`);

    const clearAll = () => {
      timeouts.current.forEach((t) => clearTimeout(t));
      timeouts.current = [];
    };

    const fade = (el, to = 1, duration = 600, delay = 0) => {
      if (!el) return;
      el.animate(
        [{ opacity: getComputedStyle(el).opacity }, { opacity: String(to) }],
        { duration, delay, easing: "ease-out", fill: "forwards" }
      );
    };

    const transform = (el, keyframes, opts) => {
      if (!el) return;
      el.animate(keyframes, {
        easing: "cubic-bezier(.2,.8,.2,1)",
        fill: "forwards",
        ...opts,
      });
    };

    const setDashDraw = (el, duration = 1200, delay = 0) => {
      if (!el) return;
      const len =
        typeof el.getTotalLength === "function" ? el.getTotalLength() : 600;
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      el.animate(
        [
          { strokeDashoffset: len, opacity: 0 },
          { strokeDashoffset: 0, opacity: 1 },
        ],
        {
          duration,
          delay,
          easing: "cubic-bezier(.2,.8,.2,1)",
          fill: "forwards",
        }
      );
    };

    const animateCandle = (wickEl, bodyEl, duration = 800, delay = 0) => {
      if (wickEl) {
        wickEl.style.opacity = "0";
        wickEl.style.transform = "scaleY(0)";
        wickEl.style.transformOrigin = "center bottom";
        wickEl.animate(
          [
            { opacity: 0, transform: "scaleY(0)" },
            { opacity: 1, transform: "scaleY(1.1)" },
            { opacity: 1, transform: "scaleY(0.95)" },
            { opacity: 1, transform: "scaleY(1)" },
          ],
          {
            duration: duration,
            delay: delay,
            easing: "cubic-bezier(.2,.8,.2,1)",
            fill: "forwards",
          }
        );
      }
      if (bodyEl) {
        bodyEl.style.opacity = "0";
        bodyEl.style.transform = "scaleY(0)";
        bodyEl.style.transformOrigin = "center bottom";
        bodyEl.animate(
          [
            { opacity: 0, transform: "scaleY(0)" },
            { opacity: 1, transform: "scaleY(1.15)" },
            { opacity: 1, transform: "scaleY(0.9)" },
            { opacity: 1, transform: "scaleY(1)" },
          ],
          {
            duration: duration + 100,
            delay: delay + 150,
            easing: "cubic-bezier(.2,.8,.2,1)",
            fill: "forwards",
          }
        );
      }
    };

    const resetVisibility = () => {
      const structure = $("structure");
      const logo = $("logo");
      const market = $("market");

      if (market) market.style.opacity = "1";
      if (structure) {
        structure.style.opacity = "0";
        structure.classList.add("hidden");
        structure.style.transform = "translate(0,0) scale(1)";
      }
      if (logo) {
        logo.style.opacity = "0";
        logo.classList.add("hidden");
        logo.style.transform = "scale(0.8)";
      }

      if (market) market.style.transform = "translate(0,0) scale(1)";

      [...ids.wickIds, ...ids.bodyIds, ...ids.gridIds, "priceLine", "sr1", "sr2", "trend"].forEach((id) => {
        const el = $(id);
        if (!el) return;
        el.style.strokeDasharray = "";
        el.style.strokeDashoffset = "";
        el.style.opacity = "0";
        el.style.transform = "";
      });

      const dot = $("dot");
      if (dot) {
        dot.style.opacity = "0";
        dot.style.transform = "scale(0)";
      }
    };

    const run = () => {
      resetVisibility();

      // 1) Draw candles one by one with bounce animation
      ids.wickIds.forEach((id, i) => {
        const wickEl = $(id);
        const bodyEl = $(`body${i + 1}`);
        animateCandle(wickEl, bodyEl, 900, i * 350);
      });

      // 2) Draw price line after candles
      timeouts.current.push(
        setTimeout(() => {
          setDashDraw($("priceLine"), 1500, 0);
        }, 3000)
      );

      // 3) Fade in structure + draw grid lines
      timeouts.current.push(
        setTimeout(() => {
          const structure = $("structure");
          if (!structure) return;
          structure.classList.remove("hidden");
          fade(structure, 1, 500, 0);

          ids.gridIds.forEach((id, i) => setDashDraw($(id), 600, 150 + i * 80));

          // Green support/resistance lines
          timeouts.current.push(
            setTimeout(() => {
              setDashDraw($("sr1"), 800, 0);
              setDashDraw($("sr2"), 800, 200);
            }, 1000)
          );

          // Red trend arrow
          timeouts.current.push(
            setTimeout(() => {
              setDashDraw($("trend"), 1000, 0);
              
              const dot = $("dot");
              if (dot) {
                dot.animate(
                  [
                    { transform: "scale(0)", opacity: 0 },
                    { transform: "scale(1.3)", opacity: 1 },
                    { transform: "scale(1)", opacity: 1 },
                  ],
                  {
                    duration: 600,
                    delay: 400,
                    easing: "cubic-bezier(.2,.8,.2,1)",
                    fill: "forwards",
                  }
                );
              }
            }, 2000)
          );
        }, 4500)
      );

      // 4) Snap inward (collapse)
      timeouts.current.push(
        setTimeout(() => {
          const market = $("market");
          const structure = $("structure");
          fade(market, 0.12, 500, 0);

          transform(
            market,
            [
              { transform: "translate(0,0) scale(1)" },
              { transform: "translate(0,0) scale(.85)" },
            ],
            { duration: 500 }
          );

          transform(
            structure,
            [
              { transform: "translate(0,0) scale(1)", opacity: 1 },
              { transform: "translate(0,0) scale(.82)", opacity: 0.85 },
            ],
            { duration: 500 }
          );

          timeouts.current.push(
            setTimeout(() => {
              transform(
                market,
                [
                  { transform: "translate(0,0) scale(.85)" },
                  { transform: "translate(0,0) scale(.08)", opacity: 0 },
                ],
                { duration: 600, easing: "cubic-bezier(.15,.9,.2,1)" }
              );
              transform(
                structure,
                [
                  { transform: "translate(0,0) scale(.82)", opacity: 0.85 },
                  { transform: "translate(0,0) scale(.08)", opacity: 0 },
                ],
                { duration: 600, easing: "cubic-bezier(.15,.9,.2,1)" }
              );
            }, 350)
          );
        }, 8000)
      );

      // 5) Reveal actual CLT Academy Logo
      timeouts.current.push(
        setTimeout(() => {
          const logo = $("logo");
          if (!logo) return;

          logo.classList.remove("hidden");
          logo.animate(
            [
              { opacity: 0, transform: "scale(0.6)" },
              { opacity: 1, transform: "scale(1.05)" },
              { opacity: 1, transform: "scale(1)" },
            ],
            {
              duration: 1200,
              easing: "cubic-bezier(.2,.8,.2,1)",
              fill: "forwards",
            }
          );
        }, 9500)
      );

      // 6) Call onComplete after animation finishes
      if (onComplete && !loop) {
        timeouts.current.push(
          setTimeout(() => {
            onComplete();
          }, 13000)
        );
      }

      if (loop) {
        timeouts.current.push(
          setTimeout(() => {
            run();
          }, 15000)
        );
      }
    };

    run();
    return () => clearAll();
  }, [ids, loop, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] ${className}`}
      data-testid="clt-animation"
      style={{
        background: "#050608",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1200 600"
        style={{ width, height: "auto" }}
        role="img"
        aria-label="CLT animated logo reveal"
      >
        <defs>
          <radialGradient id="vig" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="1200" height="600" fill="url(#vig)" />

        {/* MARKET - Candlesticks with Red/Green colors */}
        <g id="market" style={{ filter: "drop-shadow(0 0 12px rgba(16,185,129,.15)) drop-shadow(0 0 12px rgba(239,68,68,.15))" }}>
          {/* Wicks */}
          <path id="wick1" d="M280 320 L280 205" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick2" d="M360 360 L360 235" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick3" d="M440 335 L440 215" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick4" d="M520 380 L520 225" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick5" d="M600 350 L600 165" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick6" d="M680 330 L680 190" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick7" d="M760 355 L760 225" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick8" d="M840 325 L840 175" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />

          {/* Bodies */}
          <path id="body1" d="M262 300 Q262 285 277 285 L283 285 Q298 285 298 300 L298 325 Q298 340 283 340 L277 340 Q262 340 262 325 Z" 
            fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #10b981)" }} />
          <path id="body2" d="M342 335 Q342 322 357 322 L363 322 Q378 322 378 335 L378 365 Q378 378 363 378 L357 378 Q342 378 342 365 Z" 
            fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #ef4444)" }} />
          <path id="body3" d="M422 315 Q422 300 437 300 L443 300 Q458 300 458 315 L458 342 Q458 357 443 357 L437 357 Q422 357 422 342 Z" 
            fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #10b981)" }} />
          <path id="body4" d="M502 350 Q502 335 517 335 L523 335 Q538 335 538 350 L538 392 Q538 407 523 407 L517 407 Q502 407 502 392 Z" 
            fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #ef4444)" }} />
          <path id="body5" d="M582 270 Q582 255 597 255 L603 255 Q618 255 618 270 L618 350 Q618 365 603 365 L597 365 Q582 365 582 350 Z" 
            fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 10px #10b981)" }} />
          <path id="body6" d="M662 295 Q662 280 677 280 L683 280 Q698 280 698 295 L698 332 Q698 347 683 347 L677 347 Q662 347 662 332 Z" 
            fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #10b981)" }} />
          <path id="body7" d="M742 330 Q742 315 757 315 L763 315 Q778 315 778 330 L778 362 Q778 377 763 377 L757 377 Q742 377 742 362 Z" 
            fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #ef4444)" }} />
          <path id="body8" d="M822 290 Q822 275 837 275 L843 275 Q858 275 858 290 L858 328 Q858 343 843 343 L837 343 Q822 343 822 328 Z" 
            fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #10b981)" }} />

          {/* Price line */}
          <path
            id="priceLine"
            d="M230 360 C300 310, 360 390, 440 330 C520 280, 600 290, 680 250 C760 220, 820 270, 920 200"
            fill="none"
            stroke="rgba(233,237,245,.25)"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ opacity: 0 }}
          />
        </g>

        {/* STRUCTURE - Grid with GREEN support lines and RED trend */}
        <g id="structure" className="hidden">
          {/* Grid lines */}
          <path id="grid1" d="M220 190 L980 190" stroke="rgba(233,237,245,.2)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid2" d="M220 250 L980 250" stroke="rgba(233,237,245,.2)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid3" d="M220 310 L980 310" stroke="rgba(233,237,245,.2)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid4" d="M220 370 L980 370" stroke="rgba(233,237,245,.2)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid5" d="M300 150 L300 430" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid6" d="M420 150 L420 430" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid7" d="M540 150 L540 430" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid8" d="M660 150 L660 430" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid9" d="M780 150 L780 430" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid10" d="M900 150 L900 430" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />

          {/* Support/Resistance lines - GREEN */}
          <path id="sr1" d="M250 350 L950 350" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0, filter: "drop-shadow(0 0 4px #10b981)" }} />
          <path id="sr2" d="M250 230 L950 230" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0, filter: "drop-shadow(0 0 4px #10b981)" }} />
          
          {/* Trend arrow - RED */}
          <path id="trend" d="M260 390 L940 170" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #ef4444)" }} />
          
          {/* Dot indicator - RED */}
          <circle id="dot" cx="760" cy="250" r="8" fill="#ef4444" style={{ opacity: 0, transform: "scale(0)", transformOrigin: "center", filter: "drop-shadow(0 0 8px #ef4444)" }} />
        </g>

        {/* ACTUAL CLT ACADEMY LOGO - Embedded and scaled */}
        <g id="logo" className="hidden" transform="translate(360, 100) scale(0.6)" style={{ opacity: 0 }}>
          {/* White background rectangle for logo visibility on dark background */}
          <rect x="200" y="200" width="420" height="350" rx="20" fill="#ffffff" />
          
          {/* C Letter - Black */}
          <path d="M365.804688 322.0625 L365.804688 303.628906 C365.804688 267.722656 336.691406 238.605469 300.785156 238.605469 C264.878906 238.605469 235.765625 267.722656 235.765625 303.628906 L235.765625 408.402344 C235.765625 444.316406 264.878906 473.421875 300.785156 473.421875 C318.738281 473.421875 335 466.140625 346.765625 454.371094 C358.53125 442.605469 365.816406 426.34375 365.816406 408.390625 L365.816406 373.417969 L325.589844 373.417969 L325.589844 408.488281 C325.589844 422.582031 314.167969 434.003906 300.074219 434.003906 C293.03125 434.003906 286.644531 431.148438 282.035156 426.527344 C277.425781 421.910156 274.558594 415.53125 274.558594 408.488281 L274.558594 302.570312 C274.558594 288.484375 285.988281 277.054688 300.074219 277.054688 C307.125 277.054688 313.503906 279.910156 318.113281 284.519531 C322.722656 289.128906 325.589844 295.515625 325.589844 302.558594 L325.589844 322.0625 Z" fill="#000000" />
          
          {/* L Letter - Black main part */}
          <path d="M380.300781 243.734375 L421.085938 243.734375 L421.085938 428.21875 L380.300781 428.21875 Z M380.300781 428.21875 L497.382812 428.21875 L497.382812 468.445312 L380.300781 468.445312 Z" fill="#000000" />
          
          {/* L Letter - Red triangle accent */}
          <path d="M421.085938 307.339844 L380.300781 372.945312 L380.300781 238.433594 L421.085938 238.433594 Z" fill="#ff0000" />
          
          {/* T Letter - Red diagonal */}
          <path d="M433.316406 423.773438 L562.21875 293.042969 L562.21875 272.046875 L518.675781 272.046875 Z" fill="#ff0000" />
          
          {/* T Letter - Red top bar */}
          <path d="M522.457031 262.457031 L538.945312 273.019531 L441.675781 273.019531 L441.675781 239.394531 L595.664062 239.394531 L595.941406 259.175781 L595.941406 316.632812 L574.601562 294.003906 L574.601562 259.136719 L522.40625 259.058594 Z" fill="#ff0000" />
          
          {/* T Letter - Red vertical stem */}
          <path d="M555.40625 468.445312 L518.675781 468.445312 L518.675781 348.035156 L555.40625 310.667969 Z" fill="#ff0000" />
          
          {/* ACADEMY text - A */}
          <path d="M260.109375 515.195312 L265.746094 515.195312 L264.726562 512.234375 C264.398438 511.320312 264.089844 510.394531 263.8125 509.464844 C263.535156 508.53125 263.265625 507.605469 263.003906 506.664062 L262.925781 506.664062 C262.667969 507.558594 262.386719 508.472656 262.082031 509.394531 C261.773438 510.320312 261.453125 511.273438 261.128906 512.234375 Z M260.53125 501.667969 L265.535156 501.667969 L273.742188 523.867188 L268.632812 523.867188 L266.902344 518.757812 L259.011719 518.757812 L257.289062 523.867188 L252.246094 523.867188 Z" fill="#000000" />
          
          {/* ACADEMY text - C */}
          <path d="M312.183594 520.523438 C313.261719 520.523438 314.1875 520.425781 314.9375 520.246094 C315.6875 520.0625 316.332031 519.800781 316.871094 519.464844 L317.863281 522.988281 C317.292969 523.3125 316.496094 523.613281 315.464844 523.871094 C314.4375 524.132812 313.175781 524.257812 311.695312 524.257812 C310.03125 524.257812 308.492188 523.988281 307.078125 523.46875 C305.660156 522.949219 304.449219 522.179688 303.429688 521.179688 C302.410156 520.175781 301.613281 518.964844 301.054688 517.542969 C300.496094 516.117188 300.207031 514.519531 300.207031 512.730469 C300.207031 511 300.484375 509.421875 301.035156 508.015625 C301.582031 506.613281 302.363281 505.398438 303.363281 504.398438 C304.363281 503.398438 305.574219 502.628906 307.007812 502.089844 C308.441406 501.550781 310.039062 501.28125 311.800781 501.28125 C313.300781 501.28125 314.542969 501.425781 315.515625 501.703125 C316.484375 501.984375 317.285156 502.292969 317.890625 502.617188 L316.792969 506.179688 C316.179688 505.851562 315.503906 505.574219 314.761719 505.351562 C314.023438 505.128906 313.195312 505.015625 312.28125 505.015625 C311.320312 505.015625 310.414062 505.160156 309.566406 505.4375 C308.722656 505.71875 308 506.179688 307.355469 506.792969 C306.710938 507.410156 306.230469 508.21875 305.863281 509.191406 C305.5 510.160156 305.316406 511.34375 305.316406 512.730469 C305.316406 514.066406 305.488281 515.230469 305.84375 516.203125 C306.199219 517.175781 306.683594 517.984375 307.308594 518.617188 C307.933594 519.253906 308.652344 519.726562 309.492188 520.042969 C310.328125 520.359375 311.222656 520.515625 312.183594 520.515625" fill="#000000" />
          
          {/* ACADEMY text - A */}
          <path d="M352.539062 515.195312 L358.175781 515.195312 L357.15625 512.234375 C356.832031 511.320312 356.523438 510.394531 356.242188 509.464844 C355.964844 508.53125 355.695312 507.605469 355.433594 506.664062 L355.359375 506.664062 C355.097656 507.558594 354.820312 508.472656 354.511719 509.394531 C354.203125 510.320312 353.886719 511.273438 353.558594 512.234375 Z M352.964844 501.667969 L357.964844 501.667969 L366.171875 523.867188 L361.0625 523.867188 L359.332031 518.757812 L351.441406 518.757812 L349.71875 523.867188 L344.679688 523.867188 Z" fill="#000000" />
          
          {/* ACADEMY text - D */}
          <path d="M399.195312 520.132812 L400.851562 520.132812 C401.839844 520.132812 402.792969 520.007812 403.726562 519.765625 C404.660156 519.527344 405.46875 519.09375 406.179688 518.496094 C406.890625 517.902344 407.449219 517.101562 407.871094 516.101562 C408.296875 515.101562 408.507812 513.839844 408.507812 512.3125 C408.507812 510.078125 407.871094 508.367188 406.601562 507.183594 C405.332031 506 403.621094 505.402344 401.484375 505.402344 L399.195312 505.402344 Z M402.121094 501.667969 C403.832031 501.667969 405.398438 501.890625 406.804688 502.332031 C408.210938 502.777344 409.421875 503.449219 410.433594 504.34375 C411.441406 505.238281 412.222656 506.34375 412.78125 507.671875 C413.335938 509 413.605469 510.550781 413.605469 512.3125 C413.605469 514.332031 413.28125 516.0625 412.617188 517.507812 C411.953125 518.949219 411.066406 520.152344 409.941406 521.105469 C408.816406 522.058594 407.488281 522.757812 405.976562 523.203125 C404.46875 523.644531 402.859375 523.875 401.167969 523.875 L394.363281 523.875 L394.363281 501.667969 Z" fill="#000000" />
          
          {/* ACADEMY text - E */}
          <path d="M442.78125 501.667969 L457.234375 501.667969 L457.234375 505.402344 L447.613281 505.402344 L447.613281 510.480469 L456.320312 510.480469 L456.320312 514.175781 L447.613281 514.175781 L447.613281 520.132812 L457.339844 520.132812 L457.339844 523.863281 L442.78125 523.863281 Z" fill="#000000" />
          
          {/* ACADEMY text - M */}
          <path d="M487.785156 501.667969 L493.875 501.667969 L497.050781 511.78125 C497.195312 512.222656 497.339844 512.714844 497.492188 513.222656 C497.648438 513.734375 497.789062 514.253906 497.933594 514.773438 C498.078125 515.292969 498.203125 515.792969 498.320312 516.285156 C498.4375 516.773438 498.53125 517.234375 498.597656 517.660156 L498.742188 517.660156 C498.8125 517.285156 498.90625 516.839844 499.023438 516.339844 C499.136719 515.839844 499.273438 515.3125 499.40625 514.773438 C499.542969 514.234375 499.6875 513.703125 499.832031 513.183594 C499.976562 512.664062 500.101562 512.195312 500.214844 511.769531 L503.285156 501.667969 L509.382812 501.667969 L511.039062 523.863281 L506.5 523.863281 C506.355469 521.421875 506.21875 518.976562 506.074219 516.535156 C505.929688 514.089844 505.84375 511.625 505.796875 509.136719 L505.757812 506.25 L505.652344 506.25 C505.34375 507.539062 505.015625 508.894531 504.652344 510.300781 C504.285156 511.703125 503.9375 512.945312 503.613281 514.003906 L500.464844 523.863281 L496.734375 523.863281 L493.527344 513.964844 C493.125 512.695312 492.75 511.359375 492.402344 509.941406 C492.058594 508.527344 491.769531 507.296875 491.554688 506.238281 L491.449219 506.238281 C491.449219 507.085938 491.441406 507.972656 491.414062 508.894531 C491.382812 509.816406 491.363281 510.742188 491.324219 511.664062 C491.285156 512.589844 491.257812 513.484375 491.21875 514.359375 C491.179688 515.234375 491.144531 516.042969 491.09375 516.773438 L490.671875 523.855469 L486.199219 523.855469 Z" fill="#000000" />
          
          {/* ACADEMY text - Y */}
          <path d="M544.410156 501.667969 L549.136719 510.300781 L553.925781 501.667969 L559.179688 501.667969 L551.425781 514.707031 L551.425781 523.863281 L546.597656 523.863281 L546.597656 514.707031 L538.984375 501.667969 Z" fill="#000000" />
        </g>

        <style>{`
          .hidden { opacity: 0; }
        `}</style>
      </svg>
    </div>
  );
}
