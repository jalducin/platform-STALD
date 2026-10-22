// Validador de una semana completa antes de subirla al repo de datos (ver openspec: nueva-semana-ingles).
import { erroresPractica } from "./practica.ts";
import { AMBITO_CLASE, AMBITO_PROFE, AMBITO_SECUNDARIA, type Ambito, loadItem } from "./actividades.ts";
import { erroresDiagramas } from "./diagrama.ts";
import { maxIntentos, validateItem } from "./motor.ts";
import type { Store } from "./store.ts";

export interface ReporteSemana {
  errores: string[];
  avisos: string[];
}

interface Semana { id: string; titulo: string; elementos: { id: string; tipo: string; fecha: string }[] }

// Patrón semanal del grupo: mar/jue actividad, vie examen, sáb refuerzo, dom Meet (0 = domingo).
// Ruta del profe: lun actividad A, mié examen A, jue actividad B, vie pronunciación, sáb examen B.
// Secundaria (openspec: secundaria-mis-clases) no tiene patrón: 2 clases por día de lunes a sábado y 3 el domingo.
const PATRONES: Record<string, Record<number, string>> = {
  clase: { 2: "actividad", 4: "actividad", 5: "examen", 6: "refuerzo", 0: "meet" },
  profe: { 1: "actividad", 3: "examen", 4: "actividad", 5: "actividad", 6: "examen" },
};
// Materias de Secundaria; otra materia es aviso (el chip de la vista queda sin color propio).
const MATERIAS_SECUNDARIA = ["Inglés", "Español", "Matemáticas", "Ciencias", "Ciencias Sociales", "Tecnología", "Artes", "Educación Física"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const CORREO = /[\w.+-]+@[\w-]+\.[\w.-]+/;

const diaSemana = (fecha: string) => new Date(`${fecha}T12:00:00Z`).getUTCDay();
const sumarDias = (fecha: string, n: number) => new Date(Date.parse(`${fecha}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

type Elemento = NonNullable<Awaited<ReturnType<typeof loadItem>>>;

// Refuerzo: sus bancos y su base existen, los temas mapeados existen y cada tema tiene ejercicios.
async function revisarRefuerzo(store: Store, it: Elemento, id: string, ids: Set<string>, ambito: Ambito, r: ReporteSemana) {
  const { errores, avisos } = r;
  for (const b of it.bancoDe || []) if (!(await loadItem(store, b, ambito))) errores.push(`${id}: bancoDe ${b} no existe`);
  if (it.basadoEn && !(await loadItem(store, it.basadoEn, ambito))) errores.push(`${id}: basadoEn ${it.basadoEn} no existe`);
  const temas = new Set((it.temas || []).map((t) => t.id));
  for (const [de, a] of Object.entries(it.mapeoTemas || {})) if (!temas.has(a)) errores.push(`${id}: mapeoTemas ${de} → ${a}, tema inexistente en el refuerzo`);
  for (const t of temas) if (!(it.banco || []).some((e) => e.tema === t)) errores.push(`${id}: tema ${t} sin ejercicios en el banco combinado`);
  if (it.basadoEn && !ids.has(it.basadoEn)) avisos.push(`${id}: basadoEn ${it.basadoEn} no es de esta semana`);
}

// Meet: liga, hora, guion y presentación con referencias a teoría válidas.
function revisarMeet(it: Elemento, id: string, r: ReporteSemana) {
  const { errores, avisos } = r;
  if (!it.meetUrl || !it.hora) avisos.push(`${id}: falta meetUrl u hora (pídelas al admin)`);
  if (!(it.guion || []).length) avisos.push(`${id}: sin guion`);
  // deno-lint-ignore no-explicit-any
  const diapositivas = ((it.presentacion as any)?.diapositivas || []) as { tipo: string; ref?: number }[];
  if (!diapositivas.length) avisos.push(`${id}: sin presentacion`);
  for (const d of diapositivas) {
    if (d.tipo === "teoria" && !(Number.isInteger(d.ref) && d.ref! >= 0 && d.ref! < (it.teoria || []).length)) errores.push(`${id}: diapositiva teoria con ref ${d.ref} fuera de rango`);
  }
}

// Apertura de un elemento. Grupo: abre dentro de su semana (lunes…fechaLimite) y el examen, solo su día.
// Ruta del profe (openspec: profe-ruta-abierta): va a su ritmo; puede abrir antes del lunes de su semana y el examen
// no espera su día, pero nunca abre después de `fechaLimite` (que queda como ritmo sugerido).
// Secundaria (openspec: secundaria-mis-clases): dentro de su semana, y el examen mensual puede tener ventana.
// Secundaria con `dia` (openspec: secundaria-adelantar): la clase puede abrir antes de su semana (inicio del bloque de
// 2 semanas, para adelantar), pero su `dia` cae dentro de la semana.
function erroresApertura(it: Elemento, id: string, lunes: string, ambito: Ambito): string[] {
  if (ambito.clave === AMBITO_PROFE.clave) return it.disponibleDesde > it.fechaLimite ? [`${id}: disponibleDesde ${it.disponibleDesde} posterior a fechaLimite ${it.fechaLimite}`] : [];
  const errores: string[] = [];
  const adelanta = ambito.clave === AMBITO_SECUNDARIA.clave && typeof it.dia === "string";
  if (adelanta && (it.dia! < lunes || it.dia! > sumarDias(lunes, 6))) errores.push(`${id}: dia ${it.dia} fuera de la semana ${lunes}…${sumarDias(lunes, 6)}`);
  if ((!adelanta && it.disponibleDesde < lunes) || it.disponibleDesde > it.fechaLimite) errores.push(`${id}: disponibleDesde ${it.disponibleDesde} fuera de ${adelanta ? "" : lunes}…${it.fechaLimite}`);
  if (it.tipo === "examen" && it.disponibleDesde !== it.fechaLimite && ambito.clave !== AMBITO_SECUNDARIA.clave) errores.push(`${id}: el examen debe quedar bloqueado hasta su día (disponibleDesde = ${it.fechaLimite})`);
  return errores;
}

// Revisa un elemento de la semana y agrega sus errores y avisos al reporte.
async function revisarElemento(store: Store, el: Semana["elementos"][number], lunes: string, ambito: Ambito, ids: Set<string>, r: ReporteSemana) {
  const { errores, avisos } = r;
  const PATRON = PATRONES[ambito.clave];
  const it = await loadItem(store, el.id, ambito);
  if (!it) { errores.push(`${el.id}: no existe el archivo en ${ambito.contenido}/actividades ni ${ambito.contenido}/examenes`); return; }
  if (it.tipo !== el.tipo) errores.push(`${el.id}: tipo ${it.tipo} en el archivo y ${el.tipo} en la semana`);
  if (it.fechaLimite !== el.fecha) errores.push(`${el.id}: fechaLimite ${it.fechaLimite} distinta de la fecha de la semana ${el.fecha}`);
  const esSecundaria = ambito.clave === AMBITO_SECUNDARIA.clave;
  errores.push(...erroresApertura(it, el.id, lunes, ambito));
  if (it.tipo === "examen" && maxIntentos(it) === 2 && !it.segundaOportunidad && ambito.clave === AMBITO_CLASE.clave) avisos.push(`${el.id}: examen con 2 intentos sin segundaOportunidad (se sugiere el domingo)`);
  errores.push(...validateItem(it), ...erroresDiagramas(it.teoria).map((e) => `${el.id}: ${e}`), ...erroresPractica(it.teoria).map((e) => `${el.id}: ${e}`));

  if (esSecundaria && typeof it.materia === "string" && it.materia.trim() && !MATERIAS_SECUNDARIA.includes(it.materia)) {
    avisos.push(`${el.id}: materia «${it.materia}» no es una de ${MATERIAS_SECUNDARIA.join(", ")}`);
  }
  const esperado = PATRON?.[diaSemana(el.fecha)];
  if (PATRON && esperado !== el.tipo) avisos.push(`${el.id}: ${el.tipo} el ${DIAS[diaSemana(el.fecha)]}; se esperaba ${esperado ?? "ningún elemento"}`);
  const banco = (it.banco || []).length, ppi = it.preguntasPorIntento || 0;
  if (ppi && it.tipo !== "examen" && (it.tipo !== "meet" || banco) && banco < ppi * maxIntentos(it)) {
    avisos.push(`${el.id}: banco de ${banco} ejercicios, menor que ${ppi} × ${maxIntentos(it)} (poca variedad entre alumnos y alumnas)`);
  }
  if ((it.tipo === "actividad" || it.tipo === "refuerzo") && (!(it.teoria || []).length || !(it.tips || []).length)) avisos.push(`${el.id}: sin teoría o sin tips`);

  if (it.tipo === "refuerzo") await revisarRefuerzo(store, it, el.id, ids, ambito, r);
  if (it.tipo === "meet") revisarMeet(it, el.id, r);
  // El texto crudo, sin el banco combinado del refuerzo (ya se revisa en su propio archivo).
  const crudo = JSON.stringify({ ...it, banco: it.tipo === "refuerzo" ? [] : it.banco });
  if (CORREO.test(crudo)) errores.push(`${el.id}: contiene un correo electrónico (${crudo.match(CORREO)![0]}); no se permiten datos personales`);
}

export async function validarSemana(store: Store, lunes: string, ambito: Ambito = AMBITO_CLASE): Promise<ReporteSemana> {
  const errores: string[] = [], avisos: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lunes) || diaSemana(lunes) !== 1) errores.push(`${lunes}: el id de la semana no es lunes`);
  const doc = await store.get<Semana>(`${ambito.contenido}/semanas/${lunes}.json`);
  if (!doc) return { errores: [...errores, `${ambito.contenido}/semanas/${lunes}.json no existe`], avisos };
  const semana = doc.data;
  if (semana.id !== lunes) errores.push(`${lunes}: el campo id dice ${semana.id}`);

  const ids = new Set(semana.elementos.map((e) => e.id));
  for (const el of semana.elementos) await revisarElemento(store, el, lunes, ambito, ids, { errores, avisos });
  if (CORREO.test(JSON.stringify(semana))) errores.push(`${lunes}: la semana contiene un correo electrónico`);
  return { errores, avisos };
}
