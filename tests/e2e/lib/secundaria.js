// Ayudante E2E de Secundaria (openspec: navegacion-mejoras): abre una pestaña como lo haría una persona en ese tamaño.
// Tablet y PC: la fila de pestañas (`.sec-tabs`). Celular: la barra inferior (`.sec-barra`) o, si la pestaña no está
// ahí, «☰ Más» (`[data-sec-mas]`) y luego la pestaña dentro de `#sec-mas`. Espera a que su panel se vea.
// `toca(sel)`: opcional, para contar toques (p. ej. el medidor de navegacion-dispositivos); por omisión, `page.click`.
async function irPestanaSec(p, id, toca) {
  const tocar = toca || (sel => p.locator(sel).filter({ visible: true }).first().click());
  const visible = async sel => (await p.locator(sel).filter({ visible: true }).count()) > 0;
  const fila = `.sec-tabs [data-sec-tab="${id}"]`;
  const barra = `.sec-barra [data-sec-tab="${id}"]`;
  if (await visible(fila)) await tocar(fila);
  else if (await visible(barra)) await tocar(barra);
  else { await tocar('.sec-barra [data-sec-mas]'); await tocar(`#sec-mas [data-sec-tab="${id}"]`); }
  await p.waitForSelector(`#sec-${id}:not([hidden])`, { timeout: 30000 });
}

module.exports = { irPestanaSec };
