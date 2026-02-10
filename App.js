import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { supabase } from "./supabaseClient";

// Importación de Pantallas
import InventarioScreen from "./screens/InventarioScreen";
import ReporteScreen from "./screens/ReporteScreen";
import LoginScreen from "./screens/LoginScreen";

import MenusScreen from "./screens/MenusScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";

import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import VerifyEmailScreen from "./screens/VerifyEmailScreen";

// Pantallas Super Admin
import SuperAdminDashboardScreen from "./screens/SuperAdminDashboardScreen";
import GestionUsuariosScreen from "./screens/GestionUsuariosScreen";
import CrearEditarUsuarioScreen from "./screens/CrearEditarUsuarioScreen";
import AuditoriaLogsScreen from "./screens/AuditoriaLogsScreen";
import ConfiguracionGlobalScreen from "./screens/ConfiguracionGlobalScreen";

// Pantallas Jefe
import JefeDashboardScreen from "./screens/JefeDashboardScreen";
import BuzonSolicitudesScreen from "./screens/BuzonSolicitudesScreen";
import InventarioMonitoreoScreen from "./screens/InventarioMonitoreoScreen";

// Pantallas Empleado
import EmpleadoSolicitarAjusteScreen from "./screens/EmpleadoSolicitarAjusteScreen";

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sesión inicial y extraer rol de los metadatos
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      // Extraemos el rol de user_metadata (lo que pusimos vía SQL)
      const userRole = session?.user?.user_metadata?.role || "admin";
      setRole(userRole);

      setLoading(false);
    };

    initializeAuth();

    // 2. Escuchar cambios de Auth (Login/Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const userRole = session?.user?.user_metadata?.role || "admin";
      setRole(userRole);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0100D9" />
      </View>
    );
  }

  return (
    <NavigationContainer
      linking={{
        prefixes: ["tesistopo://", "exp://"],
        config: {
          screens: {
            ResetPassword: "reset-password",
            Login: "login",
          },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          // SI ESTÁ LOGUEADO - NAVEGACIÓN POR ROLES
          role === "super_admin" ? (
            <>
              <Stack.Screen
                name="SuperAdminDashboard"
                component={SuperAdminDashboardScreen}
              />
              <Stack.Screen
                name="GestionUsuarios"
                component={GestionUsuariosScreen}
              />
              <Stack.Screen
                name="CrearEditarUsuario"
                component={CrearEditarUsuarioScreen}
              />
              <Stack.Screen
                name="AuditoriaLogs"
                component={AuditoriaLogsScreen}
              />
              <Stack.Screen
                name="ConfiguracionGlobal"
                component={ConfiguracionGlobalScreen}
              />
            </>
          ) : role === "jefe" ? (
            <>
              <Stack.Screen
                name="JefeDashboard"
                component={JefeDashboardScreen}
              />
              <Stack.Screen
                name="BuzonSolicitudes"
                component={BuzonSolicitudesScreen}
              />
              <Stack.Screen
                name="Inventario"
                component={InventarioScreen}
              />
              <Stack.Screen
                name="InventarioMonitoreo"
                component={InventarioMonitoreoScreen}
              />
              <Stack.Screen name="Reporte" component={ReporteScreen} />
              <Stack.Screen name="Menus" component={MenusScreen} />
              <Stack.Screen
                name="AuditoriaLogs"
                component={AuditoriaLogsScreen}
              />
              <Stack.Screen
                name="GestionUsuarios"
                component={GestionUsuariosScreen}
              />
              <Stack.Screen
                name="CrearEditarUsuario"
                component={CrearEditarUsuarioScreen}
              />
            </>
          ) : role === "admin" ? (
            // ADMIN = TRABAJADOR/EMPLEADO (gestiona inventario)
            <>
              <Stack.Screen
                name="EmpleadoSolicitarAjuste"
                component={EmpleadoSolicitarAjusteScreen}
              />
              <Stack.Screen name="Menus" component={MenusScreen} />
              <Stack.Screen name="Reporte" component={ReporteScreen} />
            </>
          ) : null
        ) : (
          // SI NO ESTÁ LOGUEADO
          <>
            <Stack.Screen name="Login" component={LoginScreen} />

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />

            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
