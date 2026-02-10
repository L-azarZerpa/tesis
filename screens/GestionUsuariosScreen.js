import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, Image 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function GestionUsuariosScreen({ navigation, route }) {
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  useEffect(() => {
    // Obtener rol del usuario actual
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserRole(user.user_metadata?.role || 'admin');
      }
    };
    getCurrentUser();
    cargarUsuarios();
  }, []);

  useEffect(() => {
    let filtered = usuarios;

    // 1. Filtrar por rol (Si es Jefe, no ver Super Admin)
    if (currentUserRole === 'jefe') {
      filtered = filtered.filter(u => u.role !== 'super_admin');
    }

    // 2. Filtrar por búsqueda
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(u => 
        u.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsuarios(filtered);
  }, [searchQuery, usuarios, currentUserRole]);

  const cargarUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
      // El filtrado inicial lo hace el useEffect cuando cambie 'usuarios' warning: currentUserRole might not be set yet
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

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

  const renderUsuario = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => navigation.navigate('CrearEditarUsuario', { usuario: item, currentUserRole })}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: getRolColor(item.role) }]}>
          <Text style={styles.avatarText}>
            {item.nombre ? item.nombre.charAt(0).toUpperCase() : item.email.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.nombre || 'Sin nombre'}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.userMeta}>
          <View style={[styles.rolBadge, { backgroundColor: getRolColor(item.role) }]}>
            <Text style={styles.rolText}>{getRolLabel(item.role)}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: item.verificado ? '#27AE60' : '#E74C3C' 
          }]}>
            <Text style={styles.statusText}>
              {item.verificado ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </View>

      <MaterialIcons name="chevron-right" size={24} color="#BDC3C7" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
          <Text style={styles.headerSubtitle}>{usuarios.length} usuarios registrados</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#7F8C8D" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#95A5A6"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#7F8C8D" />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de usuarios */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C3E50" />
        </View>
      ) : (
        <FlatList
          data={filteredUsuarios}
          keyExtractor={item => item.id}
          renderItem={renderUsuario}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="person-off" size={64} color="#BDC3C7" />
              <Text style={styles.emptyText}>No se encontraron usuarios</Text>
            </View>
          }
        />
      )}

      {/* FAB - Botón flotante para agregar */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CrearEditarUsuario', { currentUserRole })}
      >
        <MaterialIcons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#2C3E50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: { padding: 15, paddingBottom: 80 },
  userCard: {
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
  avatarContainer: { marginRight: 15 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rolBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  rolText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
