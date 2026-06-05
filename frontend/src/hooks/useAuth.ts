import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export function useAuth() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.user, data.accessToken);
    return data.user;
  };

  const register = async (email: string, password: string) => {
    const { data } = await api.post('/auth/register', { email, password });
    setAuth(data.user, data.accessToken);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
    }
  };

  return {
    user,
    accessToken,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}
