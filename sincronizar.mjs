// Copia las piezas comunes de parciales/ (head, pie…) dentro de cada página HTML.
// Cada página marca dónde va cada pieza con <!-- parcial:nombre --> … <!-- /parcial:nombre -->.
// Uso: node sincronizar.mjs   (después de editar algo en parciales/)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const parciales = readdirSync('parciales')
  .filter(f => f.endsWith('.html'))
  .map(f => ({ nombre: f.slice(0, -5), contenido: readFileSync(`parciales/${f}`, 'utf8') }));

for (const pagina of readdirSync('.').filter(f => f.endsWith('.html'))) {
  const original = readFileSync(pagina, 'utf8');
  let html = original;
  const faltan = [];
  for (const { nombre, contenido } of parciales) {
    const marca = new RegExp(`(<!-- parcial:${nombre} -->\\n)[\\s\\S]*?(<!-- /parcial:${nombre} -->)`);
    if (marca.test(html)) html = html.replace(marca, (_, ini, fin) => ini + contenido + fin);
    else faltan.push(nombre);
  }
  if (html !== original) writeFileSync(pagina, html);
  const estado = html !== original ? 'actualizada' : 'sin cambios';
  console.log(`${pagina}: ${estado}${faltan.length ? ` (sin marca de: ${faltan.join(', ')})` : ''}`);
}
