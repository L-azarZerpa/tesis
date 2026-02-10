import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuración para que la alerta suene y se vea incluso con la app abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const scheduleVencimientoNotifications = async (productoNombre, fechaVencimiento) => {
  try {
    const fechaVenc = new Date(fechaVencimiento + 'T08:00:00');
    const hoy = new Date();

    // Diferencia real en días (redondeado hacia arriba)
    const diferenciaDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

    // --- 1. CASO INSTANTÁNEO: YA VENCIDO ---
    if (diferenciaDias <= 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "¡PRODUCTO VENCIDO! 🚨",
          body: `El producto ${productoNombre} ya caducó o vence hoy. ¡Retíralo de estantería!`,
          priority: 'high',
          sound: true,
        },
        trigger: null, // Envío inmediato
      });
      return;
    }

    // --- 2. DEFINICIÓN DE ESCALA DE RECORDATORIOS ---
    const recordatorios = [
      { dias: 30, titulo: "Aviso: 1 Mes 🗓️", cuerpo: `A ${productoNombre} le queda un mes para vencer.` },
      { dias: 7, titulo: "Aviso: 1 Semana 📋", cuerpo: `Falta una semana para que venza ${productoNombre}.` },
      { dias: 4, titulo: "Vencimiento Cercano ⏳", cuerpo: `Aviso: Menos de 4 días para que venza ${productoNombre}.` },
      { dias: 3, titulo: "CRÍTICO: 3 Días ⚠️", cuerpo: `${productoNombre} vence en 3 días. Priorizar uso.` },
      { dias: 2, titulo: "CRÍTICO: 2 Días ⚠️", cuerpo: `${productoNombre} vence pasado mañana.` },
      { dias: 1, titulo: "MAÑANA VENCE 🔴", cuerpo: `Último día: ${productoNombre} vence mañana.` }
    ];

    // --- 3. PROGRAMACIÓN AUTOMÁTICA ---
    // --- 3. PROGRAMACIÓN AUTOMÁTICA EN PARALELO ---
    const promises = recordatorios.map(async (aviso) => {
      const fechaTrigger = new Date(fechaVenc);
      fechaTrigger.setDate(fechaVenc.getDate() - aviso.dias);

      // Programamos todas para las 8:30 AM del día que corresponda
      fechaTrigger.setHours(8, 30, 0);

      // Solo programamos si la fecha del recordatorio aún no ha pasado
      if (fechaTrigger > hoy) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: aviso.titulo,
            body: aviso.cuerpo,
            data: { productoNombre },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(2, Math.floor((fechaTrigger.getTime() - Date.now()) / 1000)),
            repeats: false,
          },
        });
      }
    });

    await Promise.all(promises);

    // --- 4. AVISO DE CORTESÍA ---
    // Si falta poco para que venza al momento de registrarlo, avisamos que el rastreo inició
    if (diferenciaDias <= 7) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Rastreo de Vencimiento 🔔",
          body: `Registrado: ${productoNombre}. Recibirás alertas diarias pronto.`,
        },
        trigger: null,
      });
    }

  } catch (error) {
    console.error("Error en el sistema de alertas:", error);
  }
};

export const requestPermissions = async () => {
  if (Platform.OS === 'web') return;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
};