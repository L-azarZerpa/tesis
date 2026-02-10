/**
 * Genera el HTML para el reporte de pérdida de inventario
 * Formato institucional UNERG con texto libre (no tabla)
 */
export const generatePerdidaHTML = (data, logoDataUri) => {
  const {
    productoNombre,
    cantidad,
    unidad,
    loteVencimiento,
    razon,
    usuarioNombre,
    fecha
  } = data;

  // Formatear fecha
  const fechaFormateada = new Date(fecha).toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <style>
      @page { size: portrait; margin: 15mm; }
      body { 
        font-family: 'Helvetica', 'Arial', sans-serif; 
        margin: 0; 
        padding: 20px;
        font-size: 12px; 
        color: #000; 
        line-height: 1.6;
      }
      
      .header-container {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 30px;
        
        padding-bottom: 20px;
      }
      
      .logo-img { 
        width: 120px; 
        height: auto; 
        margin-right: 20px;
      }
      
      .institution-text { 
        text-align: center;
        font-size: 14px; 
        line-height: 1.4; 
        font-weight: bold; 
      }
      
      .main-title { 
        font-size: 20px; 
        font-weight: bold; 
        margin: 30px 0 20px 0;
        text-align: center;
        text-transform: uppercase;
        color: #000000ff;
        letter-spacing: 1px;
      }
      
      .info-section {
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      
      .info-row {
        display: flex;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px dashed #ddd;
      }
      
      .info-row:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      
      .info-label {
        font-weight: bold;
        color: #0100D9;
        width: 180px;
        text-transform: uppercase;
        font-size: 11px;
      }
      
      .info-value {
        flex: 1;
        font-size: 14px;
      }
      
      .cantidad-highlight {
        font-size: 28px;
        font-weight: 900;
        color: #E74C3C;
      }
      
      .razon-section {
        margin: 30px 0;
      }
      
      .razon-title {
        font-weight: bold;
        color: #0100D9;
        text-transform: uppercase;
        font-size: 12px;
        margin-bottom: 10px;
      }
      
      .razon-content {
        background-color: #fff;
        border: 2px solid #E74C3C;
        border-left-width: 5px;
        border-radius: 4px;
        padding: 20px;
        font-size: 14px;
        line-height: 1.8;
        min-height: 100px;
      }
      
      .footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 10px;
        color: #777;
      }
      
      .signature-area {
        display: flex;
        justify-content: space-around;
        margin-top: 60px;
      }
      
      .signature-box {
        text-align: center;
        width: 200px;
      }
      
      .signature-line {
        border-top: 1px solid #000;
        margin-bottom: 5px;
      }
      
      .signature-label {
        font-size: 11px;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="header-container">
      <img src="${logoDataUri}" class="logo-img">
      <div class="institution-text">
        República Bolivariana de Venezuela<br>
        Universidad Nacional Experimental Rómulo Gallegos<br>
        Comedor General
      </div>
    </div>
    
    <div class="main-title">Reporte de Pérdida de Inventario</div>
    
    <div class="info-section">
      <div class="info-row">
        <span class="info-label">Producto:</span>
        <span class="info-value"><strong>${productoNombre}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Cantidad Perdida:</span>
        <span class="info-value cantidad-highlight">${cantidad} ${unidad}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Lote (Vencimiento):</span>
        <span class="info-value">${loteVencimiento}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha del Reporte:</span>
        <span class="info-value">${fechaFormateada}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Reportado por:</span>
        <span class="info-value">${usuarioNombre}</span>
      </div>
    </div>
    
    <div class="razon-section">
      <div class="razon-title">Descripción / Razón de la Pérdida:</div>
      <div class="razon-content">
        ${razon}
      </div>
    </div>
    
  </body>
  </html>`;
};
