import { Injectable } from '@nestjs/common';
import { ApiException } from '../http/api-exception';

interface Window { count: number; resetAt: number }

// Fenêtres fixes en mémoire : suffisant pour un processus API unique. Les compteurs repartent de zéro au redémarrage ;
// un déploiement à plusieurs processus devra partager ce stockage (voir docs/security/security.md).
@Injectable()
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  /** Comptabilise une tentative et lève 429 si la limite est dépassée. */
  consume(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    if (this.windows.size > 10_000) this.prune(now);
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) { window = { count: 0, resetAt: now + windowMs }; this.windows.set(key, window); }
    window.count += 1;
    if (window.count > limit) throw new ApiException(429, 'RATE_LIMITED', 'Trop de tentatives. Réessayez plus tard.', { retryAfterSeconds: Math.ceil((window.resetAt - now) / 1000) });
  }

  reset(key: string): void { this.windows.delete(key); }

  private prune(now: number): void { for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key); }
}
