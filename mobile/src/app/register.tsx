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

export default function RegisterScreen() {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      Alert.alert(
        'Missing information',
        'Please fill in all fields.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Invalid password',
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Password mismatch',
        'Passwords do not match.'
      );
      return;
    }

    setLoading(true);

    try {
      await register(
        cleanName,
        cleanEmail,
        password
      );

      // Registration successful
      router.replace('/(tabs)');
    } catch (error: any) {
      console.log(
        'REGISTER ERROR:',
        error
      );

      Alert.alert(
        'Registration Failed',
        error?.message ||
          'Unable to create your account.'
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
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Start building better habits today.
        </Text>

        {/* NAME */}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            NAME
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#687169"
            autoCapitalize="words"
            style={styles.input}
            editable={!loading}
          />
        </View>

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
            placeholder="Create a password"
            placeholderTextColor="#687169"
            secureTextEntry
            style={styles.input}
            editable={!loading}
          />
        </View>

        {/* CONFIRM PASSWORD */}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            CONFIRM PASSWORD
          </Text>

          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            placeholderTextColor="#687169"
            secureTextEntry
            style={styles.input}
            editable={!loading}
          />
        </View>

        {/* REGISTER BUTTON */}

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={({ pressed }) => [
            styles.registerButton,
            pressed &&
              styles.buttonPressed,
            loading &&
              styles.disabledButton,
          ]}
        >
          {loading ? (
            <ActivityIndicator
              color="#172019"
            />
          ) : (
            <Text style={styles.registerButtonText}>
              Create Account
            </Text>
          )}
        </Pressable>

        {/* LOGIN */}

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>
            Already have an account?
          </Text>

          <Pressable
            onPress={() =>
              router.replace('/login')
            }
            disabled={loading}
          >
            <Text style={styles.loginLink}>
              Login
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
    marginBottom: 20,
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
    marginBottom: 28,
  },

  inputGroup: {
    marginBottom: 14,
  },

  label: {
    color: '#69736B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 7,
  },

  input: {
    height: 50,
    backgroundColor: '#171C18',
    borderWidth: 1,
    borderColor: '#292F2A',
    borderRadius: 15,
    color: '#E8ECE7',
    paddingHorizontal: 15,
    fontSize: 14,
  },

  registerButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: '#B7C9B5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
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

  registerButtonText: {
    color: '#172019',
    fontSize: 15,
    fontWeight: '800',
  },

  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },

  loginText: {
    color: '#737B74',
    fontSize: 12,
  },

  loginLink: {
    color: '#B7C9B5',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
});