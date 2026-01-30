import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './supabaseClient'; 

// Importación de Pantallas
import InventarioScreen from './screens/InventarioScreen';
import ReporteScreen from './screens/ReporteScreen';
import LoginScreen from './screens/LoginScreen'; 
import RegisterScreen from './screens/RegisterScreen'; 
import MenusScreen from './screens/MenusScreen'; 
import EstudianteScreen from './screens/EstudianteScreen';

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sesión inicial y extraer rol de los metadatos
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      // Extraemos el rol de user_metadata (lo que pusimos vía SQL)
      const userRole = session?.user?.user_metadata?.role || 'estudiante';
      setRole(userRole);
      
      setLoading(false);
    };

    initializeAuth();

    // 2. Escuchar cambios de Auth (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const userRole = session?.user?.user_metadata?.role || 'estudiante';
      setRole(userRole);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0100D9" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          // SI ESTÁ LOGUEADO
          role === 'admin' ? (
            <>
              <Stack.Screen name="Inventario" component={InventarioScreen} />
              <Stack.Screen name="Menus" component={MenusScreen} /> 
              <Stack.Screen name="Reporte" component={ReporteScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="EstudianteHome" component={EstudianteScreen} />
            </>
          )
        ) : (
          // SI NO ESTÁ LOGUEADO
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}