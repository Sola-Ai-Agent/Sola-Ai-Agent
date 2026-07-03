import React, { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceControlsProps {
  isActive: boolean;
  onToggle: () => void;
  volumeLevel: number;
}

type Bubble = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
  life: number;
  maxLife: number;
};

const VoiceControls: React.FC<VoiceControlsProps> = ({ isActive, onToggle, volumeLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const lastSpawnRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // scale for high-DPI
    const DPR = window.devicePixelRatio || 1;
    const logicalW = 140;
    const logicalH = 140;
    canvas.width = logicalW * DPR;
    canvas.height = logicalH * DPR;
    canvas.style.width = `${logicalW}px`;
    canvas.style.height = `${logicalH}px`;
    ctx.scale(DPR, DPR);

    let animationId = 0;
    lastSpawnRef.current = Date.now();

    const spawnBubble = () => {
      const cx = logicalW / 2;
      const cy = logicalH / 2;
      const angle = Math.random() * Math.PI * 2;
      const dist = 32 + Math.random() * 12; // spawn outside the central button
      const x = cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 6;
      const y = cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 6;
      const r = 3 + Math.random() * 6 + (volumeLevel * 8);
      const vy = -0.3 - Math.random() * 0.5 - volumeLevel * 1.2;
      const vx = (Math.random() - 0.5) * 0.5;
      const maxLife = 100 + Math.floor(Math.random() * 60);
      const bubble: Bubble = {
        x, y, r, vy, vx, alpha: 0.6 + Math.random() * 0.3, life: 0, maxLife
      };
      bubblesRef.current.push(bubble);
      if (bubblesRef.current.length > 25) bubblesRef.current.shift();
    };

    const draw = () => {
      ctx.clearRect(0, 0, logicalW, logicalH);

      // background subtle glow when active
      if (isActive) {
        const grad = ctx.createRadialGradient(logicalW / 2, logicalH / 2, 28, logicalW / 2, logicalH / 2, 70);
        grad.addColorStop(0, 'rgba(139,92,246,0.18)'); // violet
        grad.addColorStop(1, 'rgba(99,102,241,0.00)'); // indigo
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, logicalW, logicalH);
      }

      // spawn bubbles at a rate influenced by volumeLevel
      const now = Date.now();
      const spawnInterval = Math.max(70, 240 - volumeLevel * 180);
      if (isActive && now - lastSpawnRef.current > spawnInterval) {
        const spawnCount = 1 + Math.floor(volumeLevel * 2);
        for (let i = 0; i < spawnCount; i++) spawnBubble();
        lastSpawnRef.current = now;
      }

      // update & draw bubbles
      for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
        const b = bubblesRef.current[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life++;
        const t = b.life / b.maxLife;
        const fade = Math.max(0, 1 - t);
        ctx.beginPath();
        ctx.arc(b.x, b.y - t * 30, b.r * (0.9 + t * 0.5), 0, Math.PI * 2);
        
        const bubbleGrad = ctx.createRadialGradient(b.x, b.y - t * 30, 0, b.x, b.y - t * 30, b.r * (0.9 + t * 0.5));
        bubbleGrad.addColorStop(0, `rgba(139,92,246,${(b.alpha * fade * 0.9).toFixed(3)})`);
        bubbleGrad.addColorStop(1, `rgba(99,102,241,0)`);
        ctx.fillStyle = bubbleGrad;
        ctx.fill();
        
        if (b.life >= b.maxLife || b.y + b.r < -20 || b.x < -20 || b.x > logicalW + 20) {
          bubblesRef.current.splice(i, 1);
        }
      }

      // central pulsing rings (ripple outwards from under the button)
      const centerX = logicalW / 2;
      const centerY = logicalH / 2;
      const baseRadius = 34; // larger than button radius (32)
      const pulse = 1 + volumeLevel * 1.3;

      if (isActive) {
        // outer ripple ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * (1 + 0.12 * Math.sin(now / 180) * pulse), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139,92,246,${(0.25 + volumeLevel * 0.3).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // inner ripple ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, (baseRadius - 6) * (1 + 0.08 * Math.cos(now / 140) * pulse), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99,102,241,${(0.18 + volumeLevel * 0.22).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      bubblesRef.current = [];
    };
  }, [isActive, volumeLevel]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-[140px] h-[140px] flex items-center justify-center">
        {/* Background Canvas Visualizer */}
        <canvas
          ref={canvasRef}
          width={140}
          height={140}
          className="absolute inset-0 pointer-events-none rounded-full"
        />

        {/* Central Tactile Button */}
        <button
          onClick={onToggle}
          aria-label="Toggle voice"
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 active:scale-90 ${
            isActive
              ? 'bg-gradient-to-tr from-brand-600 to-violet-500 text-white shadow-brand-500/30 dark:shadow-brand-500/20'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
          }`}
        >
          {isActive ? (
            <Mic className="h-6 w-6 stroke-[2.5] animate-pulse" />
          ) : (
            <MicOff className="h-6 w-6 stroke-[2] text-zinc-400 dark:text-zinc-550" />
          )}
        </button>
      </div>
      <p className="mt-2 text-zinc-450 dark:text-zinc-500 font-bold text-[10px] tracking-wider uppercase transition-colors">
        {isActive ? "Sola is listening" : "Tap mic to speak"}
      </p>
    </div>
  );
};

export default VoiceControls;
