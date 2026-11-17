import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  hasGlow: boolean;
  glowRadius: number;
}

export const NetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Color palette tuned with purple & pink accents from the design specification
    const nodeColors = [
      '#D946EF', // Electric Fuchsia
      '#EC4899', // Bright Pink
      '#A855F7', // Deep Violet
      '#C084FC', // Light Lilac
      '#F472B6', // Rose Pink
      '#818CF8', // Indigo
    ];

    const isMobile = width < 768;
    const particleCount = isMobile ? 22 : 46;
    const connectionDistance = isMobile ? 105 : 145;

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const color = nodeColors[Math.floor(Math.random() * nodeColors.length)];
      const hasGlow = Math.random() > 0.6;
      const radius = Math.random() * 2 + 1.4;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius,
        color,
        alpha: Math.random() * 0.3 + 0.5,
        hasGlow,
        glowRadius: radius * (Math.random() * 4 + 4),
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw interconnected gradient lines (representing hash chains / forensic network)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < connectionDistance) {
            const lineAlpha = (1 - dist / connectionDistance) * 0.25;

            // Two-tone gradient connecting line between node colors
            const lineGradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            lineGradient.addColorStop(0, p1.color);
            lineGradient.addColorStop(1, p2.color);

            ctx.save();
            ctx.globalAlpha = lineAlpha;
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 2. Draw glowing nodes
      for (const p of particles) {
        // Ethereal circular aura for key nodes (matching the screenshot reference)
        if (p.hasGlow) {
          const auraGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowRadius);
          auraGradient.addColorStop(0, p.color);
          auraGradient.addColorStop(0.35, p.color + '55');
          auraGradient.addColorStop(1, 'transparent');

          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = auraGradient;
          ctx.fill();
          ctx.restore();
        }

        // Crisp luminous core
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();

        // Smooth drift update
        p.x += p.vx;
        p.y += p.vy;

        // Soft screen wrap
        if (p.x < -15) p.x = width + 15;
        if (p.x > width + 15) p.x = -15;
        if (p.y < -15) p.y = height + 15;
        if (p.y > height + 15) p.y = -15;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
      aria-hidden="true"
      style={{
        backgroundColor: '#06020c',
        backgroundImage: `
          radial-gradient(circle at 80% 25%, rgba(168, 85, 247, 0.15) 0%, transparent 45%),
          radial-gradient(circle at 15% 75%, rgba(236, 72, 153, 0.13) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, rgba(15, 7, 30, 0.9) 0%, #06020c 100%)
        `,
      }}
    >
      {/* Network Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
