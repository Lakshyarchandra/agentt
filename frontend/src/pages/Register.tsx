import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await register(email, password, fullName || undefined);
      navigate('/');
      toast.success('Account created! Welcome to Agent Studio 🎉');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-scale-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Bot size={22} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Agent Studio</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visual AI Agent Platform</div>
          </div>
        </div>

        <h2 style={{ marginBottom: '0.25rem' }}>Create account</h2>
        <p style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>Start building AI agents in minutes</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="input-label" htmlFor="reg-name">Full name (optional)</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-name"
                type="text"
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="reg-email">Email address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-email"
                type="email"
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-password"
                type="password"
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <button id="btn-register" type="submit" className="btn btn-primary w-full btn-lg" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : <>Create Account <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--text-accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
