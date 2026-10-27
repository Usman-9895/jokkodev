'use client';

import {useState} from 'react';
import {informationIdentity} from '../../lib/information/identity';

export function ContactEmail() {
  const [status, setStatus] = useState('');

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(informationIdentity.email);
      setStatus('Adresse email copiée.');
    } catch {
      setStatus('La copie automatique est indisponible. Sélectionne et copie l’adresse affichée.');
    }
  }

  return <div className="contact-email">
    <a className="jd-button jd-button--primary" href={informationIdentity.mailto}>Écrire à l’équipe</a>
    <p className="contact-email-address"><a href={informationIdentity.mailto}>{informationIdentity.email}</a></p>
    <button className="jd-button jd-button--secondary" type="button" onClick={() => void copyEmail()}>Copier l’adresse email</button>
    <small>Le bouton ouvre ton application de messagerie. Tu peux aussi utiliser l’adresse dans ton webmail.</small>
    <p className="contact-copy-status" role="status" aria-live="polite">{status}</p>
  </div>;
}
