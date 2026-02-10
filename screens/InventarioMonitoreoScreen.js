import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, Image, ScrollView 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function InventarioMonitoreoScreen({ navigation }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [modalCategorias, setModalCategorias] = useState(false);

  useEffect(() => {
    cargarCategorias();
    cargarProductos();
  }, [searchQuery, filtroCategoria]);

  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('nombre');
    if (data) setCategorias(data);
  };

  const cargarProductos = async () => {
    setLoading(true);
    try {
      let query = supabase.from('productos').select(`
        *, 
        categorias!left (id, nombre), 
        lotes!left (id, cantidad, fecha_vencimiento)
      `);

      if (searchQuery) query = query.ilike('nombre', `%${searchQuery}%`);
      if (filtroCategoria) query = query.eq('categoria_id', filtroCategoria.id);

      const { data, error } = await query;
      if (error) throw error;

      let procesados = data.map(p => {
        const lotesActivos = p.lotes?.filter(l => l.cantidad > 0) || [];
        const total = lotesActivos.reduce((acc, curr) => acc + curr.cantidad, 0);
        
        // Calcular nivel óptimo (ejemplo: 100 unidades base)
        const nivelOptimo = 100;
        const porcentaje = Math.min((total / nivelOptimo) * 100, 100);
        
        return {
          ...p,
          total,
          nivelOptimo,
          porcentaje,
          categoria_nombre: p.categorias?.nombre || 'Sin categoría',
          estado: porcentaje < 20 ? 'critico' : porcentaje < 50 ? 'bajo' : 'normal'
        };
      });

      procesados.sort((a, b) => a.porcentaje - b.porcentaje);
      setProductos(procesados);
    } catch (e) { 
      console.error("Error cargando productos:", e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const getColorEstado = (estado) => {
    if (estado === 'critico') return '#F44336';
    if (estado === 'bajo') return '#FF9800';
    return '#4CAF50';
  };

  const renderProducto = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{item.nombre}</Text>
          <Text style={styles.productCategory}>{item.categoria_nombre}</Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: getColorEstado(item.estado) }]}>
          <Text style={styles.estadoText}>
            {item.estado === 'critico' ? 'CRÍTICO' : item.estado === 'bajo' ? 'BAJO' : 'NORMAL'}
          </Text>
        </View>
      </View>

      <View style={styles.stockInfo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stockLabel}>STOCK ACTUAL</Text>
          <Text style={styles.stockValue}>{item.total} {item.unidad}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.stockLabel}>NIVEL ÓPTIMO</Text>
          <Text style={styles.stockValue}>{item.nivelOptimo} {item.unidad}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${item.porcentaje}%`, 
                backgroundColor: getColorEstado(item.estado) 
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{item.porcentaje.toFixed(0)}%</Text>
      </View>
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
          <Text style={styles.headerTitle}>MONITOREO DE STOCK</Text>
          <Text style={styles.headerSubtitle}>VISTA SOLO LECTURA</Text>
        </View>
        <Image source={require('../assets/icon.png')} style={styles.logoHeader} />
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={20} color="#999" style={{ marginRight: 10 }} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar producto..." 
            placeholderTextColor="#999" 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
          <TouchableOpacity 
            style={styles.filterButton} 
            onPress={() => setModalCategorias(true)}
          >
            <MaterialIcons 
              name="filter-list" 
              size={24} 
              color={filtroCategoria ? "#4CAF50" : "#0100D9"} 
            />
          </TouchableOpacity>
        </View>
        {filtroCategoria && (
          <View style={styles.activeFilterTag}>
            <Text style={styles.tagText}>Categoría: {filtroCategoria.nombre}</Text>
            <TouchableOpacity onPress={() => setFiltroCategoria(null)}>
              <MaterialIcons name="cancel" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#0100D9" size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={productos} 
          keyExtractor={item => item.id.toString()} 
          renderItem={renderProducto}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay productos registrados</Text>
          }
          onRefresh={cargarProductos}
          refreshing={loading}
        />
      )}

      {/* MODAL CATEGORÍAS */}
      {modalCategorias && (
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>FILTRAR POR CATEGORÍA</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              <TouchableOpacity 
                style={styles.catItem} 
                onPress={() => {
                  setFiltroCategoria(null);
                  setModalCategorias(false);
                }}
              >
                <Text style={styles.catText}>TODAS LAS CATEGORÍAS</Text>
                <MaterialIcons 
                  name={!filtroCategoria ? "radio-button-on" : "radio-button-off"} 
                  size={20} 
                  color="#0100D9" 
                />
              </TouchableOpacity>
              {categorias.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={styles.catItem} 
                  onPress={() => {
                    setFiltroCategoria(cat);
                    setModalCategorias(false);
                  }}
                >
                  <Text style={styles.catText}>{cat.nombre.toUpperCase()}</Text>
                  <MaterialIcons 
                    name={filtroCategoria?.id === cat.id ? "radio-button-on" : "radio-button-off"} 
                    size={20} 
                    color="#0100D9" 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalCategorias(false)}
            >
              <Text style={styles.closeButtonText}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { 
    height: 90, paddingHorizontal: 20, flexDirection: 'row', 
    alignItems: 'center', backgroundColor: '#FFF', elevation: 3,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
  },
  backButton: { marginRight: 15 },
  logoHeader: { width: 70, height: 70, resizeMode: 'contain' },
  headerTitle: { color: '#0100D9', fontSize: 18, fontWeight: '900' },
  headerSubtitle: { color: '#666', fontSize: 10, fontWeight: '700' },
  searchSection: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF' },
  searchRow: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#F5F6F8', paddingHorizontal: 15, 
    borderRadius: 12, height: 50, borderWidth: 1, borderColor: '#EEE' 
  },
  searchInput: { flex: 1, fontWeight: '600', color: '#333' },
  filterButton: { padding: 5 },
  activeFilterTag: { 
    flexDirection: 'row', backgroundColor: '#4CAF50', 
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 20, marginTop: 10, alignItems: 'center' 
  },
  tagText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginRight: 8 },
  productCard: { 
    backgroundColor: '#FFF', borderRadius: 15, padding: 18, 
    marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#EEE' 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  productName: { fontSize: 16, fontWeight: '800', color: '#333' },
  productCategory: { fontSize: 12, color: '#999', marginTop: 2 },
  estadoBadge: { 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 
  },
  estadoText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  stockInfo: { flexDirection: 'row', marginBottom: 15 },
  stockLabel: { fontSize: 10, color: '#999', fontWeight: '700', marginBottom: 4 },
  stockValue: { fontSize: 18, fontWeight: '900', color: '#0100D9' },
  progressContainer: { flexDirection: 'row', alignItems: 'center' },
  progressBar: { 
    flex: 1, height: 12, backgroundColor: '#F0F0F0', 
    borderRadius: 10, overflow: 'hidden', marginRight: 10 
  },
  progressFill: { height: '100%', borderRadius: 10 },
  progressText: { fontSize: 12, fontWeight: '800', color: '#666', width: 40 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontWeight: '600' },
  overlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' 
  },
  modalContent: { 
    width: '85%', backgroundColor: '#fff', borderRadius: 15, padding: 20 
  },
  modalTitle: { 
    fontSize: 16, fontWeight: '900', color: '#0100D9', 
    marginBottom: 15, textAlign: 'center' 
  },
  catItem: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', paddingVertical: 15, 
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5' 
  },
  catText: { fontWeight: '700', color: '#444' },
  closeButton: { 
    backgroundColor: '#0100D9', padding: 15, borderRadius: 10, 
    marginTop: 15, alignItems: 'center' 
  },
  closeButtonText: { color: '#FFF', fontWeight: '900' }
});
