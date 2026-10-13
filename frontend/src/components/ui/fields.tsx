import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Icon } from './icon';

type FieldDescription = { id: string; label: string; help?: string; error?: string };
function Field({ id, label, help, error, required, children }: FieldDescription & { required?: boolean; children: ReactNode }) {
  return <div className="jd-field">
    <label htmlFor={id} className="jd-field__label">{label}{required && <><span aria-hidden="true" className="jd-field__required"> *</span><span className="sr-only"> (obligatoire)</span></>}</label>
    {children}
    {help && <p id={`${id}-help`} className="jd-field__help">{help}</p>}
    {error && <p id={`${id}-error`} className="jd-field__error"><Icon name="alert" />Erreur : {error}</p>}
  </div>;
}
function description(id: string, help?: string, error?: string, provided?: string) {
  return [provided, help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
}
export type TextFieldProps = Omit<ComponentPropsWithRef<'input'>, 'size'> & FieldDescription;
export function TextField({ id, label, help, error, required, className = '', ...props }: TextFieldProps) {
  return <Field {...{ id, label, help, error, required }}><input {...props} id={id} required={required} aria-invalid={Boolean(error) || props['aria-invalid']} aria-describedby={description(id, help, error, props['aria-describedby'])} className={`jd-control ${className}`} /></Field>;
}
export type TextAreaProps = ComponentPropsWithRef<'textarea'> & FieldDescription;
export function TextArea({ id, label, help, error, required, rows = 4, className = '', ...props }: TextAreaProps) {
  return <Field {...{ id, label, help, error, required }}><textarea {...props} id={id} required={required} rows={rows} aria-invalid={Boolean(error) || props['aria-invalid']} aria-describedby={description(id, help, error, props['aria-describedby'])} className={`jd-control jd-control--textarea ${className}`} /></Field>;
}
export type SelectFieldProps = ComponentPropsWithRef<'select'> & FieldDescription;
export function SelectField({ id, label, help, error, required, className = '', children, ...props }: SelectFieldProps) {
  return <Field {...{ id, label, help, error, required }}><select {...props} id={id} required={required} aria-invalid={Boolean(error) || props['aria-invalid']} aria-describedby={description(id, help, error, props['aria-describedby'])} className={`jd-control jd-control--select ${className}`}>{children}</select></Field>;
}
