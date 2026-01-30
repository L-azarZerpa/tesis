import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, Image, Alert, ScrollView 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';
import * as ImagePicker from 'expo-image-picker'; 
import { decode } from 'base64-arraybuffer'; 

export default function MenusScreen({ navigation }) {
  const [platos, setPlatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productosDB, setProductosDB] = useState([]); 
  
  const [busquedaPlato, setBusquedaPlato] = useState('');
  const [queryReal, setQueryReal] = useState('');

  const [menuModal, setMenuModal] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [planificacionVisible, setPlanificacionVisible] = useState(false); 
  const [selectorVisible, setSelectorVisible] = useState(false);

  const [nombrePlato, setNombrePlato] = useState('');
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');

  // NUEVOS ESTADOS PARA FOTOS
  const [imagen, setImagen] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [agendaSemanal, setAgendaSemanal] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const [platoSeleccionado, setPlatoSeleccionado] = useState(null);
  const [ingredientesDetalle, setIngredientesDetalle] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => { setQueryReal(busquedaPlato); }, 500);
    return () => clearTimeout(delay);
  }, [busquedaPlato]);

  useEffect(() => {
    cargarPlatos();
    cargarProductos();
    cargarAgenda();
  }, [queryReal]);

  const cargarPlatos = async () => {
    setLoading(true);
    let query = supabase.from('platos').select('*').order('nombre');
    if (queryReal) query = query.ilike('nombre', `%${queryReal}%`);
    const { data } = await query;
    if (data) setPlatos(data);
    setLoading(false);
  };

  const cargarProductos = async () => {
    const { data } = await supabase.from('productos').select('id, nombre, unidad');
    if (data) setProductosDB(data);
  };

  // --- LÓGICA DE FOTOS ---
  const seleccionarImagen = async (modo) => {
    const opciones = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    };

    let result;
    if (modo === 'camara') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return Alert.alert("Error", "Permisos de cámara necesarios");
      result = await ImagePicker.launchCameraAsync(opciones);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(opciones);
    }

    if (!result.canceled) {
      setImagen(result.assets[0]);
    }
  };

  const subirFotoASupabase = async (platoId) => {
    try {
      const fileExt = imagen.uri.split('.').pop();
      const fileName = `${platoId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('platos_fotos')
        .upload(filePath, decode(imagen.base64), {
          contentType: `image/${fileExt}`,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('platos_fotos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      console.error("Error subiendo foto:", e);
      return null;
    }
  };

  const cargarAgenda = async () => {
    try {
      const hoy = new Date();
      const lunesActual = new Date(hoy.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1)));
      const fechaLunesISO = lunesActual.toISOString().split('T')[0];

      await supabase.from('planificacion_semanal').delete().lt('fecha_menu', fechaLunesISO);

      const { data, error } = await supabase
        .from('planificacion_semanal')
        .select(`id, fecha_menu, turno, platos(id, nombre)`)
        .order('fecha_menu', { ascending: true });
      
      if (error) throw error;
      if (data) setAgendaSemanal(data);
    } catch (e) {
      console.error("Error en agenda:", e.message);
    }
  };

  const obtenerDiasLaborales = () => {
    const hoy = new Date();
    const lunes = new Date(hoy.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1)));
    const dias = [];
    const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    for (let i = 0; i < 5; i++) {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + i);
      const fechaISO = fecha.toISOString().split('T')[0];
      const plan = agendaSemanal.find(a => a.fecha_menu === fechaISO);
      dias.push({
        nombre: nombres[i],
        fecha: fechaISO,
        platoNombre: plan ? plan.platos.nombre : 'Sin asignar',
        platoId: plan ? plan.platos.id : null
      });
    }
    return dias;
  };

  const asignarPlatoADia = async (plato) => {
    try {
      const { error } = await supabase
        .from('planificacion_semanal')
        .upsert({ 
          fecha_menu: diaSeleccionado.fecha, 
          plato_id: plato.id, 
          turno: 'Almuerzo' 
        }, { onConflict: 'fecha_menu, turno' });

      if (error) throw error;
      cargarAgenda();
      setSelectorVisible(false);
      Alert.alert("Éxito", `Menú actualizado`);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const verDetallePlato = async (plato) => {
    setPlatoSeleccionado(plato);
    setDetalleVisible(true);
    setLoadingDetalle(true);
    try {
      const { data, error } = await supabase
        .from('platos_ingredientes')
        .select(`cantidad_sugerida, productos (nombre, unidad)`)
        .eq('plato_id', plato.id);
      if (error) throw error;
      setIngredientesDetalle(data || []);
    } catch (e) { Alert.alert("Error", "No se cargaron ingredientes."); }
    finally { setLoadingDetalle(false); }
  };

  const guardarPlatoCompleto = async () => {
    if (!nombrePlato.trim() || ingredientesSeleccionados.length === 0) {
      return Alert.alert("Error", "Faltan datos.");
    }
    try {
      setSubiendoFoto(true);

      // 1. Insertar Plato
      const { data: nuevoPlato, error: errorPlato } = await supabase
        .from('platos')
        .insert([{ nombre: nombrePlato.trim() }]).select().single();
      if (errorPlato) throw errorPlato;

      // 2. Subir Imagen si existe
      if (imagen) {
        const urlFinal = await subirFotoASupabase(nuevoPlato.id);
        if (urlFinal) {
          await supabase.from('platos').update({ foto_url: urlFinal }).eq('id', nuevoPlato.id);
        }
      }

      // 3. Insertar Ingredientes
      const ingredientesData = ingredientesSeleccionados.map(ing => ({
        plato_id: nuevoPlato.id,
        producto_id: ing.id,
        cantidad_sugerida: parseFloat(ing.cantidad_sugerida) || 0
      }));

      await supabase.from('platos_ingredientes').insert(ingredientesData);
      
      Alert.alert("Éxito", "Plato registrado correctamente");
      resetForm();
      cargarPlatos();
    } catch (e) { Alert.alert("Error", e.message); }
    finally { setSubiendoFoto(false); }
  };

  const resetForm = () => {
    setNombrePlato('');
    setIngredientesSeleccionados([]);
    setImagen(null);
    setFormVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={28} color="#0100D9" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>MENÚS</Text>
          <Text style={styles.headerSubtitle}>UNERG - PLANIFICACIÓN</Text>
        </View>
        <Image source={require('../assets/icon.png')} style={styles.logoHeaderLarge} />
        <TouchableOpacity onPress={() => setMenuModal(true)} style={styles.menuButton}>
          <MaterialIcons name="menu" size={32} color="#0100D9" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
         <Text style={styles.fieldLabel}>PRÓXIMOS MENÚS (ESTA SEMANA):</Text>
         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {agendaSemanal.length === 0 ? <Text style={{fontSize:12, color:'#AAA'}}>No hay menús.</Text> : 
              agendaSemanal.map((item) => (
              <View key={item.id} style={styles.agendaTag}>
                <Text style={styles.agendaTagDate}>{item.fecha_menu.split('-').reverse().slice(0,2).join('/')}</Text>
                <Text style={styles.agendaTagName}>{item.platos?.nombre.substring(0,12)}</Text>
              </View>
            ))}
         </ScrollView>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput 
            style={styles.searchInputMenus} 
            placeholder="Buscar plato o menú..." 
            value={busquedaPlato}
            onChangeText={setBusquedaPlato}
          />
        </View>
      </View>

      {loading && !subiendoFoto ? (
        <ActivityIndicator color="#0100D9" size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={platos}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.productCard} onPress={() => verDetallePlato(item)}>
              <View style={styles.iconCircle}>
                {item.foto_url ? (
                  <Image source={{ uri: item.foto_url }} style={{width: 40, height: 40, borderRadius: 10}} />
                ) : (
                  <MaterialIcons name="restaurant" size={22} color="#0100D9" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.productName}>{item.nombre.toUpperCase()}</Text>
                <Text style={styles.productDetails}>Toca para ver ingredientes</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#0100D9" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* MODAL PLANIFICADOR */}
      <Modal visible={planificacionVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>PLANIFICAR SEMANA</Text>
            <TouchableOpacity onPress={() => setPlanificacionVisible(false)}><MaterialIcons name="close" size={28} color="#666" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {obtenerDiasLaborales().map((dia, index) => (
              <TouchableOpacity key={index} style={styles.dayCard} onPress={() => { setDiaSeleccionado(dia); setSelectorVisible(true); }}>
                <View style={{ width: 70 }}>
                  <Text style={styles.dayName}>{dia.nombre}</Text>
                  <Text style={styles.dayDate}>{dia.fecha.split('-').reverse().slice(0,2).join('/')}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 15 }}>
                  <Text style={[styles.dayPlato, { color: dia.platoId ? '#0100D9' : '#AAA' }]}>{dia.platoNombre.toUpperCase()}</Text>
                </View>
                <MaterialIcons name="edit" size={20} color="#0100D9" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL SELECTOR */}
      <Modal visible={selectorVisible} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.selectorModal}>
            <Text style={styles.modalHeaderTitle}>SELECCIONAR PLATO</Text>
            <FlatList
              data={platos}
              keyExtractor={item => item.id.toString()}
              style={{ maxHeight: 350, marginTop: 15 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => asignarPlatoADia(item)}>
                  <Text style={{ fontWeight: '700' }}>{item.nombre.toUpperCase()}</Text>
                  <MaterialIcons name="add-circle" size={24} color="#0100D9" />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.mainSubmitBtnClose} onPress={() => setSelectorVisible(false)}>
              <Text style={styles.mainSubmitBtnText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL FORMULARIO CON FOTO */}
      <Modal visible={formVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>NUEVA RECETA</Text>
            <TouchableOpacity onPress={resetForm}><MaterialIcons name="close" size={28} color="#666" /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            
            <Text style={styles.fieldLabel}>FOTO DEL PLATO</Text>
            <View style={styles.fotoContainer}>
              {imagen ? (
                <Image source={{ uri: imagen.uri }} style={styles.fotoPreview} />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <MaterialIcons name="image" size={40} color="#CCC" />
                </View>
              )}
              <View style={styles.fotoButtons}>
                <TouchableOpacity style={styles.btnFoto} onPress={() => seleccionarImagen('camara')}>
                  <MaterialIcons name="photo-camera" size={20} color="#FFF" />
                  <Text style={styles.btnFotoText}>Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnFoto, {backgroundColor: '#666'}]} onPress={() => seleccionarImagen('galeria')}>
                  <MaterialIcons name="photo-library" size={20} color="#FFF" />
                  <Text style={styles.btnFotoText}>Galería</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.fieldLabel}>NOMBRE DEL PLATO</Text>
            <TextInput style={styles.formInput} value={nombrePlato} onChangeText={setNombrePlato} placeholder="Ej: Arroz con Pollo..." />
            
            <Text style={styles.fieldLabel}>BUSCAR INGREDIENTES</Text>
            <TextInput style={styles.formInput} placeholder="Buscar en inventario..." value={busquedaProd} onChangeText={setBusquedaProd} />

            {busquedaProd.length > 0 && (
              <View style={styles.suggestions}>
                {productosDB.filter(p => p.nombre.toLowerCase().includes(busquedaProd.toLowerCase())).map(p => (
                  <TouchableOpacity key={p.id} style={styles.suggestionItem} onPress={() => {
                    if (!ingredientesSeleccionados.find(i => i.id === p.id)) {
                      setIngredientesSeleccionados([...ingredientesSeleccionados, { ...p, cantidad_sugerida: '' }]);
                    }
                    setBusquedaProd('');
                  }}>
                    <Text style={{fontWeight: '600'}}>{p.nombre} ({p.unidad})</Text>
                    <MaterialIcons name="add" size={24} color="#0100D9" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>INGREDIENTES SELECCIONADOS</Text>
            {ingredientesSeleccionados.map(ing => (
              <View key={ing.id} style={styles.ingredienteRow}>
                <Text style={{ flex: 1, fontWeight: '700' }}>{ing.nombre}</Text>
                <TextInput style={styles.cantInput} keyboardType="numeric" placeholder="Cant." onChangeText={(v) => {
                    setIngredientesSeleccionados(ingredientesSeleccionados.map(i => i.id === ing.id ? { ...i, cantidad_sugerida: v } : i));
                  }} />
                <TouchableOpacity onPress={() => setIngredientesSeleccionados(ingredientesSeleccionados.filter(i => i.id !== ing.id))}>
                  <MaterialIcons name="delete" size={22} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.mainSubmitBtn} onPress={guardarPlatoCompleto} disabled={subiendoFoto}>
              {subiendoFoto ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainSubmitBtnText}>GUARDAR PLATO Y RECETA</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL DETALLE */}
      <Modal visible={detalleVisible} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{platoSeleccionado?.nombre.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setDetalleVisible(false)}><MaterialIcons name="close" size={28} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {ingredientesDetalle.map((item, index) => (
                <View key={index} style={styles.detailRow}>
                  <Text style={styles.detailIngName}>• {item.productos.nombre}</Text>
                  <Text style={styles.detailIngCant}>{item.cantidad_sugerida} {item.productos.unidad}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL MENÚ LATERAL */}
      <Modal visible={menuModal} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuModal(false)}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setMenuModal(false); setFormVisible(true); }}>
              <MaterialIcons name="add-box" size={22} color="#0100D9" />
              <Text style={styles.dropdownText}>Crear Nuevo Plato</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setMenuModal(false); setPlanificacionVisible(true); }}>
              <MaterialIcons name="event-available" size={22} color="#0100D9" />
              <Text style={styles.dropdownText}>Planificar Semana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setMenuModal(false); navigation.navigate('Inventario'); }}>
              <MaterialIcons name="inventory" size={22} color="#0100D9" />
              <Text style={styles.dropdownText}>Ir al Inventario</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 100, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerCenter: { flex: 1, marginLeft: 10 },
  logoHeaderLarge: { width: 80, height: 80, resizeMode: 'contain', marginRight: 5 },
  headerTitle: { color: '#0100D9', fontSize: 20, fontWeight: '900' },
  headerSubtitle: { color: '#666', fontSize: 10, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6F8', paddingHorizontal: 15, borderRadius: 12, height: 45, borderWidth: 1, borderColor: '#EEE' },
  searchInputMenus: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#333' },
  productCard: { paddingVertical: 18, paddingHorizontal: 25, borderBottomWidth: 1, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0F2FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productName: { fontSize: 14, fontWeight: '700', color: '#0100D9' },
  productDetails: { color: '#777', fontSize: 11, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  dayCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  dayName: { fontWeight: '900', color: '#333' },
  dayPlato: { fontWeight: '800', fontSize: 14 },
  selectorModal: { width: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  detailModal: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  detailTitle: { fontSize: 16, fontWeight: '900', color: '#0100D9' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  mainSubmitBtn: { backgroundColor: '#0100D9', padding: 18, borderRadius: 10, marginTop: 20, alignItems: 'center', marginBottom: 50 },
  mainSubmitBtnClose: { backgroundColor: '#0100D9', padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  mainSubmitBtnText: { color: '#FFF', fontWeight: '900' },
  dropdownMenu: { position: 'absolute', top: 85, right: 20, backgroundColor: '#fff', padding: 10, borderRadius: 10, minWidth: 200, elevation: 5 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10 },
  dropdownText: { marginLeft: 12, fontWeight: '700', color: '#333' },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#EEE' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#0100D9' },
  fieldLabel: { color: '#0100D9', fontWeight: '800', fontSize: 10, marginBottom: 6, marginTop: 10 },
  formInput: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  suggestions: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#0100D9', borderRadius: 8, marginTop: -15, marginBottom: 15, maxHeight: 180 },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ingredienteRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2FF', padding: 10, borderRadius: 8, marginBottom: 8 },
  cantInput: { backgroundColor: '#FFF', width: 60, padding: 5, borderRadius: 5, textAlign: 'center', marginRight: 5, borderWidth: 1, borderColor: '#DDD' },
  agendaTag: { backgroundColor: '#F0F2FF', padding: 10, borderRadius: 10, marginRight: 10, width: 130 },
  agendaTagDate: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  agendaTagName: { fontSize: 12, fontWeight: 'bold', color: '#0100D9' },
  fotoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#F9F9F9', padding: 10, borderRadius: 12 },
  fotoPreview: { width: 100, height: 100, borderRadius: 10 },
  fotoPlaceholder: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  fotoButtons: { flex: 1, marginLeft: 15, gap: 10 },
  btnFoto: { backgroundColor: '#0100D9', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnFotoText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 5 }
});