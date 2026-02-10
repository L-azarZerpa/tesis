import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Modal, FlatList, ActivityIndicator, Alert, SafeAreaView, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { requestPermissions } from '../services/notificationService';
import { supabase } from '../supabaseClient';

export default function JefeDashboardScreen({ navigation }) {

  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // 1. Pedir permisos de notificación al cargar
    requestPermissions();

    cargarDatos();

    const channel = supabase
      .channel('dashboard_solicitudes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_ajuste' },
        async (payload) => {
          // Recargar datos visuales
          cargarDatos();

          // Notificación si hay nueva solicitud de acceso
          if (payload.eventType === 'INSERT' && payload.new.tipo_ajuste === 'acceso' && payload.new.estado === 'pendiente') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Nueva Solicitud de Acceso 🔔",
                body: `${payload.new.empleado_nombre || 'Un empleado'} solicita ingresar al inventario.`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null, // Inmediato
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ----------------------------------------------------
   * ESTADOS NUEVOS PARA ACCESOS
   * ---------------------------------------------------- */
  const [accesosModalVisible, setAccesosModalVisible] = useState(false);
  const [accesosActivos, setAccesosActivos] = useState([]);
  const [loadingAccesos, setLoadingAccesos] = useState(false);

  /* ----------------------------------------------------
   * LÓGICA DE CONTROL DE ACCESOS
   * ---------------------------------------------------- */
  const cargarAccesosActivos = async () => {
    setLoadingAccesos(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('solicitudes_ajuste')
        .select('*')
        .eq('tipo_ajuste', 'acceso')
        .eq('estado', 'aprobado')
        .gte('created_at', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccesosActivos(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAccesos(false);
    }
  };

  const revocarAcceso = async (id) => {
    try {
      const { error } = await supabase
        .from('solicitudes_ajuste')
        .update({ estado: 'rechazado' })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Éxito', 'Acceso revocado correctamente.');
      cargarAccesosActivos();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const cargarDatos = async () => {
    try {

      const { count, error: countError } = await supabase
        .from('solicitudes_ajuste')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      if (countError) throw countError;
      setSolicitudesPendientes(count || 0);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0100D9" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>JEFE DE COMEDOR</Text>
          <Text style={styles.headerSubtitle}>PANEL OPERATIVO</Text>
        </View>

        <Image source={require('../assets/icon.png')} style={styles.logo} />

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <MaterialIcons name="logout" size={24} color="#E74C3C" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >


        {/* Buzón de Solicitudes */}
        <TouchableOpacity
          style={styles.buzónCard}
          onPress={() => navigation.navigate('BuzonSolicitudes')}
        >
          <View style={styles.buzónIcon}>
            <MaterialIcons name="inbox" size={32} color="#FFF" />
            {solicitudesPendientes > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{solicitudesPendientes}</Text>
              </View>
            )}
          </View>
          <View style={styles.buzónContent}>
            <Text style={styles.buzónTitle}>Buzón de Solicitudes</Text>
            <Text style={styles.buzónDesc}>
              {solicitudesPendientes === 0
                ? 'No hay solicitudes pendientes'
                : `${solicitudesPendientes} solicitud(es) pendiente(s)`}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Acciones Rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCIONES RÁPIDAS</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setAccesosModalVisible(true)}
            >
              <MaterialIcons name="security" size={32} color="#0100D9" />
              <Text style={styles.actionText}>Control Acceso</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Inventario')}
            >
              <MaterialIcons name="inventory" size={32} color="#0100D9" />
              <Text style={styles.actionText}>Ver Inventario</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Reporte')}
            >
              <MaterialIcons name="assessment" size={32} color="#0100D9" />
              <Text style={styles.actionText}>Reportes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Menus')}
            >
              <MaterialIcons name="restaurant-menu" size={32} color="#F39C12" />
              <Text style={styles.actionText}>Menús</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AuditoriaLogs')}
            >
              <MaterialIcons name="history" size={32} color="#0100D9" />
              <Text style={styles.actionText}>Historial</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('GestionUsuarios')}
            >
              <MaterialIcons name="people" size={32} color="#0100D9" />
              <Text style={styles.actionText}>Usuarios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL: CONTROL DE ACCESOS */}
      <Modal
        visible={accesosModalVisible}
        animationType="slide"
        transparent={true}
        onShow={cargarAccesosActivos}
        onRequestClose={() => setAccesosModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ACCESOS ACTIVOS (HOY)</Text>
              <TouchableOpacity onPress={() => setAccesosModalVisible(false)}>
                <MaterialIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {loadingAccesos ? <ActivityIndicator size="large" color="#0100D9" /> : (
              <FlatList
                data={accesosActivos}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No hay empleados con acceso activo hoy.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.accesoItem}>
                    <View>
                      <Text style={styles.empleadoNombre}>{item.empleado_nombre || 'Empleado'}</Text>
                      <Text style={styles.accesoHora}>Aprobado: {new Date(item.created_at).toLocaleTimeString()}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => revocarAcceso(item.id)}
                    >
                      <Text style={styles.revokeText}>REVOCAR</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0100D9' },
  accesoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  empleadoNombre: { fontWeight: 'bold', color: '#333', fontSize: 15 },
  accesoHora: { color: '#777', fontSize: 12 },
  revokeBtn: { backgroundColor: '#E74C3C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  revokeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    height: 95,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logo: { width: 85, height: 85, resizeMode: 'contain' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0100D9' },
  headerSubtitle: { fontSize: 10, color: '#666', fontWeight: '600' },
  logoutBtn: { padding: 5 },

  content: { flex: 1 },
  section: { padding: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0100D9',
    marginLeft: 8,
    letterSpacing: 0.5,
  },

  buzónCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0100D9', // Cambiado a azul
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#0100D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buzónIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E74C3C',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0100D9',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  buzónContent: {
    flex: 1,
    marginLeft: 15,
  },
  buzónTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  buzónDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 10,
    textAlign: 'center',
  },
});
