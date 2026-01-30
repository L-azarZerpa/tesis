import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, TextInput, 
  Modal, Alert, ScrollView, ActivityIndicator, StyleSheet, 
  SafeAreaView, StatusBar, Keyboard, Image 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

const INITIAL_FORM = { 
  nombre: '', cantidad: '', unidad: '', categoria_id: '', categoria_nombre: '', 
  fechaVencimiento: '', organizationName: '', 
  numStudents: '', numTeachers: '', operationValue: '' 
};

export default function InventarioScreen({ navigation }) {
  // --- ESTADOS ---
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filtroActivo, setFiltroActivo] = useState('alfabetico'); 
  const [filtroCategoria, setFiltroCategoria] = useState(null); 
  
  const [tipoOperacion, setTipoOperacion] = useState(null); 
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [nuevaCatNombre, setNuevaCatNombre] = useState('');
  
  const [modals, setModals] = useState({ 
    menu: false, selector: false, form: false, cats: false, filtros: false 
  });

  // --- EFECTOS ---
  useEffect(() => {
    cargarCategorias();
    cargarProductos();
  }, [searchQuery, filtroActivo, filtroCategoria]);

  // --- LÓGICA DE DATOS ---
  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('nombre');
    if (data) setCategorias(data);
  };

  const cargarProductos = async () => {
    setLoading(true);
    try {
      let query = supabase.from('productos').select(`
        *, 
        categorias (id, nombre), 
        lotes (cantidad, fecha_vencimiento)
      `);

      if (searchQuery) query = query.ilike('nombre', `%${searchQuery}%`);
      if (filtroCategoria) query = query.eq('categoria_id', filtroCategoria.id);

      if (filtroActivo === 'alfabetico') query = query.order('nombre', { ascending: true });
      if (filtroActivo === 'recientes') query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      let procesados = data.map(p => {
        const lotesActivos = p.lotes?.filter(l => l.cantidad > 0) || [];
        const proximoVencimiento = lotesActivos.length > 0 
          ? lotesActivos.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))[0].fecha_vencimiento 
          : '9999-12-31';

        return {
          ...p,
          total: lotesActivos.reduce((acc, curr) => acc + curr.cantidad, 0),
          vencimientoCercano: proximoVencimiento,
          categoria_nombre: p.categorias?.nombre || 'Sin categoría'
        };
      });

      if (filtroActivo === 'stock') procesados.sort((a, b) => b.total - a.total);
      if (filtroActivo === 'vencimiento') {
        procesados.sort((a, b) => new Date(a.vencimientoCercano) - new Date(b.vencimientoCercano));
      }

      setProductos(procesados);
    } catch (e) { 
      console.error("Error cargando productos:", e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const eliminarProducto = (producto) => {
    Alert.alert(
      'ELIMINAR PRODUCTO',
      `¿Deseas eliminar definitivamente "${producto.nombre.toUpperCase()}"?\n\nEsta acción borrará todos sus lotes y registros asociados.`,
      [
        { text: 'CANCELAR', style: 'cancel' },
        { 
          text: 'ELIMINAR', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase.from('productos').delete().eq('id', producto.id);
              if (error) throw error;
              Alert.alert('Éxito', 'Producto eliminado');
              cargarProductos();
            } catch (e) {
              Alert.alert('Error', 'No se puede eliminar. Verifique si tiene dependencias activas.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const crearNuevaCategoria = async () => {
    if (!nuevaCatNombre.trim()) return Alert.alert('Atención', 'Escribe el nombre de la categoría');
    try {
      const { error } = await supabase.from('categorias').insert([{ nombre: nuevaCatNombre.trim() }]);
      if (error) throw error;
      setNuevaCatNombre('');
      cargarCategorias();
      Alert.alert('Éxito', 'Categoría creada correctamente');
    } catch (e) { 
      Alert.alert('Error', 'No se pudo crear. Quizás ya existe.'); 
    }
  };

  const handleAction = async () => {
    const qty = parseInt(form.operationValue);
    if (!qty || qty <= 0) return Alert.alert('Error', 'Ingresa una cantidad válida');

    let payload, rpcName;
    if (tipoOperacion === 'sumar' || tipoOperacion === 'nuevo') {
      rpcName = 'registrar_entrada_completa';
      payload = { 
        p_nombre: (tipoOperacion === 'nuevo' ? form.nombre : currentProduct.nombre).trim(), 
        p_categoria_id: form.categoria_id || currentProduct?.categoria_id, 
        p_unidad: (tipoOperacion === 'nuevo' ? form.unidad : currentProduct.unidad) || 'Unid', 
        p_cantidad: qty, 
        p_vencimiento: form.fechaVencimiento || new Date().toISOString().split('T')[0], 
        p_organizacion: form.organizationName || 'General'
      };
    } else {
      rpcName = 'registrar_salida_fifo';
      payload = { 
        p_producto_id: currentProduct.id, 
        p_cantidad_total: qty, 
        p_estudiantes: parseInt(form.numStudents) || 0, 
        p_profesores: parseInt(form.numTeachers) || 0
      };
    }

    try {
      const { error } = await supabase.rpc(rpcName, payload);
      if (error) throw error;
      cerrarTodo();
      cargarProductos();
    } catch (e) { 
      Alert.alert('Error', e.message); 
    }
  };

  const cerrarTodo = () => {
    setModals({ menu: false, selector: false, form: false, cats: false, filtros: false });
    setForm(INITIAL_FORM);
    setTipoOperacion(null);
    setCurrentProduct(null);
    setNuevaCatNombre('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>INVENTARIO</Text>
          <Text style={styles.headerSubtitle}>UNERG - CONTROL DE STOCK</Text>
        </View>

        <Image source={require('../assets/icon.png')} style={styles.logoHeader} />

        <TouchableOpacity style={styles.menuIconButton} onPress={() => setModals({...modals, menu: true})}>
          <MaterialIcons name="menu" size={30} color="#0100D9" />
        </TouchableOpacity>
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar producto..." 
            placeholderTextColor="#999" 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
          <TouchableOpacity style={styles.filterIconButton} onPress={() => setModals({...modals, filtros: true})}>
            <MaterialIcons name="filter-list" size={26} color={filtroCategoria ? "#4CAF50" : "#0100D9"} />
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

      {/* LISTA DE PRODUCTOS */}
      {loading ? <ActivityIndicator color="#0100D9" size="large" style={{ marginTop: 20 }} /> : (
        <FlatList 
          data={productos} 
          keyExtractor={item => item.id.toString()} 
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.productCard} 
              onPress={() => { setCurrentProduct(item); setModals({...modals, selector: true}); }}
              onLongPress={() => eliminarProducto(item)}
              delayLongPress={1000}
            >
              <View style={{flex: 1}}>
                <Text style={styles.productName}>{item.nombre}</Text>
                <Text style={styles.productDetails}>
                  {item.total} {item.unidad} • {item.categoria_nombre}
                </Text>
                {item.vencimientoCercano !== '9999-12-31' && (
                   <Text style={[styles.vencimientoLabel, {color: new Date(item.vencimientoCercano) < new Date() ? '#F44336' : '#666'}]}>
                     Vence: {item.vencimientoCercano}
                   </Text>
                )}
              </View>
              <View style={{alignItems: 'center'}}>
                <MaterialIcons name="chevron-right" size={24} color="#0100D9" />
                <Text style={{fontSize: 7, color: '#DDD'}}>Mantener para borrar</Text>
              </View>
            </TouchableOpacity>
          )} 
          ListEmptyComponent={<Text style={styles.emptyText}>No hay productos registrados</Text>}
        />
      )}

      {/* MODAL: FILTROS */}
      <Modal visible={modals.filtros} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>ORDENAR Y FILTRAR</Text>
            {[
              {id: 'alfabetico', l: 'A - Z', i: 'sort-by-alpha'}, 
              {id: 'stock', l: 'Mayor Stock', i: 'trending-up'}, 
              {id: 'vencimiento', l: 'Próximos a Vencer', i: 'event-busy'}
            ].map(op => (
              <TouchableOpacity 
                key={op.id} 
                style={[styles.filterRow, filtroActivo === op.id && styles.filterRowActive]} 
                onPress={() => setFiltroActivo(op.id)}
              >
                <MaterialIcons name={op.i} size={22} color={filtroActivo === op.id ? "#fff" : "#0100D9"} />
                <Text style={[styles.filterRowText, filtroActivo === op.id && {color: '#fff'}]}>{op.l}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>FILTRAR POR CATEGORÍA</Text>
            <TouchableOpacity style={styles.formInput} onPress={() => setModals({...modals, filtros: false, cats: true})}>
              <Text style={{color: filtroCategoria ? '#000' : '#999'}}>
                {filtroCategoria ? filtroCategoria.nombre : "Todas las categorías"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mainSubmitBtn, {backgroundColor: '#0100D9'}]} onPress={() => setModals({...modals, filtros: false})}>
              <Text style={styles.mainSubmitBtnText}>APLICAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setFiltroCategoria(null); setFiltroActivo('alfabetico'); setModals({...modals, filtros: false}); }}>
              <Text style={[styles.backLink, {color: '#F44336'}]}>LIMPIAR TODO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: SELECTOR ACCION */}
      <Modal visible={modals.selector} transparent animationType="fade">
        <View style={styles.overlay}><View style={styles.modalContent}>
          <Text style={[styles.modalHeaderTitle, {color: '#0100D9'}]}>{currentProduct?.nombre.toUpperCase()}</Text>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#0100D9'}]} onPress={() => { setTipoOperacion('sumar'); setModals({...modals, selector: false, form: true}); }}><Text style={styles.actionBtnText}>REGISTRAR ENTRADA</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#333'}]} onPress={() => { setTipoOperacion('restar'); setModals({...modals, selector: false, form: true}); }}><Text style={styles.actionBtnText}>REGISTRAR SALIDA</Text></TouchableOpacity>
          <TouchableOpacity onPress={cerrarTodo}><Text style={styles.backLink}>CANCELAR</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* MODAL: FORMULARIO */}
      <Modal visible={modals.form} transparent animationType="slide">
        <View style={styles.overlay}><ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={[styles.modalHeaderTitle, {color: tipoOperacion === 'restar' ? '#333' : '#0100D9'}]}>
            {tipoOperacion === 'nuevo' ? 'NUEVO PRODUCTO' : (tipoOperacion === 'sumar' ? 'ENTRADA DE STOCK' : 'SALIDA DE STOCK')}
          </Text>
          <View style={styles.formGroup}>
            {tipoOperacion === 'nuevo' && (
              <>
                <Text style={styles.fieldLabel}>NOMBRE DEL PRODUCTO</Text>
                <TextInput style={styles.formInput} value={form.nombre} onChangeText={v => setForm({...form, nombre: v})} />
                <Text style={styles.fieldLabel}>CATEGORÍA</Text>
                <TouchableOpacity style={styles.formInput} onPress={() => setModals({...modals, cats: true})}>
                  <Text style={{color: form.categoria_id ? '#000' : '#999'}}>{form.categoria_nombre || "Seleccionar..."}</Text>
                </TouchableOpacity>
                <Text style={styles.fieldLabel}>UNIDAD DE MEDIDA</Text>
                <TextInput style={styles.formInput} value={form.unidad} onChangeText={v => setForm({...form, unidad: v})} placeholder="Kg, Unid, Lts..." />
              </>
            )}
            <Text style={styles.fieldLabel}>CANTIDAD</Text>
            <TextInput style={styles.formInput} keyboardType="numeric" value={form.operationValue} onChangeText={v => setForm({...form, operationValue: v})} placeholder="0" />
            
            {tipoOperacion === 'restar' ? (
              <>
                <Text style={[styles.fieldLabel, {marginTop: 10}]}>BENEFICIARIOS</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ width: '48%' }}><TextInput style={styles.formInput} keyboardType="numeric" value={form.numStudents} onChangeText={v => setForm({...form, numStudents: v})} placeholder="Estud." /></View>
                  <View style={{ width: '48%' }}><TextInput style={styles.formInput} keyboardType="numeric" value={form.numTeachers} onChangeText={v => setForm({...form, numTeachers: v})} placeholder="Prof." /></View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>PROVEEDOR / ORIGEN</Text>
                <TextInput style={styles.formInput} value={form.organizationName} onChangeText={v => setForm({...form, organizationName: v})} placeholder="Ej: Almacén" />
                <Text style={styles.fieldLabel}>VENCIMIENTO (AAAA-MM-DD)</Text>
                <TextInput style={styles.formInput} value={form.fechaVencimiento} onChangeText={v => setForm({...form, fechaVencimiento: v})} placeholder="2026-05-20" />
              </>
            )}
          </View>
          <TouchableOpacity style={[styles.mainSubmitBtn, {backgroundColor: tipoOperacion === 'restar' ? '#333' : '#0100D9'}]} onPress={handleAction}>
            <Text style={styles.mainSubmitBtnText}>CONFIRMAR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModals({...modals, form: false})}><Text style={styles.backLink}>VOLVER</Text></TouchableOpacity>
        </ScrollView></View>
      </Modal>

      {/* MODAL: CATEGORIAS */}
      <Modal visible={modals.cats} transparent animationType="fade">
        <View style={styles.overlay}><View style={styles.modalContent}>
          <Text style={styles.modalHeaderTitle}>CATEGORÍAS</Text>
          {tipoOperacion === 'nuevo' && (
            <View>
              <Text style={styles.fieldLabel}>NUEVA CATEGORÍA</Text>
              <TextInput style={styles.formInput} placeholder="Nombre..." value={nuevaCatNombre} onChangeText={setNuevaCatNombre} />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0100D9', marginBottom: 20 }]} onPress={crearNuevaCategoria}>
                <Text style={styles.actionBtnText}>CREAR CATEGORÍA</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
            </View>
          )}
          <ScrollView style={{ maxHeight: 250 }}>
            {categorias.map(cat => (
              <TouchableOpacity key={cat.id} style={styles.catItem} onPress={() => {
                if (tipoOperacion === 'nuevo') {
                  setForm({...form, categoria_id: cat.id, categoria_nombre: cat.nombre});
                  setModals({...modals, cats: false});
                } else {
                  setFiltroCategoria(cat);
                  setModals({...modals, cats: false, filtros: true});
                }
              }}>
                <Text style={{ fontWeight: '700', color: '#444' }}>{cat.nombre.toUpperCase()}</Text>
                <MaterialIcons 
                  name={(filtroCategoria?.id === cat.id || form.categoria_id === cat.id) ? "radio-button-on" : "radio-button-off"} 
                  size={20} color="#0100D9" 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setModals({...modals, cats: false, filtros: tipoOperacion !== 'nuevo'})}>
            <Text style={styles.backLink}>VOLVER</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>

      {/* MENU FLOTANTE */}
      <Modal visible={modals.menu} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={cerrarTodo}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setTipoOperacion('nuevo'); setModals({...modals, menu: false, form: true}); }}>
              <MaterialIcons name="add-box" size={22} color="#0100D9" />
              <Text style={styles.dropdownText}>Nuevo Producto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownOption} onPress={() => { cerrarTodo(); navigation.navigate('Reporte'); }}>
              <MaterialIcons name="assessment" size={22} color="#0100D9" />
              <Text style={styles.dropdownText}>Reportes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownOption} onPress={() => { cerrarTodo(); navigation.navigate('Menus'); }}>
              <MaterialIcons name="restaurant-menu" size={22} color="#0100D9" />
              <Text style={styles.dropdownText}>Menú Diario</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <TouchableOpacity style={styles.dropdownOption} onPress={() => supabase.auth.signOut()}>
              <MaterialIcons name="logout" size={22} color="#F44336" />
              <Text style={[styles.dropdownText, { color: '#F44336' }]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 95, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF' },
  logoHeader: { width: 85, height: 85, resizeMode: 'contain' },
  headerTitle: { color: '#0100D9', fontSize: 22, fontWeight: '900' },
  headerSubtitle: { color: '#666', fontSize: 10, fontWeight: '600' },
  menuIconButton: { padding: 5 },
  searchSection: { paddingHorizontal: 20, paddingVertical: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#F5F6F8', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  filterIconButton: { marginLeft: 10, padding: 10, borderRadius: 10, backgroundColor: '#F0F2FF' },
  activeFilterTag: { flexDirection: 'row', backgroundColor: '#4CAF50', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10, alignItems: 'center' },
  tagText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginRight: 8 },
  productCard: { paddingVertical: 18, paddingHorizontal: 25, borderBottomWidth: 1, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' },
  productName: { fontSize: 16, fontWeight: '700', color: '#0100D9' },
  productDetails: { color: '#777', fontSize: 13 },
  vencimientoLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 25 },
  modalHeaderTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  fieldLabel: { color: '#0100D9', fontWeight: '800', fontSize: 10, marginBottom: 6, letterSpacing: 1 },
  formInput: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, marginVertical: 5, borderWidth: 1, borderColor: '#EEE' },
  filterRowActive: { backgroundColor: '#0100D9', borderColor: '#0100D9' },
  filterRowText: { marginLeft: 12, fontWeight: '700', color: '#444' },
  actionBtn: { padding: 15, borderRadius: 8, marginVertical: 6, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '800' },
  mainSubmitBtn: { padding: 16, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  mainSubmitBtnText: { color: '#fff', fontWeight: '800' },
  backLink: { color: '#999', textAlign: 'center', marginTop: 15, fontWeight: '700' },
  catItem: { paddingVertical: 15, borderBottomWidth: 1, borderColor: '#F5F5F5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownMenu: { position: 'absolute', top: 70, right: 20, backgroundColor: '#fff', padding: 10, borderRadius: 10, minWidth: 180, elevation: 5 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  dropdownText: { marginLeft: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontWeight: '600' }
});