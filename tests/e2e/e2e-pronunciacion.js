// E2E: audio y pronunciación (openspec: pronunciacion). Reconocimiento de voz simulado y voz espiada.
require('./lib/entorno'); // BASE, API, DATOS, DATA, CHROME, carpeta de salida y sesión de prueba en fetch
const { chromium } = require('playwright');
const fs = require('fs');
const { abrirPagina } = require('./lib/navegador');
const API = process.env.API;
const DATA = process.env.DATA;
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Voz espiada (speechSynthesis) y reconocimiento simulado (conVoz) o ausente.
const simularVoz = conVoz => {
  window.__habladas = [];
  const sp = window.speechSynthesis;
  if (sp) sp.speak = u => { window.__habladas.push({ texto: u.text, rate: u.rate, lang: u.lang }); };
  if (conVoz) {
    window.__oir = '';
    window.webkitSpeechRecognition = window.SpeechRecognition = class { start() { setTimeout(() => { this.onresult({ results: [[{ transcript: window.__oir }]] }); if (this.onend) this.onend(); }, 30); } };
  } else { window.webkitSpeechRecognition = undefined; window.SpeechRecognition = undefined; }
};
const pagina = (b, conVoz) => abrirPagina(b, { email: 'admin@example.com', ingles: true, init: [simularVoz, conVoz], out, etiqueta: '', dialogos: 'aceptar', ruta: '/ingles.html?modo=profe', esperar: ['#ruta-plan', { state: 'attached' }] });
(async () => {
  const act = JSON.parse(fs.readFileSync(DATA + '/contenido/profe/actividades/profe-pron-2026-10-02.json', 'utf8'));
  const porId = Object.fromEntries(act.banco.map(e => [e.id, e]));
  const b = await chromium.launch({ executablePath: process.env.CHROME });
  const p = await pagina(b, true);
  ok('la semana 0 muestra la pronunciación del viernes', (await p.$$eval('.exam-card', xs => xs.map(x => x.textContent))).join(' ').includes('Pronunciación'));
  ok('el plan lista 23 tareas', (await p.$$('.ruta-lista li')).length >= 23 + 8);
  await p.click('.exam-card [data-action="abrir-item"][data-id="profe-pron-2026-10-02"]');
  await p.waitForSelector('#exam-form'); if (await p.$('[data-action="ver-todas"]')) await p.click('[data-action="ver-todas"]');
  const ids = await p.$$eval('#exam-form [data-q]', xs => xs.map(x => x.dataset.q));
  ok('12 ejercicios', ids.length === 12, String(ids.length));
  // 🔊 en un ejercicio de escuchar
  const conAudio = ids.find(id => porId[id].audio);
  await p.click(`[data-q="${conAudio}"] [data-action="tts"]:not([data-lento])`);
  await p.click(`[data-q="${conAudio}"] [data-action="tts"][data-lento]`);
  const habl = await p.evaluate(() => window.__habladas);
  ok('🔊 y 🐢 leen el audio en inglés (normal y lento)', habl.length === 2 && habl[0].texto === porId[conAudio].audio && habl[0].lang === 'en-US' && habl[1].rate < 1, JSON.stringify(habl));
  let mal = null;
  for (const id of ids) {
    const e = porId[id];
    if (e.tipo === 'opcion') await p.check(`input[name="${id}"][value="${e.correcta}"]`);
    else if (e.tipo === 'pronunciar') {
      const oir = mal ? e.frase : 'something totally different';
      if (!mal) mal = id;
      await p.evaluate(t => { window.__oir = t; }, oir);
      await p.click(`[data-q="${id}"] [data-action="grabar"]`);
      await p.waitForFunction(id => (document.querySelector(`[data-q="${id}"] .pron-oido`) || {}).textContent?.includes('Te escuché'), id, { timeout: 5000 });
    }
  }
  const txtMal = await p.textContent(`[data-q="${mal}"] .pron-oido`);
  const otro = ids.find(id => porId[id].tipo === 'pronunciar' && id !== mal);
  const txtBien = await p.textContent(`[data-q="${otro}"] .pron-oido`);
  ok('coincidencia en vivo: bien 100 % ✔ y mal con «inténtalo»', txtBien.includes('100 %') && txtMal.includes('inténtalo'), txtBien + ' | ' + txtMal);
  ok('las 12 cuentan como respondidas', (await p.textContent('#exam-count')).startsWith('12/12'));
  await p.screenshot({ path: 'pron-ejercicios.png', fullPage: false });
  await p.click('#exam-send');
  await p.waitForSelector('.score', { timeout: 60000 });
  const res = await p.textContent('#content');
  ok('calificación 11/12 (92 %) y revisión con lo que se escuchó', (await p.textContent('.score')).includes('92') && res.includes('something totally different'), (await p.textContent('.score')).trim());
  await p.screenshot({ path: 'pron-resultado.png', fullPage: false });
  const r = await (await fetch(API + '/ingles/profe/actividades?email=admin@example.com')).json();
  const it = r.items.find(i => i.id === 'profe-pron-2026-10-02');
  ok('servidor: intento guardado con 92 %', it.intentosUsados === 1 && it.mejor && it.mejor.porcentaje === 92, JSON.stringify(it.mejor));
  // 2.º intento: solo la frase fallada, con reconocimiento
  await p.click('[data-action="volver"]'); await p.waitForSelector('#ruta-plan', { state: 'attached' });
  await p.click('.exam-card [data-action="abrir-item"][data-id="profe-pron-2026-10-02"]');
  await p.waitForSelector('#exam-form'); if (await p.$('[data-action="ver-todas"]')) await p.click('[data-action="ver-todas"]');
  ok('corrección: solo 1 por corregir (la frase fallada)', (await p.textContent('#exam-count')).includes('/1'), await p.textContent('#exam-count'));

  // Navegador sin reconocimiento: autoevaluación
  const q = await pagina(b, false);
  await q.click('.exam-card [data-action="abrir-item"][data-id="profe-pron-2026-10-02"]');
  await q.waitForSelector('#exam-form'); if (await q.$('[data-action="ver-todas"]')) await q.click('[data-action="ver-todas"]');
  const sinRec = await q.$$('[data-action="auto"]');
  ok('sin reconocimiento: botones de autoevaluación y aviso', sinRec.length >= 2 && (await q.textContent('#exam-form')).includes('Chrome o Edge') && !(await q.$('[data-action="grabar"]')));
  await q.click('[data-action="auto"][data-valor="auto:ok"]');
  ok('autoevaluación marca la respuesta', (await q.textContent('#exam-form')).includes('Marcaste que te salió bien'));
  await b.close();
  console.log(out.join('\n')); process.exit(out.some(x => x.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.error('ERROR', e.message.slice(0, 400)); process.exit(2); });
