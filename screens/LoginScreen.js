import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, 
  ScrollView, StyleSheet, Image 
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

    // 1. Intentar iniciar sesión
    // Al tener éxito, App.js detectará el cambio automáticamente
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password: password 
    });

    if (error) {
      Alert.alert('Error', 'Credenciales incorrectas');
      setLoading(false);
      return;
    }

    // NOTA: No llamamos a navigation.replace aquí.
    // El onAuthStateChange en App.js hará la redirección por nosotros.
    console.log("Login solicitado correctamente");
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
          style={localStyles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={localStyles.registerText}>
            ¿No tienes cuenta? <Text style={{fontWeight: '900'}}>Regístrate aquí</Text>
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
    width: 180, 
    height: 180,
    resizeMode: 'contain',
    marginBottom: 20
  },
  title: { 
    fontSize: 32, 
    fontWeight: '900', 
    textAlign: 'center', 
    color: '#0100D9', 
    letterSpacing: 1 
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
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
  registerLink: {
    marginTop: 25,
    padding: 10
  },
  registerText: {
    color: '#0100D9',
    fontSize: 15,
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