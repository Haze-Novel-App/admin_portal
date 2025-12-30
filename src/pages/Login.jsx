import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css'; // Import styles
import { Mail, Lock, Shield } from 'lucide-react'; // Import icons

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    // ... (Keep your existing handleLogin logic here) ...
    e.preventDefault();
    setLoading(true);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        if (profile?.role !== 'admin') {
            await supabase.auth.signOut();
            alert('Access Denied: Admins Only');
        } else {
            navigate('/dashboard');
        }
    } catch (error) {
        alert(error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <Shield className={styles.brandIcon} size={48} />
        <h2 className={styles.title}>Admin Portal</h2>
        <form onSubmit={handleLogin}>
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
          <div className={styles.inputGroup}>
            <Lock className={styles.inputIcon} size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Verifying...' : 'Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}