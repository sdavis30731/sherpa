/**
 * Topographic line pattern — decorative SVG used across the landing page
 * to reinforce the climbing/mountain brand without being literal.
 *
 * Uses currentColor so the parent controls the stroke color. Pair with
 * low opacity (e.g. text-white/5) for subtle background texture.
 *
 * Variants:
 *   - "rings": concentric topo rings (used in dark hero / brand-voice block)
 *   - "lines": flowing horizontal contour lines (used as a subtle wash)
 *   - "peak":  a stylized mountain silhouette decoration
 */

import * as React from "react";

interface TopoPatternProps {
  variant?: "rings" | "lines" | "peak";
  className?: string;
}

export function TopoPattern({
  variant = "rings",
  className = "",
}: TopoPatternProps) {
  if (variant === "lines") {
    return (
      <svg
        aria-hidden="true"
        className={className}
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        {Array.from({ length: 18 }).map((_, i) => {
          const y = 40 + i * 28;
          // Slight curvature; phase-shifted across lines.
          const phase = (i % 5) * 60;
          return (
            <path
              key={i}
              d={`M -50 ${y} C 200 ${y + 12 - phase / 30}, 600 ${y - 18 + phase / 25}, 1250 ${y + 6}`}
            />
          );
        })}
      </svg>
    );
  }

  if (variant === "peak") {
    return (
      <svg
        aria-hidden="true"
        className={className}
        viewBox="0 0 300 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      >
        {/* Concentric mountain contours — bigger to smaller, like a topo map */}
        <path d="M 0 180 L 80 60 L 130 110 L 180 30 L 230 90 L 300 180" />
        <path d="M 25 180 L 85 75 L 130 120 L 180 55 L 225 105 L 280 180" />
        <path d="M 50 180 L 90 95 L 130 130 L 180 80 L 220 115 L 260 180" />
        <path d="M 75 180 L 95 115 L 130 140 L 180 105 L 215 130 L 245 180" />
        <path d="M 100 180 L 130 150 L 180 130 L 200 150 L 230 180" />
      </svg>
    );
  }

  // Default: rings — concentric topographic loops.
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 800 800"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {Array.from({ length: 14 }).map((_, i) => {
        const r = 60 + i * 28;
        const wobble = (i % 3) * 6;
        return (
          <ellipse
            key={i}
            cx={400 + wobble}
            cy={400 - wobble / 2}
            rx={r}
            ry={r * 0.78}
          />
        );
      })}
    </svg>
  );
}
