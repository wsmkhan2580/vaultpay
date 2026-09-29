import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/resources';
import { extractErrorMessage } from '../services/api';

interface PasswordCheck {
  label: string;
  met: boolean;
}

function usePasswordChecks(password: string): PasswordCheck[] {
  return useMemo(
    () => [
      { label: 'At least 10 characters', met: password.length >= 10 },
      { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'One lowercase letter', met: /[a-z]/.test(password) },
      { label: 'One number', met: /[0-9]/.test(password) },
      { label: 'One symbol', met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const checks = usePasswordChecks(password);
  const allChecksMet = checks.every((c) => c.met);
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allChecksMet) {
      setError('Please meet all password requirements below.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        companyName: companyName.trim(),
      });
      navigate('/login', { replace: true, state: { justRegistered: true } });
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create your account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between px-14 py-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#2E6F5E 1px, transparent 1px), linear-gradient(90deg, #2E6F5E 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 12l6 6L20 6" stroke="#4FA98A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display font-semibold text-white text-base tracking-tight">VaultPay Financial Core</span>
          </div>
          <h1 className="font-display text-4xl leading-[1.15] font-semibold text-white max-w-md">
            Your own portal for invoices, payments, and receipts.
          </h1>
          <p className="text-white/50 text-sm mt-5 max-w-sm leading-relaxed">
            Create a client account to view invoices from Nexus Corporate Services, pay them
            securely by card, and download receipts — all in one place.
          </p>
        </div>
        <div className="relative text-white/30 text-xs">Nexus Corporate Services · New York, NY</div>
      </div>

      {/* Right: form panel */}
      <div className="flex items-center justify-center px-6 py-12 bg-paper">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-8 h-8 rounded-md bg-ink flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 12l6 6L20 6" stroke="#2E6F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display font-semibold text-sm">VaultPay</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink mb-1">Create your account</h2>
          <p className="text-sm text-ink-700/60 mb-6">Set up client access to your VaultPay portal.</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Blake"
              />
            </div>

            <div>
              <label className="label" htmlFor="companyName">Company name</label>
              <input
                id="companyName"
                type="text"
                autoComplete="organization"
                required
                className="input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Blake & Co."
              />
            </div>

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                placeholder="••••••••••"
              />
              {(passwordFocused || password.length > 0) && (
                <ul className="mt-2 space-y-1">
                  {checks.map((c) => (
                    <li
                      key={c.label}
                      className={`text-xs flex items-center gap-1.5 ${c.met ? 'text-vault-teal' : 'text-ink-700/45'}`}
                    >
                      <span className="inline-flex w-3.5 h-3.5 items-center justify-center">
                        {c.met ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M4 12l6 6L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <span className="block w-1 h-1 rounded-full bg-current" />
                        )}
                      </span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
              />
              {!passwordsMatch && (
                <p className="text-xs text-vault-rust mt-1.5">Passwords do not match.</p>
              )}
            </div>

            {error && (
              <div role="alert" className="text-sm text-vault-rust bg-vault-rust/5 border border-vault-rust/20 rounded-md px-3 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-ink-700/60 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-vault-teal font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
