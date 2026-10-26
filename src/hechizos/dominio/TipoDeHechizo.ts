import { num, type DefinicionDeAtributo, type DefinicionDeBandera } from "@/compartido/dominio/Atributos";

/*
 * Catálogo de lo que puede hacer un hechizo, y qué datos necesita cada cosa.
 * Es conocimiento del negocio, igual que `TIPOS_DE_OBJETO`, y por eso vive en el dominio.
 *
 * Agregar un efecto nuevo es agregar una entrada acá: la ficha dibuja sus campos, el validador lo
 * revisa y la exportación lo escribe, sin tocar nada más.
 */

export type TipoDeHechizoId =
  | "dano"
  | "curacion"
  | "resucitar"
  | "paralizar"
  | "remover_paralisis"
  | "envenenar"
  | "curar_veneno"
  | "invisibilidad"
  | "ceguera"
  | "estupidez"
  | "invocar"
  | "modificar_stat";

export interface TipoDeHechizo {
  id: TipoDeHechizoId;
  nombre: string;
  atributos: readonly DefinicionDeAtributo[];
}

const rango = [num("min", "Mínimo"), num("max", "Máximo")];
const duracion = [num("duracion", "Duración (s)")];

export const TIPOS_DE_HECHIZO: readonly TipoDeHechizo[] = [
  { id: "dano", nombre: "Daño", atributos: rango },
  { id: "curacion", nombre: "Curación", atributos: rango },
  { id: "resucitar", nombre: "Resucitar", atributos: [] },
  { id: "paralizar", nombre: "Paralizar", atributos: duracion },
  { id: "remover_paralisis", nombre: "Remover parálisis", atributos: [] },
  { id: "envenenar", nombre: "Envenenar", atributos: duracion },
  { id: "curar_veneno", nombre: "Curar veneno", atributos: [] },
  { id: "invisibilidad", nombre: "Invisibilidad", atributos: duracion },
  { id: "ceguera", nombre: "Ceguera", atributos: duracion },
  { id: "estupidez", nombre: "Estupidez", atributos: duracion },
  { id: "invocar", nombre: "Invocar NPC", atributos: [num("npc", "N.º de NPC"), num("cantidad", "Cantidad")] },
  {
    id: "modificar_stat",
    nombre: "Modificar atributo",
    atributos: [
      {
        clave: "stat",
        etiqueta: "Atributo",
        clase: "opcion",
        opciones: [
          ["mana", "Maná"],
          ["energia", "Energía"],
          ["fuerza", "Fuerza"],
          ["agilidad", "Agilidad"],
          ["carisma", "Carisma"],
          ["hambre", "Hambre"],
          ["sed", "Sed"],
        ],
      },
      ...rango,
      ...duracion,
    ],
  },
];

/** Sobre qué se lanza. En el clásico es el `Target`. */
export type ObjetivoDeHechizo = "usuario" | "npc" | "terreno" | "ambos";

export const OBJETIVOS: readonly { valor: ObjetivoDeHechizo; etiqueta: string }[] = [
  { valor: "usuario", etiqueta: "Sobre un usuario" },
  { valor: "npc", etiqueta: "Sobre un NPC" },
  { valor: "ambos", etiqueta: "Usuario o NPC" },
  { valor: "terreno", etiqueta: "Sobre el terreno" },
];

export const BANDERAS_DE_HECHIZO: readonly DefinicionDeBandera[] = [
  { clave: "baculo", etiqueta: "Necesita báculo" },
  { clave: "autolanzable", etiqueta: "Se puede lanzar a uno mismo" },
];

export function tipoDeHechizo(id: string): TipoDeHechizo {
  return TIPOS_DE_HECHIZO.find((t) => t.id === id) ?? TIPOS_DE_HECHIZO[0]!;
}

export function esTipoDeHechizoValido(id: string): id is TipoDeHechizoId {
  return TIPOS_DE_HECHIZO.some((t) => t.id === id);
}

export function esObjetivoValido(v: string): v is ObjetivoDeHechizo {
  return OBJETIVOS.some((o) => o.valor === v);
}
