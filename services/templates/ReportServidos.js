/**
 * Genera el HTML para el reporte de Salidas (Servidos)
 * Mapea las columnas 'estudiantes' y 'profesores' de registros_resta
 */
export const generateServidosHTML = (data, config, dateRange, logoDataUri) => {
    const { inicio } = dateRange;
    const diasDelMes = Array.from({ length: 31 }, (_, i) => i + 1);
    
    // Extraer el nombre del mes para el encabezado
    // Formato esperado de inicio: "DD/MM/YYYY"
    const partesFecha = inicio.split('/');
    const fechaObjeto = new Date(partesFecha[2], partesFecha[1] - 1, partesFecha[0]);
    const nombreMes = fechaObjeto.toLocaleString('es-ES', { month: 'long' }).toUpperCase();

    // --- LÓGICA PARA SECCIÓN ALMUERZOS ---
    const categorias = [
        { label: "Estudiantes", key: "estudiantes" },
        { label: "Personal", key: "profesores" }
    ];

    const tablaAlmuerzosHtml = categorias.map(cat => {
        let totalCat = 0;
        const celdas = diasDelMes.map(dia => {
            const registrosDelDia = data.filter(item => {
                const f = new Date(item.fecha);
                // getUTCDate garantiza que el número caiga en el día exacto de la DB
                return f.getUTCDate() === dia;
            });

            const sumaDia = registrosDelDia.reduce((sum, r) => sum + (Number(r[cat.key]) || 0), 0);
            totalCat += sumaDia;
            return `<td>${sumaDia > 0 ? sumaDia : ''}</td>`;
        }).join('');

        return `<tr><td class="label-col">${cat.label}</td>${celdas}<td class="total-col">${totalCat.toLocaleString()}</td></tr>`;
    }).join('');

    // Fila de TOTAL Almuerzos (Suma vertical por día)
    const filaTotalAlmuerzos = diasDelMes.map(dia => {
        const registrosDelDia = data.filter(item => {
            const f = new Date(item.fecha);
            return f.getUTCDate() === dia;
        });
        
        const totalDia = registrosDelDia.reduce((sum, r) => {
            return sum + (Number(r.estudiantes) || 0) + (Number(r.profesores) || 0);
        }, 0);
        
        return `<td>${totalDia > 0 ? totalDia : '0'}</td>`;
    }).join('');

    const granTotalAlmuerzos = data.reduce((sum, r) => {
        return sum + (Number(r.estudiantes) || 0) + (Number(r.profesores) || 0);
    }, 0);

    // --- LÓGICA PARA SECCIÓN RUBROS UTILIZADOS ---
    const rubrosUnicos = [...new Set(data.map(item => (item.producto_nombre || '').toUpperCase()))].sort();
    
    const tablaRubrosHtml = rubrosUnicos.map(rubro => {
        let totalRubro = 0;
        let unidad = "";

        const celdas = diasDelMes.map(dia => {
            const registros = data.filter(item => {
                const f = new Date(item.fecha);
                return (item.producto_nombre || '').toUpperCase() === rubro && f.getUTCDate() === dia;
            });
            
            if (registros.length > 0 && !unidad) {
                unidad = registros[0].unidad || "kg";
            }

            const cant = registros.reduce((sum, r) => sum + (Number(r.cantidad) || 0), 0);
            totalRubro += cant;
            return `<td>${cant > 0 ? cant : ''}</td>`;
        }).join('');

        return `<tr><td class="label-col">${rubro}</td>${celdas}<td class="total-col">${totalRubro.toLocaleString()} ${unidad || 'kg'}</td></tr>`;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { size: landscape; margin: 3mm; }
            body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 5px; font-size: 10px; color: #000; }
            .header-table { width: 100%; border: none; margin-bottom: 10px; }
            .header-table td { border: none; text-align: center; padding: 0; }
            .logo-img { width: 180px; height: auto; }
            .institution-text { font-size: 11px; line-height: 1.2; font-weight: bold; }
            .main-title { font-size: 14px; font-weight: bold; margin-top: 5px; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #000; text-align: center; padding: 2px 0; height: 20px; word-wrap: break-word; }
            .bg-gray-header { background-color: #f2f2f2; font-weight: bold; }
            .bg-gray-section { background-color: #d9d9d9; font-weight: bold; font-size: 12px; }
            .label-col { text-align: left; padding-left: 5px; width: 120px; font-weight: bold; text-transform: uppercase; }
            .day-col { width: 25px; font-size: 9px; } 
            .total-col { width: 70px; font-weight: bold; background-color: #eee; }
            .month-label { text-align: right; font-weight: bold; font-size: 12px; border: none; }
            .row-total-bold { font-weight: bold; background-color: #f9f9f9; }
        </style>
    </head>
    <body>
        <table class="header-table">
            <tr>
                <td style="width: 20%; text-align: left;"><img src="${logoDataUri}" class="logo-img"></td>
                <td style="width: 60%;">
                    <div class="institution-text">República Bolivariana de Venezuela<br>Universidad Nacional Experimental Rómulo Gallegos<br>Comedor General</div>
                    <div class="main-title">RELACIÓN DE COMIDAS SERVIDAS</div>
                </td>
                <td style="width: 20%; vertical-align: bottom;" class="month-label">Mes de ${nombreMes}</td>
            </tr>
        </table>

        <table>
            <thead>
                <tr class="bg-gray-section"><th colspan="33">ALMUERZOS</th></tr>
                <tr class="bg-gray-header">
                    <th class="label-col">FECHA</th>
                    ${diasDelMes.map(i => `<th class="day-col">${i < 10 ? '0'+i : i}</th>`).join('')}
                    <th class="total-col">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${tablaAlmuerzosHtml}
                <tr class="row-total-bold">
                    <td class="label-col">TOTAL</td>
                    ${filaTotalAlmuerzos}
                    <td class="total-col">${granTotalAlmuerzos.toLocaleString()}</td>
                </tr>
                <tr class="bg-gray-section"><th colspan="33">RUBROS UTILIZADOS</th></tr>
                <tr class="bg-gray-header">
                    <th class="label-col">FECHA</th>
                    ${diasDelMes.map(i => `<th class="day-col">${i < 10 ? '0'+i : i}</th>`).join('')}
                    <th class="total-col">TOTAL</th>
                </tr>
                ${tablaRubrosHtml}
            </tbody>
        </table>
    </body>
    </html>`;
};