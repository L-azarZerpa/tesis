import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Image, SafeAreaView, StatusBar, ImageBackground
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

import * as Linking from 'expo-linking';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Por favor ingresa un correo válido');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = Linking.createURL('reset-password');
      console.log('Redirecting to:', redirectUrl); // Para depuración

      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      Alert.alert(
        '✅ Email Enviado',
        `Se ha enviado un enlace de recuperación a tu correo. \n\n(Redirect URL: ${redirectUrl})`, // Mostramos URL para verificar que coincida con Supabase
        [
          {
            text: 'Entendido',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      console.error('Error al enviar código:', error);
      Alert.alert('Error', error.message || 'No se pudo enviar el correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <ImageBackground
        source={{ uri: 'https://unerg.edu.ve/wp-content/uploads/2024/02/8.png' }}
        style={styles.background}
        resizeMode="cover"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0100D9" />
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardContainer}>
              <Image
                source={require('../assets/icon.png')}
                style={styles.logo}
              />

              <MaterialIcons name="lock-reset" size={80} color="#0100D9" style={styles.icon} />

              <Text style={styles.title}>¿OLVIDASTE TU CONTRASEÑA?</Text>
              <Text style={styles.subtitle}>
                Ingresa tu correo electrónico y te enviaremos un código de verificación
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="usuario@unerg.edu.ve"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>ENVIAR CÓDIGO</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginText}>
                  ¿Recordaste tu contraseña? <Text style={{ fontWeight: '900' }}>Inicia sesión</Text>
                </Text>
              </TouchableOpacity>

              <Text style={styles.footer}>Área de Ingeniería en Sistemas © 2026</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    zIndex: 10
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10
  },
  icon: {
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0100D9',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  formGroup: {
    marginBottom: 20,
    width: '100%'
  },
  label: {
    color: '#0100D9',
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 13
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333'
  },
  button: {
    backgroundColor: '#0100D9',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
    elevation: 4,
    shadowColor: '#0100D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 1
  },
  loginLink: {
    marginTop: 25,
    padding: 10
  },
  loginText: {
    color: '#0100D9',
    fontSize: 15,
    textAlign: 'center'
  },
  footer: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
    fontSize: 11,
    fontWeight: '600'
  }
});
