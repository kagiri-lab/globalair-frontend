'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: React.ReactNode;
    icon: LucideIcon;
    error?: string;
    hint?: React.ReactNode;
}

// Labelled input with a leading icon; password inputs get a show/hide toggle
const AuthField = forwardRef<HTMLInputElement, Props>(function AuthField({ id, label, icon: Icon, error, hint, type = 'text', ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className="auth-field">
            <label className="label" htmlFor={id}>{label}</label>
            <div className="auth-input-wrap">
                <Icon size={17} className="auth-input-icon" aria-hidden="true" />
                <input
                    ref={ref}
                    id={id}
                    type={isPassword && visible ? 'text' : type}
                    className={`input${error ? ' error' : ''}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    style={{ paddingRight: isPassword ? '2.75rem' : undefined }}
                    {...rest}
                />
                {isPassword && (
                    <button type="button" className="auth-input-toggle" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
                        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                )}
            </div>
            {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : hint}
        </div>
    );
});

export default AuthField;
