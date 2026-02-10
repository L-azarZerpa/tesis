import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, ScrollView,
  ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, Switch 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

export default function CrearEditarUsuarioScreen({ route, navigation }) {
  const { usuario, currentUserRole } = route.params || {};
  const isEditing = !!usuario;

  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    password: '',
    rol: usuario?.role || 'admin',
    activo: usuario?.verificado ?? true,
  });
  const [loading, setLoading] = useState(false);

  // Roles disponibles según el rol del usuario actual
  const getRolesDisponibles = () => {
    if (currentUserRole === 'super_admin') {
      return [
        { value: 'super_admin', label: 'Super Admin', icon: 'admin-panel-settings', color: '#E74C3C' },
        { value: 'jefe', label: 'Jefe', icon: 'supervisor-account', color: '#9B59B6' },
        { value: 'admin', label: 'Trabajador', icon: 'badge', color: '#1ABC9C' },
      ];
    } else {
      // Jefe solo puede crear jefes y trabajadores
      return [
        { value: 'jefe', label: 'Jefe', icon: 'supervisor-account', color: '#9B59B6' },
        { value: 'admin', label: 'Trabajador', icon: 'badge', color: '#1ABC9C' },
      ];
    }
  };

  const roles = getRolesDisponibles();

  const handleSave = async () => {
    // Validaciones
    if (!form.nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    if (!form.email.trim()) {
      Alert.alert('Error', 'El email es obligatorio');
      return;
    }

    if (!isEditing && !form.password) {
      Alert.alert('Error', 'La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    if (!isEditing && form.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        // Actualizar usuario existente
        const { error: updateError } = await supabase
          .from('perfiles')
          .update({
          nombre: form.nombre.trim(),
            role: form.rol,
            verificado: form.activo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usuario.id);

        if (updateError) throw updateError;

        // Registrar log
        await supabase.rpc('registrar_log_auditoria', {
          p_accion: 'ACTUALIZAR_USUARIO',
          p_descripcion: `Usuario ${form.nombre} actualizado`,
          p_tabla_afectada: 'perfiles',
          p_registro_id: usuario.id,
        });

        Alert.alert('Éxito', 'Usuario actualizado correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Crear nuevo usuario
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              role: form.rol,
            },
          },
        });

        if (authError) throw authError;

        // Actualizar perfil con nombre
        if (authData.user) {
          await supabase
            .from('perfiles')
            .update({
              nombre: form.nombre.trim(),
              verificado: form.activo,
            })
            .eq('id', authData.user.id);

          // Registrar log
          await supabase.rpc('registrar_log_auditoria', {
            p_accion: 'CREAR_USUARIO',
            p_descripcion: `Usuario ${form.nombre} (${form.rol}) creado`,
            p_tabla_afectada: 'perfiles',
            p_registro_id: authData.user.id,
          });
        }

        Alert.alert('Éxito', 'Usuario creado correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error guardando usuario:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    Alert.alert(
      'Resetear Contraseña',
      '¿Enviar email de recuperación a ' + form.email + '?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(form.email);
              if (error) throw error;
              Alert.alert('Éxito', 'Email de recuperación enviado');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // Función para eliminar usuario
  const handleDelete = () => {
    Alert.alert(
      'Eliminar Usuario',
      `¿Estás seguro de eliminar a ${form.nombre || form.email}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Registrar log antes de eliminar
              await supabase.rpc('registrar_log_auditoria', {
                p_accion: 'ELIMINAR_USUARIO',
                p_descripcion: `Usuario ${form.nombre} (${form.email}) eliminado`,
                p_tabla_afectada: 'perfiles',
                p_registro_id: usuario.id,
              });

              // Eliminar de perfiles
              const { error } = await supabase
                .from('perfiles')
                .delete()
                .eq('id', usuario.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Usuario eliminado correctamente', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Error eliminando usuario:', error);
              Alert.alert('Error', error.message || 'No se pudo eliminar el usuario');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={28} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Nombre */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre Completo *</Text>
          <TextInput
            style={styles.input}
            value={form.nombre}
            onChangeText={(text) => setForm({ ...form, nombre: text })}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor="#95A5A6"
          />
        </View>

        {/* Email */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Correo Electrónico *</Text>
          <TextInput
            style={[styles.input, isEditing && styles.inputDisabled]}
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            placeholder="usuario@unerg.edu.ve"
            placeholderTextColor="#95A5A6"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isEditing}
          />
        </View>

        {/* Contraseña */}
        {!isEditing && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña *</Text>
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#95A5A6"
              secureTextEntry
            />
          </View>
        )}

        {isEditing && (
          <TouchableOpacity 
            style={styles.resetPasswordBtn}
            onPress={handleResetPassword}
          >
            <MaterialIcons name="lock-reset" size={20} color="#3498DB" />
            <Text style={styles.resetPasswordText}>Enviar email de recuperación</Text>
          </TouchableOpacity>
        )}

        {/* Rol */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Rol del Usuario *</Text>
          <View style={styles.rolesContainer}>
            {roles.map((rol) => (
              <TouchableOpacity
                key={rol.value}
                style={[
                  styles.rolCard,
                  form.rol === rol.value && { 
                    borderColor: rol.color, 
                    borderWidth: 2,
                    backgroundColor: rol.color + '10' 
                  }
                ]}
                onPress={() => setForm({ ...form, rol: rol.value })}
              >
                <MaterialIcons 
                  name={rol.icon} 
                  size={32} 
                  color={form.rol === rol.value ? rol.color : '#95A5A6'} 
                />
                <Text style={[
                  styles.rolLabel,
                  form.rol === rol.value && { color: rol.color, fontWeight: '900' }
                ]}>
                  {rol.label}
                </Text>
                {form.rol === rol.value && (
                  <View style={[styles.checkmark, { backgroundColor: rol.color }]}>
                    <MaterialIcons name="check" size={16} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Estado Activo/Inactivo */}
        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <View style={styles.switchLabel}>
              <MaterialIcons 
                name={form.activo ? "check-circle" : "cancel"} 
                size={24} 
                color={form.activo ? '#27AE60' : '#E74C3C'} 
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.switchTitle}>
                  Usuario {form.activo ? 'Activo' : 'Inactivo'}
                </Text>
                <Text style={styles.switchDesc}>
                  {form.activo 
                    ? 'El usuario puede acceder al sistema' 
                    : 'El usuario no podrá iniciar sesión'}
                </Text>
              </View>
            </View>
            <Switch
              value={form.activo}
              onValueChange={(value) => setForm({ ...form, activo: value })}
              trackColor={{ false: '#E74C3C', true: '#27AE60' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botón Eliminar - Solo en modo edición */}
        {isEditing && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={loading}
          >
            <MaterialIcons name="delete" size={20} color="#FFF" />
            <Text style={styles.deleteButtonText}>Eliminar Usuario</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#2C3E50' },
  content: { flex: 1, padding: 20 },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 15,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputDisabled: {
    backgroundColor: '#F8F9FA',
    color: '#95A5A6',
  },
  resetPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#EBF5FB',
    borderRadius: 10,
    marginBottom: 20,
  },
  resetPasswordText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#3498DB',
  },
  rolesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rolCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  rolLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
  },
  switchDesc: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#3498DB',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  saveButtonDisabled: {
    backgroundColor: '#95A5A6',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#E74C3C',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
