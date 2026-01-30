import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, 
  ScrollView, StyleSheet, Image 
} from 'react-native';
import { supabase } from '../supabaseClient'; 

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // 1. Validaciones básicas
    if (!email || !password || !confirmPassword) {
      Alert.alert('Atención', 'Todos los campos son obligatorios');
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

    // 2. Registro en Supabase con Metadatos de Rol
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        // Esto asigna el rol automáticamente al crear la cuenta
        data: {
          role: 'estudiante',
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error de registro', error.message);
    } else {
      // Nota: Si tienes activada la confirmación por email, el usuario debe verificarlo antes de loguearse
      Alert.alert(
        '¡Éxito!', 
        'Cuenta de estudiante creada correctamente. Ahora puedes iniciar sesión.',
        [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={localStyles.container}
    >
      <ScrollView 
        contentContainerStyle={localStyles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Image 
          source={require('../assets/icon.png')} 
          style={localStyles.logo} 
        />

        <Text style={localStyles.title}>REGISTRO</Text>
        <Text style={localStyles.subtitle}>CREAR CUENTA DE ESTUDIANTE</Text>
        
        <View style={localStyles.formGroup}>
          <Text style={localStyles.label}>Correo institucional</Text>
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

        <View style={localStyles.formGroup}>
          <Text style={localStyles.label}>Confirmar Contraseña</Text>
          <TextInput
            style={localStyles.input}
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={localStyles.button} 
          onPress={handleRegister} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={localStyles.buttonText}>REGISTRARSE</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={localStyles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={localStyles.loginText}>
            ¿Ya tienes cuenta? <Text style={{fontWeight: '900'}}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
        
        <Text style={localStyles.footer}>Área de Ingeniería en Sistemas © 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 25, 
    alignItems: 'center' 
  },
  logo: { 
    width: 120, 
    height: 120, 
    resizeMode: 'contain', 
    marginBottom: 15 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#0100D9',
    letterSpacing: 1 
  },
  subtitle: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#666', 
    marginBottom: 30,
    letterSpacing: 1
  },
  formGroup: { 
    marginBottom: 15, 
    width: '100%' 
  },
  label: { 
    color: '#0100D9', 
    fontWeight: '700', 
    marginBottom: 5, 
    fontSize: 13,
    marginLeft: 4
  },
  input: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#ddd',
    fontSize: 16
  },
  button: { 
    backgroundColor: '#0100D9', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center', 
    width: '100%',
    marginTop: 10,
    elevation: 3
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '800', 
    fontSize: 18,
    letterSpacing: 1
  },
  loginLink: {
    marginTop: 20,
    padding: 10
  },
  loginText: {
    color: '#0100D9',
    fontSize: 15
  },
  footer: { 
    textAlign: 'center', 
    marginTop: 40, 
    color: '#bbb', 
    fontSize: 11,
    fontWeight: '600'
  }
});