import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, SafeAreaView, StatusBar,
  FlatList, Modal, TextInput, ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

const INITIAL_FORM = {
  cantidad: '',
  organizationName: '',
  fechaVencimiento: '',
  numStudents: '',
  numTeachers: ''
};

export default function EmpleadoSolicitarAjusteScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [accessStatus, setAccessStatus] = useState(null); // 'pendiente', 'aprobado', 'rechazado', or null

  // --- ESTADOS PARA VISTA INVENTARIO ---
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProd, setLoadingProd] = useState(false);

  const [filtroActivo, setFiltroActivo] = useState('alfabetico');
  const [filtroCategoria, setFiltroCategoria] = useState(null);

  // Modales y Formularios
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [catsModalVisible, setCatsModalVisible] = useState(false);

  const [actionType, setActionType] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  // --- ESTADOS PARA SALIDA POR PLATO ---
  const [platos, setPlatos] = useState([]);
  const [platoSeleccionado, setPlatoSeleccionado] = useState(null);
  const [salidaPlatoForm, setSalidaPlatoForm] = useState({ numStudents: '', numTeachers: '' });
  const [salidaPlatoVisible, setSalidaPlatoVisible] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [provsModalVisible, setProvsModalVisible] = useState(false);

  // --- REFRESH CONTROL ---
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      cargarCategorias(),
      cargarProductos(),
      cargarPlatos(),
      cargarProveedores()
    ]);
    setRefreshing(false);
  };

  // 1. SETUP INICIAL + REALTIME
  useEffect(() => {
    let channel;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carga inicial
      checkExistingRequest();

      // Suscripción Realtime
      channel = supabase
        .channel('public_solicitudes_ajuste')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitudes_ajuste'
          },
          (payload) => {
            console.log("Cambio detectado en DB. Tipo:", payload.eventType);
            // 1. Refetch seguro siempre
            checkExistingRequest(true);

            // 2. Actualización optimista si coincide
            if (payload.new && payload.new.empleado_id === user.id && payload.new.tipo_ajuste === 'acceso') {
              setAccessStatus(payload.new.estado);
            }
          }
        )
        .subscribe((status) => {
          console.log("Estado suscripción:", status);
        });
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // 2. POLLING AGRESIVO (RESPALDO CRÍTICO)
  // Se ejecuta si el usuario está esperando (pendiente) O si ya está dentro (aprobado),
  // para asegurar que si le quitan el permiso, lo saque fuera en máximo 2 segundos.
  useEffect(() => {
    const necesitaPolling = accessStatus === 'pendiente' || accessStatus === 'aprobado';
    let interval;

    if (necesitaPolling) {
      // console.log("Polling activo verificando estado...");
      interval = setInterval(() => {
        checkExistingRequest(true);
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [accessStatus]);


  // Si se aprueba, cargamos productos y categorías
  useEffect(() => {
    if (accessStatus === 'aprobado') {
      cargarCategorias();
      cargarProductos();
      cargarPlatos();
      cargarProveedores();
    }
  }, [accessStatus, searchQuery, filtroCategoria, filtroActivo]);

  const checkExistingRequest = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('solicitudes_ajuste')
        .select('estado')
        .eq('empleado_id', user.id)
        .eq('tipo_ajuste', 'acceso')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Solo actualizamos si el estado es diferente para evitar re-renders innecesarios
        // aunque React suele manejar esto bien con primitivos.
        setAccessStatus(prevStatus => {
          if (prevStatus !== data.estado) {
            console.log(`Estado cambiado: ${prevStatus} -> ${data.estado}`);
            return data.estado;
          }
          return prevStatus;
        });
      } else {
        setAccessStatus(null);
      }

    } catch (error) {
      if (!silent) console.error('Error verificando acceso:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const solicitarAcceso = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Error de Sesión', 'No se pudo verificar tu usuario. Cierra sesión y vuelve a entrar.');
        return;
      }

      let nombre = user.email;
      try {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre')
          .eq('id', user.id)
          .maybeSingle();
        if (perfil?.nombre) nombre = perfil.nombre;
      } catch (err) { }

      const payload = {
        empleado_id: user.id,
        empleado_nombre: nombre,
        tipo_ajuste: 'acceso',
        estado: 'pendiente',
        fecha_solicitud: new Date().toISOString(),
        datos: {}
      };

      const { error: insertError } = await supabase
        .from('solicitudes_ajuste')
        .insert(payload);

      if (insertError) throw insertError;

      Alert.alert('Solicitud Enviada', 'Tu solicitud ha sido enviada al jefe.');
      setAccessStatus('pendiente'); // Esto activará el useEffect de polling

    } catch (error) {
      Alert.alert('Error al enviar solicitud', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // LOGICA DE INVENTARIO
  // ----------------------------------------------------
  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('nombre');
    if (data) setCategorias(data);
  };

  const cargarPlatos = async () => {
    try {
      const { data, error } = await supabase
        .from('platos')
        .select(`
          *,
          platos_ingredientes (
            cantidad_sugerida,
            productos (id, nombre, unidad)
          )
        `)
        .order('nombre');
      if (error) {
        console.error("Error Supabase Platos:", error.message);
      } else if (data) {
        setPlatos(data);
      }
    } catch (err) {
      console.error("Error cargando platos:", err);
    }
  };

  const cargarProveedores = async () => {
    try {
      const { data, error } = await supabase.from('organizaciones').select('*').order('nombre');
      if (error) {
        console.error("Error Supabase Proveedores:", error.message);
      } else if (data) {
        setProveedores(data);
      }
    } catch (err) {
      console.error("Error cargando proveedores:", err);
    }
  };

  const cargarProductos = async () => {
    setLoadingProd(true);
    try {
      let query = supabase.from('productos').select(`
        *, 
        categorias!left (id, nombre), 
        lotes!left (cantidad, fecha_vencimiento)
      `);

      if (searchQuery) query = query.ilike('nombre', `%${searchQuery}%`);
      if (filtroCategoria) query = query.eq('categoria_id', filtroCategoria.id);

      const { data, error } = await query;
      if (error) throw error;

      let procesados = data.map(p => {
        const lotes = p.lotes || [];
        const total = lotes.reduce((acc, l) => acc + l.cantidad, 0);

        const lotesActivos = lotes.filter(l => l.cantidad > 0);
        lotesActivos.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
        const proximoVencimiento = lotesActivos.length > 0 ? lotesActivos[0].fecha_vencimiento : '9999-12-31';

        return {
          ...p,
          total,
          vencimientoCercano: proximoVencimiento,
          categoria_nombre: p.categorias?.nombre || 'Sin categoría'
        };
      });

      if (filtroActivo === 'alfabetico') procesados.sort((a, b) => a.nombre.localeCompare(b.nombre));
      if (filtroActivo === 'stock') procesados.sort((a, b) => b.total - a.total);
      if (filtroActivo === 'vencimiento') {
        procesados.sort((a, b) => new Date(a.vencimientoCercano) - new Date(b.vencimientoCercano));
      }

      setProductos(procesados);

    } catch (e) {
      console.error("Error cargando productos:", e.message);
    } finally {
      setLoadingProd(false);
    }
  };

  const handleDateChange = (text) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 4) formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
    if (cleaned.length > 6) formatted = formatted.slice(0, 7) + '-' + cleaned.slice(6, 8);
    setForm({ ...form, fechaVencimiento: formatted.slice(0, 10) });
  };

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setModalVisible(true);
  };

  const openForm = (type) => {
    setActionType(type);
    setModalVisible(false);
    setFormVisible(true);
    setForm(INITIAL_FORM);
  };

  const handleSubmitAdjustment = async () => {
    const qty = parseInt(form.cantidad);
    if (!qty || qty <= 0) return Alert.alert('Error', 'Ingresa una cantidad válida');

    if (actionType === 'sumar') {
      if (!form.organizationName || form.fechaVencimiento.length < 10) {
        return Alert.alert('Error', 'Ingresa proveedor y fecha válida (AAAA-MM-DD)');
      }
    } else {
      if (!form.numStudents.trim() || !form.numTeachers.trim()) {
        return Alert.alert('Error', 'Ingresa beneficiarios (0 si no aplica)');
      }
      if (qty > selectedProduct.total) return Alert.alert('Error', 'No hay stock suficiente');
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single();
      const nombreUsuario = perfil?.nombre || user.email;

      let tipoAjuste, datosPayload, razon;

      if (actionType === 'sumar') {
        tipoAjuste = 'entrada';
        datosPayload = {
          nombre: selectedProduct.nombre,
          categoria_id: selectedProduct.categoria_id,
          unidad: selectedProduct.unidad,
          cantidad: qty,
          vencimiento: form.fechaVencimiento,
          organizacion: form.organizationName
        };
        razon = "Solicitud Entrada (Empleado)";
      } else {
        tipoAjuste = 'salida';
        datosPayload = {
          producto_id: selectedProduct.id,
          cantidad_total: qty,
          estudiantes: parseInt(form.numStudents),
          profesores: parseInt(form.numTeachers)
        };
        razon = "Solicitud Salida (Empleado)";
      }

      const { error } = await supabase.from('solicitudes_ajuste').insert({
        empleado_id: user.id,
        empleado_nombre: nombreUsuario,
        producto_id: selectedProduct.id,
        producto_nombre: selectedProduct.nombre,
        tipo_ajuste: tipoAjuste,
        cantidad: qty,
        razon: razon,
        estado: 'pendiente',
        datos: datosPayload
      });

      if (error) throw error;
      Alert.alert('Solicitud Enviada', 'El jefe debe aprobar este movimiento.');

      setFormVisible(false);
      setForm(INITIAL_FORM);
      cargarProductos();

    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // VISTA: SI ESTÁ APROBADO -> MOSTRAR LISTA
  // ----------------------------------------------------
  if (accessStatus === 'aprobado') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>AJUSTAR STOCK</Text>
            <Text style={styles.headerSubtitle}>VISTA DE EMPLEADO</Text>
          </View>
          <Image source={require('../assets/icon.png')} style={styles.logoHeader} />
          <TouchableOpacity
            style={[styles.menuIconButton, { marginRight: 10 }]}
            onPress={() => setSalidaPlatoVisible(true)}
          >
            <MaterialIcons name="restaurant" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.menuIconButton}>
            <MaterialIcons name="logout" size={24} color="#E74C3C" />
          </TouchableOpacity>
        </View>

        {/* BUSCADOR Y FILTROS */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterIconButton} onPress={() => setFilterModalVisible(true)}>
              <MaterialIcons name="filter-list" size={26} color={(filtroCategoria || filtroActivo !== 'alfabetico') ? "#4CAF50" : "#0100D9"} />
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

        {/* LISTA */}
        {loadingProd ? <ActivityIndicator size="large" color="#0100D9" style={{ marginTop: 20 }} /> : (
          <FlatList
            data={productos}
            keyExtractor={item => item.id.toString()}
            refreshing={refreshing}
            onRefresh={onRefresh}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productCard} onPress={() => handleSelectProduct(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.nombre}</Text>
                  <Text style={styles.productDetails}>{item.total} {item.unidad} • {item.categoria_nombre}</Text>
                  {item.vencimientoCercano && (
                    <Text style={[styles.vencimientoLabel, { color: new Date(item.vencimientoCercano) < new Date() ? '#F44336' : '#666' }]}>
                      {item.vencimientoCercano === '9999-12-31' ? '' : `Vence: ${item.vencimientoCercano}`}
                    </Text>
                  )}
                </View>
                <MaterialIcons name="touch-app" size={24} color="#0100D9" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron productos.</Text>}
          />
        )}

        {/* --- MODAL SELECCION DE ACCION --- */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={[styles.modalContent, { maxWidth: 400 }]}>
              <Text style={[styles.modalHeaderTitle, { color: '#0100D9', marginBottom: 5 }]}>{selectedProduct?.nombre.toUpperCase()}</Text>
              <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
                Stock Actual: {selectedProduct?.total} {selectedProduct?.unidad}
              </Text>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0100D9' }]} onPress={() => openForm('sumar')}>
                <MaterialIcons name="add-circle" size={24} color="#fff" />
                <Text style={styles.actionBtnText}>REGISTRAR ENTRADA</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.backLink}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- MODAL FORMULARIO --- */}
        <Modal visible={formVisible} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalHeaderTitle, { color: actionType === 'sumar' ? '#0100D9' : '#333' }]}>
                {actionType === 'sumar' ? 'SOLICITUD DE ENTRADA' : 'SOLICITUD DE SALIDA'}
              </Text>
              <Text style={{ color: '#666', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
                {selectedProduct?.nombre}
              </Text>

              <Text style={styles.fieldLabel}>CANTIDAD ({selectedProduct?.unidad})</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                placeholder="0"
                value={form.cantidad}
                onChangeText={v => setForm({ ...form, cantidad: v })}
              />

              {actionType === 'sumar' ? (
                <>
                  <Text style={styles.fieldLabel}>PROVEEDOR / ORIGEN</Text>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => setProvsModalVisible(true)}
                  >
                    <Text style={{ color: form.organizationName ? '#000' : '#999' }}>
                      {form.organizationName || "Seleccionar Proveedor"}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.fieldLabel}>FECHA VENCIMIENTO (AAAA-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    placeholder="2026-12-31"
                    value={form.fechaVencimiento}
                    onChangeText={handleDateChange}
                    maxLength={10}
                  />
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ width: '48%' }}>
                      <Text style={styles.fieldLabel}>ESTUDIANTES</Text>
                      <TextInput style={styles.formInput} keyboardType="numeric" placeholder="0"
                        value={form.numStudents} onChangeText={v => setForm({ ...form, numStudents: v })}
                      />
                    </View>
                    <View style={{ width: '48%' }}>
                      <Text style={styles.fieldLabel}>PERSONAL</Text>
                      <TextInput style={styles.formInput} keyboardType="numeric" placeholder="0"
                        value={form.numTeachers} onChangeText={v => setForm({ ...form, numTeachers: v })}
                      />
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.mainSubmitBtn, { backgroundColor: actionType === 'sumar' ? '#0100D9' : '#333' }]}
                onPress={handleSubmitAdjustment}
              >
                <Text style={styles.mainSubmitBtnText}>ENVIAR SOLICITUD</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <Text style={styles.backLink}>CANCELAR</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

        {/* --- MODAL SELECCION: PROVEEDORES --- */}
        <Modal visible={provsModalVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeaderTitle}>SELECCIONAR PROVEEDOR</Text>
              <ScrollView style={{ maxHeight: 350 }}>
                {proveedores.map(p => (
                  <TouchableOpacity key={p.id} style={styles.catItem} onPress={() => {
                    setForm({ ...form, organizationName: p.nombre });
                    setProvsModalVisible(false);
                  }}>
                    <Text style={{ fontWeight: '700', color: '#444' }}>{p.nombre.toUpperCase()}</Text>
                    <MaterialIcons name={form.organizationName === p.nombre ? "radio-button-on" : "radio-button-off"} size={20} color="#0100D9" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setProvsModalVisible(false)}>
                <Text style={styles.backLink}>VOLVER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- MODAL SALIDA POR PLATO --- */}
        <Modal visible={salidaPlatoVisible} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              {loading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#0100D9" />
                  <Text style={{ marginTop: 10, color: '#666' }}>Procesando salida...</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                  <Text style={styles.modalHeaderTitle}>REGISTRAR SALIDA POR PLATO</Text>

                  {!platoSeleccionado ? (
                    <>
                      <Text style={{ textAlign: 'center', marginBottom: 15, color: '#666' }}>
                        Selecciona el menú que se preparó hoy:
                      </Text>
                      {platos.map(plato => (
                        <TouchableOpacity
                          key={plato.id}
                          style={styles.catItem}
                          onPress={() => setPlatoSeleccionado(plato)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                            <Text style={{ fontWeight: '700', color: '#333', fontSize: 16 }}>{plato.nombre}</Text>
                          </View>
                          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <TouchableOpacity onPress={() => setPlatoSeleccionado(null)} style={{ marginRight: 10 }}>
                          <MaterialIcons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0100D9' }}>{platoSeleccionado.nombre}</Text>
                      </View>

                      <View style={{ backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, marginBottom: 20 }}>
                        <Text style={styles.fieldLabel}>INGREDIENTES</Text>
                        {platoSeleccionado.platos_ingredientes?.map((ing, i) => (
                          <Text key={i} style={{ color: '#444', marginBottom: 4 }}>
                            • {ing.productos?.nombre}: <Text style={{ fontWeight: 'bold' }}>{ing.cantidad_sugerida} {ing.productos?.unidad}</Text>
                          </Text>
                        ))}
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ width: '48%' }}>
                          <Text style={styles.fieldLabel}>ESTUDIANTES</Text>
                          <TextInput
                            style={styles.formInput}
                            keyboardType="numeric"
                            placeholder="0"
                            value={salidaPlatoForm.numStudents}
                            onChangeText={v => setSalidaPlatoForm({ ...salidaPlatoForm, numStudents: v })}
                          />
                        </View>
                        <View style={{ width: '48%' }}>
                          <Text style={styles.fieldLabel}>PERSONAL</Text>
                          <TextInput
                            style={styles.formInput}
                            keyboardType="numeric"
                            placeholder="0"
                            value={salidaPlatoForm.numTeachers}
                            onChangeText={v => setSalidaPlatoForm({ ...salidaPlatoForm, numTeachers: v })}
                          />
                        </View>
                      </View>

                      {/* VISTA PREVIA DEL TOTAL */}
                      {(salidaPlatoForm.numStudents || salidaPlatoForm.numTeachers) && (
                        <View style={{ marginTop: 10, padding: 10, backgroundColor: '#E8F5E9', borderRadius: 8 }}>
                          <Text style={[styles.fieldLabel, { color: '#2E7D32' }]}>TOTAL A DESCONTAR:</Text>
                          {platoSeleccionado.platos_ingredientes?.map((ing, i) => {
                            const totalPersonas = (parseInt(salidaPlatoForm.numStudents) || 0) + (parseInt(salidaPlatoForm.numTeachers) || 0);
                            return (
                              <Text key={i} style={{ color: '#1B5E20', fontWeight: '600' }}>
                                • {ing.productos?.nombre}: {ing.cantidad_sugerida} {ing.productos?.unidad}
                              </Text>
                            );
                          })}
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.mainSubmitBtn, { backgroundColor: '#333' }]}
                        onPress={async () => {
                          const est = parseInt(salidaPlatoForm.numStudents) || 0;
                          const prof = parseInt(salidaPlatoForm.numTeachers) || 0;

                          if (est === 0 && prof === 0) {
                            return Alert.alert("Error", "Ingresa al menos 1 beneficiario");
                          }

                          setLoading(true);
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single();
                            const nombreUsuario = perfil?.nombre || user.email;

                            const promises = platoSeleccionado.platos_ingredientes.map(async (ing) => {
                              const cantidadTotal = ing.cantidad_sugerida;
                              if (cantidadTotal <= 0) return;

                              return supabase.from('solicitudes_ajuste').insert({
                                empleado_id: user.id,
                                empleado_nombre: nombreUsuario,
                                producto_id: ing.productos.id,
                                producto_nombre: ing.productos.nombre,
                                tipo_ajuste: 'salida',
                                cantidad: cantidadTotal,
                                razon: `Menú: ${platoSeleccionado.nombre}`,
                                estado: 'pendiente',
                                datos: {
                                  producto_id: ing.productos.id,
                                  cantidad_total: cantidadTotal,
                                  estudiantes: est,
                                  profesores: prof,
                                  es_menu: true,
                                  plato_nombre: platoSeleccionado.nombre
                                }
                              });
                            });

                            await Promise.all(promises);

                            Alert.alert('Solicitud Enviada', 'Se han generado las solicitudes de salida para cada ingrediente.');
                            setSalidaPlatoVisible(false);
                            setPlatoSeleccionado(null);
                            setSalidaPlatoForm({ numStudents: '', numTeachers: '' });

                          } catch (e) {
                            Alert.alert("Error", e.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        <Text style={styles.mainSubmitBtnText}>ENVIAR SOLICITUD DE SALIDA</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity onPress={() => { setSalidaPlatoVisible(false); setPlatoSeleccionado(null); }}>
                    <Text style={styles.backLink}>CANCELAR</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* --- MODAL PRINCIPAL: ORDENAR Y FILTRAR --- */}
        <Modal visible={filterModalVisible} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeaderTitle}>ORDENAR Y FILTRAR</Text>
              {[
                { id: 'alfabetico', l: 'A - Z', i: 'sort-by-alpha' },
                { id: 'stock', l: 'Mayor Stock', i: 'trending-up' },
                { id: 'vencimiento', l: 'Próximos a Vencer', i: 'event-busy' }
              ].map(op => (
                <TouchableOpacity
                  key={op.id}
                  style={[styles.filterRow, filtroActivo === op.id && styles.filterRowActive]}
                  onPress={() => setFiltroActivo(op.id)}
                >
                  <MaterialIcons name={op.i} size={22} color={filtroActivo === op.id ? "#fff" : "#0100D9"} />
                  <Text style={[styles.filterRowText, filtroActivo === op.id && { color: '#fff' }]}>{op.l}</Text>
                </TouchableOpacity>
              ))}

              <View style={{ height: 1, backgroundColor: '#EEE', marginVertical: 10 }} />

              <Text style={styles.fieldLabel}>FILTRAR POR CATEGORÍA</Text>
              <TouchableOpacity style={styles.formInput} onPress={() => { setFilterModalVisible(false); setCatsModalVisible(true); }}>
                <Text style={{ color: filtroCategoria ? '#000' : '#999' }}>
                  {filtroCategoria ? filtroCategoria.nombre : "Todas las categorías"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.mainSubmitBtn, { backgroundColor: '#0100D9' }]} onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.mainSubmitBtnText}>APLICAR</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setFiltroCategoria(null); setFiltroActivo('alfabetico'); setFilterModalVisible(false); }}>
                <Text style={[styles.backLink, { color: '#F44336' }]}>LIMPIAR TODO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- MODAL SELECCION: CATEGORIAS --- */}
        <Modal visible={catsModalVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeaderTitle}>SELECCIONAR CATEGORÍA</Text>
              <ScrollView style={{ maxHeight: 350 }}>
                <TouchableOpacity style={styles.catItem} onPress={() => { setFiltroCategoria(null); setCatsModalVisible(false); setFilterModalVisible(true); }}>
                  <Text style={{ fontWeight: '700', color: '#444' }}>TODAS</Text>
                  <MaterialIcons name={!filtroCategoria ? "radio-button-on" : "radio-button-off"} size={20} color="#0100D9" />
                </TouchableOpacity>
                {categorias.map(cat => (
                  <TouchableOpacity key={cat.id} style={styles.catItem} onPress={() => { setFiltroCategoria(cat); setCatsModalVisible(false); setFilterModalVisible(true); }}>
                    <Text style={{ fontWeight: '700', color: '#444' }}>{cat.nombre.toUpperCase()}</Text>
                    <MaterialIcons name={filtroCategoria?.id === cat.id ? "radio-button-on" : "radio-button-off"} size={20} color="#0100D9" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => { setCatsModalVisible(false); setFilterModalVisible(true); }}>
                <Text style={styles.backLink}>VOLVER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // VISTA: PANTALLA DE SOLICITUD (Status Pendiente / Null)
  // ----------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Image source={require('../assets/icon.png')} style={styles.logoHeader} />
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.headerTitle}>CONTROL DE ACCESO</Text>
          <Text style={styles.headerSubtitle}>SISTEMA DE INVENTARIO</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.menuIconButton}>
          <MaterialIcons name="logout" size={24} color="#E74C3C" />
        </TouchableOpacity>
      </View>

      <View style={styles.centerContent}>

        {loading && <ActivityIndicator size="large" color="#0100D9" style={{ marginBottom: 20 }} />}

        {!loading && accessStatus === null && (
          <TouchableOpacity style={styles.bigButton} onPress={solicitarAcceso}>
            <MaterialIcons name="vpn-key" size={60} color="#fff" />
            <Text style={styles.bigButtonText}>SOLICITAR ACCESO AL INVENTARIO</Text>
          </TouchableOpacity>
        )}

        {!loading && accessStatus === 'pendiente' && (
          <View style={styles.statusBox}>
            <MaterialIcons name="hourglass-empty" size={80} color="#F39C12" />
            <Text style={styles.statusTitle}>Solicitud Enviada</Text>
            <Text style={styles.statusDesc}>
              Esperando aprobación del Jefe de Comedor...
            </Text>
            <Text style={styles.statusNote}>
              La pantalla se actualizará automáticamente.
            </Text>
          </View>
        )}

        {!loading && accessStatus === 'rechazado' && (
          <View style={styles.statusBox}>
            <MaterialIcons name="error-outline" size={80} color="#E74C3C" />
            <Text style={[styles.statusTitle, { color: '#E74C3C' }]}>Acceso Rechazado</Text>
            <Text style={styles.statusDesc}>
              Tu solicitud ha sido denegada por el jefe.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setAccessStatus(null)}>
              <Text style={styles.retryText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

// ESTILOS (COPIADOS Y UNIFICADOS)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 95, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF' },
  logoHeader: { width: 85, height: 85, resizeMode: 'contain' },
  headerTitle: { color: '#0100D9', fontSize: 22, fontWeight: '900' },
  headerSubtitle: { color: '#666', fontSize: 10, fontWeight: '600' },
  menuIconButton: { padding: 5 },

  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  bigButton: { backgroundColor: '#0100D9', width: '100%', padding: 40, borderRadius: 20, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  bigButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
  statusBox: { alignItems: 'center' },
  statusTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
  statusDesc: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 5 },
  statusNote: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  retryButton: { marginTop: 20, padding: 15, backgroundColor: '#eee', borderRadius: 10 },
  retryText: { color: '#333', fontWeight: 'bold' },

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

  actionBtn: { padding: 15, borderRadius: 8, marginVertical: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '800', marginLeft: 10 },
  mainSubmitBtn: { padding: 16, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  mainSubmitBtnText: { color: '#fff', fontWeight: '800' },
  backLink: { color: '#999', textAlign: 'center', marginTop: 15, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontWeight: '600' },
  catItem: { paddingVertical: 15, borderBottomWidth: 1, borderColor: '#F5F5F5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});
