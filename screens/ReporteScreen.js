import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert, Modal,
  ActivityIndicator, Image, SafeAreaView, StatusBar, StyleSheet, ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../supabaseClient';
import { sendReportByEmail } from '../services/ReportService';

export default function ReporteScreen({ navigation }) {
  const [registrosSuma, setRegistrosSuma] = useState([]);
  const [registrosResta, setRegistrosResta] = useState([]);
  const [planificacion, setPlanificacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState('sumas');
  const [modals, setModals] = useState({ menu: false });
  const [fechaInicial, setFechaInicial] = useState(null);
  const [fechaSecundaria, setFechaSecundaria] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState({ show: false, type: 'inicial' });

  useEffect(() => { cargarTodosLosDatos(); }, []);

  const cargarTodosLosDatos = async () => {
    try {
      setLoading(true);

      // 1. Cargar Entradas
      const { data: sData } = await supabase.from('registros_suma').select('*').order('fecha', { ascending: false });

      // 2. Cargar Salidas
      const { data: rData } = await supabase.from('registros_resta').select('*').order('fecha', { ascending: false });

      // 3. Cargar Planificación con RELACIONES (Platos -> Ingredientes -> Productos)
      const { data: pData, error: pError } = await supabase
        .from('planificacion_semanal')
        .select(`
          id, 
          fecha_menu, 
          turno, 
          notas, 
          platos (
            nombre,
            platos_ingredientes (
              cantidad_sugerida,
              productos (nombre, unidad)
            )
          )
        `)
        .order('fecha_menu', { ascending: false });

      if (pError) throw pError;

      setRegistrosSuma(sData || []);
      setRegistrosResta(rData || []);
      setPlanificacion(pData || []);
    } catch (e) {
      Alert.alert('Error', 'No se cargaron los datos correctamente');
      console.error("Detalle error carga:", e);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado optimizado con useMemo
  const dataFiltrada = useMemo(() => {
    let data = selectedList === 'sumas' ? registrosSuma : selectedList === 'restas' ? registrosResta : planificacion;

    if (fechaInicial && fechaSecundaria) {
      const inicio = new Date(fechaInicial).setHours(0, 0, 0, 0);
      const fin = new Date(fechaSecundaria).setHours(23, 59, 59, 999);

      return data.filter(item => {
        const rawDate = item.fecha || item.fecha_menu || item.created_at;
        const d = new Date(rawDate).getTime();
        return d >= inicio && d <= fin;
      });
    }
    return data;
  }, [selectedList, registrosSuma, registrosResta, planificacion, fechaInicial, fechaSecundaria]);

  const opcionesTablas = [
    { id: 'sumas', label: 'ENTRADAS', icon: 'add-circle', color: '#0100D9' },
    { id: 'restas', label: 'SALIDAS', icon: 'remove-circle', color: '#F44336' },
    { id: 'menus', label: 'PLANIFICACIÓN', icon: 'event-note', color: '#4CAF50' },
  ];

  const currentConfig = opcionesTablas.find(o => o.id === selectedList);

  const handleEnviarReporte = async () => {
    setModals(prev => ({ ...prev, menu: false }));

    if (!fechaInicial || !fechaSecundaria) {
      return Alert.alert("Aviso", "Seleccione el rango de fechas para el reporte.");
    }

    if (dataFiltrada.length === 0) {
      return Alert.alert("Aviso", "No hay datos en este rango para exportar.");
    }

    try {
      setLoading(true);
      await sendReportByEmail(
        dataFiltrada,
        {
          ...currentConfig,
          type: selectedList,
          title: currentConfig.label
        },
        {
          inicio: fechaInicial.toLocaleDateString(),
          fin: fechaSecundaria.toLocaleDateString()
        }
      );
    } catch (e) {
      Alert.alert("Error de Reporte", e.message || "No se pudo generar el PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <View style={styles.headerLeftContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={30} color="#0100D9" /></TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>REPORTES</Text>
            <Text style={styles.headerSubtitle}>UNERG - COMEDOR</Text>
          </View>
        </View>
        <View style={styles.headerRightContainer}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <TouchableOpacity onPress={() => setModals({ menu: true })}>
            <MaterialIcons name="menu" size={30} color="#0100D9" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.fieldLabel}>RANGO DE CONSULTA (SEMANAL/MENSUAL)</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker({ show: true, type: 'inicial' })}>
            <MaterialIcons name="calendar-today" size={18} color="#0100D9" />
            <Text style={styles.dateText}>{fechaInicial ? fechaInicial.toLocaleDateString() : 'Desde'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker({ show: true, type: 'secundaria' })}>
            <MaterialIcons name="event" size={18} color="#0100D9" />
            <Text style={styles.dateText}>{fechaSecundaria ? fechaSecundaria.toLocaleDateString() : 'Hasta'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {opcionesTablas.map((op) => (
            <TouchableOpacity
              key={op.id}
              onPress={() => setSelectedList(op.id)}
              style={[styles.tabItem, selectedList === op.id && { backgroundColor: op.color, borderColor: op.color }]}
            >
              <MaterialIcons name={op.icon} size={18} color={selectedList === op.id ? '#FFF' : op.color} />
              <Text style={[styles.tabLabel, { color: selectedList === op.id ? '#FFF' : '#666' }]}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#0100D9" /></View>
      ) : (
        <FlatList
          data={dataFiltrada}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {selectedList === 'menus' ? (item.platos?.nombre || 'Sin plato') : item.producto_nombre}
                </Text>
                <Text style={styles.itemSub}>
                  {selectedList === 'sumas' && `Cant: ${item.cantidad} • ${item.organizacion}`}
                  {selectedList === 'restas' && `Cant: ${item.cantidad} • Atendidos: ${item.estudiantes + item.profesores}`}
                  {selectedList === 'menus' && `${item.turno} ${item.notas ? `• ${item.notas}` : ''}`}
                </Text>
                <Text style={styles.itemDate}>
                  {new Date(item.fecha || item.fecha_menu).toLocaleDateString()}
                </Text>
              </View>
              <MaterialIcons
                name={selectedList === 'sumas' ? 'add-box' : selectedList === 'restas' ? 'indeterminate-check-box' : 'assignment'}
                size={24} color={currentConfig.color}
              />
            </View>
          )}
        />
      )}

      {/* Modal de Opciones */}
      <Modal visible={modals.menu} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModals({ menu: false })}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownOption} onPress={handleEnviarReporte}>
              <MaterialIcons name="picture-as-pdf" size={22} color="#E91E63" /><Text style={styles.dropdownText}>Exportar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownOption} onPress={() => { setFechaInicial(null); setFechaSecundaria(null); setModals({ menu: false }); }}>
              <MaterialIcons name="refresh" size={22} color="#FF9800" /><Text style={styles.dropdownText}>Limpiar Filtros</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {showDatePicker.show && (
        <DateTimePicker
          value={new Date()} mode="date"
          onChange={(e, d) => {
            setShowDatePicker({ ...showDatePicker, show: false });
            if (d) showDatePicker.type === 'inicial' ? setFechaInicial(d) : setFechaSecundaria(d);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 95, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerLeftContainer: { flexDirection: 'row', alignItems: 'center' },
  headerRightContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#0100D9', fontSize: 20, fontWeight: '900' },
  headerSubtitle: { color: '#666', fontSize: 10, fontWeight: '700' },
  logo: { width: 65, height: 65, resizeMode: 'contain', marginRight: 8 },
  filterSection: { padding: 15, backgroundColor: '#F8F9FA' },
  fieldLabel: { color: '#0100D9', fontWeight: '800', fontSize: 11, marginBottom: 8, letterSpacing: 0.5 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, width: '48%', borderWidth: 1, borderColor: '#E0E0E0' },
  dateText: { marginLeft: 8, fontSize: 13, color: '#444', fontWeight: '600' },
  tabBarContainer: { paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabScrollContent: { paddingHorizontal: 15 },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#EEE', marginRight: 10, backgroundColor: '#FDFDFD' },
  tabLabel: { marginLeft: 8, fontSize: 12, fontWeight: '800' },
  itemCard: { paddingHorizontal: 25, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', flexDirection: 'row', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  itemSub: { color: '#777', fontSize: 13, marginTop: 3 },
  itemDate: { color: '#AAA', fontSize: 11, marginTop: 5, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dropdownMenu: { position: 'absolute', top: 80, right: 20, backgroundColor: '#fff', padding: 8, borderRadius: 15, minWidth: 200, elevation: 12 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15 },
  dropdownText: { marginLeft: 12, fontWeight: '700', color: '#444', fontSize: 14 }
});