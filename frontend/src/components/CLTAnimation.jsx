import React, { useEffect, useMemo, useRef } from "react";

/**
 * CLT Academy — Animated Logo Reveal (React)
 * - Pure SVG + Web Animations API (no deps)
 * - Duration ~12s (slowed down)
 * - Red/Green candlesticks, Green support lines, Red trend arrow
 */
export default function CLTAnimation({
  width = "min(980px, 96vw)",
  loop = false,
  className = "",
  onComplete = null,
}) {
  const svgRef = useRef(null);
  const rafs = useRef([]);
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

  // Define which candles are bullish (green) vs bearish (red)
  const candleColors = useMemo(() => ({
    1: "#10b981", // green - bullish
    2: "#ef4444", // red - bearish
    3: "#10b981", // green
    4: "#ef4444", // red
    5: "#10b981", // green - big bullish
    6: "#10b981", // green
    7: "#ef4444", // red
    8: "#10b981", // green
  }), []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const $ = (id) => svg.querySelector(`#${CSS.escape(id)}`);

    const clearAll = () => {
      timeouts.current.forEach((t) => clearTimeout(t));
      timeouts.current = [];
      rafs.current.forEach((r) => cancelAnimationFrame(r));
      rafs.current = [];
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

    // Animate candle with bounce effect
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
      const subtext = $("subtext");
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
      }
      if (subtext) {
        subtext.style.opacity = "0";
        subtext.classList.add("hidden");
        subtext.style.transform = "translateY(10px) scale(.95)";
      }

      if (market) market.style.transform = "translate(0,0) scale(1)";

      // Reset all elements
      [...ids.wickIds, ...ids.bodyIds, ...ids.gridIds, "priceLine", "sr1", "sr2", "trend", "C", "L", "T"].forEach((id) => {
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

      const sweepRect = $("sweepRect");
      if (sweepRect) sweepRect.style.transform = "translateX(0px)";
    };

    const run = () => {
      resetVisibility();

      // 1) Draw candles one by one with bounce animation (slower - 350ms apart)
      ids.wickIds.forEach((id, i) => {
        const wickEl = $(id);
        const bodyEl = $(`body${i + 1}`);
        animateCandle(wickEl, bodyEl, 900, i * 350);
      });

      // 2) Draw price line after candles (starts at 3s)
      timeouts.current.push(
        setTimeout(() => {
          setDashDraw($("priceLine"), 1500, 0);
        }, 3000)
      );

      // 3) Fade in structure + draw grid lines (starts at 4.5s)
      timeouts.current.push(
        setTimeout(() => {
          const structure = $("structure");
          if (!structure) return;
          structure.classList.remove("hidden");
          fade(structure, 1, 500, 0);

          // Grid lines one by one (slower)
          ids.gridIds.forEach((id, i) => setDashDraw($(id), 600, 150 + i * 80));

          // Green support/resistance lines (at 5.5s)
          timeouts.current.push(
            setTimeout(() => {
              setDashDraw($("sr1"), 800, 0);
              setDashDraw($("sr2"), 800, 200);
            }, 1000)
          );

          // Red trend arrow (at 6.5s)
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

      // 4) Snap inward (collapse) - starts at 8s
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

      // 5) Reveal CLT Logo - starts at 9.5s
      timeouts.current.push(
        setTimeout(() => {
          const logo = $("logo");
          if (!logo) return;

          logo.classList.remove("hidden");
          fade(logo, 1, 400, 0);

          // Draw C, L, T letters one by one (slower)
          setDashDraw($("C"), 1000, 100);
          setDashDraw($("L"), 1000, 400);
          setDashDraw($("T"), 1000, 700);

          // Sweep effect
          const sweepRect = $("sweepRect");
          if (sweepRect) {
            sweepRect.animate(
              [{ transform: "translateX(0px)" }, { transform: "translateX(1700px)" }],
              {
                duration: 1200,
                delay: 1000,
                easing: "ease-in-out",
                fill: "forwards",
              }
            );
          }
        }, 9500)
      );

      // 6) Subtext "CLT ACADEMY" - starts at 11.5s
      timeouts.current.push(
        setTimeout(() => {
          const subtext = $("subtext");
          if (!subtext) return;
          subtext.classList.remove("hidden");
          fade(subtext, 1, 600, 0);
          transform(
            subtext,
            [
              { transform: "translateY(10px) scale(.95)", opacity: 0 },
              { transform: "translateY(0px) scale(1)", opacity: 1 },
            ],
            { duration: 600 }
          );
        }, 11500)
      );

      // 7) Call onComplete after animation finishes (~13s)
      if (onComplete && !loop) {
        timeouts.current.push(
          setTimeout(() => {
            onComplete();
          }, 13000)
        );
      }

      // loop
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
  }, [ids, loop, onComplete, candleColors]);

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
        viewBox="0 0 1200 520"
        style={{ width, height: "auto" }}
        role="img"
        aria-label="CLT animated logo reveal"
      >
        <defs>
          <radialGradient id="vig" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0)" />
            <stop offset="55%" stopColor="rgba(255,255,255,.75)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <mask id="sweepMask">
            <rect id="sweepRect" x="-500" y="0" width="500" height="520" fill="url(#sweepGrad)" />
          </mask>
        </defs>

        <rect x="0" y="0" width="1200" height="520" fill="url(#vig)" />

        {/* MARKET - Candlesticks with Red/Green colors */}
        <g id="market" style={{ filter: "drop-shadow(0 0 12px rgba(16,185,129,.15)) drop-shadow(0 0 12px rgba(239,68,68,.15))" }}>
          {/* Wicks - colored red/green */}
          <path id="wick1" d="M280 290 L280 175" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick2" d="M360 330 L360 205" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick3" d="M440 305 L440 185" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick4" d="M520 350 L520 195" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick5" d="M600 320 L600 135" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick6" d="M680 300 L680 160" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick7" d="M760 325 L760 195" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />
          <path id="wick8" d="M840 295 L840 145" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0 }} />

          {/* Bodies - colored red/green with glow */}
          <path id="body1" d="M262 270 Q262 255 277 255 L283 255 Q298 255 298 270 L298 295 Q298 310 283 310 L277 310 Q262 310 262 295 Z" 
            fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #10b981)" }} />
          <path id="body2" d="M342 305 Q342 292 357 292 L363 292 Q378 292 378 305 L378 335 Q378 348 363 348 L357 348 Q342 348 342 335 Z" 
            fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #ef4444)" }} />
          <path id="body3" d="M422 285 Q422 270 437 270 L443 270 Q458 270 458 285 L458 312 Q458 327 443 327 L437 327 Q422 327 422 312 Z" 
            fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #10b981)" }} />
          <path id="body4" d="M502 320 Q502 305 517 305 L523 305 Q538 305 538 320 L538 362 Q538 377 523 377 L517 377 Q502 377 502 362 Z" 
            fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #ef4444)" }} />
          <path id="body5" d="M582 240 Q582 225 597 225 L603 225 Q618 225 618 240 L618 320 Q618 335 603 335 L597 335 Q582 335 582 320 Z" 
            fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 10px #10b981)" }} />
          <path id="body6" d="M662 265 Q662 250 677 250 L683 250 Q698 250 698 265 L698 302 Q698 317 683 317 L677 317 Q662 317 662 302 Z" 
            fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #10b981)" }} />
          <path id="body7" d="M742 300 Q742 285 757 285 L763 285 Q778 285 778 300 L778 332 Q778 347 763 347 L757 347 Q742 347 742 332 Z" 
            fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #ef4444)" }} />
          <path id="body8" d="M822 260 Q822 245 837 245 L843 245 Q858 245 858 260 L858 298 Q858 313 843 313 L837 313 Q822 313 822 298 Z" 
            fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #10b981)" }} />

          {/* Price line - subtle */}
          <path
            id="priceLine"
            d="M230 330 C300 280, 360 360, 440 300 C520 250, 600 260, 680 220 C760 190, 820 240, 920 170"
            fill="none"
            stroke="rgba(233,237,245,.25)"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ opacity: 0 }}
          />
        </g>

        {/* STRUCTURE - Grid with GREEN support lines and RED trend */}
        <g id="structure" className="hidden">
          {/* Grid lines - subtle gray */}
          <path id="grid1" d="M220 160 L980 160" stroke="rgba(233,237,245,.2)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid2" d="M220 220 L980 220" stroke="rgba(233,237,245,.2)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid3" d="M220 280 L980 280" stroke="rgba(233,237,245,.2)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid4" d="M220 340 L980 340" stroke="rgba(233,237,245,.2)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid5" d="M300 120 L300 400" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid6" d="M420 120 L420 400" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid7" d="M540 120 L540 400" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid8" d="M660 120 L660 400" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid9" d="M780 120 L780 400" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />
          <path id="grid10" d="M900 120 L900 400" stroke="rgba(233,237,245,.15)" strokeWidth="2" fill="none" style={{ opacity: 0 }} />

          {/* Support/Resistance lines - GREEN */}
          <path id="sr1" d="M250 320 L950 320" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0, filter: "drop-shadow(0 0 4px #10b981)" }} />
          <path id="sr2" d="M250 200 L950 200" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0, filter: "drop-shadow(0 0 4px #10b981)" }} />
          
          {/* Trend arrow - RED */}
          <path id="trend" d="M260 360 L940 140" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" style={{ opacity: 0, filter: "drop-shadow(0 0 6px #ef4444)" }} />
          
          {/* Dot indicator - RED */}
          <circle id="dot" cx="760" cy="220" r="8" fill="#ef4444" style={{ opacity: 0, transform: "scale(0)", transformOrigin: "center", filter: "drop-shadow(0 0 8px #ef4444)" }} />
        </g>

        {/* LOGO - Matching CLT Academy logo style */}
        <g
          id="logo"
          className="hidden"
          style={{ filter: "drop-shadow(0 0 12px rgba(255,43,43,.2)) drop-shadow(0 0 30px rgba(233,237,245,.12))" }}
        >
          {/* C Letter - styled like logo */}
          <path
            id="C"
            d="M430 260 C430 200, 475 165, 545 165 L580 165 M580 355 L545 355 C475 355, 430 320, 430 260"
            fill="none"
            stroke="#e9edf5"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0 }}
          />
          
          {/* L Letter - styled like logo */}
          <path 
            id="L" 
            d="M620 165 L620 355 L730 355" 
            fill="none"
            stroke="#e9edf5"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0 }}
          />
          
          {/* T Letter - styled like logo with red accent */}
          <path 
            id="T" 
            d="M760 165 L920 165 M840 165 L840 355" 
            fill="none"
            stroke="#e9edf5"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0 }}
          />
          
          {/* Red accent on T */}
          <path 
            d="M840 165 L840 280" 
            fill="none"
            stroke="#ff2b2b"
            strokeWidth="8"
            strokeLinecap="round"
            style={{ opacity: 0.6 }}
          />

          {/* Sweep effect lines */}
          <g mask="url(#sweepMask)">
            <path d="M410 160 L940 160" stroke="#e9edf5" strokeWidth="2" fill="none" opacity="0.2" />
            <path d="M410 260 L940 260" stroke="#e9edf5" strokeWidth="2" fill="none" opacity="0.15" />
            <path d="M410 360 L940 360" stroke="#e9edf5" strokeWidth="2" fill="none" opacity="0.1" />
          </g>
        </g>

        {/* SUBTEXT - "CLT ACADEMY" in logo font style, centered */}
        <g id="subtext" className="hidden">
          {/* Main text */}
          <text
            x="600"
            y="435"
            textAnchor="middle"
            fill="rgba(233,237,245,.9)"
            fontSize="32"
            letterSpacing="12"
            fontFamily="'Arial Black', 'Helvetica Neue', sans-serif"
            fontWeight="900"
          >
            CLT ACADEMY
          </text>
          
          {/* Subtle underline accent */}
          <line 
            x1="420" 
            y1="455" 
            x2="780" 
            y2="455" 
            stroke="rgba(255,43,43,.4)" 
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Inline CSS */}
        <style>{`
          .hidden { opacity: 0; }
        `}</style>
      </svg>
    </div>
  );
}
