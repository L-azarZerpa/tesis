import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Image, SafeAreaView, StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleResetPassword = async () => {
    // Validaciones
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      Alert.alert(
        '✅ Contraseña Actualizada',
        'Tu contraseña ha sido cambiada exitosamente.',
        [
          {
            text: 'Ir al Inicio',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      Alert.alert('Error', 'No se pudo actualizar la contraseña. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
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

          <MaterialIcons name="lock-open" size={80} color="#0100D9" style={styles.icon} />

          <Text style={styles.title}>NUEVA CONTRASEÑA</Text>
          <Text style={styles.subtitle}>
            Establece una nueva contraseña para tu cuenta
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nueva contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialIcons
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={24}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <MaterialIcons
                  name={showConfirmPassword ? "visibility" : "visibility-off"}
                  size={24}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>La contraseña debe tener:</Text>
            <View style={styles.requirementRow}>
              <MaterialIcons
                name={password.length >= 6 ? "check-circle" : "cancel"}
                size={20}
                color={password.length >= 6 ? "#4CAF50" : "#999"}
              />
              <Text style={styles.requirementText}>Al menos 6 caracteres</Text>
            </View>
            <View style={styles.requirementRow}>
              <MaterialIcons
                name={password === confirmPassword && password.length > 0 ? "check-circle" : "cancel"}
                size={20}
                color={password === confirmPassword && password.length > 0 ? "#4CAF50" : "#999"}
              />
              <Text style={styles.requirementText}>Las contraseñas coinciden</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>ACTUALIZAR CONTRASEÑA</Text>
            )}
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333'
  },
  eyeButton: {
    padding: 15
  },
  requirementsBox: {
    backgroundColor: '#F0F2FF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%'
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0100D9',
    marginBottom: 10
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  requirementText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#666'
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
  footer: {
    textAlign: 'center',
    marginTop: 40,
    color: '#bbb',
    fontSize: 11,
    fontWeight: '600'
  }
});
