import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

// Importamos las dos plantillas
import { generateRecibidosHTML } from './templates/ReportRecibidos';
import { generateServidosHTML } from './templates/ReportServidos';

export const sendReportByEmail = async (data, config, dateRange) => {
  try {
    // 1. Cargar el logo
    const asset = Asset.fromModule(require('../assets/icon.png'));
    await asset.downloadAsync();
    const base64Logo = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, { 
      encoding: 'base64' 
    });
    const logoDataUri = `data:image/png;base64,${base64Logo}`;

    // 2. Selección de plantilla según el tipo de datos
    let htmlContent = '';
    
    if (config.type === 'restas') {
      // Usa el formato de Almuerzos + Rubros Utilizados
      htmlContent = generateServidosHTML(data, config, dateRange, logoDataUri);
    } else {
      // Usa el formato de Relación de Rubros Recibidos
      htmlContent = generateRecibidosHTML(data, config, dateRange, logoDataUri);
    }

    // 3. Generar PDF
    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    // 4. Enviar Correo
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) throw new Error("Correo no disponible");

    await MailComposer.composeAsync({
      subject: `REPORTE UNERG - ${config.title} (${dateRange.inicio})`,
      attachments: [uri],
      recipients: ['controlestudios@unerg.edu.ve'],
      body: `Envío de reporte: ${config.title}\nPeriodo: ${dateRange.inicio} - ${dateRange.fin}`
    });

    return true;
  } catch (error) {
    console.error("Error en ReportService:", error);
    throw error;
  }
};