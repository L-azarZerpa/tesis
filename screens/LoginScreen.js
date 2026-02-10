
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Image, SafeAreaView, StatusBar, ImageBackground
} from 'react-native';
import { supabase } from '../supabaseClient';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atención', 'Ingresa credenciales');
      return;
    }
    setLoading(true);

    try {
      // 1. Intentar iniciar sesión
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        console.error('Error de login:', error);

        // Mensajes más específicos según el tipo de error
        if (error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email no confirmado',
            'Tu cuenta aún no ha sido verificada. ¿Deseas verificarla ahora?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Verificar',
                onPress: () => {
                  setLoading(false);
                  navigation.navigate('VerifyEmail', { email: email.trim(), fromLogin: true });
                }
              }
            ]
          );
          setLoading(false);
          return;
        } else if (error.message.includes('Invalid login credentials')) {
          // Verificar si el usuario existe pero no está confirmado
          const { data: checkData } = await supabase.rpc('is_email_confirmed', {
            p_email: email.trim()
          });

          if (checkData === false) {
            Alert.alert(
              'Email no verificado',
              'Tu cuenta existe pero no ha sido verificada. Te enviaremos un código de verificación.',
              [
                {
                  text: 'Verificar ahora',
                  onPress: async () => {
                    try {
                      // Generar nuevo código
                      await supabase.rpc('create_verification_code', {
                        p_email: email.trim(),
                        p_type: 'email_verification',
                        p_user_id: null
                      });

                      setLoading(false);
                      navigation.navigate('VerifyEmail', { email: email.trim(), fromLogin: true });
                    } catch (err) {
                      console.error('Error generando código:', err);
                      Alert.alert('Error', 'No se pudo enviar el código de verificación.');
                      setLoading(false);
                    }
                  }
                }
              ]
            );
            return;
          }

          Alert.alert('Error', 'Credenciales incorrectas. Verifica tu email y contraseña.');
        } else {
          Alert.alert('Error', error.message);
        }

        setLoading(false);
        return;
      }

      // Login exitoso
      // Login exitoso - usuario redirigido automáticamente
    } catch (error) {
      console.error('Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <ImageBackground
        source={{ uri: 'https://unerg.edu.ve/wp-content/uploads/2024/02/8.png' }}
        style={localStyles.background}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={localStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={localStyles.cardContainer}>
              <Image
                source={require('../assets/icon.png')}
                style={localStyles.logo}
              />

              <Text style={localStyles.title}>INVENTARIO</Text>
              <Text style={localStyles.subtitle}>CONTROL DE STOCK UNERG</Text>

              <View style={localStyles.formGroup}>
                <Text style={localStyles.label}>Correo electrónico</Text>
                <TextInput
                  style={localStyles.input}
                  placeholder="usuario@unerg.edu.ve"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={localStyles.formGroup}>
                <Text style={localStyles.label}>Contraseña</Text>
                <TextInput
                  style={localStyles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={localStyles.button}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={localStyles.buttonText}>ENTRAR</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={localStyles.forgotPasswordLink}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={localStyles.forgotPasswordText}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>



              <Text style={localStyles.footer}>Área de Ingeniería en Sistemas © 2026</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
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
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    color: '#0100D9',
    letterSpacing: 1,
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 2
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
  forgotPasswordLink: {
    marginTop: 15,
    padding: 10
  },
  forgotPasswordText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '700'
  },
  registerLink: {
    marginTop: 10,
    padding: 10
  },
  registerText: {
    color: '#0100D9',
    fontSize: 14,
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

