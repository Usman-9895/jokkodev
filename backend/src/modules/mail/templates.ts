import type { MailMessage } from './mail.service';

export function verificationMail(to: string, username: string, link: string): MailMessage {
  return { to, subject: 'Confirme ton adresse email JokkoDev', text: `Bonjour ${username},\n\nPour confirmer ton adresse email, ouvre ce lien dans les 24 heures :\n${link}\n\nSi tu n'as pas créé de compte JokkoDev, ignore ce message.\n\nL'équipe JokkoDev` };
}

export function passwordResetMail(to: string, username: string, link: string): MailMessage {
  return { to, subject: 'Réinitialisation de ton mot de passe JokkoDev', text: `Bonjour ${username},\n\nPour choisir un nouveau mot de passe, ouvre ce lien dans les 30 minutes :\n${link}\n\nToutes tes sessions seront fermées après le changement. Si tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe reste inchangé.\n\nL'équipe JokkoDev` };
}
