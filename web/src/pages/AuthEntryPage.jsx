import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';

/**
 * Abre el modal de auth en modo registro/login y redirige al home
 * para que el usuario nunca vea una página suelta de entrada.
 */
export default function AuthEntryPage({ mode = 'register' }) {
  const { setAuthOpen, setAuthIntent, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
      return;
    }
    setAuthIntent(mode === 'login' ? null : 'register');
    setAuthOpen(true);
    navigate('/', { replace: true });
  }, [user, mode, navigate, setAuthOpen, setAuthIntent]);

  return null;
}
