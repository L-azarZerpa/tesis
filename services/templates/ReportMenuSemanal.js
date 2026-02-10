/**
 * Plantilla HTML para el Reporte de Planificación Semanal
 * Procesa datos relacionales: planificacion_semanal -> platos -> platos_ingredientes -> productos
 */
export const generateMenuSemanalHTML = (data, config, dateRange, logoDataUri) => {
  const { inicio, fin } = dateRange;

  // Días de la semana para las columnas del reporte
  const diasNombre = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];

  /**
   * Busca en el array de datos el objeto que corresponda al día de la semana.
   * Se usa getUTCDay para evitar que la zona horaria mueva los platos de un día a otro.
   */
  const obtenerDatosPorDia = (numDia) => {
    return data.find(item => {
      if (!item.fecha_menu) return false;
      const f = new Date(item.fecha_menu);
      return f.getUTCDay() === numDia;
    });
  };

  // 1. GENERAR FILA DE PLATOS (CABECERA DE CADA DÍA)
  const filaPreparaciones = diasNombre.map((_, index) => {
    const planDia = obtenerDatosPorDia(index + 1); // 1 = Lunes, 5 = Viernes
    const nombrePlato = planDia?.platos?.nombre || "No planificado";

    return `
      <td style="height: 50px; text-align: center; vertical-align: middle; font-weight: bold; background-color: #fdfdfd;">
        ${nombrePlato.toUpperCase()}
      </td>`;
  }).join('');

  // 2. GENERAR FILA DE INGREDIENTES (LISTADO DETALLADO)
  const filaIngredientes = diasNombre.map((_, index) => {
    const planDia = obtenerDatosPorDia(index + 1);

    // Extraemos la relación anidada de ingredientes
    const ingredientes = planDia?.platos?.platos_ingredientes || [];

    const listaHtml = ingredientes.map(ing => {
      const cantidad = ing.cantidad_sugerida || 0;
      const producto = ing.productos?.nombre || "Producto";
      const unidad = ing.productos?.unidad || "kg";
      return `<div style="margin-bottom: 4px; border-bottom: 0.5px solid #eee; padding-bottom: 2px;">
                • <strong>${cantidad} ${unidad}</strong> - ${producto}
              </div>`;
    }).join('');

    return `
      <td class="ingredientes-cell">
        ${listaHtml || '<span style="color: #ccc;">Sin ingredientes registrados</span>'}
      </td>`;
  }).join('');

  // 3. ESTRUCTURA COMPLETA DEL DOCUMENTO HTML/CSS
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        /* Configuración de impresión */
        @page { size: portrait; margin: 10mm; }
        
        body { 
          font-family: 'Helvetica', 'Arial', sans-serif; 
          font-size: 10px; 
          color: #333; 
          line-height: 1.2;
          margin: 0;
          padding: 0;
        }

        .header { text-align: center; margin-bottom: 20px; }
        .header img { width: 90px; height: auto; margin-bottom: 10px; }
        
        .institution { 
          font-weight: bold; 
          font-size: 10px; 
          text-transform: uppercase; 
          line-height: 1.4;
        }

        .title { 
          font-weight: bold; 
          font-size: 16px; 
          margin: 15px 0; 
          text-decoration: underline;
          color: #000;
        }

        .meta-info { 
          margin-bottom: 10px; 
          font-weight: bold; 
          font-size: 11px;
          background: #f0f0f0;
          padding: 5px;
          display: inline-block;
        }

        table { 
          width: 100%; 
          border-collapse: collapse; 
          table-layout: fixed; /* Mantiene las columnas del mismo ancho */
        }

        th, td { 
          border: 1px solid #000; 
          padding: 8px; 
          vertical-align: top; 
        }

        th { 
          background-color: #0100D9; 
          color: #FFFFFF; 
          text-align: center; 
          font-size: 11px;
          text-transform: uppercase;
        }

        .section-header { 
          font-weight: bold; 
          text-align: center; 
          background-color: #e0e0e0; 
          font-size: 9px; 
          padding: 6px;
          text-transform: uppercase;
        }

        .ingredientes-cell { 
          font-size: 9px; 
          height: 480px; /* Altura fija para mantener el formato oficial */
          background-color: #fff;
        }

        .footer {
          margin-top: 40px;
          display: flex;
          justify-content: space-around;
        }

        .signature-box {
          width: 200px;
          text-align: center;
          border-top: 1px solid #000;
          padding-top: 5px;
          font-size: 10px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>

      <div class="header">
        <img src="${logoDataUri}" alt="Logo UNERG">
        <div class="institution">
          República Bolivariana de Venezuela<br>
          Universidad Nacional Experimental Rómulo Gallegos<br>
          Vicerrectorado Académico - Programa Comedor
        </div>
        <div class="title">PLANIFICACIÓN SEMANAL DE MENÚ CUMPLIDO</div>
      </div>

      <div class="meta-info">PERIODO: ${inicio} AL ${fin}</div>

      <table>
        <thead>
          <tr>
            ${diasNombre.map(d => `<th>${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="5" class="section-header">NOMBRE DEL PLATO / PREPARACIÓN</td>
          </tr>
          <tr>
            ${filaPreparaciones}
          </tr>
          <tr>
            <td colspan="5" class="section-header">DETALLE DE INGREDIENTES UTILIZADOS</td>
          </tr>
          <tr>
            ${filaIngredientes}
          </tr>
        </tbody>
      </table>

    </body>
    </html>
  `;
};