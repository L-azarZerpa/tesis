import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';

// Importamos las plantillas
import { generateMenuSemanalHTML as generatePlanificacionMaestraHTML } from './templates/ReportMenuSemanal';
import { generateRecibidosHTML } from './templates/ReportRecibidos';
import { generateServidosHTML } from './templates/ReportServidos';
import { generatePerdidaHTML } from './templates/ReportPerdida';

/**
 * Servicio para generar PDF y enviar por correo
 * @param {Array} data - Datos provenientes de Supabase
 * @param {Object} config - Configuración (tipo de reporte, título, color)
 * @param {Object} dateRange - Rango de fechas { inicio, fin }
 */
export const sendReportByEmail = async (data, config, dateRange) => {
  try {
    // URL del logo institucional
    const LOGO_URL = "https://i.ibb.co/Zzzys5xW/icon.png";

    // 1. Normalización de configuración para evitar campos undefined
    const safeConfig = {
      ...config,
      title: config.label || config.title || "REPORTE UNERG",
      type: config.type || "sumas",
    };

    // 2. Selección de plantilla según el tipo de reporte seleccionado en el TabBar
    let htmlContent = '';

    switch (safeConfig.type) {
      case 'menus':
        // Usa la data relacional (platos -> ingredientes -> productos)
        htmlContent = generatePlanificacionMaestraHTML(data, safeConfig, dateRange, LOGO_URL);
        break;

      case 'restas':
        // Reporte de SALIDAS (consumo de estudiantes/profesores)
        htmlContent = generateServidosHTML(data, safeConfig, dateRange, LOGO_URL);
        break;

      case 'sumas':
      default:
        // Reporte de ENTRADAS (ingresos al inventario por organización)
        htmlContent = generateRecibidosHTML(data, safeConfig, dateRange, LOGO_URL);
        break;
    }

    // 3. Generación del archivo PDF físico en el almacenamiento temporal del tlf
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    // 4. Verificar si el dispositivo tiene una aplicación de correo lista (Gmail, Outlook, etc.)
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("No se detectó una aplicación de correo configurada en este dispositivo.");
    }

    // 5. Lanzar el selector de aplicaciones de correo con el archivo adjunto
    await MailComposer.composeAsync({
      subject: `REPORTE UNERG - ${safeConfig.title} (${dateRange.inicio} al ${dateRange.fin})`,
      attachments: [uri],
      recipients: [''], // Puedes poner un correo institucional por defecto aquí
      body: `Saludos,\n\nSe adjunta el reporte oficial de ${safeConfig.title}.\n\n` +
        `• Periodo: ${dateRange.inicio} - ${dateRange.fin}\n` +
        `• Generado automáticamente por: Sistema de Comedor UNERG.\n\n` +
        `Por favor, no responda a este mensaje.`
    });

    return true;
  } catch (error) {
    console.error("Error detallado en ReportService:", error);
    // Re-lanzamos el error para que ReporteScreen pueda mostrar el Alert.alert
    throw new Error(error.message || "Error al procesar el archivo PDF");
  }
};

/**
 * Servicio para generar PDF de reporte de pérdida y enviar por correo
 * @param {Object} data - Datos del reporte de pérdida
 */
export const sendPerdidaReportByEmail = async (data) => {
  try {
    // URL del logo institucional
    const LOGO_URL = "https://i.ibb.co/Zzzys5xW/icon.png";

    // Generar HTML con la plantilla de pérdida
    const htmlContent = generatePerdidaHTML(data, LOGO_URL);

    // Generación del archivo PDF físico
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    // Verificar si hay una app de correo disponible
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("No se detectó una aplicación de correo configurada en este dispositivo.");
    }

    // Lanzar el compositor de correo con el PDF adjunto
    await MailComposer.composeAsync({
      subject: `REPORTE DE PÉRDIDA - ${data.productoNombre} (${data.cantidad} ${data.unidad})`,
      attachments: [uri],
      recipients: [''],
      body: `Saludos,\n\nSe adjunta el reporte oficial de PÉRDIDA DE INVENTARIO.\n\n` +
        `• Producto: ${data.productoNombre}\n` +
        `• Cantidad perdida: ${data.cantidad} ${data.unidad}\n` +
        `• Reportado por: ${data.usuarioNombre}\n\n` +
        `Por favor, revisar y tomar las acciones correspondientes.`
    });

    return true;
  } catch (error) {
    console.error("Error en sendPerdidaReportByEmail:", error);
    throw new Error(error.message || "Error al generar el reporte de pérdida");
  }
};