import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div id="loginScreen" className="login-screen">
      <div className="login-water" aria-hidden="true"></div>
      <div className="login-overlay"></div>

      <div
        className={`login-box ${shake ? 'shake' : ''}`}
        id="loginBox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loginTitle"
      >
        <div className="login-logo">
          <svg className="drop-logo" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <ellipse className="drop-ripple" cx="24" cy="39" rx="15" ry="3" fill="#75D8F3"/>
            <path className="drop-shape" d="M24 4C18 13 10 22 10 30a14 14 0 0 0 28 0C38 22 30 13 24 4Z" fill="#B9F2FF" stroke="#4169E1" stroke-width="2.5"/>
            <path className="drop-water" d="M14 30c0-5.6 4.5-10 10-10s10 4.4 10 10a10 10 0 0 1-20 0Z" fill="#1877D2"/>
            <path className="drop-shine" d="M18 24c1.4-2.3 3.2-4.6 5.2-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <span>ClearDrop</span>
        </div>

        <h2 id="loginTitle">Welcome to ClearDrop</h2>
        <p className="login-tagline">Gravity Filter System</p>

        <div className="google-signin">
          <p className="google-security-note">
            Google may request its own 2-Step Verification. ClearDrop never sees or stores Google verification codes.
          </p>
        </div>

        <form id="loginForm" className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="loginUser">Community ID / Username</label>
            <input
              type="text"
              id="loginUser"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. clear2026"
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="loginPass">Password</label>
            <input
              type="password"
              id="loginPass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <p className="login-security-note">Secure demo sign-in</p>
          {error && (
            <p className="login-error show" id="loginError">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary login-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="login-demo-hint">
          Customer: <strong>clear2026</strong> / <strong>drop123</strong><br />
          Stock manager: <strong>clearadmin</strong> / <strong>stock123</strong><br />
          <small style={{ opacity: 0.85, marginTop: '4px', display: 'block' }}>
            Also supports: clearinventory, clearproduction, clearsales, clearpartner
          </small>
        </p>
      </div>
    </div>
  );
}
