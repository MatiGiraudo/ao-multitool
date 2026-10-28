import type { Npc } from "@/npcs/dominio/Npc";
import type { EscritorDeNpcsClasicos } from "../aplicacion/puertos";
import { ENCABEZADO, type OriginalesDeFamilia } from "../dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion, salvoElDefault, siPrendida, type ClavesPropias } from "./EscritorIni";
import { DIRECCION_DE_AO, movimientoDeAo, TIPOS } from "./LectorNpcsDat";

/**
 * Devuelve el `NPCs.dat` con los NPCs del editor escritos encima de los originales.
 *
 * Un `NPCs.dat` de verdad tiene 124 claves distintas y el editor maneja unas veinticinco; las
 * otras cien —alineación, comercia con qué, backup, sonidos, el tipo de ataque— vuelven tal como
 * vinieron. Lo que sí se reescribe es lo que la ficha del editor muestra y deja cambiar.
 *
 * Como en los objetos, `NpcType` no se toca sobre un NPC importado: varios tipos del clásico caen
 * en el mismo del editor, así que el del archivo es el que sabe.
 *
 * Las listas (`Sp1..SpN`, `Obj1..ObjN`) se reescriben junto con su contador. Si la lista se achicó,
 * las claves sobrantes quedan en el archivo pero el servidor no las lee: primero mira el contador.
 */

/** Para los NPCs nuevos, un `NpcType` representativo de cada tipo del editor. */
const TIPO_CLASICO: Readonly<Record<string, number>> = {
  comerciante: 1,
  hostil: 2,
  guardia: 3,
  entrenador: 4,
  banquero: 5,
  quest: 6,
  sacerdote: 7,
};

const MOVIMIENTOS: Readonly<Record<string, number>> = { quieto: 1, aleatorio: 2, persigue: 3 };

export class EscritorNpcsDat implements EscritorDeNpcsClasicos {
  escribir(npcs: readonly Npc[], originales: OriginalesDeFamilia): string {
    const ordenados = [...npcs].sort((a, b) => a.numero - b.numero);
    const secciones = ordenados.map((npc) => {
      const original = originales[npc.numero];
      const lineas = original ? original.split(/\r?\n/) : [`[NPC${npc.numero}]`];
      const reescrita = reescribirSeccion(lineas, clavesDe(npc, !!original));
      return original ? reescrita : [...reescrita, ""];
    });
    const encabezado = originales[ENCABEZADO];
    return armarIni(secciones, encabezado ? encabezado.split(/\r?\n/) : [`[INIT]`, `NumNPCs=${ordenados.at(-1)?.numero ?? 0}`, ""]);
  }
}

function clavesDe(npc: Npc, tieneOriginal: boolean): ClavesPropias {
  const atributos = npc.atributosVigentes();
  /* Un atributo que el editor no maneja para este NPC —un comerciante no tiene vida ni golpe— se
   * deja como estaba: el archivo igual lo trae y borrarlo sería perderlo. */
  const numero = (clave: string) => (clave in atributos ? Number(atributos[clave]) || 0 : null);
  const bandera = (clave: string) => siPrendida(npc.banderas.includes(clave));

  const claves: ClavesPropias = {
    Name: npc.nombre,
    Desc: npc.descripcion,
    Body: npc.cuerpo,
    Head: npc.cabeza,
    /* Lo que el editor muestra cuando el archivo no dice nada es un valor por defecto, no algo que
     * el usuario haya elegido: si no estaba y sigue siendo el de siempre, no se agrega. */
    Heading: salvoElDefault(Math.max(1, DIRECCION_DE_AO.indexOf(npc.direccion as never) + 1), 3),
    /* El clásico tiene más movimientos que el editor —hay NPCs con `Movement=5`— y todos los que
     * no son 1 ni 2 son «persigue». Si el original ya quiere decir lo mismo, se deja como está. */
    Movement: (original) => {
      const valor = MOVIMIENTOS[npc.movimiento] ?? 1;
      if (original === undefined) return valor === 1 ? null : valor;
      return movimientoDeAo(Number(original)) === npc.movimiento ? null : valor;
    },
    Attackable: bandera("atacable"),
    Hostile: bandera("hostil"),
    // En el clásico `ReSpawn=0` quiere decir que SÍ vuelve a aparecer.
    ReSpawn: npc.banderas.includes("respawn") ? 0 : siPrendida(true),
    MaxHP: numero("vida"),
    MinHIT: numero("golpeMin"),
    MaxHIT: numero("golpeMax"),
    DEF: numero("defensa"),
    DEFm: numero("defensaMagica"),
    PoderEvasion: numero("evasion"),
    GiveEXP: numero("experiencia"),
    GiveGLD: numero("oro"),
    Domable: numero("domable"),
  };
  /* El tipo sólo se reescribe si de verdad cambió: varios del clásico caen en el mismo del
   * editor, así que mientras el original signifique lo mismo, el del archivo es el que sabe. */
  claves.NpcType = (original) => {
    const loQueDecia = TIPOS[Number(original)];
    // Si el archivo trae un tipo que el editor no conoce (hay `NpcType=0`), tampoco se pisa: lo
    // que el editor muestra ahí es un valor por defecto, no algo que el usuario haya elegido.
    return !loQueDecia || loQueDecia === npc.tipo.id ? null : (TIPO_CLASICO[npc.tipo.id] ?? 2);
  };
  if (!tieneOriginal && npc.tipo.id === "comerciante") claves.Comercia = 1;

  /*
   * Las listas se reescriben sólo si el editor de verdad maneja esa lista para este tipo.
   *
   * Un guardia no suelta nada y un banquero no vende, así que para ellos la ficha no muestra
   * inventario y `dropsVigentes()` viene vacío. Pero el archivo igual los trae con `NROITEMS=15`,
   * y escribir 0 sería vaciarle el inventario a un NPC que en el juego lo usa.
   */
  if (npc.tipo.lanzaHechizos) {
    const hechizos = npc.hechizosVigentes();
    claves.LanzaSpells = hechizos.length;
    hechizos.forEach((n, i) => (claves[`Sp${i + 1}`] = n));
  }

  if (npc.tipo.comercia || npc.tipo.suelta) {
    // El mismo campo es el inventario del que vende y el botín del que pelea.
    const items = npc.tipo.comercia ? npc.enVentaVigente() : npc.dropsVigentes();
    claves.NROITEMS = items.length;
    items.forEach((item, i) => {
      const valor = `${item.objeto}-${item.cantidad}`;
      claves[`Obj${i + 1}`] = (original) => {
        const crudo = (original ?? "").trim();
        // Varios traen comentario (`Obj1=389-1000 'Martillo de Herrero`): si dice lo mismo, no se toca.
        if (crudo.startsWith(valor)) return null;
        // Y hay `Obj1=54-0`: una cantidad en cero que el editor no sabe mostrar —la lee como 1—,
        // así que mientras el objeto sea el mismo, la línea se deja como estaba.
        const [objeto, cantidad] = crudo.split("-");
        if (Number(objeto) === item.objeto && !Number.parseInt(cantidad ?? "", 10)) return null;
        return valor;
      };
    });
  }

  return claves;
}
