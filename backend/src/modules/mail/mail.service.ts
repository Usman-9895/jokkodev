import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { ENVIRONMENT } from '../../config/config.module';
import type { Environment } from '../../config/environment';

export interface MailMessage { to: string; subject: string; text: string; messageId?:string }

// En développement et en test, les messages sont écrits en JSON dans MAIL_FILE_DIR (ignoré par Git) au lieu d'être envoyés.
// Les liens de compte contiennent des jetons : ni l'adresse ni le contenu ne sont journalisés.
@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {
    const smtp = env.mail.smtp;
    this.transporter = env.mail.transport === 'smtp' && smtp
      ? createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, requireTLS: !smtp.secure, connectionTimeout:10000,greetingTimeout:10000,socketTimeout:30000, auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined })
      : createTransport({ jsonTransport: true });
  }

  async send(message: MailMessage): Promise<void> {
    const info = await this.transporter.sendMail({ from: this.env.mail.from, ...message });
    if (this.env.mail.transport === 'file') {
      await mkdir(this.env.mail.fileDir, { recursive: true });
      await writeFile(join(this.env.mail.fileDir, `${Date.now()}-${info.messageId.replace(/[^A-Za-z0-9.-]/g, '')}.json`), String(info.message), { mode: 0o600 });
    }
  }

  /** Envoi hors du chemin de la réponse HTTP : la durée de réponse ne dépend pas de l'existence d'un compte. */
  sendInBackground(message: MailMessage, event: string): void {
    this.send(message).catch(() => console.error(JSON.stringify({ event: 'mail_failed', type: event })));
  }
}
