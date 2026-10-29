
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@habit_tracker_token';
const USER_KEY = '@habit_tracker_user';

// Local backend for development on your physical Android phone.
const API_URL = 'https://habit-tracker-n3gw.onrender.com';

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // LOAD SAVED LOGIN
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const savedUser = await AsyncStorage.getItem(USER_KEY);

        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser) as User;

          if (mounted) {
            setToken(savedToken);
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error('LOAD AUTH ERROR:', error);

        await AsyncStorage.multiRemove([
          TOKEN_KEY,
          USER_KEY,
        ]);

        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // REGISTER
  // =====================================================

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || 'Registration failed'
        );
      }

      if (!data.token || !data.user) {
        throw new Error(
          'Invalid registration response from server'
        );
      }

      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);
    } catch (error: any) {
      if (error?.message?.includes('Network request failed')) {
        throw new Error(
          'Cannot connect to the local server. Check your Wi-Fi and backend.'
        );
      }

      throw error;
    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const login = async (
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Login failed');
      }

      if (!data.token || !data.user) {
        throw new Error(
          'Invalid login response from server'
        );
      }

      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);
    } catch (error: any) {
      if (error?.message?.includes('Network request failed')) {
        throw new Error(
          'Cannot connect to the local server. Check your Wi-Fi and backend.'
        );
      }

      throw error;
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        TOKEN_KEY,
        USER_KEY,
      ]);

      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('LOGOUT ERROR:', error);
      throw error;
    }
  };

  // =====================================================
  // PROVIDER
  // =====================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}
