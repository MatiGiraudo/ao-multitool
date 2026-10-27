/**
 * Las pestañas del editor. Sumar una herramienta nueva es agregar una línea acá: el encabezado,
 * el título de la pestaña activa y el orden salen de esta lista.
 *
 * `familia` las agrupa visualmente. Mientras una familia tenga una sola pestaña se ve como un
 * botón suelto; cuando se llenen (Apariencias y NPCs en Personajes, FX y Hechizos en Reglas,
 * Mapas y Diagnóstico en Mundo) el agrupado se nota solo, sin tocar el encabezado.
 */
export type Familia = "Gráficos" | "Personajes" | "Reglas" | "Mundo" | "Proyecto";

export const FAMILIAS: readonly Familia[] = ["Gráficos", "Personajes", "Reglas", "Mundo", "Proyecto"];

export interface Seccion {
  href: string;
  nombre: string;
  familia: Familia;
  /** La línea de ayuda que el encabezado muestra cuando la pestaña está activa. */
  sub: string;
}

export const SECCIONES: readonly Seccion[] = [
  {
    href: "/animaciones",
    nombre: "Animaciones",
    familia: "Gráficos",
    sub: "Cargá hojas de sprites, marcá los frames en orden y exportá cada ciclo como JSON.",
  },
  {
    href: "/apariencias",
    nombre: "Apariencias",
    familia: "Personajes",
    sub: "Armá los cuerpos y las cabezas: su gráfico en cada dirección y dónde se apoya la cabeza.",
  },
  {
    href: "/npcs",
    nombre: "NPCs",
    familia: "Personajes",
    sub: "Criaturas y gente del mundo: su apariencia, qué pelean, qué sueltan, qué venden y qué lanzan.",
  },
  {
    href: "/objetos",
    nombre: "Objetos",
    familia: "Reglas",
    sub: "Creá los objetos del juego y vinculá su icono, gráfico en el suelo y animaciones de equipado.",
  },
  {
    href: "/fx",
    nombre: "FX",
    familia: "Reglas",
    sub: "Armá los efectos visuales: qué animación se dibuja, cuánto se corre y cuántas veces se repite.",
  },
  {
    href: "/hechizos",
    nombre: "Hechizos",
    familia: "Reglas",
    sub: "Definí los hechizos: qué hacen, cuánto cuestan, sus palabras mágicas y con qué FX se ven.",
  },
  {
    href: "/diagnostico",
    nombre: "Diagnóstico",
    familia: "Mundo",
    sub: "Qué quedó roto o a medio terminar en todo el mundo, incluido lo que ningún módulo ve solo.",
  },
  {
    href: "/importar",
    nombre: "Importar",
    familia: "Proyecto",
    sub: "Traé lo que ya existe en los archivos del AO original: la tabla de GRH, los cuerpos, las cabezas, los FX, los objetos y los hechizos.",
  },
  {
    href: "/exportar",
    nombre: "Exportar",
    familia: "Proyecto",
    sub: "Los JSON de todo el mundo juntos, listos para que los lea el juego.",
  },
];

/** La sección a la que corresponde una ruta (la primera, si no hay ninguna). */
export function seccionDe(ruta: string | null | undefined): Seccion {
  return SECCIONES.find((s) => ruta?.startsWith(s.href)) ?? SECCIONES[0]!;
}

/** Las secciones agrupadas por familia, en el orden de FAMILIAS y salteando las familias vacías. */
export function seccionesPorFamilia(): { familia: Familia; secciones: Seccion[] }[] {
  return FAMILIAS.map((familia) => ({ familia, secciones: SECCIONES.filter((s) => s.familia === familia) })).filter((g) => g.secciones.length > 0);
}
