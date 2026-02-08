import React, { useEffect, useMemo, useRef } from "react";

/**
 * CLT Academy — Animated Logo Reveal (React)
 * - Pure SVG + Web Animations API (no deps)
 * - Duration ~7s
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
      marketIds: [
        "wick1",
        "wick2",
        "wick3",
        "wick4",
        "wick5",
        "wick6",
        "wick7",
        "wick8",
        "body1",
        "body2",
        "body3",
        "body4",
        "body5",
        "body6",
        "body7",
        "body8",
        "priceLine",
      ],
      gridIds: [
        "grid1",
        "grid2",
        "grid3",
        "grid4",
        "grid5",
        "grid6",
        "grid7",
        "grid8",
        "grid9",
        "grid10",
        "sr1",
        "sr2",
        "trend",
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
      rafs.current.forEach((r) => cancelAnimationFrame(r));
      rafs.current = [];
    };

    const fade = (el, to = 1, duration = 500, delay = 0) => {
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

    const setDashDraw = (el, duration = 900, delay = 0) => {
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

    const resetVisibility = () => {
      const structure = $("structure");
      const logo = $("logo");
      const subtext = $("subtext");
      const market = $("market");

      // Reset opacities
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
        subtext.style.transform = "translateY(6px) scale(.98)";
      }

      // Reset transforms
      if (market) market.style.transform = "translate(0,0) scale(1)";

      // Reset dash strokes
      [...ids.marketIds, ...ids.gridIds, "C", "L", "T"].forEach((id) => {
        const el = $(id);
        if (!el) return;
        el.style.strokeDasharray = "";
        el.style.strokeDashoffset = "";
      });

      // Reset dot
      const dot = $("dot");
      if (dot) {
        dot.style.opacity = "0";
        dot.style.transform = "scale(0)";
      }

      // Reset sweep
      const sweepRect = $("sweepRect");
      if (sweepRect) sweepRect.style.transform = "translateX(0px)";
    };

    const run = () => {
      resetVisibility();

      // 1) Draw market candles + price line
      ids.marketIds.forEach((id, i) => setDashDraw($(id), 650, i * 55));

      // 2) Fade in structure + draw its lines
      timeouts.current.push(
        setTimeout(() => {
          const structure = $("structure");
          if (!structure) return;
          structure.classList.remove("hidden");
          fade(structure, 1, 380, 0);

          ids.gridIds.forEach((id, i) => setDashDraw($(id), 520, 120 + i * 35));

          const dot = $("dot");
          if (dot) {
            dot.animate(
              [
                { transform: "scale(0)", opacity: 0 },
                { transform: "scale(1)", opacity: 1 },
              ],
              {
                duration: 420,
                delay: 520,
                easing: "cubic-bezier(.2,.8,.2,1)",
                fill: "forwards",
              }
            );
          }
        }, 1100)
      );

      // 3) Snap inward (collapse)
      timeouts.current.push(
        setTimeout(() => {
          const market = $("market");
          const structure = $("structure");
          fade(market, 0.15, 350, 0);

          transform(
            market,
            [
              { transform: "translate(0,0) scale(1)" },
              { transform: "translate(0,0) scale(.85)" },
            ],
            { duration: 360 }
          );

          transform(
            structure,
            [
              { transform: "translate(0,0) scale(1)", opacity: 1 },
              { transform: "translate(0,0) scale(.82)", opacity: 0.9 },
            ],
            { duration: 360 }
          );

          timeouts.current.push(
            setTimeout(() => {
              transform(
                market,
                [
                  { transform: "translate(0,0) scale(.85)" },
                  { transform: "translate(0,0) scale(.12)", opacity: 0 },
                ],
                { duration: 420, easing: "cubic-bezier(.15,.9,.2,1)" }
              );
              transform(
                structure,
                [
                  { transform: "translate(0,0) scale(.82)", opacity: 0.9 },
                  { transform: "translate(0,0) scale(.12)", opacity: 0 },
                ],
                { duration: 420, easing: "cubic-bezier(.15,.9,.2,1)" }
              );
            }, 220)
          );
        }, 3050)
      );

      // 4) Reveal CLT
      timeouts.current.push(
        setTimeout(() => {
          const logo = $("logo");
          if (!logo) return;

          logo.classList.remove("hidden");
          fade(logo, 1, 280, 0);

          ["C", "L", "T"].forEach((id, i) => setDashDraw($(id), 700, 60 + i * 120));

          const sweepRect = $("sweepRect");
          if (sweepRect) {
            sweepRect.animate(
              [{ transform: "translateX(0px)" }, { transform: "translateX(1700px)" }],
              {
                duration: 900,
                delay: 700,
                easing: "ease-in-out",
                fill: "forwards",
              }
            );
          }
        }, 4000)
      );

      // 5) Subtext
      timeouts.current.push(
        setTimeout(() => {
          const subtext = $("subtext");
          if (!subtext) return;
          subtext.classList.remove("hidden");
          fade(subtext, 1, 420, 0);
          transform(
            subtext,
            [
              { transform: "translateY(6px) scale(.98)", opacity: 0 },
              { transform: "translateY(0px) scale(1)", opacity: 1 },
            ],
            { duration: 420 }
          );
        }, 5600)
      );

      // 6) Call onComplete after animation finishes
      if (onComplete && !loop) {
        timeouts.current.push(
          setTimeout(() => {
            onComplete();
          }, 7000)
        );
      }

      // loop
      if (loop) {
        timeouts.current.push(
          setTimeout(() => {
            run();
          }, 8500)
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

        {/* MARKET */}
        <g id="market" style={{ filter: "drop-shadow(0 0 10px rgba(255,43,43,.18)) drop-shadow(0 0 24px rgba(233,237,245,.10))" }}>
          {/* Wicks */}
          <path id="wick1" d="M280 290 L280 175" className="stroke muted thin" />
          <path id="wick2" d="M360 330 L360 205" className="stroke muted thin" />
          <path id="wick3" d="M440 305 L440 185" className="stroke muted thin" />
          <path id="wick4" d="M520 350 L520 195" className="stroke muted thin" />
          <path id="wick5" d="M600 320 L600 135" className="stroke muted thin" />
          <path id="wick6" d="M680 300 L680 160" className="stroke muted thin" />
          <path id="wick7" d="M760 325 L760 195" className="stroke muted thin" />
          <path id="wick8" d="M840 295 L840 145" className="stroke muted thin" />

          {/* Bodies */}
          <path id="body1" d="M262 270 Q262 255 277 255 L283 255 Q298 255 298 270 L298 295 Q298 310 283 310 L277 310 Q262 310 262 295 Z" className="stroke base" />
          <path id="body2" d="M342 305 Q342 292 357 292 L363 292 Q378 292 378 305 L378 335 Q378 348 363 348 L357 348 Q342 348 342 335 Z" className="stroke base" />
          <path id="body3" d="M422 285 Q422 270 437 270 L443 270 Q458 270 458 285 L458 312 Q458 327 443 327 L437 327 Q422 327 422 312 Z" className="stroke base" />
          <path id="body4" d="M502 320 Q502 305 517 305 L523 305 Q538 305 538 320 L538 362 Q538 377 523 377 L517 377 Q502 377 502 362 Z" className="stroke base" />
          <path id="body5" d="M582 240 Q582 225 597 225 L603 225 Q618 225 618 240 L618 320 Q618 335 603 335 L597 335 Q582 335 582 320 Z" className="stroke accent base" />
          <path id="body6" d="M662 265 Q662 250 677 250 L683 250 Q698 250 698 265 L698 302 Q698 317 683 317 L677 317 Q662 317 662 302 Z" className="stroke base" />
          <path id="body7" d="M742 300 Q742 285 757 285 L763 285 Q778 285 778 300 L778 332 Q778 347 763 347 L757 347 Q742 347 742 332 Z" className="stroke base" />
          <path id="body8" d="M822 260 Q822 245 837 245 L843 245 Q858 245 858 260 L858 298 Q858 313 843 313 L837 313 Q822 313 822 298 Z" className="stroke base" />

          {/* Price line */}
          <path
            id="priceLine"
            d="M230 330 C300 280, 360 360, 440 300 C520 250, 600 260, 680 220 C760 190, 820 240, 920 170"
            className="stroke muted"
          />
        </g>

        {/* STRUCTURE */}
        <g id="structure" className="hidden">
          <path id="grid1" d="M220 160 L980 160" className="stroke muted thin" />
          <path id="grid2" d="M220 220 L980 220" className="stroke muted thin" />
          <path id="grid3" d="M220 280 L980 280" className="stroke muted thin" />
          <path id="grid4" d="M220 340 L980 340" className="stroke muted thin" />
          <path id="grid5" d="M300 120 L300 400" className="stroke muted thin" />
          <path id="grid6" d="M420 120 L420 400" className="stroke muted thin" />
          <path id="grid7" d="M540 120 L540 400" className="stroke muted thin" />
          <path id="grid8" d="M660 120 L660 400" className="stroke muted thin" />
          <path id="grid9" d="M780 120 L780 400" className="stroke muted thin" />
          <path id="grid10" d="M900 120 L900 400" className="stroke muted thin" />

          <path id="sr1" d="M250 320 L950 320" className="stroke base thin" />
          <path id="sr2" d="M250 200 L950 200" className="stroke base thin" />
          <path id="trend" d="M260 360 L940 140" className="stroke accent thin" />
          <circle id="dot" cx="760" cy="220" r="6" fill="#ff2b2b" style={{ opacity: 0, transform: "scale(0)", transformOrigin: "center" }} />
        </g>

        {/* LOGO */}
        <g
          id="logo"
          className="hidden"
          style={{ filter: "drop-shadow(0 0 10px rgba(255,43,43,.18)) drop-shadow(0 0 24px rgba(233,237,245,.10))" }}
        >
          <path
            id="C"
            d="M430 260 C430 205, 470 170, 535 170 L575 170 M575 350 L535 350 C470 350, 430 315, 430 260"
            className="stroke base"
          />
          <path id="L" d="M620 170 L620 350 L720 350" className="stroke base" />
          <path id="T" d="M760 170 L910 170 M835 170 L835 350" className="stroke base" />

          <g mask="url(#sweepMask)">
            <path d="M410 160 L940 160" className="stroke base" opacity="0.25" />
            <path d="M410 260 L940 260" className="stroke base" opacity="0.18" />
            <path d="M410 360 L940 360" className="stroke base" opacity="0.14" />
          </g>
        </g>

        {/* SUBTEXT */}
        <g id="subtext" className="hidden">
          <text
            x="600"
            y="430"
            textAnchor="middle"
            fill="rgba(233,237,245,.82)"
            fontSize="26"
            letterSpacing="4"
            style={{ fontWeight: 700 }}
          >
            CLT ACADEMY
          </text>
        </g>

        {/* Inline CSS classes for SVG */}
        <style>{`
          .hidden{opacity:0}
          .stroke{fill:none;stroke:#e9edf5;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
          .muted{stroke:rgba(233,237,245,.35);stroke-width:4}
          .thin{stroke-width:3}
          .accent{stroke:#ff2b2b}
          .base{stroke:#e9edf5}
        `}</style>
      </svg>
    </div>
  );
}
