import React, { useEffect, useRef, useState } from 'react';

/**
 * FloatingGithubIcons — Renders clearly visible floating GitHub octocat icons
 * across the homepage with 3D perspective transforms and gentle animation.
 * Icons are rendered as an overlay layer between the Three.js background and the UI.
 */

const GITHUB_ICON_URL = 'https://cdn-icons-png.flaticon.com/512/25/25231.png';

// Pre-defined positions to match the reference screenshot layout
// Each icon has: x%, y%, size(px), delay(s), duration(s), initialRotateY, initialRotateX
const ICON_CONFIGS = [
  { x: 3, y: 18, size: 52, delay: 0, duration: 7, rotY: -15, rotX: 10, opacity: 0.22 },
  { x: 12, y: 35, size: 36, delay: 1.2, duration: 8, rotY: 12, rotX: -8, opacity: 0.18 },
  { x: 8, y: 55, size: 28, delay: 0.5, duration: 9, rotY: -8, rotX: 5, opacity: 0.15 },
  { x: 18, y: 12, size: 42, delay: 2.0, duration: 7.5, rotY: 10, rotX: -12, opacity: 0.20 },
  { x: 30, y: 22, size: 24, delay: 0.8, duration: 8.5, rotY: -5, rotX: 8, opacity: 0.13 },
  { x: 75, y: 15, size: 48, delay: 1.5, duration: 7, rotY: 15, rotX: -10, opacity: 0.22 },
  { x: 85, y: 30, size: 38, delay: 0.3, duration: 8, rotY: -12, rotX: 6, opacity: 0.18 },
  { x: 90, y: 55, size: 30, delay: 2.2, duration: 9.5, rotY: 8, rotX: -5, opacity: 0.15 },
  { x: 70, y: 45, size: 26, delay: 1.8, duration: 8, rotY: -10, rotX: 12, opacity: 0.14 },
  { x: 82, y: 68, size: 44, delay: 0.7, duration: 7.5, rotY: 14, rotX: -8, opacity: 0.20 },
  { x: 50, y: 8, size: 22, delay: 1.0, duration: 9, rotY: -6, rotX: 10, opacity: 0.12 },
  { x: 25, y: 70, size: 32, delay: 2.5, duration: 8.5, rotY: 10, rotX: -6, opacity: 0.16 },
  { x: 60, y: 65, size: 20, delay: 1.4, duration: 9, rotY: -8, rotX: 4, opacity: 0.11 },
  { x: 42, y: 38, size: 18, delay: 3.0, duration: 10, rotY: 5, rotX: -3, opacity: 0.10 },
];

export default function FloatingGithubIcons3D() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <>
      {/* Inject keyframes once */}
      <style>{`
        @keyframes floatIcon3D {
          0% {
            transform: translateY(0px) rotateY(var(--rotY)) rotateX(var(--rotX)) scale(1);
          }
          25% {
            transform: translateY(-12px) rotateY(calc(var(--rotY) + 8deg)) rotateX(calc(var(--rotX) - 5deg)) scale(1.03);
          }
          50% {
            transform: translateY(-6px) rotateY(calc(var(--rotY) - 5deg)) rotateX(calc(var(--rotX) + 8deg)) scale(0.98);
          }
          75% {
            transform: translateY(-15px) rotateY(calc(var(--rotY) + 3deg)) rotateX(calc(var(--rotX) - 3deg)) scale(1.02);
          }
          100% {
            transform: translateY(0px) rotateY(var(--rotY)) rotateX(var(--rotX)) scale(1);
          }
        }
        @keyframes floatIconReduced {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.01);
          }
        }
      `}</style>

      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{
          zIndex: 1,
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        }}
        aria-hidden="true"
      >
        {ICON_CONFIGS.map((cfg, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${cfg.x}%`,
              top: `${cfg.y}%`,
              width: `${cfg.size}px`,
              height: `${cfg.size}px`,
              '--rotY': `${cfg.rotY}deg`,
              '--rotX': `${cfg.rotX}deg`,
              opacity: cfg.opacity,
              animation: prefersReducedMotion
                ? `floatIconReduced ${cfg.duration * 2}s ease-in-out infinite`
                : `floatIcon3D ${cfg.duration}s ease-in-out ${cfg.delay}s infinite`,
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              filter: 'drop-shadow(0 2px 8px rgba(9,38,53,0.08))',
            }}
          >
            <img
              src={GITHUB_ICON_URL}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'brightness(0.25) sepia(1) saturate(3) hue-rotate(160deg)',
                userSelect: 'none',
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
