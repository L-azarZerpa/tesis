import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, Image, Alert, ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function MenusScreen({ navigation }) {
  const [platos, setPlatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productosDB, setProductosDB] = useState([]);

  const [tabActiva, setTabActiva] = useState('platos');
  const [busquedaPlato, setBusquedaPlato] = useState('');
  const [queryReal, setQueryReal] = useState('');

  const [menuModal, setMenuModal] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);

  const [opcionesVisible, setOpcionesVisible] = useState(false);
  const [platoParaAccion, setPlatoParaAccion] = useState(null);

  const [nombrePlato, setNombrePlato] = useState('');
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');


  const [agendaSemanal, setAgendaSemanal] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const [platoSeleccionado, setPlatoSeleccionado] = useState(null);
  const [ingredientesDetalle, setIngredientesDetalle] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [editandoId, setEditandoId] = useState(null);

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

  const eliminarPlato = (id) => {
    Alert.alert(
      "ELIMINAR PLATO",
      "¿Estás seguro? Esta acción borrará permanentemente el plato.",
      [
        { text: "CANCELAR", style: "cancel" },
        {
          text: "ELIMINAR",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from('platos').delete().eq('id', id);
            if (!error) {
              cargarPlatos();
              Alert.alert("Éxito", "Plato eliminado.");
            } else {
              Alert.alert("Error", "No se pudo eliminar.");
            }
          }
        }
      ]
    );
  };

  const prepararEdicion = async (plato) => {
    setEditandoId(plato.id);
    setNombrePlato(plato.nombre);

    const { data } = await supabase
      .from('platos_ingredientes')
      .select(`producto_id, cantidad_sugerida, productos(nombre, unidad)`)
      .eq('plato_id', plato.id);

    if (data) {
      const ingCargados = data.map(i => ({
        id: i.producto_id,
        nombre: i.productos.nombre,
        unidad: i.productos.unidad,
        cantidad_sugerida: i.cantidad_sugerida.toString()
      }));
      setIngredientesSeleccionados(ingCargados);
    }
    setFormVisible(true);
  };


  const cargarAgenda = async () => {
    try {
      const hoy = new Date();
      const lunesActual = new Date(hoy.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1)));
      const fechaLunesISO = lunesActual.toISOString().split('T')[0];
      await supabase.from('planificacion_semanal').delete().lt('fecha_menu', fechaLunesISO);
      const { data } = await supabase.from('planificacion_semanal')
        .select(`id, fecha_menu, turno, platos(id, nombre)`)
        .order('fecha_menu', { ascending: true });
      if (data) setAgendaSemanal(data);
    } catch (e) { console.error(e.message); }
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
        platoId: plan ? plan.platos.id : null,
      });
    }
    return dias;
  };

  const asignarPlatoADia = async (plato) => {
    try {
      const { error } = await supabase.from('planificacion_semanal')
        .upsert({ fecha_menu: diaSeleccionado.fecha, plato_id: plato.id, turno: 'Almuerzo' }, { onConflict: 'fecha_menu, turno' });
      if (error) throw error;
      cargarAgenda();
      setSelectorVisible(false);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const verDetallePlato = async (plato) => {
    setPlatoSeleccionado(plato);
    setDetalleVisible(true);
    setLoadingDetalle(true);
    const { data } = await supabase.from('platos_ingredientes').select(`cantidad_sugerida, productos (nombre, unidad)`).eq('plato_id', plato.id);
    setIngredientesDetalle(data || []);
    setLoadingDetalle(false);
  };

  const guardarPlatoCompleto = async () => {
    if (!nombrePlato.trim() || ingredientesSeleccionados.length === 0) return Alert.alert("Error", "Faltan datos.");

    try {
      let platoId = editandoId;
      if (editandoId) {
        await supabase.from('platos').update({ nombre: nombrePlato.trim() }).eq('id', editandoId);
        await supabase.from('platos_ingredientes').delete().eq('plato_id', editandoId);
      } else {
        const { data: nuevoPlato } = await supabase.from('platos').insert([{ nombre: nombrePlato.trim() }]).select().single();
        platoId = nuevoPlato.id;
      }

      const ingredientesData = ingredientesSeleccionados.map(ing => ({
        plato_id: platoId, producto_id: ing.id, cantidad_sugerida: parseFloat(ing.cantidad_sugerida) || 0
      }));
      await supabase.from('platos_ingredientes').insert(ingredientesData);
      resetForm();
      cargarPlatos();
      Alert.alert("Éxito", editandoId ? "Plato actualizado" : "Plato guardado");
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const resetForm = () => {
    setNombrePlato(''); setIngredientesSeleccionados([]); setEditandoId(null); setFormVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. HEADER */}
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

      {/* 2. BUSCADOR */}
      {tabActiva === 'platos' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInputMenus}
              placeholder="Buscar plato..."
              value={busquedaPlato}
              onChangeText={setBusquedaPlato}
            />
          </View>
        </View>
      )}

      {/* 3. TABS */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <TouchableOpacity
            style={[styles.tabButton, tabActiva === 'platos' && styles.tabButtonActive]}
            onPress={() => setTabActiva('platos')}
          >
            <MaterialIcons name="restaurant-menu" size={20} color={tabActiva === 'platos' ? "#FFF" : "#0100D9"} />
            <Text style={[styles.tabButtonText, tabActiva === 'platos' && styles.tabButtonTextActive]}>LISTA DE PLATOS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, tabActiva === 'semanal' && styles.tabButtonActive]}
            onPress={() => setTabActiva('semanal')}
          >
            <MaterialIcons name="date-range" size={20} color={tabActiva === 'semanal' ? "#FFF" : "#0100D9"} />
            <Text style={[styles.tabButtonText, tabActiva === 'semanal' && styles.tabButtonTextActive]}>MENÚ SEMANAL</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. CONTENIDO */}
      {loading ? (
        <ActivityIndicator color="#0100D9" size="large" style={{ marginTop: 50 }} />
      ) : (
        tabActiva === 'platos' ? (
          <FlatList
            data={platos}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productCard}
                onPress={() => verDetallePlato(item)}
                onLongPress={() => {
                  setPlatoParaAccion(item);
                  setOpcionesVisible(true);
                }}
              >
                <View style={styles.iconCircle}>
                  <MaterialIcons name="restaurant" size={22} color="#0100D9" />
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.productName}>{item.nombre.toUpperCase()}</Text>
                  <Text style={styles.productDetails}>Mantén presionado para opciones</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#0100D9" />
              </TouchableOpacity>
            )}
          />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.sectionTitle}>PROGRAMACIÓN DE LA SEMANA</Text>
            {obtenerDiasLaborales().map((dia, index) => (
              <TouchableOpacity key={index} style={styles.dayCardMain} onPress={() => { setDiaSeleccionado(dia); setSelectorVisible(true); }}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayName}>{dia.nombre.substring(0, 3).toUpperCase()}</Text>
                  <Text style={styles.dayDate}>{dia.fecha.split('-').reverse().slice(0, 2).join('/')}</Text>
                </View>
                <View style={styles.agendaImageContainer}>
                  <View style={styles.agendaNoImage}>
                    <MaterialIcons name="restaurant" size={16} color={dia.platoId ? "#0100D9" : "#CCC"} />
                  </View>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 15 }}>
                  <Text style={[styles.dayPlato, { color: dia.platoId ? '#0100D9' : '#AAA' }]} numberOfLines={1}>
                    {dia.platoNombre.toUpperCase()}
                  </Text>
                </View>
                <MaterialIcons name="edit-calendar" size={24} color="#0100D9" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )
      )}

      {/* MODAL ACCIONES PLATOS */}
      <Modal visible={opcionesVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.overlayCenter} activeOpacity={1} onPress={() => setOpcionesVisible(false)}>
          <View style={styles.horizontalOptionsCard}>
            <Text style={styles.optionsTitle}>{platoParaAccion?.nombre.toUpperCase()}</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.optionButton} onPress={() => { setOpcionesVisible(false); prepararEdicion(platoParaAccion); }}>
                <View style={[styles.optionIconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialIcons name="edit" size={28} color="#1976D2" />
                </View>
                <Text style={styles.optionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionButton} onPress={() => { setOpcionesVisible(false); eliminarPlato(platoParaAccion.id); }}>
                <View style={[styles.optionIconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <MaterialIcons name="delete-forever" size={28} color="#D32F2F" />
                </View>
                <Text style={styles.optionText}>Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionButton} onPress={() => setOpcionesVisible(false)}>
                <View style={[styles.optionIconCircle, { backgroundColor: '#F5F5F5' }]}>
                  <MaterialIcons name="close" size={28} color="#666" />
                </View>
                <Text style={styles.optionText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL SELECTOR AGENDA */}
      <Modal visible={selectorVisible} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.selectorModal}>
            <Text style={styles.modalHeaderTitle}>ASIGNAR A {diaSeleccionado?.nombre.toUpperCase()}</Text>
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

      {/* MODAL MENÚ PRINCIPAL (ACTUALIZADO CON INVENTARIO) */}
      <Modal visible={menuModal} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuModal(false)}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setMenuModal(false); resetForm(); setFormVisible(true); }}>
              <MaterialIcons name="add-box" size={22} color="#0100D9" />
              <Text style={styles.dropdownText}>Crear Nuevo Plato</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#EEE', marginVertical: 5 }} />

            <TouchableOpacity style={styles.dropdownOption} onPress={() => {
              setMenuModal(false);
              Alert.alert("Cerrar Sesión", "¿Seguro que quieres salir?", [
                { text: "No", style: "cancel" },
                { text: "Sí, salir", style: "destructive", onPress: () => supabase.auth.signOut() }
              ]);
            }}>
              <MaterialIcons name="logout" size={22} color="#F44336" />
              <Text style={[styles.dropdownText, { color: '#F44336' }]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DETALLE */}
      <Modal visible={detalleVisible} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.detailModal}>
            <TouchableOpacity style={styles.closeDetailTop} onPress={() => setDetalleVisible(false)}>
              <MaterialIcons name="cancel" size={32} color="#0100D9" />
            </TouchableOpacity>
            <View style={styles.detailImageContainer}>
              <View style={[styles.detailImage, styles.noImagePlaceholder]}>
                <MaterialIcons name="restaurant" size={50} color="#0100D9" />
                <Text style={{ color: '#0100D9', fontSize: 10, fontWeight: 'bold' }}>SIN FOTO</Text>
              </View>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>{platoSeleccionado?.nombre.toUpperCase()}</Text>
              <View style={styles.divider} />
              <Text style={styles.ingTitle}>INGREDIENTES REQUERIDOS:</Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {loadingDetalle ? (
                  <ActivityIndicator color="#0100D9" style={{ marginTop: 10 }} />
                ) : (
                  ingredientesDetalle.map((item, index) => (
                    <View key={index} style={styles.detailRow}>
                      <Text style={styles.detailIngName}>• {item.productos.nombre}</Text>
                      <Text style={styles.detailIngCant}>{item.cantidad_sugerida} {item.productos.unidad}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL FORMULARIO */}
      <Modal visible={formVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{editandoId ? 'EDITAR PLATO' : 'NUEVO PLATO'}</Text>
            <TouchableOpacity onPress={resetForm}><MaterialIcons name="close" size={28} color="#666" /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.fieldLabel}>NOMBRE DEL PLATO</Text>
            <TextInput style={styles.formInput} value={nombrePlato} onChangeText={setNombrePlato} placeholder="Ej: Arroz con Pollo..." />
            <Text style={styles.fieldLabel}>AÑADIR INGREDIENTES</Text>
            <TextInput style={styles.formInput} placeholder="Buscar en inventario..." value={busquedaProd} onChangeText={setBusquedaProd} />
            {busquedaProd.length > 0 && (
              <View style={styles.suggestions}>
                {productosDB.filter(p => p.nombre.toLowerCase().includes(busquedaProd.toLowerCase())).map(p => (
                  <TouchableOpacity key={p.id} style={styles.suggestionItem} onPress={() => {
                    if (!ingredientesSeleccionados.find(i => i.id === p.id)) { setIngredientesSeleccionados([...ingredientesSeleccionados, { ...p, cantidad_sugerida: '' }]); }
                    setBusquedaProd('');
                  }}>
                    <Text style={{ fontWeight: '600' }}>{p.nombre} ({p.unidad})</Text>
                    <MaterialIcons name="add" size={24} color="#0100D9" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {ingredientesSeleccionados.map(ing => (
              <View key={ing.id} style={styles.ingredienteRow}>
                <Text style={{ flex: 1, fontWeight: '700' }}>{ing.nombre}</Text>
                <TextInput
                  style={styles.cantInput}
                  keyboardType="numeric"
                  placeholder="Cant."
                  value={ing.cantidad_sugerida}
                  onChangeText={(v) => setIngredientesSeleccionados(ingredientesSeleccionados.map(i => i.id === ing.id ? { ...i, cantidad_sugerida: v } : i))}
                />
                <TouchableOpacity onPress={() => setIngredientesSeleccionados(ingredientesSeleccionados.filter(i => i.id !== ing.id))}><MaterialIcons name="delete" size={22} color="#F44336" /></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.mainSubmitBtn} onPress={guardarPlatoCompleto}>
              <Text style={styles.mainSubmitBtnText}>{editandoId ? 'GUARDAR CAMBIOS' : 'CREAR PLATO COMPLETO'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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
  searchContainer: { paddingHorizontal: 20, marginTop: 15 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6F8', paddingHorizontal: 15, borderRadius: 12, height: 50, borderWidth: 1, borderColor: '#EEE' },
  searchInputMenus: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#333' },
  tabContainer: { marginVertical: 15 },
  tabButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2FF',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10,
    borderWidth: 1, borderColor: '#D0D5FF'
  },
  tabButtonActive: { backgroundColor: '#0100D9', borderColor: '#0100D9' },
  tabButtonText: { marginLeft: 8, fontWeight: '800', fontSize: 12, color: '#0100D9' },
  tabButtonTextActive: { color: '#FFF' },
  productCard: { paddingVertical: 18, paddingHorizontal: 25, borderBottomWidth: 1, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0F2FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productName: { fontSize: 14, fontWeight: '700', color: '#0100D9' },
  productDetails: { color: '#777', fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0100D9', marginBottom: 15, letterSpacing: 1 },
  dayCardMain: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  dayBadge: { backgroundColor: '#0100D9', padding: 8, borderRadius: 10, width: 60, alignItems: 'center' },
  dayName: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  dayDate: { color: '#FFF', fontSize: 10, opacity: 0.8 },
  dayPlato: { fontWeight: '800', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  selectorModal: { width: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  agendaImageContainer: { width: 45, height: 45, borderRadius: 8, backgroundColor: '#FFF', marginLeft: 12, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  agendaThumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  agendaNoImage: { justifyContent: 'center', alignItems: 'center' },
  detailModal: { width: '85%', backgroundColor: '#FFF', borderRadius: 25, overflow: 'hidden' },
  closeDetailTop: { position: 'absolute', top: 10, right: 10, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  detailImageContainer: { width: '100%', height: 200, backgroundColor: '#F0F2FF' },
  detailImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  detailContent: { padding: 20 },
  detailTitle: { fontSize: 20, fontWeight: '900', color: '#0100D9', textAlign: 'center' },
  divider: { height: 2, backgroundColor: '#F0F2FF', marginVertical: 15, width: '50%', alignSelf: 'center' },
  ingTitle: { fontSize: 11, fontWeight: '900', color: '#666', marginBottom: 10, letterSpacing: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  detailIngName: { fontWeight: '700', color: '#444', fontSize: 14 },
  detailIngCant: { fontWeight: '800', color: '#0100D9', fontSize: 14 },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#EEE' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#0100D9' },
  fieldLabel: { color: '#0100D9', fontWeight: '800', fontSize: 10, marginBottom: 6, marginTop: 10 },
  formInput: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  suggestions: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#0100D9', borderRadius: 8, marginTop: -15, marginBottom: 15, maxHeight: 180 },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ingredienteRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2FF', padding: 10, borderRadius: 8, marginBottom: 8 },
  cantInput: { backgroundColor: '#FFF', width: 60, padding: 5, borderRadius: 5, textAlign: 'center', marginRight: 5, borderWidth: 1, borderColor: '#DDD' },
  fotoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#F9F9F9', padding: 10, borderRadius: 12 },
  fotoPreview: { width: 100, height: 100, borderRadius: 10 },
  fotoPlaceholder: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  fotoButtons: { flex: 1, marginLeft: 15, gap: 10 },
  btnFoto: { backgroundColor: '#0100D9', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnFotoText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  mainSubmitBtn: { backgroundColor: '#0100D9', padding: 18, borderRadius: 10, marginTop: 20, alignItems: 'center', marginBottom: 50 },
  mainSubmitBtnClose: { backgroundColor: '#0100D9', padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  mainSubmitBtnText: { color: '#FFF', fontWeight: '900' },
  dropdownMenu: { position: 'absolute', top: 85, right: 20, backgroundColor: '#fff', padding: 10, borderRadius: 10, minWidth: 200, elevation: 5 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10 },
  dropdownText: { marginLeft: 12, fontWeight: '700', color: '#333' },
  horizontalOptionsCard: { width: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
  optionsTitle: { fontSize: 16, fontWeight: '900', color: '#0100D9', marginBottom: 20, textAlign: 'center' },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  optionButton: { alignItems: 'center', width: 80 },
  optionIconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  optionText: { fontSize: 12, fontWeight: '700', color: '#444' },
});