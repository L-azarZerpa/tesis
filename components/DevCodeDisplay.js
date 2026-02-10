import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

/**
 * Componente de DESARROLLO para mostrar códigos de verificación
 * ELIMINAR EN PRODUCCIÓN cuando tengas servicio de email configurado
 */
export default function DevCodeDisplay({ email, onCodeReceived }) {
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCode = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_latest_verification_code', { p_email: email });

      if (error) throw error;

      if (data && data.length > 0) {
        setCode(data[0].code);
        if (onCodeReceived) {
          onCodeReceived(data[0].code);
        }
      }
    } catch (error) {
      console.error('Error obteniendo código:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Esperar 2 segundos para que se genere el código
    const timer = setTimeout(() => {
      fetchCode();
    }, 2000);

    return () => clearTimeout(timer);
  }, [email]);

  const copyCode = () => {
    if (code) {
      Alert.alert('Código Copiado', `Código: ${code}`);
    }
  };

  if (!code) {
    return (
      <View style={styles.container}>
        <View style={styles.devBanner}>
          <MaterialIcons name="code" size={20} color="#FF9800" />
          <Text style={styles.devText}>MODO DESARROLLO</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchCode}
          disabled={loading}
        >
          <MaterialIcons name="refresh" size={20} color="#0100D9" />
          <Text style={styles.refreshText}>
            {loading ? 'Cargando...' : 'Mostrar código de verificación'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.devBanner}>
        <MaterialIcons name="code" size={20} color="#FF9800" />
        <Text style={styles.devText}>MODO DESARROLLO - CÓDIGO GENERADO</Text>
      </View>
      
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Tu código de verificación:</Text>
        <TouchableOpacity style={styles.codeDisplay} onPress={copyCode}>
          <Text style={styles.codeText}>{code}</Text>
          <MaterialIcons name="content-copy" size={20} color="#0100D9" />
        </TouchableOpacity>
        <Text style={styles.hint}>Toca para copiar</Text>
      </View>

      <View style={styles.warningBox}>
        <MaterialIcons name="warning" size={18} color="#F44336" />
        <Text style={styles.warningText}>
          Este componente es solo para desarrollo. En producción, el código se enviará por email.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    width: '100%'
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 15
  },
  devText: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9800',
    letterSpacing: 1
  },
  codeBox: {
    backgroundColor: '#F0F2FF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0100D9',
    borderStyle: 'dashed'
  },
  codeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600'
  },
  codeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 5
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0100D9',
    letterSpacing: 8,
    marginRight: 15
  },
  hint: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic'
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0100D9'
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0100D9'
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginTop: 15
  },
  warningText: {
    marginLeft: 8,
    fontSize: 11,
    color: '#F44336',
    flex: 1,
    lineHeight: 16
  }
});
