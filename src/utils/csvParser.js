/**
 * parsePriceBookCSV — Converts a CSV file to an array of Price Book entries.
 * Required columns: service_name, book_price
 * Optional columns: category, uom (unit), notes, estimated_cost
 */
export function parsePriceBookCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return reject(new Error('El archivo CSV está vacío o no tiene datos.'));

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

      if (!headers.includes('service_name')) {
        return reject(new Error('El CSV debe tener la columna "service_name".'));
      }
      if (!headers.includes('book_price')) {
        return reject(new Error('El CSV debe tener la columna "book_price".'));
      }

      const result = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const obj = {};
        headers.forEach((h, idx) => {
          let val = cols[idx]?.trim().replace(/^"|"$/g, '') || '';
          if (h === 'book_price' || h === 'estimated_cost') {
            val = parseFloat(val) || 0;
          }
          obj[h] = val;
        });
        // Normalize: accept both 'uom' and 'unit' as the unit column
        if (!obj.uom && obj.unit) obj.uom = obj.unit;
        if (obj.service_name) result.push(obj);
      }

      if (result.length === 0) return reject(new Error('No se encontraron registros válidos en el CSV.'));
      resolve(result);
    };

    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
}