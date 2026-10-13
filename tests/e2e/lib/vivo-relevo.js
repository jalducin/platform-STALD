// Relevo local del juego en vivo para E2E (openspec: juegos-en-vivo). Reemplaza a Supabase Realtime en las pruebas:
// cada página se suscribe con EventSource (GET /rx?topic&id) y publica con POST /tx?topic&id; el relevo reparte cada
// mensaje a las demás páginas del mismo topic (sin eco, como `self: false`). La latencia, la pérdida y el desorden se
// inyectan en la página (EnVivo.simulado), así CI no depende de Supabase.
//
//   const relevo = await levantarRelevo();
//   abrirPagina(b, { ..., init: initVivo(relevo.url, { latencia: 60, perdida: 0.03 }), ruta: '/juegos.html?vivoSimulado=1' });
//   relevo.cortar(id) / relevo.reanudar(id)   // silencia a alguien sin avisar (se le acabó la batería)
//   relevo.contar()                           // { mensajes, porTopic }
//   await relevo.cerrar();
const http = require('node:http');

async function levantarRelevo() {
  const subs = new Map(); // topic → Set({ id, res })
  const cortados = new Set();
  let mensajes = 0;
  const porTopic = {};
  const servidor = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), topic = u.searchParams.get('topic') || '', id = u.searchParams.get('id') || '';
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'GET' && u.pathname === '/rx') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': hola\n\n');
      if (!subs.has(topic)) subs.set(topic, new Set());
      const s = { id, res };
      subs.get(topic).add(s);
      req.on('close', () => subs.get(topic).delete(s));
      return;
    }
    if (req.method === 'POST' && u.pathname === '/tx') {
      let body = '';
      req.on('data', d => { body += d; if (body.length > 4096) req.destroy(); });
      req.on('end', () => {
        res.end('ok');
        if (cortados.has(id)) return;
        mensajes++; porTopic[topic] = (porTopic[topic] || 0) + 1;
        for (const s of subs.get(topic) || []) if (s.id !== id && !cortados.has(s.id)) s.res.write('data: ' + body.replace(/\n/g, ' ') + '\n\n');
      });
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + servidor.address().port;
  return {
    url,
    cortar: id => cortados.add(id),
    reanudar: id => cortados.delete(id),
    contar: () => ({ mensajes, porTopic: { ...porTopic } }),
    // Mensaje fabricado desde Node (p. ej. karts de páginas congeladas para medir fps de un solo aparato).
    inyectar: (topic, sobre) => { const txt = JSON.stringify(sobre); for (const s of subs.get(topic) || []) if (s.id !== sobre.i) s.res.write('data: ' + txt + '\n\n'); },
    cerrar: () => new Promise(r => { for (const set of subs.values()) for (const s of set) s.res.end(); servidor.close(() => r()); }),
  };
}

// Script para addInitScript: opciones de EnVivo.simulado que la página de Juegos usa con ?vivoSimulado=1.
const initVivo = (relevo, opciones = {}) => [o => { window.__vivoSimulado = o; }, { relevo, latencia: 60, perdida: 0.03, desorden: 0.1, ...opciones }];

module.exports = { levantarRelevo, initVivo };
