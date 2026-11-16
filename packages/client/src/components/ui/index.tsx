// Pequeños componentes de presentación reutilizables (solo estilos de Tailwind).

import type {
  ComponentProps,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'md' | 'sm';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1 rounded-md font-medium transition-colors disabled:opacity-50';
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:hover:bg-indigo-600',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:hover:bg-white',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:hover:bg-red-600',
  ghost: 'text-indigo-700 hover:bg-indigo-50 disabled:hover:bg-transparent',
};
const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-2.5 py-1 text-sm',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...rest} />;
}

export const LABEL_CLASS = 'mb-1 block text-sm font-medium text-slate-700';
const CONTROL_CLASS =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-2 focus:outline-indigo-600 aria-invalid:border-red-500 aria-invalid:focus:outline-red-500 disabled:bg-slate-100';

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL_CLASS} ${className}`} {...rest} />;
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL_CLASS} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} className={`${CONTROL_CLASS} ${className}`} {...rest} />;
}

/** Contenedor de un campo de formulario (el <label> lo aporta cada componente). */
export function Field({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/** Mensaje de error de campo (rojo, bajo el control). Úselo dentro de un contenedor role="alert". */
export const FIELD_ERROR_CLASS = 'mt-1 text-sm text-red-600';
/** Contenedor de lista de mensajes de error. */
export const ERROR_BOX_CLASS = 'mt-1 space-y-0.5 text-sm text-red-600 [&>p]:m-0';

export const PAGE_TITLE_CLASS = 'mb-4 text-xl font-semibold text-slate-900';
export const SECTION_TITLE_CLASS = 'mb-2 text-base font-semibold text-slate-900';
export const EMPTY_CLASS = 'rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500';
