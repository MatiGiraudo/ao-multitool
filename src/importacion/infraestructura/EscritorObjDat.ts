import type { Objeto } from "@/objetos/dominio/Objeto";
import type { TipoDeObjetoId } from "@/objetos/dominio/TipoDeObjeto";
import type { EscritorDeObjetosClasicos } from "../aplicacion/puertos";
import { ENCABEZADO, type OriginalesDeFamilia } from "../dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion, type ClavesPropias } from "./EscritorIni";

/**
 * Devuelve el `OBJ.dat`, con los objetos del editor escritos encima de los originales.
 *
 * Lo que el editor maneja se reescribe; todo lo demás —ropaje, sonidos, clases prohibidas,
 * requisitos de herrería— vuelve tal como vino. Por eso un archivo importado y exportado sin
 * tocar nada sale idéntico, y uno con un nombre editado sale idéntico salvo esa línea.
 *
 * Dos cosas que no se reescriben nunca sobre un objeto importado, a propósito:
 *
 * - **`ObjType`**: varios tipos del clásico caen en el mismo del editor (1, 13 y 34 son todos
 *   «comida»), así que volver atrás sería adivinar. El del archivo es el que sabe.
 * - **`GrhIndex`**: el editor guarda «tal hoja, tal animación», no un número de GRH. Mientras no
 *   se resuelva al revés, el icono vuelve como estaba; si lo cambiaste acá, en el clásico sigue
 *   el de antes.
 *
 * Un objeto creado en el editor no tiene original: sale con las claves conocidas y nada más. El
 * servidor lee las que faltan como 0, que para un objeto nuevo suele estar bien.
 */

/** Para los objetos nuevos, un `ObjType` representativo de cada tipo del editor. */
const TIPO_CLASICO: Readonly<Record<TipoDeObjetoId, number>> = {
  comida: 1,
  arma: 2,
  armadura: 3,
  oro: 5,
  llave: 9,
  pocion: 11,
  recurso: 14,
  escudo: 16,
  casco: 17,
  pergamino: 24,
  herramienta: 2,
  otro: 0,
};

const EFECTO_CLASICO: Readonly<Record<string, number>> = {
  agilidad: 1,
  fuerza: 2,
  vida: 3,
  mana: 4,
  cura_veneno: 5,
};

export class EscritorObjDat implements EscritorDeObjetosClasicos {
  escribir(objetos: readonly Objeto[], originales: OriginalesDeFamilia): string {
    const ordenados = [...objetos].sort((a, b) => a.numero - b.numero);
    const secciones = ordenados.map((objeto) => {
      const original = originales[objeto.numero];
      // El original ya trae su propia línea `[OBJn]`, con el comentario que tuviera al lado. Uno
      // nuevo la necesita, y además un renglón en blanco para que no quede pegado al siguiente.
      const lineas = original ? original.split(/\r?\n/) : [`[OBJ${objeto.numero}]`];
      const reescrita = reescribirSeccion(lineas, clavesDe(objeto, !!original));
      return original ? reescrita : [...reescrita, ""];
    });
    // El encabezado del archivo vuelve tal cual: en un OBJ.dat es la tabla de tipos comentada que
    // explica qué significa cada `ObjType`, o sea la documentación para el que lo abra. Si no hay
    // original, alcanza con el `NumObjs` que el servidor espera.
    const encabezado = originales[ENCABEZADO];
    return armarIni(secciones, encabezado ? encabezado.split(/\r?\n/) : [`NumObjs=${ordenados.at(-1)?.numero ?? 0}`]);
  }
}

function clavesDe(objeto: Objeto, tieneOriginal: boolean): ClavesPropias {
  const atributos = objeto.atributosVigentes();
  /* Siempre un número, 0 incluido: si la clave ya estaba en el archivo hay que escribir lo que
   * dice el editor, y si no estaba, el escritor no la agrega cuando es 0. */
  const numero = (clave: string) => {
    const v = Number(atributos[clave] ?? 0);
    return Number.isFinite(v) ? v : 0;
  };
  const bandera = (clave: string) => (objeto.banderas.includes(clave) ? 1 : 0);

  const claves: ClavesPropias = {
    Name: objeto.nombre,
    Valor: objeto.valor,
    Texto: objeto.descripcion || null,
    Newbie: bandera("newbie"),
    Crucial: bandera("noCae"),
    Instransferible: bandera("intransferible"),
    DosManos: bandera("dosManos"),
    Proyectil: bandera("proyectil"),
  };
  if (!tieneOriginal) claves.ObjType = TIPO_CLASICO[objeto.tipo.id] ?? 0;

  switch (objeto.tipo.id) {
    case "arma":
      claves.MinHIT = numero("minHit");
      claves.MaxHIT = numero("maxHit");
      break;
    case "armadura":
    case "casco":
    case "escudo":
      claves.MinDef = numero("minDef");
      claves.MaxDef = numero("maxDef");
      break;
    case "pocion":
      claves.TipoPocion = EFECTO_CLASICO[String(atributos.efecto ?? "")] ?? null;
      claves.MinModificador = numero("min");
      claves.MaxModificador = numero("max");
      claves.DuracionEfecto = numero("duracion");
      break;
    case "comida":
      claves.MinHam = numero("hambre");
      claves.MinSed = numero("sed");
      break;
    case "pergamino":
      claves.HechizoIndex = numero("hechizo");
      break;
    case "llave":
      claves.Clave = String(atributos.clave ?? "") || null;
      break;
  }
  return claves;
}
