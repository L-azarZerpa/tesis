import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, Image, ScrollView 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function EstudianteScreen() {
  const [planificacion, setPlanificacion] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el detalle del plato
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      // 1. AGREGAMOS 'foto_url' a la consulta de platos
      const { data, error } = await supabase
        .from('planificacion_semanal')
        .select(`
          id, fecha_menu, turno, notas, plato_id,
          platos ( id, nombre, foto_url )
        `)
        .gte('fecha_menu', new Date().toISOString().split('T')[0])
        .order('fecha_menu', { ascending: true });

      if (error) throw error;
      setPlanificacion(data || []);
    } catch (e) {
      console.error("Error al cargar menús:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const verDetallesPlato = async (menu) => {
    setSelectedMenu(menu);
    setIngredientes([]);
    if (!menu.plato_id) return;

    setLoadingDetalle(true);
    try {
      const { data, error } = await supabase
        .from('platos_ingredientes')
        .select(`
          cantidad_sugerida,
          productos ( nombre, unidad )
        `)
        .eq('plato_id', menu.plato_id);

      if (error) throw error;
      setIngredientes(data || []);
    } catch (e) {
      console.error("Error ingredientes:", e.message);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const renderMenuVertical = ({ item }) => {
    const fechaObj = new Date(item.fecha_menu + 'T00:00:00');
    const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opciones);

    return (
      <TouchableOpacity 
        style={styles.menuCard} 
        onPress={() => verDetallesPlato(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{fechaFormateada.toUpperCase()}</Text>
          <View style={styles.turnoBadge}>
            <Text style={styles.turnoText}>{item.turno}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          {/* 2. MOSTRAR FOTO EN LA LISTA O ICONO POR DEFECTO */}
          <View style={styles.fotoContenedorLista}>
            {item.platos?.foto_url ? (
              <Image 
                source={{ uri: item.platos.foto_url }} 
                style={styles.fotoPlatoLista} 
              />
            ) : (
              <MaterialIcons name="restaurant" size={24} color="#0100D9" />
            )}
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.platoLabel}>PLATO SERVIDO:</Text>
            <Text style={styles.platoNombre}>{item.platos?.nombre || 'Por definir'}</Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={14} color="#CCC" style={{marginLeft: 'auto'}} />
        </View>

        {item.notas && (
          <View style={styles.footerNota}>
            <MaterialIcons name="info" size={16} color="#666" />
            <Text style={styles.notasText} numberOfLines={1}>{item.notas}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>MENÚ SEMANAL</Text>
          <Text style={styles.headerSubtitle}>COMEDOR UNERG</Text>
        </View>
        <Image source={require('../assets/icon.png')} style={styles.logoHeader} />
        <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <MaterialIcons name="logout" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0100D9" />
        </View>
      ) : (
        <FlatList
          data={planificacion}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMenuVertical}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay platos programados.</Text>
            </View>
          }
          onRefresh={fetchMenus}
          refreshing={loading}
        />
      )}

      {/* MODAL DE DETALLES CON FOTO GRANDE */}
      <Modal visible={!!selectedMenu} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalBtn} 
              onPress={() => setSelectedMenu(null)}
            >
              <MaterialIcons name="close" size={28} color="#333" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderInfo}>
                {/* 3. FOTO GRANDE EN EL MODAL */}
                <View style={styles.fotoContenedorModal}>
                  {selectedMenu?.platos?.foto_url ? (
                    <Image 
                      source={{ uri: selectedMenu.platos.foto_url }} 
                      style={styles.fotoPlatoModal} 
                    />
                  ) : (
                    <View style={styles.iconCircle}>
                      <MaterialIcons name="restaurant-menu" size={35} color="#0100D9" />
                    </View>
                  )}
                </View>

                <Text style={styles.modalPlatoNombre}>{selectedMenu?.platos?.nombre}</Text>
                <Text style={styles.modalTurnoText}>{selectedMenu?.turno}</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitleModal}>INGREDIENTES DEL PLATO</Text>
              
              {loadingDetalle ? (
                <ActivityIndicator color="#0100D9" style={{ marginVertical: 20 }} />
              ) : ingredientes.length > 0 ? (
                ingredientes.map((ing, index) => (
                  <View key={index} style={styles.ingredienteRow}>
                    <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
                    <Text style={styles.ingredienteNombre}>{ing.productos?.nombre}</Text>
                    <Text style={styles.ingredienteCantidad}>
                      {ing.cantidad_sugerida} {ing.productos?.unidad}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No hay ingredientes registrados.</Text>
              )}

              {selectedMenu?.notas && (
                <>
                  <Text style={[styles.sectionTitleModal, {marginTop: 20}]}>NOTAS ADICIONALES</Text>
                  <View style={styles.notasBox}>
                    <Text style={styles.notasTextModal}>{selectedMenu.notas}</Text>
                  </View>
                </>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.entendidoBtn} 
              onPress={() => setSelectedMenu(null)}
            >
              <Text style={styles.entendidoBtnText}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    height: 90, paddingHorizontal: 25, flexDirection: 'row', 
    alignItems: 'center', backgroundColor: '#FFF', elevation: 3 
  },
  logoHeader: { width: 60, height: 60, resizeMode: 'contain' },
  headerTitle: { color: '#0100D9', fontSize: 20, fontWeight: '900' },
  headerSubtitle: { color: '#666', fontSize: 10, fontWeight: '700' },
  logoutBtn: { marginLeft: 15, padding: 8 },
  listPadding: { padding: 20 },
  
  menuCard: {
    backgroundColor: '#FFF', borderRadius: 15, marginBottom: 15,
    overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#EEE'
  },
  cardHeader: {
    backgroundColor: '#F0F2FF', paddingHorizontal: 15, paddingVertical: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  dateText: { fontSize: 11, fontWeight: '800', color: '#0100D9' },
  turnoBadge: { backgroundColor: '#0100D9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  turnoText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  cardBody: { padding: 12, flexDirection: 'row', alignItems: 'center' },
  
  // Estilos de Foto en Lista
  fotoContenedorLista: {
    width: 65, height: 65, borderRadius: 12, backgroundColor: '#F0F2FF',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  fotoPlatoLista: { width: '100%', height: '100%', resizeMode: 'cover' },

  textContainer: { marginLeft: 15, flex: 1 },
  platoLabel: { fontSize: 10, color: '#999', fontWeight: '800' },
  platoNombre: { fontSize: 17, fontWeight: '900', color: '#333' },
  
  footerNota: {
    backgroundColor: '#FAFAFA', padding: 10, flexDirection: 'row',
    alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  notasText: { fontSize: 12, color: '#666', marginLeft: 8, fontStyle: 'italic' },

  // Estilos Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, 
    padding: 25, maxHeight: '90%' 
  },
  closeModalBtn: { alignSelf: 'flex-end', padding: 5, marginBottom: 10 },
  modalHeaderInfo: { alignItems: 'center', marginBottom: 10 },
  
  // Estilo Foto en Modal
  fotoContenedorModal: {
    width: '100%', height: 220, borderRadius: 20, backgroundColor: '#F0F2FF',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 15
  },
  fotoPlatoModal: { width: '100%', height: '100%', resizeMode: 'cover' },

  iconCircle: { 
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#F0F2FF', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 10 
  },
  modalPlatoNombre: { fontSize: 24, fontWeight: '900', color: '#333', textAlign: 'center' },
  modalTurnoText: { fontSize: 14, color: '#0100D9', fontWeight: '800', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 20 },
  sectionTitleModal: { fontSize: 12, fontWeight: '800', color: '#999', marginBottom: 15, letterSpacing: 1 },
  ingredienteRow: { 
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, 
    backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12 
  },
  ingredienteNombre: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600', color: '#444' },
  ingredienteCantidad: { fontSize: 13, color: '#666', fontWeight: '700' },
  notasBox: { backgroundColor: '#FFF9C4', padding: 15, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#FBC02D' },
  notasTextModal: { color: '#555', fontStyle: 'italic', lineHeight: 18 },
  entendidoBtn: { 
    backgroundColor: '#0100D9', padding: 16, borderRadius: 15, 
    alignItems: 'center', marginTop: 25, marginBottom: 10
  },
  entendidoBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  noDataText: { color: '#999', textAlign: 'center', fontStyle: 'italic' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', fontWeight: '600' }
});