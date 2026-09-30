// Validador de una semana completa antes de subirla al repo de datos (ver openspec: nueva-semana-ingles).
import { loadItem } from "./actividades.ts";
import { maxIntentos, validateItem } from "./motor.ts";
import type { Store } from "./store.ts";

export interface ReporteSemana {
  errores: string[];
  avisos: string[];
}

interface Semana { id: string; titulo: string; elementos: { id: string; tipo: string; fecha: string }[] }

// Patrón semanal: mar/jue actividad, vie examen, sáb refuerzo, dom Meet (0 = domingo).
const PATRON: Record<number, string> = { 2: "actividad", 4: "actividad", 5: "examen", 6: "refuerzo", 0: "meet" };
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const CORREO = /[\w.+-]+@[\w-]+\.[\w.-]+/;

const diaSemana = (fecha: string) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

export async function validarSemana(store: Store, lunes: string): Promise<ReporteSemana> {
  const errores: string[] = [], avisos: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lunes) || diaSemana(lunes) !== 1) errores.push(`${lunes}: el id de la semana no es lunes`);
  const doc = await store.get<Semana>(`contenido/semanas/${lunes}.json`);
  if (!doc) return { errores: [...errores, `contenido/semanas/${lunes}.json no existe`], avisos };
  const semana = doc.data;
  if (semana.id !== lunes) errores.push(`${lunes}: el campo id dice ${semana.id}`);

  const ids = new Set(semana.elementos.map((e) => e.id));
  for (const el of semana.elementos) {
    const it = await loadItem(store, el.id);
    if (!it) { errores.push(`${el.id}: no existe el archivo en contenido/actividades ni contenido/examenes`); continue; }
    if (it.tipo !== el.tipo) errores.push(`${el.id}: tipo ${it.tipo} en el archivo y ${el.tipo} en la semana`);
    if (it.fechaLimite !== el.fecha) errores.push(`${el.id}: fechaLimite ${it.fechaLimite} distinta de la fecha de la semana ${el.fecha}`);
    if (it.disponibleDesde < lunes || it.disponibleDesde > it.fechaLimite) errores.push(`${el.id}: disponibleDesde ${it.disponibleDesde} fuera de ${lunes}…${it.fechaLimite}`);
    if (it.tipo === "examen" && it.disponibleDesde !== it.fechaLimite) errores.push(`${el.id}: el examen debe quedar bloqueado hasta su día (disponibleDesde = ${it.fechaLimite})`);
    errores.push(...validateItem(it));

    const esperado = PATRON[diaSemana(el.fecha)];
    if (esperado !== el.tipo) avisos.push(`${el.id}: ${el.tipo} el ${DIAS[diaSemana(el.fecha)]}; se esperaba ${esperado ?? "ningún elemento"}`);
    const banco = (it.banco || []).length, ppi = it.preguntasPorIntento || 0;
    if (ppi && it.tipo !== "examen" && (it.tipo !== "meet" || banco) && banco < ppi * maxIntentos(it)) {
      avisos.push(`${el.id}: banco de ${banco} ejercicios, menor que ${ppi} × ${maxIntentos(it)} (poca variedad entre alumnos y alumnas)`);
    }
    if ((it.tipo === "actividad" || it.tipo === "refuerzo") && (!(it.teoria || []).length || !(it.tips || []).length)) avisos.push(`${el.id}: sin teoría o sin tips`);

    if (it.tipo === "refuerzo") {
      for (const b of it.bancoDe || []) if (!(await loadItem(store, b))) errores.push(`${el.id}: bancoDe ${b} no existe`);
      if (it.basadoEn && !(await loadItem(store, it.basadoEn))) errores.push(`${el.id}: basadoEn ${it.basadoEn} no existe`);
      const temas = new Set((it.temas || []).map((t) => t.id));
      for (const [de, a] of Object.entries(it.mapeoTemas || {})) if (!temas.has(a)) errores.push(`${el.id}: mapeoTemas ${de} → ${a}, tema inexistente en el refuerzo`);
      for (const t of temas) if (!(it.banco || []).some((e) => e.tema === t)) errores.push(`${el.id}: tema ${t} sin ejercicios en el banco combinado`);
      if (it.basadoEn && !ids.has(it.basadoEn)) avisos.push(`${el.id}: basadoEn ${it.basadoEn} no es de esta semana`);
    }
    if (it.tipo === "meet") {
      if (!it.meetUrl || !it.hora) avisos.push(`${el.id}: falta meetUrl u hora (pídelas al admin)`);
      if (!(it.guion || []).length) avisos.push(`${el.id}: sin guion`);
      // deno-lint-ignore no-explicit-any
      const diapositivas = ((it.presentacion as any)?.diapositivas || []) as { tipo: string; ref?: number }[];
      if (!diapositivas.length) avisos.push(`${el.id}: sin presentacion`);
      for (const d of diapositivas) {
        if (d.tipo === "teoria" && !(Number.isInteger(d.ref) && d.ref! >= 0 && d.ref! < (it.teoria || []).length)) errores.push(`${el.id}: diapositiva teoria con ref ${d.ref} fuera de rango`);
      }
    }
    // El texto crudo, sin el banco combinado del refuerzo (ya se revisa en su propio archivo).
    const crudo = JSON.stringify({ ...it, banco: it.tipo === "refuerzo" ? [] : it.banco });
    if (CORREO.test(crudo)) errores.push(`${el.id}: contiene un correo electrónico (${crudo.match(CORREO)![0]}); no se permiten datos personales`);
  }
  if (CORREO.test(JSON.stringify(semana))) errores.push(`${lunes}: la semana contiene un correo electrónico`);
  return { errores, avisos };
}
