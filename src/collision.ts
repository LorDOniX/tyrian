export type Circle = { x: number; y: number; radius: number };
export type MovingCircle = Circle & { previousX: number; previousY: number };

export function circlesOverlap(a: Circle, b: Circle): boolean {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= (a.radius + b.radius) ** 2;
}

// První čas dotyku v intervalu 0–1. Relativní pohyb zahrnuje oba objekty.
export function sweepHit(a: MovingCircle, b: MovingCircle): number | null {
  const x = a.previousX - b.previousX;
  const y = a.previousY - b.previousY;
  const dx = a.x - b.x - x;
  const dy = a.y - b.y - y;
  const radius = a.radius + b.radius;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const aa = dx * dx + dy * dy;
  if (aa === 0) return null;
  const bb = 2 * (x * dx + y * dy);
  const discriminant = bb * bb - 4 * aa * c;
  if (discriminant < 0) return null;
  const t = (-bb - Math.sqrt(discriminant)) / (2 * aa);
  return t >= 0 && t <= 1 ? t : null;
}
