/*
 * Catálogo de tipos de objeto de AO y qué atributos tiene cada uno.
 * Es conocimiento del negocio, por eso vive en el dominio.
 * Las claves (arma, minHit, noCae…) son las mismas que exportaba el indexador web: no las cambies
 * sin migrar los JSON existentes.
 */

export type TipoDeObjetoId =
  | "arma"
  | "armadura"
  | "casco"
  | "escudo"
  | "herramienta"
  | "pocion"
  | "comida"
  | "pergamino"
  | "llave"
  | "recurso"
  | "oro"
  | "otro";

export interface DefinicionDeAtributo {
  clave: string;
  etiqueta: string;
  clase: "numero" | "texto" | "opcion";
  opciones?: readonly (readonly [valor: string, etiqueta: string])[];
}

export interface DefinicionDeBandera {
  clave: string;
  etiqueta: string;
}

export interface TipoDeObjeto {
  id: TipoDeObjetoId;
  nombre: string;
  /** Se ve puesto en el personaje: necesita animaciones por dirección. */
  equipable: boolean;
  atributos: readonly DefinicionDeAtributo[];
  banderas: readonly DefinicionDeBandera[];
}

const num = (clave: string, etiqueta: string): DefinicionDeAtributo => ({ clave, etiqueta, clase: "numero" });
const defensa = [num("minDef", "Defensa mín."), num("maxDef", "Defensa máx.")];

export const BANDERAS_COMUNES: readonly DefinicionDeBandera[] = [
  { clave: "newbie", etiqueta: "Solo newbies" },
  { clave: "noCae", etiqueta: "No se cae al morir" },
  { clave: "intransferible", etiqueta: "Intransferible" },
];

export const TIPOS_DE_OBJETO: readonly TipoDeObjeto[] = [
  {
    id: "arma",
    nombre: "Arma",
    equipable: true,
    atributos: [num("minHit", "Golpe mín."), num("maxHit", "Golpe máx.")],
    banderas: [
      { clave: "dosManos", etiqueta: "Dos manos" },
      { clave: "proyectil", etiqueta: "Usa proyectiles" },
    ],
  },
  { id: "armadura", nombre: "Armadura / ropa", equipable: true, atributos: defensa, banderas: [] },
  { id: "casco", nombre: "Casco", equipable: true, atributos: defensa, banderas: [] },
  { id: "escudo", nombre: "Escudo", equipable: true, atributos: defensa, banderas: [] },
  {
    id: "herramienta",
    nombre: "Herramienta",
    equipable: true,
    atributos: [
      {
        clave: "oficio",
        etiqueta: "Oficio",
        clase: "opcion",
        opciones: [
          ["pesca", "Pesca"],
          ["tala", "Tala"],
          ["mineria", "Minería"],
          ["herreria", "Herrería"],
          ["carpinteria", "Carpintería"],
        ],
      },
    ],
    banderas: [],
  },
  {
    id: "pocion",
    nombre: "Poción",
    equipable: false,
    atributos: [
      {
        clave: "efecto",
        etiqueta: "Efecto",
        clase: "opcion",
        opciones: [
          ["vida", "Vida"],
          ["mana", "Maná"],
          ["fuerza", "Fuerza"],
          ["agilidad", "Agilidad"],
          ["cura_veneno", "Cura veneno"],
        ],
      },
      num("min", "Cantidad mín."),
      num("max", "Cantidad máx."),
      num("duracion", "Duración (s)"),
    ],
    banderas: [],
  },
  { id: "comida", nombre: "Comida / bebida", equipable: false, atributos: [num("hambre", "Quita hambre"), num("sed", "Quita sed")], banderas: [] },
  { id: "pergamino", nombre: "Pergamino", equipable: false, atributos: [num("hechizo", "N.º de hechizo")], banderas: [] },
  { id: "llave", nombre: "Llave", equipable: false, atributos: [{ clave: "clave", etiqueta: "Clave", clase: "texto" }], banderas: [] },
  { id: "recurso", nombre: "Recurso", equipable: false, atributos: [], banderas: [] },
  { id: "oro", nombre: "Oro", equipable: false, atributos: [], banderas: [] },
  { id: "otro", nombre: "Otro", equipable: false, atributos: [], banderas: [] },
];

export function tipoDeObjeto(id: string): TipoDeObjeto {
  return TIPOS_DE_OBJETO.find((t) => t.id === id) ?? TIPOS_DE_OBJETO[TIPOS_DE_OBJETO.length - 1]!;
}

export function esTipoValido(id: string): id is TipoDeObjetoId {
  return TIPOS_DE_OBJETO.some((t) => t.id === id);
}

export function banderasPermitidas(t: TipoDeObjeto): readonly DefinicionDeBandera[] {
  return [...BANDERAS_COMUNES, ...t.banderas];
}
