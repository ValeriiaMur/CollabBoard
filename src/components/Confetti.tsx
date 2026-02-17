"use client";

import { useEffect, useState } from "react";

/**
 * Canvas-based confetti burst that plays once on mount then removes itself.
 * Lightweight — no external libraries needed.
 */
export function Confetti() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = document.getElementById(
      "confetti-canvas"
    ) as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = [
      "#FF6B6B", // red
      "#4ECDC4", // teal
      "#45B7D1", // sky
      "#96E6A1", // green
      "#DDA0DD", // plum
      "#F7DC6F", // yellow
      "#BB8FCE", // purple
      "#F0B27A", // orange
      "#85C1E9", // light blue
      "#F1948A", // salmon
      "#82E0AA", // mint
      "#F8C471", // gold
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
      shape: "rect" | "circle" | "strip";
      opacity: number;
      gravity: number;
      friction: number;
    }

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 180;

    // Spawn particles from a few burst points across the top
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const burstX = canvas.width * (0.2 + Math.random() * 0.6);
      const shape = (["rect", "circle", "strip"] as const)[
        Math.floor(Math.random() * 3)
      ];
      particles.push({
        x: burstX,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * 4 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        shape,
        opacity: 1,
        gravity: 0.12 + Math.random() * 0.06,
        friction: 0.99,
      });
    }

    let frameId: number;
    let elapsed = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;

      for (const p of particles) {
        p.vy += p.gravity;
        p.vx *= p.friction;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Fade out after passing 70% of screen height
        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.02;
        }

        if (p.opacity <= 0 || p.y > canvas.height + 20) continue;
        alive++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // strip / ribbon
          ctx.fillRect(-p.size / 2, -p.size * 0.15, p.size, p.size * 0.3);
        }

        ctx.restore();
      }

      elapsed++;

      if (alive > 0 && elapsed < 300) {
        frameId = requestAnimationFrame(draw);
      } else {
        // Animation finished — remove component
        setVisible(false);
      }
    }

    frameId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frameId);
  }, []);

  if (!visible) return null;

  return (
    <canvas
      id="confetti-canvas"
      className="pointer-events-none fixed inset-0 z-[9999]"
    />
  );
}
