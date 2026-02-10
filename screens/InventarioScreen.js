import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, ScrollView, ActivityIndicator, StyleSheet,
  SafeAreaView, StatusBar, Keyboard, Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

// --- IMPORTACIÓN DEL SERVICIO DE NOTIFICACIONES ---
import { requestPermissions, scheduleVencimientoNotifications } from '../services/notificationService';

// --- IMPORTACIÓN DEL SERVICIO DE REPORTES DE PÉRDIDA ---
import { sendPerdidaReportByEmail } from '../services/ReportService';

const INITIAL_FORM = {
  nombre: '', cantidad: '', unidad: '', categoria_id: '', categoria_nombre: '', es_fungible: true,
  fechaVencimiento: '', organizationName: '',
  numStudents: '', numTeachers: '', operationValue: ''
};

export default function InventarioScreen({ navigation, isRequestMode = false }) {
  // --- ESTADOS ---
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filtroActivo, setFiltroActivo] = useState('alfabetico');
  const [filtroCategoria, setFiltroCategoria] = useState(null);

  const [tipoOperacion, setTipoOperacion] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentProduct, setCurrentProduct] = useState(null);

  const [modals, setModals] = useState({
    menu: false, selector: false, form: false, cats: false, filtros: false, provs: false, perdida: false, salidaPlato: false
  });

  // --- ESTADOS PARA REPORTE DE PÉRDIDA ---
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [perdidaForm, setPerdidaForm] = useState({ cantidad: '', razon: '' });

  // --- ESTADOS PARA SALIDA POR PLATO ---
  const [platos, setPlatos] = useState([]);
  const [platoSeleccionado, setPlatoSeleccionado] = useState(null);
  const [salidaPlatoForm, setSalidaPlatoForm] = useState({ numStudents: '', numTeachers: '' });

  // --- EFECTOS ---
  useEffect(() => {
    requestPermissions();
    cargarCategorias();
    cargarProveedores();
    cargarProductos();
    cargarPlatos();
  }, [searchQuery, filtroActivo, filtroCategoria]);

  // --- LÓGICA DE DATOS ---
  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('nombre');
    if (data) setCategorias(data);
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

  const cargarProductos = async () => {
    setLoading(true);
    try {
      let query = supabase.from('productos').select(`
        *, 
        categorias!left (id, nombre, es_fungible), 
        lotes!left (id, cantidad, fecha_vencimiento)
      `);

      if (searchQuery) query = query.ilike('nombre', `%${searchQuery}%`);
      if (filtroCategoria) query = query.eq('categoria_id', filtroCategoria.id);

      const { data, error } = await query;
      if (error) throw error;

      let procesados = data.map(p => {
        const lotesActivos = p.lotes?.filter(l => l.cantidad > 0) || [];
        lotesActivos.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));

        const proximoVencimiento = lotesActivos.length > 0
          ? lotesActivos[0].fecha_vencimiento
          : '9999-12-31';

        return {
          ...p,
          lotesDisponibles: lotesActivos,
          total: lotesActivos.reduce((acc, curr) => acc + curr.cantidad, 0),
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
      setLoading(false);
    }
  };

  // --- MÁSCARA DE FECHA (AAAA-MM-DD) ---
  const handleDateChange = (text) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 4) formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
    if (cleaned.length > 6) formatted = formatted.slice(0, 7) + '-' + cleaned.slice(6, 8);
    setForm({ ...form, fechaVencimiento: formatted.slice(0, 10) });
  };

  /* ----------------------------------------------------
   * LONG PRESS HANDLER (Opciones Edit/Delete)
   * ---------------------------------------------------- */
  const handleOptionsProducto = (producto) => {
    if (isRequestMode) return;

    Alert.alert(
      producto.nombre.toUpperCase(),
      'Seleccione una acción:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Editar Detalles',
          onPress: () => {
            setCurrentProduct(producto);
            setTipoOperacion('edit');
            setForm({
              ...INITIAL_FORM,
              nombre: producto.nombre,
              unidad: producto.unidad,
              categoria_id: producto.categoria_id,
              categoria_nombre: producto.categoria_nombre,
              es_fungible: producto.categorias?.es_fungible !== false
            });
            setModals({ ...modals, form: true });
          }
        },
        {
          text: 'Eliminar Producto',
          style: 'destructive',
          onPress: () => confirmarEliminar(producto)
        }
      ]
    );
  };

  const confirmarEliminar = (producto) => {
    // 1. CONDICIONAL: NO BORRAR SI HAY STOCK
    if (producto.total > 0) {
      return Alert.alert(
        'ACCIÓN DENEGADA',
        `No puedes eliminar "${producto.nombre}" porque tiene existencias (${producto.total} ${producto.unidad}).\n\nPrimero debes vaciar sus lotes.`
      );
    }

    // 2. CONFIRMACIÓN
    Alert.alert(
      'ELIMINAR PRODUCTO',
      `¿Deseas eliminar definitivamente "${producto.nombre.toUpperCase()}"?\n\nEsta acción borrará el producto y desvinculará su historial.`,
      [
        { text: 'CANCELAR', style: 'cancel' },
        {
          text: 'ELIMINAR',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // 1. Desvincular de solicitudes (conservar el registro, quitar el ID)
              const { error: solError } = await supabase
                .from('solicitudes_ajuste')
                .update({ producto_id: null })
                .eq('producto_id', producto.id);
              if (solError) console.log("Warn: Solicitudes update", solError);

              // 2. Desvincular de reportes de pérdida
              const { error: repError } = await supabase
                .from('reportes_perdida')
                .update({ producto_id: null })
                .eq('producto_id', producto.id);
              if (repError) console.log("Warn: Reportes update", repError);

              // 3. Desvincular de registros históricos (SUMAS y RESTAS)
              const { error: restaError } = await supabase
                .from('registros_resta')
                .update({ producto_id: null })
                .eq('producto_id', producto.id);
              if (restaError) console.log("Warn: Registros Resta update", restaError);

              const { error: sumaError } = await supabase
                .from('registros_suma')
                .update({ producto_id: null })
                .eq('producto_id', producto.id);
              if (sumaError) console.log("Warn: Registros Suma update", sumaError);

              // 4. Desvincular de ingredientes de platos (si aplica)
              const { error: platoError } = await supabase
                .from('platos_ingredientes')
                .update({ producto_id: null })
                .eq('producto_id', producto.id);
              if (platoError) console.log("Warn: Platos Ingredientes update", platoError);

              // 5. Eliminar lotes vacíos (Relación fuerte, se borran)
              const { error: lotesError } = await supabase
                .from('lotes')
                .delete()
                .eq('producto_id', producto.id);
              if (lotesError) throw lotesError;

              // 6. Eliminar el producto final
              const { error } = await supabase.from('productos').delete().eq('id', producto.id);
              if (error) throw error;

              Alert.alert('Éxito', 'Producto eliminado');
              cargarProductos();
            } catch (e) {
              console.log("Error al eliminar:", e);
              Alert.alert('Error', 'No se pudo eliminar el producto. ' + e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  /* ----------------------------------------------------
   * UNIFIED ACTION HANDLER
   * ---------------------------------------------------- */
  const handleAction = async () => {

    // ------------------------------------------------
    // MODO EDICIÓN
    // ------------------------------------------------
    if (tipoOperacion === 'edit') {
      if (!form.nombre.trim()) return Alert.alert('Error', 'El nombre no puede estar vacío');
      if (!form.unidad.trim()) return Alert.alert('Error', 'La unidad no puede estar vacía');

      setLoading(true);
      try {
        const { error } = await supabase.from('productos')
          .update({
            nombre: form.nombre,
            unidad: form.unidad,
            categoria_id: form.categoria_id
          })
          .eq('id', currentProduct.id);

        if (error) throw error;
        Alert.alert('Éxito', 'Producto actualizado correctamente');
        cerrarTodo();
        cargarProductos();
      } catch (e) {
        Alert.alert('Error al actualizar', e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const qty = parseInt(form.operationValue);

    // 1. VALIDACIÓN DE CANTIDAD
    if (!qty || qty <= 0) return Alert.alert('Error', 'Ingresa una cantidad válida');

    // 2. VALIDACIONES ESPECÍFICAS
    if (tipoOperacion === 'nuevo') {
      // Validaciones básicas para nuevo producto
      if (!form.nombre.trim() || !form.categoria_id || !form.organizationName) {
        return Alert.alert('Campos Incompletos', 'Llene todos los campos obligatorios.');
      }

      // Validar unidad solo si es fungible (si no, asignamos defecto)
      if (form.es_fungible && !form.unidad.trim()) {
        return Alert.alert('Campo Requerido', 'Indique la unidad de medida.');
      }

      // Solo requerir fecha si es fungible
      if (form.es_fungible && form.fechaVencimiento.length < 10) {
        return Alert.alert('Fecha Requerida', 'Los productos fungibles requieren fecha de vencimiento (AAAA-MM-DD).');
      }
    } else if (tipoOperacion === 'sumar') {
      if (!form.organizationName) {
        return Alert.alert('Campos Incompletos', 'Seleccione un Proveedor.');
      }
      // Solo requerir fecha si el producto actual es fungible
      const productoEsFungible = currentProduct?.categorias?.es_fungible !== false;
      if (productoEsFungible && form.fechaVencimiento.length < 10) {
        return Alert.alert('Fecha Requerida', 'Los productos fungibles requieren fecha de vencimiento.');
      }
    } else if (tipoOperacion === 'restar') {
      if (!form.numStudents.trim() || !form.numTeachers.trim()) {
        return Alert.alert('Beneficiarios Vacíos', 'Indique la cantidad de personas (use 0 si no aplica).');
      }
      if (qty > currentProduct.total) return Alert.alert('Error', 'No hay stock suficiente.');
    }

    setLoading(true);
    try {
      // ------------------------------------------------
      // MODO SOLICITUD (EMPLEADO)
      // ------------------------------------------------
      if (isRequestMode) {
        const { data: { user } } = await supabase.auth.getUser();
        // Obtener nombre
        const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single();
        const nombreUsuario = perfil?.nombre || user.email;

        let tipoAjuste, datosPayload, razon;

        if (tipoOperacion === 'sumar' || tipoOperacion === 'nuevo') {
          tipoAjuste = 'entrada';
          datosPayload = {
            nombre: (tipoOperacion === 'nuevo' ? form.nombre : currentProduct.nombre).trim(),
            categoria_id: form.categoria_id || currentProduct?.categoria_id,
            unidad: (tipoOperacion === 'nuevo' ? (form.es_fungible ? form.unidad : 'Unid') : currentProduct.unidad),
            cantidad: qty,
            vencimiento: form.fechaVencimiento || '9999-12-31', // Usar fecha lejana si es vacío
            organizacion: form.organizationName
          };
          razon = "Entrada de Inventario";
        } else {
          tipoAjuste = 'salida';
          datosPayload = {
            producto_id: currentProduct.id,
            cantidad_total: qty,
            estudiantes: parseInt(form.numStudents),
            profesores: parseInt(form.numTeachers)
          };
          razon = "Salida de Inventario";
        }

        const { error: reqError } = await supabase.from('solicitudes_ajuste').insert({
          empleado_id: user.id,
          empleado_nombre: nombreUsuario,
          producto_id: (tipoOperacion === 'nuevo' ? null : currentProduct.id), // Puede ser null si es nuevo prod
          producto_nombre: (tipoOperacion === 'nuevo' ? form.nombre : currentProduct.nombre),
          tipo_ajuste: tipoAjuste,
          cantidad: qty,
          razon: razon,
          estado: 'pendiente',
          datos: datosPayload
        });

        if (reqError) throw reqError;
        Alert.alert('Solicitud Enviada', 'El Jefe debe aprobar esta operación.');

      } else {
        // ------------------------------------------------
        // MODO DIRECTO (SUPER ADMIN / JEFE)
        // ------------------------------------------------
        let payload, rpcName;
        if (tipoOperacion === 'sumar' || tipoOperacion === 'nuevo') {
          rpcName = 'registrar_entrada_completa';
          payload = {
            p_nombre: (tipoOperacion === 'nuevo' ? form.nombre : currentProduct.nombre).trim(),
            p_categoria_id: form.categoria_id || currentProduct?.categoria_id,
            p_unidad: (tipoOperacion === 'nuevo' ? (form.es_fungible ? form.unidad : 'Unid') : currentProduct.unidad),
            p_cantidad: qty,
            p_vencimiento: form.fechaVencimiento || '9999-12-31', // Usar fecha lejana si es vacío
            p_organizacion: form.organizationName
          };
        } else {
          rpcName = 'registrar_salida_fifo';
          payload = {
            p_producto_id: currentProduct.id,
            p_cantidad_total: qty,
            p_estudiantes: parseInt(form.numStudents),
            p_profesores: parseInt(form.numTeachers)
          };
        }

        const { error } = await supabase.rpc(rpcName, payload);
        if (error) throw error;

        if (tipoOperacion === 'sumar' || tipoOperacion === 'nuevo') {
          const nombreParaNotif = tipoOperacion === 'nuevo' ? form.nombre : currentProduct.nombre;
          scheduleVencimientoNotifications(nombreParaNotif, form.fechaVencimiento);
        }
        Alert.alert('Éxito', 'Operación registrada correctamente.');
      }

      cerrarTodo();
      cargarProductos();

    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const cerrarTodo = () => {
    setModals({ menu: false, selector: false, form: false, cats: false, filtros: false, provs: false, perdida: false, salidaPlato: false });
    setForm(INITIAL_FORM);
    setTipoOperacion(null);
    setCurrentProduct(null);
    setLoteSeleccionado(null);
    setPerdidaForm({ cantidad: '', razon: '' });
    setPlatoSeleccionado(null);
    setSalidaPlatoForm({ numStudents: '', numTeachers: '' });
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
        <TouchableOpacity style={styles.menuIconButton} onPress={() => setModals({ ...modals, menu: true })}>
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
          <TouchableOpacity style={styles.filterIconButton} onPress={() => setModals({ ...modals, filtros: true })}>
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
      {loading && !modals.form ? <ActivityIndicator color="#0100D9" size="large" style={{ marginTop: 20 }} /> : (
        <FlatList
          data={productos}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => { setCurrentProduct(item); setModals({ ...modals, selector: true }); }}
              onLongPress={() => handleOptionsProducto(item)}
              delayLongPress={600}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.nombre}</Text>
                <Text style={styles.productDetails}>
                  {item.total} {item.unidad} • {item.categoria_nombre}
                </Text>
                {item.vencimientoCercano !== '9999-12-31' && (
                  <Text style={[styles.vencimientoLabel, { color: new Date(item.vencimientoCercano) < new Date() ? '#F44336' : '#666' }]}>
                    Vence: {item.vencimientoCercano}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'center' }}>
                <MaterialIcons name="chevron-right" size={24} color="#0100D9" />
                <Text style={{ fontSize: 7, color: '#DDD' }}>Opciones</Text>
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
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>FILTRAR POR CATEGORÍA</Text>
            <TouchableOpacity style={styles.formInput} onPress={() => setModals({ ...modals, filtros: false, cats: true })}>
              <Text style={{ color: filtroCategoria ? '#000' : '#999' }}>
                {filtroCategoria ? filtroCategoria.nombre : "Todas las categorías"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mainSubmitBtn, { backgroundColor: '#0100D9' }]} onPress={() => setModals({ ...modals, filtros: false })}>
              <Text style={styles.mainSubmitBtnText}>APLICAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setFiltroCategoria(null); setFiltroActivo('alfabetico'); setModals({ ...modals, filtros: false }); }}>
              <Text style={[styles.backLink, { color: '#F44336' }]}>LIMPIAR TODO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: SELECTOR ACCION CON LOTES */}
      <Modal visible={modals.selector} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={[styles.modalHeaderTitle, { color: '#0100D9', marginBottom: 5 }]}>{currentProduct?.nombre.toUpperCase()}</Text>
            <Text style={{ textAlign: 'center', color: '#666', marginBottom: 15 }}>Stock Total: {currentProduct?.total} {currentProduct?.unidad}</Text>

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>LOTES EN EXISTENCIA <Text style={{ fontSize: 8, color: '#E67E22' }}>(toca para reportar pérdida)</Text>:</Text>
            <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
              {currentProduct?.lotesDisponibles?.length > 0 ? (
                currentProduct.lotesDisponibles.map((lote) => (
                  <TouchableOpacity
                    key={lote.id}
                    style={styles.loteRow}
                    onPress={() => {
                      setLoteSeleccionado(lote);
                      setPerdidaForm({ cantidad: '', razon: '' });
                      setModals({ ...modals, selector: false, perdida: true });
                    }}
                  >
                    <View>
                      <Text style={styles.loteQty}>{lote.cantidad} {currentProduct.unidad}</Text>
                      <Text style={styles.loteDate}>Vencimiento: {lote.fecha_vencimiento}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <MaterialIcons
                        name="inventory"
                        size={20}
                        color={new Date(lote.fecha_vencimiento) < new Date() ? "#F44336" : "#4CAF50"}
                      />
                      <MaterialIcons name="touch-app" size={14} color="#E67E22" style={{ marginTop: 2 }} />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ textAlign: 'center', color: '#999', padding: 10 }}>Sin lotes disponibles</Text>
              )}
            </ScrollView>

            <View style={styles.divider} />

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0100D9', marginTop: 10 }]} onPress={() => { setTipoOperacion('sumar'); setModals({ ...modals, selector: false, form: true }); }}><Text style={styles.actionBtnText}>REGISTRAR ENTRADA</Text></TouchableOpacity>

            <TouchableOpacity onPress={cerrarTodo}><Text style={styles.backLink}>CANCELAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: FORMULARIO CON VALIDACIONES Y MÁSCARA */}
      <Modal visible={modals.form} transparent animationType="slide">
        <View style={styles.overlay}><ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={[styles.modalHeaderTitle, { color: tipoOperacion === 'restar' ? '#333' : '#0100D9' }]}>
            {tipoOperacion === 'nuevo' ? 'NUEVO PRODUCTO' :
              tipoOperacion === 'sumar' ? 'ENTRADA DE STOCK' :
                tipoOperacion === 'edit' ? 'EDITAR PRODUCTO' :
                  'SALIDA DE STOCK'}
          </Text>
          <View style={styles.formGroup}>
            {/* CAMPOS PARA NUEVO O EDITAR */}
            {(tipoOperacion === 'nuevo' || tipoOperacion === 'edit') && (
              <>
                <Text style={styles.fieldLabel}>NOMBRE DEL PRODUCTO</Text>
                <TextInput style={styles.formInput} value={form.nombre} onChangeText={v => setForm({ ...form, nombre: v })} />
                <Text style={styles.fieldLabel}>CATEGORÍA</Text>
                <TouchableOpacity style={styles.formInput} onPress={() => setModals({ ...modals, cats: true })}>
                  <Text style={{ color: form.categoria_id ? '#000' : '#999' }}>{form.categoria_nombre || "Seleccionar..."}</Text>
                </TouchableOpacity>

                {/* SI ES EDIT, SIEMPRE MUESTRA UNIDAD. */}
                {(tipoOperacion === 'edit' || form.es_fungible) && (
                  <>
                    <Text style={styles.fieldLabel}>UNIDAD DE MEDIDA</Text>
                    <TextInput style={styles.formInput} value={form.unidad} onChangeText={v => setForm({ ...form, unidad: v })} placeholder="Kg, Unid, Lts..." />
                  </>
                )}
              </>
            )}

            {/* CAMPOS DE OPERACIÓN (STOCK) (NO VISIBLES EN EDIT) */}
            {tipoOperacion !== 'edit' && (
              <>
                <Text style={styles.fieldLabel}>CANTIDAD</Text>
                <TextInput style={styles.formInput} keyboardType="numeric" value={form.operationValue} onChangeText={v => setForm({ ...form, operationValue: v })} placeholder="0" />

                {tipoOperacion === 'restar' ? (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>BENEFICIARIOS (OBLIGATORIO)</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ width: '48%' }}><TextInput style={styles.formInput} keyboardType="numeric" value={form.numStudents} onChangeText={v => setForm({ ...form, numStudents: v })} placeholder="Estud." /></View>
                      <View style={{ width: '48%' }}><TextInput style={styles.formInput} keyboardType="numeric" value={form.numTeachers} onChangeText={v => setForm({ ...form, numTeachers: v })} placeholder="Personal" /></View>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>PROVEEDOR / ORIGEN</Text>
                    <TouchableOpacity style={styles.formInput} onPress={() => setModals({ ...modals, provs: true })}>
                      <Text style={{ color: form.organizationName ? '#000' : '#999' }}>{form.organizationName || "Seleccionar Proveedor..."}</Text>
                    </TouchableOpacity>

                    {/* Mostrar campo de fecha solo si es fungible */}
                    {(tipoOperacion === 'nuevo' ? form.es_fungible : currentProduct?.categorias?.es_fungible !== false) ? (
                      <>
                        <Text style={styles.fieldLabel}>VENCIMIENTO (AAAA-MM-DD)</Text>
                        <TextInput
                          style={styles.formInput}
                          keyboardType="numeric"
                          value={form.fechaVencimiento}
                          onChangeText={handleDateChange}
                          placeholder="2026-05-20"
                          maxLength={10}
                        />
                      </>
                    ) : (
                      <View style={{ backgroundColor: '#FFF8E1', padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#FFE082' }}>
                        <Text style={{ color: '#F57C00', fontWeight: 'bold', fontSize: 12 }}>
                          📦 Categoría No Fungible
                        </Text>
                        <Text style={{ color: '#666', fontSize: 11 }}>
                          Este tipo de producto no requiere fecha de vencimiento.
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </View>
          <TouchableOpacity style={[styles.mainSubmitBtn, { backgroundColor: tipoOperacion === 'restar' ? '#333' : '#0100D9' }]} onPress={handleAction}>
            <Text style={styles.mainSubmitBtnText}>{tipoOperacion === 'edit' ? 'GUARDAR CAMBIOS' : 'CONFIRMAR'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModals({ ...modals, form: false })}><Text style={styles.backLink}>VOLVER</Text></TouchableOpacity>
        </ScrollView></View>
      </Modal>

      {/* MODAL: SELECCIÓN DE CATEGORIAS */}
      <Modal visible={modals.cats} transparent animationType="fade">
        <View style={styles.overlay}><View style={styles.modalContent}>
          <Text style={styles.modalHeaderTitle}>SELECCIONAR CATEGORÍA</Text>
          <ScrollView style={{ maxHeight: 350 }}>
            {categorias.map(cat => (
              <TouchableOpacity key={cat.id} style={styles.catItem} onPress={() => {
                if (tipoOperacion === 'nuevo' || tipoOperacion === 'edit') {
                  setForm({ ...form, categoria_id: cat.id, categoria_nombre: cat.nombre, es_fungible: cat.es_fungible !== false });
                  setModals({ ...modals, cats: false });
                } else {
                  setFiltroCategoria(cat);
                  setModals({ ...modals, cats: false, filtros: true });
                }
              }}>
                <View>
                  <Text style={{ fontWeight: '700', color: '#444' }}>{cat.nombre.toUpperCase()}</Text>
                  {cat.es_fungible === false && (
                    <Text style={{ fontSize: 10, color: '#E67E22' }}>📦 No requiere vencimiento</Text>
                  )}
                </View>
                <MaterialIcons
                  name={(filtroCategoria?.id === cat.id || form.categoria_id === cat.id) ? "radio-button-on" : "radio-button-off"}
                  size={20} color="#0100D9"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setModals({ ...modals, cats: false })}>
            <Text style={styles.backLink}>VOLVER</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>

      {/* MODAL: SELECCIÓN DE PROVEEDORES */}
      <Modal visible={modals.provs} transparent animationType="fade">
        <View style={styles.overlay}><View style={styles.modalContent}>
          <Text style={styles.modalHeaderTitle}>SELECCIONAR PROVEEDOR</Text>
          <ScrollView style={{ maxHeight: 350 }}>
            {proveedores.map(prov => (
              <TouchableOpacity key={prov.id} style={styles.catItem} onPress={() => {
                setForm({ ...form, organizationName: prov.nombre });
                setModals({ ...modals, provs: false });
              }}>
                <Text style={{ fontWeight: '700', color: '#444' }}>{prov.nombre.toUpperCase()}</Text>
                <MaterialIcons
                  name={form.organizationName === prov.nombre ? "radio-button-on" : "radio-button-off"}
                  size={20} color="#0100D9"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setModals({ ...modals, provs: false })}>
            <Text style={styles.backLink}>VOLVER</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>

      {/* MENU FLOTANTE */}
      <Modal visible={modals.menu} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={cerrarTodo}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setTipoOperacion('nuevo'); setModals({ ...modals, menu: false, form: true }); }}>
              <MaterialIcons name="add-box" size={22} color="#0100D9" />
              <Text style={styles.dropdownText}>Nuevo Producto</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setModals({ ...modals, menu: false, salidaPlato: true }); }}>
              <MaterialIcons name="restaurant" size={22} color="#333" />
              <Text style={styles.dropdownText}>Registrar Salida</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <TouchableOpacity style={styles.dropdownOption} onPress={() => supabase.auth.signOut()}>
              <MaterialIcons name="logout" size={22} color="#F44336" />
              <Text style={[styles.dropdownText, { color: '#F44336' }]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: SALIDA POR PLATO */}
      <Modal visible={modals.salidaPlato} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalHeaderTitle, { color: '#333' }]}>🍽️ REGISTRAR SALIDA</Text>

            {/* Selección de Plato */}
            <Text style={styles.fieldLabel}>SELECCIONAR PLATO</Text>
            <ScrollView style={{ maxHeight: 180, marginBottom: 15 }} nestedScrollEnabled>
              {platos.length > 0 ? platos.map(plato => (
                <TouchableOpacity
                  key={plato.id}
                  style={[styles.catItem, platoSeleccionado?.id === plato.id && { backgroundColor: '#E8F5E9', borderColor: '#4CAF50', borderWidth: 1, borderRadius: 8 }]}
                  onPress={() => setPlatoSeleccionado(plato)}
                >
                  <View>
                    <Text style={{ fontWeight: '700', color: '#333' }}>{plato.nombre.toUpperCase()}</Text>
                    <Text style={{ fontSize: 10, color: '#777' }}>
                      {plato.platos_ingredientes?.length || 0} ingrediente(s)
                    </Text>
                  </View>
                  <MaterialIcons
                    name={platoSeleccionado?.id === plato.id ? "radio-button-on" : "radio-button-off"}
                    size={20} color="#4CAF50"
                  />
                </TouchableOpacity>
              )) : (
                <Text style={{ textAlign: 'center', color: '#999', padding: 15 }}>No hay platos registrados</Text>
              )}
            </ScrollView>

            {/* Vista previa de ingredientes */}
            {platoSeleccionado && (
              <View style={{ backgroundColor: '#FFF8E1', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#FFE082' }}>
                <Text style={{ fontWeight: 'bold', color: '#F57C00', fontSize: 11, marginBottom: 5 }}>📦 INGREDIENTES A RESTAR:</Text>
                {platoSeleccionado.platos_ingredientes?.map((ing, idx) => (
                  <Text key={idx} style={{ fontSize: 11, color: '#666' }}>
                    • {ing.productos?.nombre || 'Producto eliminado'}: {ing.cantidad_sugerida} {ing.productos?.unidad || ''}
                  </Text>
                ))}
              </View>
            )}

            {/* Beneficiarios */}
            <Text style={styles.fieldLabel}>BENEFICIARIOS</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '48%' }}>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  value={salidaPlatoForm.numStudents}
                  onChangeText={v => setSalidaPlatoForm({ ...salidaPlatoForm, numStudents: v })}
                  placeholder="Estudiantes"
                />
              </View>
              <View style={{ width: '48%' }}>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  value={salidaPlatoForm.numTeachers}
                  onChangeText={v => setSalidaPlatoForm({ ...salidaPlatoForm, numTeachers: v })}
                  placeholder="Personal"
                />
              </View>
            </View>

            {/* Botón de confirmar */}
            <TouchableOpacity
              style={[styles.mainSubmitBtn, { backgroundColor: '#333' }]}
              onPress={async () => {
                if (!platoSeleccionado) return Alert.alert('Error', 'Selecciona un plato');
                const estudiantes = parseInt(salidaPlatoForm.numStudents) || 0;
                const profesores = parseInt(salidaPlatoForm.numTeachers) || 0;
                if (estudiantes + profesores <= 0) return Alert.alert('Error', 'Ingresa al menos un beneficiario');

                setLoading(true);
                try {
                  // NUEVA LÓGICA: Iterar desde el cliente para controlar la cantidad exacta
                  // sin multiplicar por número de personas (según requerimiento)

                  const promises = platoSeleccionado.platos_ingredientes.map(async (ing) => {
                    // La cantidad a descontar es la sugerida, SIN MULTIPLICAR
                    const cantidadADescontar = ing.cantidad_sugerida;
                    if (cantidadADescontar <= 0) return;

                    return supabase.rpc('registrar_salida_fifo', {
                      p_producto_id: ing.productos.id,
                      p_cantidad_total: cantidadADescontar,
                      p_estudiantes: estudiantes,
                      p_profesores: profesores
                    });
                  });

                  const results = await Promise.all(promises);

                  // Verificar si hubo errores en alguna de las llamadas
                  const errors = results.filter(r => r.error);
                  if (errors.length > 0) throw errors[0].error;

                  Alert.alert('Éxito', 'Salida registrada correctamente.');
                  cerrarTodo();
                  cargarProductos();

                } catch (e) {
                  Alert.alert('Error', e.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainSubmitBtnText}>CONFIRMAR SALIDA</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={cerrarTodo}>
              <Text style={styles.backLink}>CANCELAR</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL: REPORTE DE PÉRDIDA */}
      <Modal visible={modals.perdida} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalHeaderTitle, { color: '#E74C3C' }]}>⚠️ REPORTE DE PÉRDIDA</Text>

            {/* Info del producto y lote */}
            <View style={{ backgroundColor: '#FFF5F5', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#FFCCCC' }}>
              <Text style={{ fontWeight: 'bold', color: '#333' }}>{currentProduct?.nombre}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>
                Lote seleccionado: {loteSeleccionado?.cantidad} {currentProduct?.unidad} • Vence: {loteSeleccionado?.fecha_vencimiento}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>CANTIDAD PERDIDA</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={perdidaForm.cantidad}
              onChangeText={v => setPerdidaForm({ ...perdidaForm, cantidad: v })}
              placeholder={`Máximo: ${loteSeleccionado?.cantidad || 0}`}
            />

            <Text style={styles.fieldLabel}>RAZÓN / DESCRIPCIÓN DE LA PÉRDIDA</Text>
            <TextInput
              style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={4}
              value={perdidaForm.razon}
              onChangeText={v => setPerdidaForm({ ...perdidaForm, razon: v })}
              placeholder="Describa detalladamente la razón de la pérdida..."
            />

            <TouchableOpacity
              style={[styles.mainSubmitBtn, { backgroundColor: '#E74C3C', marginTop: 10 }]}
              onPress={async () => {
                const qty = parseInt(perdidaForm.cantidad);

                // Validaciones
                if (!qty || qty <= 0) {
                  return Alert.alert('Error', 'Ingresa una cantidad válida');
                }
                if (qty > loteSeleccionado?.cantidad) {
                  return Alert.alert('Error', `La cantidad no puede ser mayor a ${loteSeleccionado?.cantidad}`);
                }
                if (!perdidaForm.razon.trim()) {
                  return Alert.alert('Error', 'Debes escribir la razón de la pérdida');
                }

                setLoading(true);
                try {
                  // Obtener usuario actual
                  const { data: { user } } = await supabase.auth.getUser();
                  const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single();
                  const nombreUsuario = perfil?.nombre || user.email;

                  // 1. Calcular nueva cantidad del lote y actualizarlo
                  const nuevaCantidad = loteSeleccionado.cantidad - qty;

                  // Actualizar lote
                  const { error: updateLoteError } = await supabase
                    .from('lotes')
                    .update({ cantidad: nuevaCantidad })
                    .eq('id', loteSeleccionado.id);

                  if (updateLoteError) throw updateLoteError;

                  // 2. Guardar en la tabla reportes_perdida
                  const { error: dbError } = await supabase.from('reportes_perdida').insert({
                    producto_id: currentProduct.id,
                    producto_nombre: currentProduct.nombre,
                    lote_id: loteSeleccionado.id,
                    cantidad: qty,
                    unidad: currentProduct.unidad,
                    razon: perdidaForm.razon.trim(),
                    usuario_id: user.id,
                    usuario_nombre: nombreUsuario
                  });

                  if (dbError) throw dbError;

                  // 3. Generar y enviar PDF por correo
                  await sendPerdidaReportByEmail({
                    productoNombre: currentProduct.nombre,
                    cantidad: qty,
                    unidad: currentProduct.unidad,
                    loteVencimiento: loteSeleccionado.fecha_vencimiento,
                    razon: perdidaForm.razon.trim(),
                    usuarioNombre: nombreUsuario,
                    fecha: new Date().toISOString()
                  });

                  Alert.alert('Éxito', 'Reporte de pérdida registrado y stock actualizado.');
                  cerrarTodo();
                  cargarProductos();

                } catch (error) {
                  console.error('Error en reporte de pérdida:', error);
                  Alert.alert('Error', error.message || 'No se pudo procesar el reporte');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.mainSubmitBtnText}>GENERAR REPORTE</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModals({ ...modals, perdida: false, selector: true })}>
              <Text style={styles.backLink}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontWeight: '600' },
  loteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F9F9F9', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
  loteQty: { fontWeight: 'bold', color: '#333' },
  loteDate: { fontSize: 11, color: '#777' }
});