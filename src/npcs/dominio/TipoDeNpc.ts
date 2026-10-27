import { num, type DefinicionDeAtributo, type DefinicionDeBandera } from "@/compartido/dominio/Atributos";

/*
 * Qué clase de NPC es y, sobre todo, qué secciones de la ficha le corresponden: un banquero no
 * tiene golpe ni suelta nada al morir, un comerciante tiene inventario, un lobo pelea.
 *
 * Es el mismo recurso que `TIPOS_DE_OBJETO` y `TIPOS_DE_HECHIZO`: el tipo declara, y la ficha, el
 * validador y la exportación lo siguen. Un tipo nuevo es una línea más en esta lista.
 */

export type TipoDeNpcId = "hostil" | "guardia" | "comerciante" | "sacerdote" | "banquero" | "entrenador" | "quest" | "otro";

export interface TipoDeNpc {
  id: TipoDeNpcId;
  nombre: string;
  /** Pelea: tiene vida, golpe y defensas, y por eso también experiencia y oro. */
  pelea: boolean;
  /** Vende: tiene un inventario de lo que ofrece. */
  comercia: boolean;
  /** Puede lanzar hechizos. */
  lanzaHechizos: boolean;
  /** Suelta objetos al morir. */
  suelta: boolean;
  atributos: readonly DefinicionDeAtributo[];
}

/** Lo que necesita saber algo que pelea. Son los mismos números que el servidor usa en combate. */
const COMBATE: readonly DefinicionDeAtributo[] = [
  num("vida", "Vida"),
  num("golpeMin", "Golpe mín."),
  num("golpeMax", "Golpe máx."),
  num("defensa", "Defensa"),
  num("defensaMagica", "Defensa mágica"),
  num("evasion", "Evasión"),
  num("experiencia", "Experiencia que da"),
  num("oro", "Oro que da"),
  num("domable", "Dificultad para domar"),
];

const comun = { pelea: false, comercia: false, lanzaHechizos: false, suelta: false, atributos: [] } as const;

export const TIPOS_DE_NPC: readonly TipoDeNpc[] = [
  { id: "hostil", nombre: "Criatura hostil", pelea: true, comercia: false, lanzaHechizos: true, suelta: true, atributos: COMBATE },
  { id: "guardia", nombre: "Guardia", pelea: true, comercia: false, lanzaHechizos: true, suelta: false, atributos: COMBATE },
  { id: "comerciante", nombre: "Comerciante", ...comun, comercia: true },
  { id: "sacerdote", nombre: "Sacerdote", ...comun },
  { id: "banquero", nombre: "Banquero", ...comun },
  { id: "entrenador", nombre: "Entrenador", ...comun },
  { id: "quest", nombre: "De misión", ...comun },
  { id: "otro", nombre: "Otro", ...comun },
];

/** Cómo se mueve cuando nadie lo toca. */
export type MovimientoDeNpc = "quieto" | "aleatorio" | "persigue";

export const MOVIMIENTOS: readonly { valor: MovimientoDeNpc; etiqueta: string }[] = [
  { valor: "quieto", etiqueta: "Se queda quieto" },
  { valor: "aleatorio", etiqueta: "Camina al azar" },
  { valor: "persigue", etiqueta: "Persigue al jugador" },
];

export const BANDERAS_DE_NPC: readonly DefinicionDeBandera[] = [
  { clave: "atacable", etiqueta: "Se le puede pegar" },
  { clave: "hostil", etiqueta: "Ataca al jugador" },
  { clave: "respawn", etiqueta: "Vuelve a aparecer" },
];

export function tipoDeNpc(id: string): TipoDeNpc {
  return TIPOS_DE_NPC.find((t) => t.id === id) ?? TIPOS_DE_NPC[TIPOS_DE_NPC.length - 1]!;
}

export function esTipoDeNpcValido(id: string): id is TipoDeNpcId {
  return TIPOS_DE_NPC.some((t) => t.id === id);
}

export function esMovimientoValido(v: string): v is MovimientoDeNpc {
  return MOVIMIENTOS.some((m) => m.valor === v);
}
