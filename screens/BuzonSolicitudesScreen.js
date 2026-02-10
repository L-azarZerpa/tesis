import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function BuzonSolicitudesScreen({ navigation }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarSolicitudes();

    const channel = supabase
      .channel('buzon_solicitudes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_ajuste' },
        () => {
          cargarSolicitudes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cargarSolicitudes = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_ajuste')
        .select('*')
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalle = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setModalVisible(true);
    setMotivoRechazo('');
  };

  const procesarSolicitud = async (accion) => {
    if (accion === 'rechazar' && !motivoRechazo.trim()) {
      Alert.alert('Error', 'Debe proporcionar un motivo de rechazo');
      return;
    }

    setProcesando(true);

    try {
      const { data, error } = await supabase.rpc('procesar_solicitud_ajuste', {
        p_solicitud_id: solicitudSeleccionada.id,
        p_accion: accion,
        p_motivo_rechazo: accion === 'rechazar' ? motivoRechazo.trim() : null,
      });

      if (error) throw error;

      Alert.alert(
        'Éxito',
        accion === 'aprobar'
          ? 'Solicitud aprobada correctamente'
          : 'Solicitud rechazada',
        [
          {
            text: 'OK',
            onPress: () => {
              setModalVisible(false);
              cargarSolicitudes();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error procesando solicitud:', error);
      Alert.alert('Error', error.message || 'No se pudo procesar la solicitud');
    } finally {
      setProcesando(false);
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'perdida': return '#E74C3C';
      case 'dano': return '#E67E22';
      case 'vencimiento': return '#F39C12';
      case 'acceso': return '#3498DB';
      case 'entrada': return '#2ECC71';
      case 'salida': return '#E67E22';
      default: return '#95A5A6';
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'perdida': return 'Pérdida';
      case 'dano': return 'Daño';
      case 'vencimiento': return 'Vencimiento';
      case 'acceso': return 'Acceso';
      case 'entrada': return 'Entrada';
      case 'salida': return 'Salida';
      default: return tipo;
    }
  };

  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const renderSolicitud = ({ item }) => {
    let iconName = "error-outline";
    switch (item.tipo_ajuste) {
      case 'perdida': iconName = "broken-image"; break;
      case 'dano': iconName = "warning"; break;
      case 'vencimiento': iconName = "event-busy"; break;
      case 'acceso': iconName = "vpn-key"; break;
      case 'entrada': iconName = "add-circle"; break;
      case 'salida': iconName = "remove-circle"; break;
    }

    return (
      <TouchableOpacity style={styles.solicitudCard} onPress={() => abrirDetalle(item)}>
        <View style={[styles.tipoIndicator, { backgroundColor: getTipoColor(item.tipo_ajuste) }]} />

        <View style={styles.solicitudContent}>
          <View style={styles.solicitudHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name={iconName} size={18} color={getTipoColor(item.tipo_ajuste)} style={{ marginRight: 5 }} />
              <Text style={styles.productoNombre}>
                {item.tipo_ajuste === 'acceso' ? 'SOLICITUD DE ACCESO' : (item.producto_nombre || item.datos?.nombre || 'Producto')}
              </Text>
            </View>
            <View style={[styles.tipoBadge, { backgroundColor: getTipoColor(item.tipo_ajuste) }]}>
              <Text style={styles.tipoBadgeText}>{getTipoLabel(item.tipo_ajuste)}</Text>
            </View>
          </View>

          {item.tipo_ajuste !== 'acceso' && (
            <Text style={styles.cantidad}>Cantidad: {item.cantidad} {item.datos?.unidad || ''}</Text>
          )}

          <View style={styles.solicitudFooter}>
            <View style={styles.empleadoInfo}>
              <MaterialIcons name="person" size={14} color="#7F8C8D" />
              <Text style={styles.empleadoNombre}>{item.empleado_nombre}</Text>
            </View>
            <Text style={styles.fecha}>{formatFecha(item.created_at || item.fecha_solicitud)}</Text>
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={24} color="#BDC3C7" />
      </TouchableOpacity>
    );
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
          <Text style={styles.headerTitle}>Buzón de Solicitudes</Text>
          <Text style={styles.headerSubtitle}>
            {solicitudes.length} pendiente{solicitudes.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={cargarSolicitudes}>
          <MaterialIcons name="refresh" size={28} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9B59B6" />
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={item => item.id}
          renderItem={renderSolicitud}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color="#BDC3C7" />
              <Text style={styles.emptyText}>No hay solicitudes pendientes</Text>
              <Text style={styles.emptySubtext}>Las nuevas solicitudes aparecerán aquí</Text>
            </View>
          }
        />
      )}

      {/* Modal de Detalle */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {/* Header del Modal */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalle de Solicitud</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={28} color="#2C3E50" />
                </TouchableOpacity>
              </View>

              {solicitudSeleccionada && (
                <>
                  {/* Información del Producto */}
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>PRODUCTO</Text>
                    <Text style={styles.infoValue}>{solicitudSeleccionada.producto_nombre}</Text>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>CANTIDAD A AJUSTAR</Text>
                    <Text style={[styles.infoValue, { color: '#E74C3C', fontSize: 24, fontWeight: '900' }]}>
                      {solicitudSeleccionada.cantidad} unidades
                    </Text>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>TIPO DE AJUSTE</Text>
                    <View style={[styles.tipoBadgeLarge, { backgroundColor: getTipoColor(solicitudSeleccionada.tipo_ajuste) }]}>
                      <Text style={styles.tipoBadgeLargeText}>{getTipoLabel(solicitudSeleccionada.tipo_ajuste)}</Text>
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>RAZÓN</Text>
                    <View style={styles.razonBox}>
                      <Text style={styles.razonText}>{solicitudSeleccionada.razon}</Text>
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>SOLICITADO POR</Text>
                    <View style={styles.empleadoBox}>
                      <MaterialIcons name="person" size={20} color="#9B59B6" />
                      <Text style={styles.empleadoBoxText}>{solicitudSeleccionada.empleado_nombre}</Text>
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>FECHA DE SOLICITUD</Text>
                    <Text style={styles.infoValue}>{formatFecha(solicitudSeleccionada.fecha_solicitud)}</Text>
                  </View>

                  {/* Campo de Rechazo */}
                  <View style={styles.rechazoSection}>
                    <Text style={styles.rechazoLabel}>Motivo de rechazo (opcional)</Text>
                    <TextInput
                      style={styles.rechazoInput}
                      placeholder="Escriba el motivo si va a rechazar..."
                      value={motivoRechazo}
                      onChangeText={setMotivoRechazo}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Botones de Acción */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.aprobarButton]}
                      onPress={() => procesarSolicitud('aprobar')}
                      disabled={procesando}
                    >
                      {procesando ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <MaterialIcons name="check-circle" size={24} color="#FFF" />
                          <Text style={styles.actionButtonText}>APROBAR AJUSTE</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.rechazarButton]}
                      onPress={() => procesarSolicitud('rechazar')}
                      disabled={procesando}
                    >
                      {procesando ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <MaterialIcons name="cancel" size={24} color="#FFF" />
                          <Text style={styles.actionButtonText}>RECHAZAR</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 15 },
  solicitudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipoIndicator: {
    width: 5,
    height: '100%',
    position: 'absolute',
    left: 0,
  },
  solicitudContent: {
    flex: 1,
    padding: 15,
    paddingLeft: 20,
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productoNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  tipoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tipoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  cantidad: {
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '600',
    marginBottom: 8,
  },
  solicitudFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empleadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empleadoNombre: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  fecha: {
    fontSize: 11,
    color: '#95A5A6',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#95A5A6',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2C3E50',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#7F8C8D',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tipoBadgeLarge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  tipoBadgeLargeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  razonBox: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#9B59B6',
  },
  razonText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  empleadoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4ECF7',
    padding: 12,
    borderRadius: 10,
  },
  empleadoBoxText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9B59B6',
    marginLeft: 8,
  },
  rechazoSection: {
    marginBottom: 20,
  },
  rechazoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E74C3C',
    marginBottom: 8,
  },
  rechazoInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#2C3E50',
    minHeight: 80,
  },
  actionsContainer: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  aprobarButton: {
    backgroundColor: '#27AE60',
  },
  rechazarButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 10,
  },
});
