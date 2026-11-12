// Genera las imágenes para compartir enlaces (img/og/<página>.jpg, 1200×630) y el favicon,
// dibujándolos con herramientas/plantilla.html en un navegador sin ventana (Chrome, Edge o Chromium).
// Uso, desde la carpeta del boletín: node herramientas/miniaturas.mjs
// Si el navegador está en otro sitio: NAVEGADOR="/ruta/al/ejecutable" node herramientas/miniaturas.mjs
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const PLANTILLA = readFileSync(join(RAIZ, 'herramientas/plantilla.html'), 'utf8');
const TEMPORAL = join(RAIZ, 'herramientas/_render.html');

const navegador = [
  process.env.NAVEGADOR,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].find(r => r && existsSync(r));
if (!navegador) throw new Error('No encontré Chrome, Edge ni Chromium. Indica la ruta con NAVEGADOR=…');

// ---------- Datos de cada página, leídos de su propio HTML ----------
const texto = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const buscar = (html, re) => html.match(re)?.[1];

const tarjetaDeArticulo = html => {
  const titulo = buscar(html, /<h1 class="art-title">([\s\S]*?)<\/h1>/);
  const cat = texto(buscar(html, /<p class="art-cat">([\s\S]*?)<\/p>/));
  const fecha = texto(buscar(html, /<div class="art-meta">\s*<span>([\s\S]*?)<\/span>/));
  const img = buscar(html, /<figure class="art-portada[\s\S]*?(<img [^>]*>)/);
  const src = buscar(img, /src="([^"]+)"/);
  const posicion = buscar(img, /object-position:\s*([^;"]+)/) ?? (img.includes('foto-retrato') ? '50% 22%' : '50% 50%');
  const largo = texto(titulo).length;
  const tam = largo > 110 ? 46 : largo > 85 ? 50 : 56;
  return `<div class="tarjeta">
  <div class="texto">
    <p class="marca">Espacio Con<span class="s">(s)</span><em>Ciencia</em></p>
    <p class="cat">${cat} · ${fecha}</p>
    <h1 class="titulo" style="--tam:${tam}px">${titulo}</h1>
    <p class="pie">Departamento de Ciencias · UPAEP</p>
  </div>
  <div class="foto"><img src="../${src}" style="object-position:${posicion}"></div>
</div>`;
};

const tarjetaDePortada = () => {
  // Oscilación amortiguada, como la gráfica del hero
  const puntos = Array.from({ length: 241 }, (_, i) => {
    const x = i / 240, y = .52 - .3 * Math.exp(-2.2 * x) * Math.sin(x * 22);
    return `${(70 + x * 1080).toFixed(1)},${(40 + y * 520).toFixed(1)}`;
  }).join(' ');
  return `<div class="tarjeta portada">
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none">
    <path d="M70 40V590H1160" stroke="rgba(22,18,15,.35)"/>
    <polyline points="${puntos}" stroke="rgba(200,16,46,.28)" stroke-width="2"/>
  </svg>
  <div class="contenido">
    <p class="nombre"><span>Espacio</span><span>Con<span class="s" style="display:inline">(s)</span><em>Ciencia</em></span></p>
    <p class="desc">El boletín del <b>Departamento de Ciencias de la UPAEP</b></p>
  </div>
</div>`;
};

// ---------- Navegador por el protocolo de DevTools ----------
const puerto = 9400 + Math.floor(Math.random() * 400);
const perfil = mkdtempSync(join(tmpdir(), 'miniaturas-'));
const proceso = spawn(navegador, ['--headless=new', `--remote-debugging-port=${puerto}`, '--hide-scrollbars', `--user-data-dir=${perfil}`, 'about:blank']);
const esperar = ms => new Promise(r => setTimeout(r, ms));

let pestañas;
for (let i = 0; i < 50 && !pestañas; i++) {
  try { pestañas = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json(); } catch { await esperar(200); }
}
const ws = new WebSocket(pestañas.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0;
const pendientes = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id) { pendientes.get(d.id)?.(d.result); pendientes.delete(d.id); } };
const cdp = (method, params = {}) => new Promise(r => { const i = ++id; pendientes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await cdp('Page.enable');
await cdp('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });

const capturar = async (contenido, archivo, { ancho, alto, escala = 1, formato = 'jpeg' }) => {
  writeFileSync(TEMPORAL, PLANTILLA.replace('<!-- contenido -->', contenido));
  await cdp('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'file://' + TEMPORAL });
  await esperar(400);
  await cdp('Runtime.evaluate', { expression: 'Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode())])', awaitPromise: true });
  const { data } = await cdp('Page.captureScreenshot', { format: formato, quality: formato === 'jpeg' ? 90 : undefined, clip: { x: 0, y: 0, width: ancho, height: alto, scale: escala } });
  writeFileSync(join(RAIZ, archivo), Buffer.from(data, 'base64'));
  console.log('✓', archivo);
};

try {
  for (const pagina of readdirSync(RAIZ).filter(f => f.endsWith('.html'))) {
    const html = readFileSync(join(RAIZ, pagina), 'utf8');
    const contenido = html.includes('class="art-title"') ? tarjetaDeArticulo(html) : tarjetaDePortada();
    await capturar(contenido, `img/og/${pagina.replace('.html', '.jpg')}`, { ancho: 1200, alto: 630 });
  }
  const icono = clase => `<div class="icono ${clase}"><span>(s)</span></div>`;
  await capturar(icono('redondo'), 'favicon.png', { ancho: 180, alto: 180, escala: 64 / 180, formato: 'png' });
  await capturar(icono(''), 'apple-touch-icon.png', { ancho: 180, alto: 180, formato: 'png' });
} finally {
  ws.close();
  rmSync(TEMPORAL, { force: true });
  const cerrado = new Promise(r => proceso.once('exit', r));
  proceso.kill();
  await cerrado;
  rmSync(perfil, { recursive: true, force: true, maxRetries: 5 });
}
