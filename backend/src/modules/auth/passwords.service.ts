import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

// Paramètres minimaux recommandés par OWASP pour Argon2id ; à recalibrer sur le serveur de production (cible 100 à 300 ms).
const options = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> { return argon2.hash(password, options); }

  /** Vérifie toujours une empreinte, même pour un compte inconnu, afin de ne pas révéler son existence par le temps de réponse. */
  async verify(hash: string | undefined, password: string): Promise<boolean> {
    this.dummyHash ??= this.hash('jokkodev-compte-inexistant');
    const target = hash ?? await this.dummyHash;
    try { return await argon2.verify(target, password) && hash !== undefined; } catch { return false; }
  }

  needsRehash(hash: string): boolean { return argon2.needsRehash(hash, options); }
}
