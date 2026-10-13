// Ayudantes de las E2E de personajes de Arcade (openspec: personajes-xalli, personajes-estilo-karts), compartidos por e2e-plataformas.js y
// e2e-karts.js.
//
//   PERSONAJES               ids, nombres, títulos y colores de firma esperados (en el orden del selector)
//   contarColor(fr, caja, hex, tol)   píxeles del canvas #c dentro de `caja` (px del lienzo) a ≤ tol del color
//   recorte(p, fr, caja, archivo, margen)   captura de cerca de `caja` (px del lienzo) con margen en px de pantalla
//   hojaPerfiles(fr, archivo)   hoja con los 4 personajes de perfil en todas las poses (Personajes.pintar), en PNG
const fs = require('fs');

// firma: color de un rasgo propio del perfil (branquias, plumas, pelaje, flores); kart: color de la carrocería.
const PERSONAJES = [
  { id: 'xalli', nombre: 'Xalli', titulo: 'Guardián de los Canales', firma: '#ff6f91', kart: '#14b8a6' },
  { id: 'itzae', nombre: 'Itzae', titulo: 'Cronista del Sol', firma: '#14b8a6', kart: '#d97706' },
  { id: 'yahui', nombre: 'Yahui', titulo: 'Guerrero Jaguar de las Nubes', firma: '#e9a83a', kart: '#eab308' },
  { id: 'xochiquetzal', nombre: 'Xochiquetzal', titulo: 'Señora de la Niebla y las Flores', firma: '#db2777', kart: '#c026d3' },
  // Personajes estilo karts (openspec: personajes-estilo-karts)
  { id: 'xolo', nombre: 'Xolo', titulo: 'Guía Veloz de los Caminos', firma: '#6b7a90', kart: '#059669', peso: '🪶 Ligero', masa: 0.8, nuevo: true },
  { id: 'tlali', nombre: 'Tlali', titulo: 'Saltarina de los Valles', firma: '#84cc16', kart: '#84cc16', peso: '🪶 Ligero', masa: 0.8, nuevo: true },
  { id: 'tona', nombre: 'Tona', titulo: 'Sabia de la Costa', firma: '#5f8a3a', kart: '#0369a1', peso: '🪨 Pesado', masa: 1.25, nuevo: true },
  { id: 'kinich', nombre: 'Kinich', titulo: 'Estratega del Juego de Pelota', firma: '#dc2626', kart: '#dc2626', peso: '⚖️ Medio', masa: 1, nuevo: true },
];

const contarColor = (fr, caja, hex, tol = 24) => fr.evaluate(([c, h, t]) => {
  const cv = document.getElementById('c'), x = cv.getContext('2d');
  const x0 = Math.max(0, Math.floor(c.x)), y0 = Math.max(0, Math.floor(c.y));
  const w = Math.min(cv.width - x0, Math.ceil(c.w)), hh = Math.min(cv.height - y0, Math.ceil(c.h));
  if (w <= 0 || hh <= 0) return 0;
  const d = x.getImageData(x0, y0, w, hh).data, n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  let k = 0;
  for (let i = 0; i < d.length; i += 4) if (Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b) <= t) k++;
  return k;
}, [caja, hex, tol]);

async function recorte(p, fr, caja, archivo, margen = 12) {
  const r = await fr.locator('#c').boundingBox();
  const lienzo = await fr.evaluate(() => { const c = document.getElementById('c'); return { w: c.width, h: c.height }; });
  const ex = r.width / lienzo.w, ey = r.height / lienzo.h;
  const x = Math.max(0, r.x + caja.x * ex - margen), y = Math.max(0, r.y + caja.y * ey - margen);
  await p.screenshot({ path: archivo, clip: { x, y, width: caja.w * ex + 2 * margen, height: caja.h * ey + 2 * margen } });
}

// Hoja de revisión: filas = personajes; columnas = poses base y, al final, con champiñón y con chile.
async function hojaPerfiles(fr, archivo) {
  const url = await fr.evaluate(() => {
    const P = globalThis.Personajes, poses = ['quieto', 'camina', 'salta', 'cae', 'dano', 'pierde', 'gana'], esc = 7, celda = 150;
    const cols = poses.length + 2, c = document.createElement('canvas');
    c.width = cols * celda; c.height = P.LISTA.length * celda;
    const x = c.getContext('2d');
    x.fillStyle = '#7cc6f2'; x.fillRect(0, 0, c.width, c.height);
    P.LISTA.forEach((per, fila) => {
      const cel = [...poses.map(p => [p, 'base']), ['quieto', 'grande'], ['quieto', 'fuego']];
      cel.forEach(([pose, poder], col) => {
        x.save(); x.translate(col * celda + celda / 2, fila * celda + celda - 14);
        x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.ellipse(0, 0, 40, 8, 0, 0, 7); x.fill();
        const s = esc * (poder === 'grande' ? 21 / 13 * 0.62 : 1) * 0.95;
        x.scale(s, s);
        P.pintar(x, per.id, { pose, fase: 1.2, t: 0.5, poder });
        x.restore();
      });
    });
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(archivo, Buffer.from(url.split(',')[1], 'base64'));
}

module.exports = { PERSONAJES, contarColor, recorte, hojaPerfiles };
