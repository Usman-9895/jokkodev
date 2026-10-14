'use client';
import {useState} from 'react';
import {TextField,Button} from '../ui';
import type {TextFieldProps} from '../ui/fields';
export function PasswordField(props:TextFieldProps){
  const [visible,setVisible]=useState(false);
  return <div className="account-password"><TextField {...props} type={visible?'text':'password'}/><Button className="account-password-toggle" variant="quiet" iconOnly aria-label={`${visible?'Masquer':'Afficher'} ${props.label.toLocaleLowerCase('fr')}`} aria-pressed={visible} aria-controls={props.id} onClick={()=>setVisible(v=>!v)}><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!visible&&<path d="m3 3 18 18"/>}</svg></Button></div>;
}
