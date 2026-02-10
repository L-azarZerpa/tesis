import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, Image, Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function ConfiguracionGlobalScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [configuraciones, setConfiguraciones] = useState({});
  const [editando, setEditando] = useState({});

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*')
        .order('clave');
      
      if (error) throw error;

      const configObj = {};
      data.forEach(item => {
        configObj[item.clave] = item.valor;
      });
      setConfiguraciones(configObj);
      setEditando(configObj);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      const updates = Object.keys(editando).map(clave => ({
        clave,
        valor: editando[clave]
      }));

      for (const config of updates) {
        const { error } = await supabase
          .from('configuracion_sistema')
          .upsert(config, { onConflict: 'clave' });
        
        if (error) throw error;
      }

      Alert.alert('Éxito', 'Configuraciones actualizadas correctamente.');
      cargarConfiguraciones();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const ConfigItem = ({ clave, titulo, descripcion, tipo = 'text' }) => (
    <View style={styles.configCard}>
      <View style={styles.configHeader}>
        <MaterialIcons name="settings" size={20} color="#0100D9" />
        <Text style={styles.configTitle}>{titulo}</Text>
      </View>
      <Text style={styles.configDescription}>{descripcion}</Text>
      <TextInput 
        style={styles.configInput}
        value={editando[clave] || ''}
        onChangeText={(value) => setEditando({ ...editando, [clave]: value })}
        keyboardType={tipo === 'number' ? 'numeric' : 'default'}
        placeholder={`Valor de ${titulo.toLowerCase()}`}
      />
      <Text style={styles.configKey}>Clave: {clave}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#0100D9" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>CONFIGURACIÓN GLOBAL</Text>
          <Text style={styles.headerSubtitle}>PARÁMETROS DEL SISTEMA</Text>
        </View>
        <Image source={require('../assets/icon.png')} style={styles.logoHeader} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0100D9" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.warningCard}>
            <MaterialIcons name="warning" size={24} color="#FF9800" />
            <Text style={styles.warningText}>
              Estos parámetros afectan el funcionamiento global del sistema. 
              Modifícalos con precaución.
            </Text>
          </View>

          <ConfigItem 
            clave="stock_minimo_alerta"
            titulo="Stock Mínimo de Alerta"
            descripcion="Cantidad mínima de productos antes de generar alerta crítica"
            tipo="number"
          />

          <ConfigItem 
            clave="dias_vencimiento_alerta"
            titulo="Días para Alerta de Vencimiento"
            descripcion="Días antes del vencimiento para mostrar advertencia"
            tipo="number"
          />

          <ConfigItem 
            clave="email_notificaciones"
            titulo="Email de Notificaciones"
            descripcion="Correo electrónico para recibir alertas del sistema"
          />

          <ConfigItem 
            clave="nombre_institucion"
            titulo="Nombre de la Institución"
            descripcion="Nombre completo de la institución"
          />

          <ConfigItem 
            clave="horario_comedor"
            titulo="Horario del Comedor"
            descripcion="Horario de atención del comedor"
          />

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={guardarCambios}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialIcons name="save" size={22} color="#FFF" />
                <Text style={styles.saveButtonText}>GUARDAR CAMBIOS</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={() => {
              Alert.alert(
                'Restablecer Valores',
                '¿Deseas restablecer todos los valores a los guardados?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Restablecer', 
                    onPress: () => setEditando({ ...configuraciones }) 
                  }
                ]
              );
            }}
          >
            <MaterialIcons name="refresh" size={22} color="#666" />
            <Text style={styles.resetButtonText}>RESTABLECER VALORES</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    height: 90, paddingHorizontal: 20, flexDirection: 'row', 
    alignItems: 'center', backgroundColor: '#FFF', elevation: 3,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
  },
  backButton: { marginRight: 15 },
  logoHeader: { width: 70, height: 70, resizeMode: 'contain' },
  headerTitle: { color: '#0100D9', fontSize: 18, fontWeight: '900' },
  headerSubtitle: { color: '#666', fontSize: 10, fontWeight: '700' },
  content: { flex: 1, padding: 20 },
  warningCard: { 
    flexDirection: 'row', backgroundColor: '#FFF3E0', 
    padding: 15, borderRadius: 12, marginBottom: 20, 
    alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#FF9800' 
  },
  warningText: { 
    flex: 1, marginLeft: 12, fontSize: 13, 
    color: '#E65100', lineHeight: 18 
  },
  configCard: { 
    backgroundColor: '#FFF', borderRadius: 12, 
    padding: 18, marginBottom: 15, elevation: 2,
    borderWidth: 1, borderColor: '#EEE'
  },
  configHeader: { 
    flexDirection: 'row', alignItems: 'center', marginBottom: 8 
  },
  configTitle: { 
    fontSize: 15, fontWeight: '800', color: '#333', marginLeft: 10 
  },
  configDescription: { 
    fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 16 
  },
  configInput: { 
    backgroundColor: '#F5F6F8', borderRadius: 8, 
    padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' 
  },
  configKey: { 
    fontSize: 10, color: '#999', marginTop: 8, fontStyle: 'italic' 
  },
  saveButton: { 
    flexDirection: 'row', backgroundColor: '#0100D9', 
    padding: 18, borderRadius: 12, alignItems: 'center', 
    justifyContent: 'center', marginTop: 20 
  },
  saveButtonText: { 
    color: '#FFF', fontSize: 16, fontWeight: '900', marginLeft: 10 
  },
  resetButton: { 
    flexDirection: 'row', backgroundColor: '#F5F5F5', 
    padding: 15, borderRadius: 12, alignItems: 'center', 
    justifyContent: 'center', marginTop: 10, marginBottom: 30 
  },
  resetButtonText: { 
    color: '#666', fontSize: 14, fontWeight: '700', marginLeft: 10 
  }
});
