import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      Alert.alert(
        'Missing information',
        'Please enter your email and password.'
      );
      return;
    }

    setLoading(true);

    try {
      await login(cleanEmail, password);

      // Login successful
      router.replace('/(tabs)');
    } catch (error: any) {
      console.log('LOGIN ERROR:', error);

      Alert.alert(
        'Login Failed',
        error?.message || 'Unable to login.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.content}>

        {/* LOGO */}

        <View style={styles.logoContainer}>
          <Text style={styles.logo}>
            🌱
          </Text>
        </View>

        {/* TITLE */}

        <Text style={styles.title}>
          Welcome Back
        </Text>

        <Text style={styles.subtitle}>
          Continue building better habits.
        </Text>

        {/* EMAIL */}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            EMAIL
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#687169"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            editable={!loading}
          />
        </View>

        {/* PASSWORD */}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            PASSWORD
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#687169"
            secureTextEntry
            style={styles.input}
            editable={!loading}
          />
        </View>

        {/* LOGIN BUTTON */}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.buttonPressed,
            loading && styles.disabledButton,
          ]}
        >
          {loading ? (
            <ActivityIndicator
              color="#172019"
            />
          ) : (
            <Text style={styles.loginText}>
              Login
            </Text>
          )}
        </Pressable>

        {/* REGISTER */}

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>
            Don't have an account?
          </Text>

          <Pressable
            onPress={() =>
              router.push('/register')
            }
            disabled={loading}
          >
            <Text style={styles.registerLink}>
              Register
            </Text>
          </Pressable>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101311',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#1D281F',
    borderWidth: 1,
    borderColor: '#344137',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },

  logo: {
    fontSize: 36,
  },

  title: {
    color: '#F0F3EF',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: '#737B74',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 35,
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    color: '#69736B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 7,
  },

  input: {
    height: 52,
    backgroundColor: '#171C18',
    borderWidth: 1,
    borderColor: '#292F2A',
    borderRadius: 15,
    color: '#E8ECE7',
    paddingHorizontal: 15,
    fontSize: 14,
  },

  loginButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: '#B7C9B5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  buttonPressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginText: {
    color: '#172019',
    fontSize: 15,
    fontWeight: '800',
  },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },

  registerText: {
    color: '#737B74',
    fontSize: 12,
  },

  registerLink: {
    color: '#B7C9B5',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
});