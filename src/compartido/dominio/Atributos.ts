import { asegurar, ErrorDeDominio } from "./ErrorDeDominio";

/*
 * Los atributos que dependen del tipo: un arma tiene golpe mínimo y máximo, una poción tiene
 * efecto y duración, un hechizo de daño tiene su rango. En vez de una clase por tipo, cada tipo
 * DECLARA qué atributos tiene, y la ficha, el validador y la exportación los recorren solos.
 *
 * Agregar un atributo (o un tipo entero) es agregar un dato, no tocar código: eso es el principio
 * abierto/cerrado, y es lo que hace que Objetos y Hechizos compartan toda esta maquinaria.
 */

export type ValorDeAtributo = string | number;

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

/** Atajo para declarar un atributo numérico, que es el caso más común. */
export const num = (clave: string, etiqueta: string): DefinicionDeAtributo => ({ clave, etiqueta, clase: "numero" });

/**
 * Devuelve un mapa de atributos nuevo con ese cambio aplicado, validando contra la definición.
 * Un valor null o vacío borra el atributo.
 */
export function conAtributo(
  atributos: Readonly<Record<string, ValorDeAtributo>>,
  definiciones: readonly DefinicionDeAtributo[],
  clave: string,
  valor: ValorDeAtributo | null,
  queNoAplica: string,
): Record<string, ValorDeAtributo> {
  const def = definiciones.find((a) => a.clave === clave);
  if (!def) throw new ErrorDeDominio(queNoAplica);
  const out = { ...atributos };
  if (valor === null || valor === "") {
    delete out[clave];
    return out;
  }
  if (def.clase === "numero") {
    const n = Number(valor);
    asegurar(Number.isFinite(n), `${def.etiqueta} tiene que ser un número.`);
    out[clave] = n;
  } else if (def.clase === "opcion") {
    asegurar(def.opciones?.some(([v]) => v === valor), `Opción inválida para ${def.etiqueta}.`);
    out[clave] = String(valor);
  } else out[clave] = String(valor);
  return out;
}

/** Sólo los atributos que corresponden a estas definiciones (los de otro tipo se conservan, pero no cuentan). */
export function atributosVigentes(
  atributos: Readonly<Record<string, ValorDeAtributo>>,
  definiciones: readonly DefinicionDeAtributo[],
): Record<string, ValorDeAtributo> {
  const out: Record<string, ValorDeAtributo> = {};
  for (const a of definiciones) {
    const v = atributos[a.clave];
    if (v !== undefined && v !== "") out[a.clave] = v;
  }
  return out;
}

/** Igual que el anterior, para las banderas. */
export function banderasVigentes(banderas: readonly string[], definiciones: readonly DefinicionDeBandera[]): string[] {
  const ok = new Set(definiciones.map((b) => b.clave));
  return banderas.filter((b) => ok.has(b));
}
