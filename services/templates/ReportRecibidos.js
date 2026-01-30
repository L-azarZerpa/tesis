// app/services/templates/ReportRecibidos.js

export const generateRecibidosHTML = (data, config, dateRange, logoDataUri) => {
  const { title } = config;
  const { inicio, fin } = dateRange;

  const diasDelMes = Array.from({ length: 31 }, (_, i) => i + 1);
  const rubrosUnicos = [...new Set(data.map(item => 
    (item.producto_nombre || item.productos?.nombre || 'S/N').toUpperCase()
  ))].sort();

  const tablaHtml = rubrosUnicos.map(rubro => {
    let totalRubro = 0;
    const celdasDias = diasDelMes.map(dia => {
      const registrosDelDia = data.filter(item => {
        const f = new Date(item.fecha || item.created_at);
        const nombre = (item.producto_nombre || item.productos?.nombre || '').toUpperCase();
        return nombre === rubro && f.getDate() === dia;
      });
      const cantidadDia = registrosDelDia.reduce((sum, r) => sum + r.cantidad, 0);
      totalRubro += cantidadDia;
      return `<td>${cantidadDia > 0 ? cantidadDia : ''}</td>`;
    }).join('');
    return `<tr><td class="bg-gray rubro-col">${rubro}</td>${celdasDias}<td class="total-col">${totalRubro > 0 ? totalRubro : ''}</td></tr>`;
  }).join('');

  const encabezadoOrgs = diasDelMes.map(dia => {
    const registro = data.find(item => new Date(item.fecha || item.created_at).getDate() === dia);
    const org = registro?.organizacion ? registro.organizacion.toUpperCase() : "";
    return `<th class="vertical-text">${org}</th>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: landscape; margin: 5mm; }
        body { font-family: 'Arial', sans-serif; margin: 10px; font-size: 8.5px; color: #000; }
        .header-container { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .membrete-central { flex: 1; text-align: center; line-height: 1.3; font-size: 13px; font-weight: bold; }
        .title-row { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px; }
        .titulo-principal { width: 60%; text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #000; text-align: center; height: 18px; }
        .bg-gray { background-color: #ededed; font-weight: bold; }
        .rubro-col { text-align: left; padding-left: 4px; width: 90px; font-size: 10px; }
        .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; height: 90px; font-size: 9px; vertical-align: middle; padding: 5px 0; }
        .total-col { width: 45px; font-weight: bold; background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header-container">
          <img src="${logoDataUri}" style="width: 180px;">
          <div class="membrete-central">
              República Bolivariana de Venezuela<br> Universidad Nacional Experimental Rómulo Gallegos<br> Comedor General
          </div>
          <div style="width: 180px;"></div>
      </div>
      <div class="title-row">
          <div style="width: 20%;">Desde: <strong>${inicio}</strong></div>
          <div class="titulo-principal">${title}</div>
          <div style="width: 20%; text-align: right;">Hasta: <strong>${fin}</strong></div>
      </div>
      <table>
          <thead>
              <tr class="bg-gray">
                  <th class="rubro-col">ORGANIZACIÓN</th>${encabezadoOrgs}<th class="total-col"></th>
              </tr>
              <tr class="bg-gray">
                  <th class="rubro-col">FECHA</th>
                  ${diasDelMes.map(i => `<td>${i < 10 ? '0'+i : i}</td>`).join('')}
                  <td class="total-col">TOTAL</td>
              </tr>
          </thead>
          <tbody>${tablaHtml}</tbody>
      </table>
    </body>
    </html>`;
};