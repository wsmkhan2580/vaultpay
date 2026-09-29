import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { justRegistered?: boolean } | null)?.justRegistered
    ? 'Account created. Sign in below to continue.'
    : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/client', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid email or password.'));
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
            Invoicing and payments, built like a vault.
          </h1>
          <p className="text-white/50 text-sm mt-5 max-w-sm leading-relaxed">
            Every invoice, payment, and receipt for Nexus Corporate Services — verified server-side,
            reconciled automatically, visible only to who it belongs to.
          </p>
        </div>
        <div className="relative text-white/30 text-xs">Nexus Corporate Services · New York, NY</div>
      </div>

      {/* Right: form panel */}
      <div className="flex items-center justify-center px-6 py-16 bg-paper">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-8 h-8 rounded-md bg-ink flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 12l6 6L20 6" stroke="#2E6F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display font-semibold text-sm">VaultPay</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink mb-1">Sign in</h2>
          <p className="text-sm text-ink-700/60 mb-8">Access your VaultPay portal.</p>

          {successMessage && (
            <div className="text-sm text-vault-teal bg-vault-teal/5 border border-vault-teal/20 rounded-md px-3 py-2.5 mb-4">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                autoComplete="current-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
              />
            </div>

            {error && (
              <div role="alert" className="text-sm text-vault-rust bg-vault-rust/5 border border-vault-rust/20 rounded-md px-3 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-ink-700/60 text-center mt-6">
            New to VaultPay?{' '}
            <Link to="/register" className="text-vault-teal font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
