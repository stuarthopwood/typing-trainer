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
  good: ["#22c55e", "#16a34a", "#4ade80"],
  great: ["#f59e0b", "#d97706", "#fbbf24", "#eab308"],
  perfect: ["#a855f7", "#7c3aed", "#ec4899", "#f43f5e", "#fbbf24", "#22d3ee"],
};

export function createConfetti(
  canvas: HTMLCanvasElement,
  tier: CelebrationTier,
  onComplete?: () => void
): () => void {
  if (tier === "none") {
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
      return "shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-pulse";
    case "great":
      return "shadow-[0_0_20px_rgba(245,158,11,0.5)]";
    case "good":
      return "shadow-[0_0_15px_rgba(34,197,94,0.4)]";
    default:
      return "";
  }
}
