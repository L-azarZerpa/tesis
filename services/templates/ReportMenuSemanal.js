export const generateMenuSemanalHTML = (data, config, dateRange, logoDataUri) => {
  const { inicio, fin } = dateRange;
  
  // Días de la semana para el encabezado
  const diasNombre = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
  
  // Agrupar datos por día de la semana (1-5)
  // Nota: f.getDay() devuelve 1 para Lunes, 5 para Viernes
  const obtenerDatosPorDia = (numDia) => {
    return data.filter(item => {
      const f = new Date(item.fecha || item.fecha_menu);
      return f.getDay() === numDia;
    });
  };

  // Generar las celdas de preparación (Nombres de los platos)
  const filaPreparaciones = diasNombre.map((_, index) => {
    const diaData = obtenerDatosPorDia(index + 1);
    // Evitar duplicados de nombres de platos en el mismo día
    const platosUnicos = [...new Set(diaData.map(d => d.plato_nombre_menu))].filter(Boolean);
    return `<td>${platosUnicos.join('<br>')}</td>`;
  }).join('');

  // Generar las celdas de ingredientes (Rubros y cantidades)
  const filaIngredientes = diasNombre.map((_, index) => {
    const diaData = obtenerDatosPorDia(index + 1);
    const listaIngredientes = diaData.map(d => 
      `${d.cantidad} ${d.unidad || 'kg'} ${d.producto_nombre}`
    ).join('<br>');
    return `<td class="ingredientes-cell">${listaIngredientes}</td>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: portrait; margin: 5mm; }
        body { font-family: 'Arial', sans-serif; font-size: 10px; color: #000; }
        .header { text-align: center; margin-bottom: 10px; }
        .header img { width: 120px; }
        .institution { font-weight: bold; font-size: 11px; text-transform: uppercase; }
        .title { font-weight: bold; font-size: 14px; margin: 10px 0; border-bottom: 1px solid #000; display: inline-block; }
        
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 5px; vertical-align: top; text-align: left; }
        th { background-color: #f2f2f2; text-align: center; }
        
        .section-title { font-weight: bold; text-align: center; background-color: #eee; font-size: 9px; }
        .ingredientes-cell { font-size: 9px; height: 350px; } /* Altura fija para imitar el formato físico */
        .meta-info { margin-bottom: 5px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoDataUri}">
        <div class="institution">
          República Bolivariana de Venezuela<br>
          Universidad Nacional Experimental Rómulo Gallegos<br>
          Programa Comedor - Núcleo San Juan de los Morros
        </div>
        <div class="title">PLAN DE MENÚ CUMPLIDO</div>
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
            <td colspan="5" class="section-title">PREPARACIONES SUMINISTRADAS</td>
          </tr>
          <tr>
            ${filaPreparaciones}
          </tr>
          <tr>
            <td colspan="5" class="section-title">RUBROS UTILIZADOS (CANTIDADES)</td>
          </tr>
          <tr>
            ${filaIngredientes}
          </tr>
        </tbody>
      </table>
    </body>
    </html>`;
};