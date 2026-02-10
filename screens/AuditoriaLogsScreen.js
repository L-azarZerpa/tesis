import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, SafeAreaView, StatusBar, RefreshControl 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function AuditoriaLogsScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarLogs();
  }, []);

  const cargarLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error cargando logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarLogs();
  };

  const getAccionIcon = (accion) => {
    if (accion.includes('CREAR')) return 'add-circle';
    if (accion.includes('ACTUALIZAR') || accion.includes('EDITAR')) return 'edit';
    if (accion.includes('ELIMINAR')) return 'delete';
    if (accion.includes('APROBAR')) return 'check-circle';
    if (accion.includes('RECHAZAR')) return 'cancel';
    if (accion.includes('LOGIN')) return 'login';
    if (accion.includes('LOGOUT')) return 'logout';
    return 'info';
  };

  const getAccionColor = (accion) => {
    if (accion.includes('CREAR')) return '#1ABC9C';
    if (accion.includes('ACTUALIZAR') || accion.includes('EDITAR')) return '#3498DB';
    if (accion.includes('ELIMINAR')) return '#E74C3C';
    if (accion.includes('APROBAR')) return '#27AE60';
    if (accion.includes('RECHAZAR')) return '#E67E22';
    return '#95A5A6';
  };

  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const esHoy = date.toDateString() === hoy.toDateString();
    const esAyer = date.toDateString() === ayer.toDateString();

    const hora = date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (esHoy) return `Hoy ${hora}`;
    if (esAyer) return `Ayer ${hora}`;
    
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderLog = ({ item }) => (
    <View style={styles.logCard}>
      <View style={[styles.logIcon, { backgroundColor: getAccionColor(item.accion) + '20' }]}>
        <MaterialIcons 
          name={getAccionIcon(item.accion)} 
          size={24} 
          color={getAccionColor(item.accion)} 
        />
      </View>

      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logAccion}>{item.accion.replace(/_/g, ' ')}</Text>
          <Text style={styles.logFecha}>{formatFecha(item.created_at)}</Text>
        </View>

        <Text style={styles.logDescripcion}>{item.descripcion}</Text>

        <View style={styles.logFooter}>
          <View style={styles.logUser}>
            <MaterialIcons name="person" size={14} color="#7F8C8D" />
            <Text style={styles.logUserText}>{item.user_email}</Text>
          </View>
          {item.user_rol && (
            <View style={[styles.logRolBadge, { backgroundColor: getRolColor(item.user_rol) }]}>
              <Text style={styles.logRolText}>{getRolLabel(item.user_rol)}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const getRolColor = (rol) => {
    switch(rol) {
      case 'super_admin': return '#E74C3C';
      case 'jefe': return '#9B59B6';
      case 'admin': return '#1ABC9C';
      default: return '#95A5A6';
    }
  };

  const getRolLabel = (rol) => {
    switch(rol) {
      case 'super_admin': return 'Super Admin';
      case 'jefe': return 'Jefe';
      case 'admin': return 'Trabajador';
      default: return rol;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Logs del Sistema</Text>
          <Text style={styles.headerSubtitle}>Auditoría de acciones</Text>
        </View>
        <TouchableOpacity onPress={cargarLogs}>
          <MaterialIcons name="refresh" size={28} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C3E50" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={renderLog}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={64} color="#BDC3C7" />
              <Text style={styles.emptyText}>No hay logs registrados</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECF0F1' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerCenter: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#2C3E50' },
  headerSubtitle: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: { padding: 15 },
  logCard: {
    flexDirection: 'row',
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
  logIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: { flex: 1 },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logAccion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  logFecha: {
    fontSize: 11,
    color: '#95A5A6',
    fontWeight: '600',
  },
  logDescripcion: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logUserText: {
    fontSize: 11,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  logRolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  logRolText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#95A5A6',
    marginTop: 15,
    fontWeight: '600',
  },
});
