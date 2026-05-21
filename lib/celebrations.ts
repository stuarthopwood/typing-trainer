import type { CelebrationTier } from "./types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const COLORS = {
  good: ["#00cc6a", "#00ff88", "#4ade80"],
  great: ["#00ff88", "#00cc6a", "#22d3ee", "#fbbf24"],
  perfect: ["#00ff88", "#00cc6a", "#22d3ee", "#ffffff", "#fbbf24", "#f43f5e"],
};

export function createConfetti(
  canvas: HTMLCanvasElement,
  tier: CelebrationTier,
  onComplete?: () => void
): () => void {
  if (tier === "none" || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    onComplete?.();
    return () => {};
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  canvas.width = canvas.offsetWidth * window.devicePixelRatio;
  canvas.height = canvas.offsetHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const colors = COLORS[tier];
  const particleCount = tier === "perfect" ? 80 : tier === "great" ? 50 : 30;

  const particles: Particle[] = Array.from({ length: particleCount }, () => ({
    x: canvas.offsetWidth / 2 + (Math.random() - 0.5) * 200,
    y: canvas.offsetHeight / 2,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 10 - 5,
    life: 1,
    maxLife: 60 + Math.random() * 40,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 3 + Math.random() * 4,
  }));

  let frame = 0;
  let animId: number;
  let cancelled = false;

  function animate() {
    if (cancelled) return;
    ctx!.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    let alive = 0;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.vx *= 0.98;
      p.life = 1 - frame / p.maxLife;

      if (p.life <= 0) continue;
      alive++;

      ctx!.globalAlpha = p.life;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(p.x, p.y, p.size, p.size);
    }

    frame++;
    if (alive > 0 && frame < 120) {
      animId = requestAnimationFrame(animate);
    } else {
      ctx!.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      onComplete?.();
    }
  }

  animId = requestAnimationFrame(animate);
  return () => {
    cancelled = true;
    cancelAnimationFrame(animId);
  };
}

export function getGlowClass(tier: CelebrationTier): string {
  switch (tier) {
    case "perfect":
      return "shadow-[0_0_40px_rgba(0,255,136,0.5)] animate-pulse";
    case "great":
      return "shadow-[0_0_25px_rgba(0,255,136,0.3)]";
    case "good":
      return "shadow-[0_0_15px_rgba(0,204,106,0.2)]";
    default:
      return "";
  }
}
