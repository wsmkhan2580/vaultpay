import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="text-center">
        <div className="font-display text-5xl font-semibold text-ink mb-2">404</div>
        <p className="text-sm text-ink-700/60 mb-6">This page doesn't exist.</p>
        <Link to="/" className="btn-primary">
          Go home
        </Link>
      </div>
    </div>
  );
}
