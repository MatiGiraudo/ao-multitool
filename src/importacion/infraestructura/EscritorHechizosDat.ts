import type { Hechizo } from "@/hechizos/dominio/Hechizo";
import type { EscritorDeHechizosClasicos } from "../aplicacion/puertos";
import { ENCABEZADO, type OriginalesDeFamilia } from "../dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion, salvoElDefault, siPrendida, type ClavesPropias } from "./EscritorIni";

/**
 * Devuelve el `Hechizos.dat` con los hechizos del editor escritos encima de los originales.
 *
 * Acá la traducción es la más torcida de las tres: el clásico codifica el efecto con una docena
 * de banderas sueltas (`SubeHP`, `Paraliza`, `Invoca`…) que el editor junta en un solo `tipo`, y
 * varias de ellas pueden venir en 1 a la vez. Volver atrás sería elegir una de las formas de
 * escribir lo mismo y pisar la que el archivo traía.
 *
 * Por eso, sobre un hechizo importado, el efecto **no se toca**: se reescribe lo que la ficha
 * muestra —nombre, palabras mágicas, maná, energía, objetivo, FX, sonido, requisitos— y las
 * banderas del efecto quedan como estaban. Un hechizo creado en el editor sí las necesita, así
 * que para ésos se escribe la forma más común de cada tipo.
 */

const OBJETIVO_CLASICO: Readonly<Record<string, number>> = { usuario: 1, npc: 2, ambos: 3, terreno: 4 };

/** Qué bandera del clásico prende cada tipo del editor, para los hechizos nuevos. */
const EFECTO_CLASICO: Readonly<Record<string, (a: Record<string, number>) => ClavesPropias>> = {
  curacion: (a) => ({ SubeHP: 1, MinHP: a.min ?? 0, MaxHP: a.max ?? 0 }),
  dano: (a) => ({ SubeHP: 2, MinHP: a.min ?? 0, MaxHP: a.max ?? 0 }),
  resucitar: () => ({ Revivir: 1 }),
  paralizar: (a) => ({ Paraliza: 1, Duracion: a.duracion ?? 0 }),
  remover_paralisis: () => ({ RemoverParalisis: 1 }),
  envenenar: (a) => ({ Envenena: 1, Duracion: a.duracion ?? 0 }),
  curar_veneno: () => ({ CuraVeneno: 1 }),
  invisibilidad: (a) => ({ Invisibilidad: 1, Duracion: a.duracion ?? 0 }),
  ceguera: (a) => ({ Ceguera: 1, Duracion: a.duracion ?? 0 }),
  estupidez: (a) => ({ Estupidez: 1, Duracion: a.duracion ?? 0 }),
  invocar: (a) => ({ Invoca: 1, NumNpc: a.npc ?? 0, Cant: a.cantidad ?? 0 }),
};

/** `modificar_stat` es uno solo acá y seis allá, según qué stat toque. */
const STAT_CLASICO: Readonly<Record<string, [string, string, string]>> = {
  mana: ["SubeMana", "MinMana", "MaxMana"],
  energia: ["SubeSta", "MinSta", "MaxSta"],
  fuerza: ["SubeFuerza", "MinFuerza", "MaxFuerza"],
  agilidad: ["SubeAgilidad", "MinAgilidad", "MaxAgilidad"],
  hambre: ["SubeHam", "MinHam", "MaxHam"],
  sed: ["SubeSed", "MinSed", "MaxSed"],
};

export class EscritorHechizosDat implements EscritorDeHechizosClasicos {
  escribir(hechizos: readonly Hechizo[], originales: OriginalesDeFamilia): string {
    const ordenados = [...hechizos].sort((a, b) => a.numero - b.numero);
    const secciones = ordenados.map((hechizo) => {
      const original = originales[hechizo.numero];
      const lineas = original ? original.split(/\r?\n/) : [`[Hechizo${hechizo.numero}]`];
      const reescrita = reescribirSeccion(lineas, clavesDe(hechizo, !!original));
      return original ? reescrita : [...reescrita, ""];
    });
    const encabezado = originales[ENCABEZADO];
    return armarIni(secciones, encabezado ? encabezado.split(/\r?\n/) : [`[INIT]`, `NumeroHechizos=${ordenados.at(-1)?.numero ?? 0}`, ""]);
  }
}

function clavesDe(hechizo: Hechizo, tieneOriginal: boolean): ClavesPropias {
  const claves: ClavesPropias = {
    Nombre: hechizo.nombre,
    Desc: hechizo.descripcion,
    PalabrasMagicas: hechizo.palabrasMagicas,
    ManaRequerido: hechizo.mana,
    StaRequerido: hechizo.energia,
    MinSkill: hechizo.skillRequerido,
    MinLevel: hechizo.nivelMinimo,
    // Un hechizo sin `Target` se muestra como «ambos»: eso es el valor por defecto, no una elección.
    Target: salvoElDefault(OBJETIVO_CLASICO[hechizo.objetivo] ?? 3, 3),
    FXgrh: hechizo.fx,
    WAV: hechizo.sonido,
    NeedStaff: siPrendida(hechizo.banderas.includes("baculo")),
    AutoLanzar: siPrendida(hechizo.banderas.includes("autolanzable")),
  };
  if (tieneOriginal) return claves;

  // Sólo para los hechizos nuevos: el efecto, en la forma más común de escribirlo.
  const atributos = Object.fromEntries(
    Object.entries(hechizo.atributosVigentes()).map(([k, v]) => [k, typeof v === "number" ? v : 0]),
  ) as Record<string, number>;
  const stat = String(hechizo.atributosVigentes().stat ?? "");
  if (hechizo.tipo.id === "modificar_stat" && STAT_CLASICO[stat]) {
    const [bandera, min, max] = STAT_CLASICO[stat]!;
    return { ...claves, [bandera]: 1, [min]: atributos.min ?? 0, [max]: atributos.max ?? 0 };
  }
  return { ...claves, ...(EFECTO_CLASICO[hechizo.tipo.id]?.(atributos) ?? {}) };
}
