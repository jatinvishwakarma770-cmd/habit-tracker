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
  createContext<AuthContextType | undefined>(
    undefined
  );

const TOKEN_KEY = '@habit_tracker_token';
const USER_KEY = '@habit_tracker_user';

// Physical Android phone
const API_URL = 'http://192.168.1.66:5000';

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  // =====================================================
  // LOAD SAVED LOGIN
  // =====================================================

  useEffect(() => {
  const loadAuth = async () => {
    try {
      console.log('Checking saved login...');

      const savedToken =
        await AsyncStorage.getItem(TOKEN_KEY);

      const savedUser =
        await AsyncStorage.getItem(USER_KEY);

      console.log('SAVED TOKEN:', savedToken);
      console.log('SAVED USER:', savedUser);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));

        console.log('✅ Saved user found');
      } else {
        console.log('❌ No saved login found');
      }

    } catch (error) {
      console.log('LOAD AUTH ERROR:', error);

      // If stored data is corrupted, clear it
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);

      setToken(null);
      setUser(null);

    } finally {
      setLoading(false);
    }
  };

  loadAuth();
}, []);

  // =====================================================
  // REGISTER
  // =====================================================

  const register = async (
    name: string,
    email: string,
    password: string
  ) => {
    try {
      console.log(
        'REGISTER REQUEST STARTED'
      );

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name: name.trim(),
            email: email
              .trim()
              .toLowerCase(),
            password,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        'REGISTER RESPONSE:',
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Registration failed'
        );
      }

      if (!data.token || !data.user) {
        throw new Error(
          'Invalid registration response from server'
        );
      }

      // Save token
      await AsyncStorage.setItem(
        TOKEN_KEY,
        data.token
      );

      // Save user
      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(data.user)
      );

      // Update state
      setToken(data.token);
      setUser(data.user);

      console.log(
        'REGISTRATION SUCCESSFUL'
      );
    } catch (error: any) {
      console.log(
        'REGISTER ERROR:',
        error
      );

      if (
        error?.message?.includes(
          'Network request failed'
        )
      ) {
        throw new Error(
          'Cannot connect to server. Make sure your phone and PC are on the same Wi-Fi.'
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
  ) => {
    try {
      console.log(
        'LOGIN REQUEST STARTED'
      );

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email: email
              .trim()
              .toLowerCase(),
            password,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        'LOGIN RESPONSE:',
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Login failed'
        );
      }

      if (!data.token || !data.user) {
        throw new Error(
          'Invalid login response from server'
        );
      }

      // Save token
      await AsyncStorage.setItem(
        TOKEN_KEY,
        data.token
      );

      // Save user
      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(data.user)
      );

      // Update state
      setToken(data.token);
      setUser(data.user);

      console.log(
        'LOGIN SUCCESSFUL'
      );
    } catch (error: any) {
      console.log(
        'LOGIN ERROR:',
        error
      );

      if (
        error?.message?.includes(
          'Network request failed'
        )
      ) {
        throw new Error(
          'Cannot connect to server. Make sure your phone and PC are on the same Wi-Fi.'
        );
      }

      throw error;
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    try {
      console.log(
        'LOGGING OUT...'
      );

      await AsyncStorage.removeItem(
        TOKEN_KEY
      );

      await AsyncStorage.removeItem(
        USER_KEY
      );

      setToken(null);
      setUser(null);

      console.log(
        'LOGOUT SUCCESSFUL'
      );
    } catch (error) {
      console.log(
        'LOGOUT ERROR:',
        error
      );
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
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}