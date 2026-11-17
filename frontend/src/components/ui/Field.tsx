import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId } from 'react';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}

function FieldShell({ label, error, hint, htmlFor, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, className = '', id, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={fieldId}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({ label, error, hint, className = '', id, ...rest }: TextAreaProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={fieldId}>
      <textarea id={fieldId} aria-invalid={!!error} className={`input min-h-[96px] ${error ? 'input-error' : ''} ${className}`} {...rest} />
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function SelectField({ label, error, className = '', id, children, ...rest }: SelectFieldProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} error={error} htmlFor={fieldId}>
      <select id={fieldId} className={`input ${error ? 'input-error' : ''} ${className}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}
