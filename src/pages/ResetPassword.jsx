import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import styles from './ResetPassword.module.css';
import { Mail, Lock, ShieldCheck } from 'lucide-react';

const REDIRECT_URL = 'https://admin.shelfiebooks.in/reset-password';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = useMemo(() => searchParams.get('code'), [searchParams]);

  const [mode, setMode] = useState(code ? 'set' : 'request');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (!code) return;
    const exchange = async () => {
      setLoading(true);
      setMessage('');
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setMode('set');
      } catch (err) {
        setMessage(err.message || 'Unable to open reset link.');
        setMode('request');
      } finally {
        setLoading(false);
      }
    };
    exchange();
  }, [code]);

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: REDIRECT_URL,
      });
      if (error) throw error;
      setMessage('Reset email sent. Check your inbox.');
    } catch (err) {
      setMessage(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Password updated. Please sign in.');
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      setMessage(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <ShieldCheck className={styles.brandIcon} size={46} />
        <h2 className={styles.title}>
          {mode === 'set' ? 'Set New Password' : 'Reset Password'}
        </h2>

        {message && <div className={styles.message}>{message}</div>}

        {mode === 'request' && (
          <form onSubmit={handleRequest}>
            <div className={styles.inputGroup}>
              <Mail className={styles.inputIcon} size={20} />
              <input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        {mode === 'set' && (
          <form onSubmit={handleSetPassword}>
            <div className={styles.inputGroup}>
              <Lock className={styles.inputIcon} size={20} />
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <Lock className={styles.inputIcon} size={20} />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}

        <div className={styles.linkRow}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => navigate('/')}
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
