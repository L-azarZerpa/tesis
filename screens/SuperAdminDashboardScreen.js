import React, { useEffect, useState } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, SafeAreaView, StatusBar, Image, RefreshControl 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function SuperAdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const { data, error } = await supabase
        .from('vista_estadisticas_usuarios')
        .select('*')
        .single();

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarEstadisticas();
  };

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>SUPER ADMIN</Text>
            <Text style={styles.headerSubtitle}>Panel de Control Técnico</Text>
          </View>
        </View>
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
        {/* Métricas */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>MÉTRICAS DEL SISTEMA</Text>
          
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: '#3498DB' }]}>
              <MaterialIcons name="people" size={32} color="#FFF" />
              <Text style={styles.metricValue}>{stats?.usuarios_activos || 0}</Text>
              <Text style={styles.metricLabel}>Usuarios Activos</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#9B59B6' }]}>
              <MaterialIcons name="supervisor-account" size={32} color="#FFF" />
              <Text style={styles.metricValue}>{stats?.total_jefes || 0}</Text>
              <Text style={styles.metricLabel}>Jefes</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#1ABC9C' }]}>
              <MaterialIcons name="badge" size={32} color="#FFF" />
              <Text style={styles.metricValue}>{stats?.total_admins || 0}</Text>
              <Text style={styles.metricLabel}>Trabajadores</Text>
            </View>
          </View>

          {stats?.usuarios_sin_verificar > 0 && (
            <View style={styles.warningCard}>
              <MaterialIcons name="warning" size={24} color="#E67E22" />
              <Text style={styles.warningText}>
                {stats.usuarios_sin_verificar} usuario(s) sin verificar
              </Text>
            </View>
          )}
        </View>

        {/* Accesos Rápidos */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.sectionTitle}>ACCESO RÁPIDO</Text>
          
          <TouchableOpacity 
            style={styles.quickAccessCard}
            onPress={() => navigation.navigate('GestionUsuarios')}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: '#3498DB' }]}>
              <MaterialIcons name="manage-accounts" size={28} color="#FFF" />
            </View>
            <View style={styles.quickAccessContent}>
              <Text style={styles.quickAccessTitle}>Gestión de Usuarios</Text>
              <Text style={styles.quickAccessDesc}>Crear, editar e inhabilitar usuarios</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#BDC3C7" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAccessCard}
            onPress={() => navigation.navigate('AuditoriaLogs')}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: '#9B59B6' }]}>
              <MaterialIcons name="history" size={28} color="#FFF" />
            </View>
            <View style={styles.quickAccessContent}>
              <Text style={styles.quickAccessTitle}>Logs del Sistema</Text>
              <Text style={styles.quickAccessDesc}>Auditoría y seguimiento de acciones</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#BDC3C7" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAccessCard}
            onPress={() => navigation.navigate('ConfiguracionGlobal')}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: '#1ABC9C' }]}>
              <MaterialIcons name="settings" size={28} color="#FFF" />
            </View>
            <View style={styles.quickAccessContent}>
              <Text style={styles.quickAccessTitle}>Configuración Global</Text>
              <Text style={styles.quickAccessDesc}>Parámetros del sistema</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#BDC3C7" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECF0F1' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 50, height: 50, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#2C3E50' },
  headerSubtitle: { fontSize: 11, color: '#7F8C8D', fontWeight: '600' },
  logoutBtn: { padding: 8 },
  content: { flex: 1 },
  metricsSection: { padding: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 15,
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginTop: 5,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#E67E22',
  },
  warningText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  quickAccessSection: { padding: 20, paddingTop: 0 },
  quickAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickAccessIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAccessContent: { flex: 1, marginLeft: 15 },
  quickAccessTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
  },
  quickAccessDesc: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
});
