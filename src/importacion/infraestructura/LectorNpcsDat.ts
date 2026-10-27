import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import type { Direccion } from "@/compartido/dominio/Direccion";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { NpcImportado } from "@/npcs/aplicacion/casosDeUso";
import type { Drop, EnVenta } from "@/npcs/dominio/Npc";
import type { LectorDeNpcsClasicos } from "../aplicacion/puertos";
import { ArchivoIni } from "./LectorIni";

/*
 * Lee el `NPCs.dat` del AO clásico:
 *
 *     [NPC1]
 *     Name=Lobo
 *     NpcType=2
 *     Body=25
 *     Head=0
 *     Heading=3
 *     Movement=3
 *     Attackable=1
 *     Hostile=1
 *     GiveEXP=50
 *     GiveGLD=20
 *     MaxHP=60
 *     MaxHIT=8
 *     NROITEMS=2
 *     Obj1=12-100
 *     LanzaSpells=1
 *     Sp1=5
 *
 * Tres cosas no se traducen solas y por eso están acá:
 *
 * - El tipo sale de `NpcType` y, cuando ese número no alcanza, de las banderas (`Comercia=1` es un
 *   comerciante aunque el tipo diga otra cosa).
 * - `Obj1=12-100` es "objeto 12, cantidad 100". Esa lista es el inventario de venta de un
 *   comerciante y lo que suelta al morir de una criatura: el mismo campo, distinto significado
 *   según el tipo, así que se reparte al final.
 * - `Heading` y `Movement` son números del cliente, no palabras.
 */

/** `NpcType` del clásico → el tipo del editor. Lo que no está acá se decide por las banderas. */
const TIPOS: Readonly<Record<number, string>> = {
  1: "comerciante",
  2: "hostil",
  3: "guardia",
  4: "entrenador",
  5: "banquero",
  6: "quest",
  7: "sacerdote",
};

/** El mismo orden que en los índices de apariencias: NORTH = 1, EAST = 2, SOUTH = 3, WEST = 4. */
const DIRECCION_DE_AO: readonly Direccion[] = ["norte", "este", "sur", "oeste"];

/** `Movement` del cliente: 1 es quieto, 2 da vueltas, el resto persigue. */
function movimientoDeAo(n: number): string {
  if (n <= 1) return "quieto";
  if (n === 2) return "aleatorio";
  return "persigue";
}

export class LectorNpcsDat implements LectorDeNpcsClasicos {
  leer(texto: string): NpcImportado[] {
    const ini = ArchivoIni.parsear(texto);
    const secciones = ini.numeradas("npc");
    if (!secciones.length) throw new ErrorDeDominio("No encontré ninguna sección [NPCn]: ¿seguro que es un NPCs.dat?");

    return secciones.map(({ seccion, numero }) => {
      const comercia = ini.bandera(seccion, "Comercia");
      const tipo = comercia ? "comerciante" : (TIPOS[ini.entero(seccion, "NpcType")] ?? "otro");
      const items = objetos(ini, seccion);

      const banderas: string[] = [];
      if (ini.bandera(seccion, "Attackable")) banderas.push("atacable");
      if (ini.bandera(seccion, "Hostile")) banderas.push("hostil");
      // En el clásico `ReSpawn=0` quiere decir que SÍ vuelve a aparecer.
      if (ini.entero(seccion, "ReSpawn") === 0) banderas.push("respawn");

      return {
        numero,
        nombre: ini.texto(seccion, "Name") || ini.texto(seccion, "Nombre"),
        descripcion: ini.texto(seccion, "Desc"),
        tipo,
        cuerpo: ini.entero(seccion, "Body"),
        cabeza: ini.entero(seccion, "Head"),
        direccion: DIRECCION_DE_AO[ini.entero(seccion, "Heading", 3) - 1] ?? "sur",
        movimiento: movimientoDeAo(ini.entero(seccion, "Movement")),
        banderas,
        atributos: combate(ini, seccion),
        hechizos: hechizos(ini, seccion),
        // El mismo campo es el inventario del que vende y el botín del que pelea.
        drops: tipo === "comerciante" ? [] : items.map((o): Drop => ({ ...o, probabilidad: 100 })),
        enVenta: tipo === "comerciante" ? items : [],
      };
    });
  }
}

function combate(ini: ArchivoIni, s: string): Record<string, ValorDeAtributo> {
  const out: Record<string, ValorDeAtributo> = {};
  const poner = (clave: string, valor: number) => {
    if (valor > 0) out[clave] = valor;
  };
  poner("vida", ini.entero(s, "MaxHP"));
  poner("golpeMin", ini.entero(s, "MinHIT"));
  poner("golpeMax", ini.entero(s, "MaxHIT"));
  poner("defensa", ini.entero(s, "DEF"));
  poner("defensaMagica", ini.entero(s, "DEFm"));
  poner("evasion", ini.entero(s, "PoderEvasion"));
  poner("experiencia", ini.entero(s, "GiveEXP"));
  poner("oro", ini.entero(s, "GiveGLD"));
  poner("domable", ini.entero(s, "Domable"));
  return out;
}

function hechizos(ini: ArchivoIni, s: string): number[] {
  const cuantos = ini.entero(s, "LanzaSpells");
  const out: number[] = [];
  for (let i = 1; i <= cuantos; i++) {
    const n = ini.entero(s, `Sp${i}`);
    if (n > 0) out.push(n);
  }
  return out;
}

/** `Obj1=12-100` → objeto 12, cantidad 100. */
function objetos(ini: ArchivoIni, s: string): EnVenta[] {
  const cuantos = ini.entero(s, "NROITEMS");
  const out: EnVenta[] = [];
  for (let i = 1; i <= cuantos; i++) {
    const [objeto, cantidad] = ini.texto(s, `Obj${i}`).split("-");
    const n = Number.parseInt((objeto ?? "").trim(), 10);
    if (Number.isFinite(n) && n > 0) out.push({ objeto: n, cantidad: Math.max(1, Number.parseInt((cantidad ?? "").trim(), 10) || 1) });
  }
  return out;
}
