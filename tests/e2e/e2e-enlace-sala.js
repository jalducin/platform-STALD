// E2E: enlace de partida para una invitada nueva, QR y botón Compartir.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const { abrirPagina } = require('./lib/navegador');
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const host = await abrirPagina(b, { email: 'marisol@example.com', contexto: { permissions: ['clipboard-read', 'clipboard-write'] }, out, etiqueta: '', ruta: '/juegos.html' });
  await host.waitForSelector('[data-juego]');
  await host.click('[data-tab="partidas"]'); await host.selectOption('#p-juego', 'basta-es'); await host.click('#f-crear button[type=submit]');
  await host.waitForSelector('[data-p="empezar"]');
  const codigo = (await host.textContent('.letra')).trim();
  const enlace = (await host.textContent('#p-enlace')).trim();
  ok('sala de espera muestra el enlace con ?sala=', enlace.includes('juegos.html?sala=' + codigo), enlace);
  await host.waitForSelector('#p-qr canvas, #p-qr img', { timeout: 15000 }).catch(() => {});
  ok('sala de espera muestra el QR', !!(await host.$('#p-qr canvas, #p-qr img')));
  await host.screenshot({ path: 'sala-compartir.png' });
  await host.click('[data-p="compartir"]'); await host.waitForTimeout(600);
  const tras = await host.textContent('[data-p="compartir"]');
  const clip = await host.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok('Compartir: comparte o copia el enlace', tras.includes('copiado') ? clip.includes('?sala=' + codigo) : true, tras + ' | ' + clip.slice(0, 80));
  // Invitada nueva sin sesión abre el enlace
  const g = await abrirPagina(b, { out, etiqueta: 'invitada' });
  await g.goto(enlace); await g.waitForSelector('[data-stald-auth]');
  ok('enlace sin sesión: avisa la invitación', (await g.textContent('main')).includes('Te invitaron a la partida ' + codigo));
  await g.fill('#stald-auth-correo', 'amiga.sofy@example.com'); await g.click('#stald-auth-enviar'); await g.waitForSelector('#stald-auth-codigo'); await g.fill('#stald-auth-codigo', '123456'); await g.click('#stald-auth-verificar');
  await g.waitForSelector('#f-invitado', { timeout: 30000 });
  ok('registro de invitada menciona la partida', (await g.textContent('main')).includes('en la partida ' + codigo));
  await g.fill('#apodo', 'Amiga'); await g.check('#acepto'); await g.click('#f-invitado button[type=submit]');
  await g.waitForSelector('#p-body .rank li', { timeout: 30000 }).catch(() => {});
  const lobby = (await g.textContent('#p-body').catch(() => '')).replace(/\s+/g, ' ');
  ok('invitada cae directo en la sala de espera', lobby.includes(codigo) && lobby.includes('Marisol') && lobby.includes('Amiga'), lobby.slice(0, 160));
  await host.waitForTimeout(3200);
  ok('la anfitriona ve entrar a la invitada', (await host.textContent('#p-body')).includes('Amiga'));
  // Enlace a una sala que no existe
  const x = await abrirPagina(b, { email: 'angel@example.com', viejo: true, viewport: { width: 1280, height: 720 }, ruta: '/juegos.html?sala=ZZZZ' }); await x.waitForSelector('#p-msg .alert', { timeout: 30000 }).catch(() => {});
  ok('enlace a sala inexistente: aviso claro', ((await x.textContent('#p-msg').catch(() => '')) || '').includes('No existe'));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 300)); process.exit(2); });
