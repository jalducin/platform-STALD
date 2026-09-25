// Lógica pura: extracción de filas de Notion y filtrado por correo.
// Sin llamadas de red, para poder probarla con `deno test`.

export interface UserInfo {
  email: string | null;
  name: string | null;
}

// Campos internos que nunca salen en la respuesta HTTP.
interface WithUsers {
  userIds: string[];
  userEmails: string[];
  userNames: string[];
}

export interface SecundariaRow extends WithUsers {
  name: string;
  materia: string | null;
  completado: boolean;
  fecha: string | null;
  fechaReal: string | null;
  semana: string | null;
  dia: string | null;
  url: string;
}

export interface InglesRow extends WithUsers {
  source: "clases_ingles";
  name: string;
  label: string;
  completado: boolean;
  fecha: string | null;
  alumno: string | null;
  url: string;
}

// deno-lint-ignore no-explicit-any
type NotionPage = any;

function peopleIds(p: NotionPage): string[] {
  // deno-lint-ignore no-explicit-any
  return (p?.["Usuario"]?.people || []).map((u: any) => u.id);
}

function title(p: NotionPage): string {
  return p?.["Name"]?.title?.[0]?.plain_text || "(sin título)";
}

// Base "📖 Clases" (Secundaria). Los nombres de propiedad son literales de Notion.
export function extractSecundariaRow(page: NotionPage): SecundariaRow {
  const p = page.properties;
  const real = p["Fecha entrega real"];
  return {
    name: title(p),
    materia: p["Matería"]?.select?.name || null,
    completado: !!p["Completado"]?.checkbox,
    fecha: p["Fecha entrega"]?.date?.start || null,
    fechaReal: real?.last_edited_time
      ? String(real.last_edited_time).slice(0, 10)
      : (real?.date?.start || null),
    semana: p["Semana"]?.select?.name || null,
    dia: p["Día "]?.select?.name || null,
    userIds: peopleIds(p),
    userEmails: [],
    userNames: [],
    url: page.url,
  };
}

// Base "📖 Clases Inglés". Ojo: "Fecha Entrega " lleva espacio final.
export function extractInglesRow(page: NotionPage): InglesRow {
  const p = page.properties;
  const modulo = p["Módulo"]?.select?.name || "";
  const tipo = p["Tipo"]?.select?.name || "";
  return {
    source: "clases_ingles",
    name: title(p),
    label: [modulo, tipo].filter(Boolean).join(" · "),
    completado: !!p["Completado"]?.checkbox,
    fecha: p["Fecha Entrega "]?.date?.start || null,
    alumno: p["Nombre"]?.select?.name || null,
    userIds: peopleIds(p),
    userEmails: [],
    userNames: [],
    url: page.url,
  };
}

export function attachUsers<T extends WithUsers>(rows: T[], users: Map<string, UserInfo>): T[] {
  for (const row of rows) {
    const resolved = row.userIds.map((id) => users.get(id)).filter((u): u is UserInfo => !!u);
    row.userEmails = resolved.map((u) => u.email).filter((e): e is string => !!e);
    row.userNames = resolved.map((u) => u.name).filter((n): n is string => !!n);
  }
  return rows;
}

export function normalizeEmail(raw: string | null | undefined): string {
  return (raw || "").trim().toLowerCase();
}

// Decide qué filas ve un correo. Sin admin configurado, nadie es admin.
export function filterForEmail<T extends WithUsers>(
  rows: T[],
  email: string,
  adminEmail: string,
): { rows: Omit<T, "userIds" | "userEmails">[]; isAdmin: boolean } {
  const isAdmin = adminEmail !== "" && email === adminEmail;
  const visible = isAdmin ? rows : rows.filter((r) => r.userEmails.includes(email));
  return { rows: visible.map(toPublic), isAdmin };
}

// Quita correos e IDs de usuario; conserva los nombres para la vista admin.
export function toPublic<T extends WithUsers>(row: T): Omit<T, "userIds" | "userEmails"> {
  const { userIds: _ids, userEmails: _emails, ...rest } = row;
  return rest;
}
