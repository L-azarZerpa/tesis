import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, 
  ScrollView, StyleSheet, Image, SafeAreaView, StatusBar 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function VerifyEmailScreen({ route, navigation }) {
  const { email, fromLogin } = route.params || {};
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDelay, setResendDelay] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  useEffect(() => {
    let timer;
    if (resendDelay > 0) {
      timer = setTimeout(() => setResendDelay(resendDelay - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendDelay]);

  const handleVerifyEmail = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Error', 'Por favor ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('verify_code', {
        p_email: email,
        p_code: code.trim(),
        p_type: 'email_verification'
      });

      if (error) throw error;

      if (data) {
        Alert.alert(
          '✅ Email Verificado',
          'Tu cuenta ha sido verificada exitosamente. Ahora puedes iniciar sesión.',
          [
            {
              text: 'Ir al Login',
              onPress: () => {
                // Limpiar el stack de navegación y volver al login
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Código incorrecto o expirado. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error al verificar email:', error);
      Alert.alert('Error', 'No se pudo verificar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendDelay > 0) return;

    setResendLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_verification_code', {
        p_email: email,
        p_type: 'email_verification',
        p_user_id: null
      });

      if (error) throw error;

      // Calcular delay progresivo: 1min, 2min, 4min, 8min, hasta 10min máximo
      const delays = [60, 120, 240, 480, 600];
      const newDelay = delays[Math.min(resendAttempts, delays.length - 1)];
      
      setResendDelay(newDelay);
      setResendAttempts(resendAttempts + 1);

      Alert.alert('✅ Código Reenviado', 'Se ha enviado un nuevo código a tu correo electrónico.');
      console.log('Nuevo código de verificación generado para:', email);
    } catch (error) {
      console.error('Error al reenviar código:', error);
      Alert.alert('Error', 'No se pudo reenviar el código. Intenta más tarde.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (fromLogin) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
      >
      <ScrollView 
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Image 
          source={require('../assets/icon.png')} 
          style={styles.logo} 
        />

        <MaterialIcons name="mark-email-read" size={80} color="#0100D9" style={styles.icon} />

        <Text style={styles.title}>VERIFICAR EMAIL</Text>
        <Text style={styles.subtitle}>
          Ingresa el código de 6 dígitos que enviamos a{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color="#0100D9" />
          <Text style={styles.infoText}>
            Revisa tu bandeja de entrada y carpeta de spam
          </Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Código de verificación</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleVerifyEmail} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>VERIFICAR EMAIL</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>¿No recibiste el código?</Text>
          <TouchableOpacity 
            onPress={handleResendCode}
            disabled={resendDelay > 0 || resendLoading}
            style={styles.resendButton}
          >
            {resendLoading ? (
              <ActivityIndicator size="small" color="#0100D9" />
            ) : (
              <Text style={[
                styles.resendButtonText,
                (resendDelay > 0) && styles.resendButtonTextDisabled
              ]}>
                {resendDelay > 0 
                  ? `Reenviar en ${formatTime(resendDelay)}` 
                  : 'Reenviar código'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.backLink}
          onPress={handleBackToLogin}
        >
          <Text style={styles.backLinkText}>
            Volver al inicio de sesión
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.footer}>Área de Ingeniería en Sistemas © 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 25,
    alignItems: 'center' 
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
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  emailText: {
    color: '#0100D9',
    fontWeight: '800'
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2FF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%'
  },
  infoText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#666',
    flex: 1
  },
  formGroup: { 
    marginBottom: 20, 
    width: '100%' 
  },
  label: { 
    color: '#0100D9', 
    fontWeight: '700', 
    marginBottom: 8, 
    textAlign: 'center',
    fontSize: 13
  },
  codeInput: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#0100D9',
    fontSize: 32,
    color: '#333',
    fontWeight: '800',
    letterSpacing: 10
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
  resendContainer: {
    marginTop: 30,
    alignItems: 'center'
  },
  resendText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10
  },
  resendButton: {
    padding: 10
  },
  resendButtonText: {
    color: '#0100D9',
    fontSize: 16,
    fontWeight: '800'
  },
  resendButtonTextDisabled: {
    color: '#999'
  },
  backLink: {
    marginTop: 20,
    padding: 10
  },
  backLinkText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center'
  },
  footer: { 
    textAlign: 'center', 
    marginTop: 40, 
    color: '#bbb', 
    fontSize: 11,
    fontWeight: '600'
  }
});
