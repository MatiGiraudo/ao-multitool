import {
  atributosVigentes,
  banderasVigentes,
  conAtributo as aplicarAtributo,
  type ValorDeAtributo,
} from "@/compartido/dominio/Atributos";
import { DIRECCIONES, type Direccion } from "@/compartido/dominio/Direccion";
import { asegurar } from "@/compartido/dominio/ErrorDeDominio";
import { numeroDeAo } from "@/compartido/dominio/NumeroDeAo";
import {
  BANDERAS_DE_NPC,
  esMovimientoValido,
  esTipoDeNpcValido,
  tipoDeNpc,
  type MovimientoDeNpc,
  type TipoDeNpc,
  type TipoDeNpcId,
} from "./TipoDeNpc";

/** Lo que suelta al morir: qué objeto, cuántos y con qué probabilidad. */
export interface Drop {
  objeto: number;
  cantidad: number;
  /** De 1 a 100. */
  probabilidad: number;
}

/** Lo que tiene para vender. */
export interface EnVenta {
  objeto: number;
  cantidad: number;
}

export interface DatosNpc {
  clave: string;
  /** El número de NPC de AO (el del `NPCs.dat`). */
  numero: number;
  nombre: string;
  descripcion: string;
  tipo: TipoDeNpcId;
  /** Cuerpo y cabeza por número, como en el juego. 0 = ninguno (hay criaturas sin cabeza aparte). */
  cuerpo: number;
  cabeza: number;
  direccion: Direccion;
  movimiento: MovimientoDeNpc;
  banderas: readonly string[];
  atributos: Readonly<Record<string, ValorDeAtributo>>;
  /** Números de hechizo que puede lanzar. */
  hechizos: readonly number[];
  drops: readonly Drop[];
  enVenta: readonly EnVenta[];
  esEjemplo: boolean;
}

/**
 * Raíz de agregado del módulo NPCs.
 *
 * Es el que más mira hacia afuera de todo el editor: apunta a un cuerpo, a una cabeza, a los
 * objetos que suelta o vende y a los hechizos que lanza. A todos los apunta **por número**, como
 * hace el juego, y nunca importa nada de esos módulos: si esos números existen lo revisa el
 * validador con catálogos que le pasan desde afuera (ver `servicios.ts`).
 */
export class Npc {
  private constructor(private readonly d: DatosNpc) {}

  static crear(clave: string, numero: number): Npc {
    return new Npc({
      clave,
      numero: numeroDeAo(numero, "El ID del NPC"),
      nombre: "NPC nuevo",
      descripcion: "",
      tipo: "hostil",
      cuerpo: 0,
      cabeza: 0,
      direccion: "sur",
      movimiento: "quieto",
      banderas: ["atacable", "respawn"],
      atributos: {},
      hechizos: [],
      drops: [],
      enVenta: [],
      esEjemplo: false,
    });
  }

  static reconstituir(d: DatosNpc): Npc {
    asegurar(d.clave, "El NPC necesita una clave.");
    asegurar(esTipoDeNpcValido(d.tipo), `Tipo de NPC desconocido: ${d.tipo}.`);
    asegurar(esMovimientoValido(d.movimiento), `Movimiento de NPC desconocido: ${d.movimiento}.`);
    asegurar(DIRECCIONES.some((x) => x.valor === d.direccion), `Dirección desconocida: ${d.direccion}.`);
    return new Npc({
      ...d,
      numero: numeroDeAo(d.numero, "El ID del NPC"),
      cuerpo: referencia(d.cuerpo, "El cuerpo"),
      cabeza: referencia(d.cabeza, "La cabeza"),
      banderas: [...new Set(d.banderas)],
      atributos: { ...d.atributos },
      hechizos: numerosUnicos(d.hechizos, "hechizo"),
      drops: d.drops.map(validarDrop),
      enVenta: d.enVenta.map(validarEnVenta),
    });
  }

  get clave() {
    return this.d.clave;
  }
  get numero() {
    return this.d.numero;
  }
  get nombre() {
    return this.d.nombre;
  }
  get descripcion() {
    return this.d.descripcion;
  }
  get tipo(): TipoDeNpc {
    return tipoDeNpc(this.d.tipo);
  }
  get cuerpo() {
    return this.d.cuerpo;
  }
  get cabeza() {
    return this.d.cabeza;
  }
  get direccion() {
    return this.d.direccion;
  }
  get movimiento() {
    return this.d.movimiento;
  }
  get banderas(): readonly string[] {
    return this.d.banderas;
  }
  get atributos(): Readonly<Record<string, ValorDeAtributo>> {
    return this.d.atributos;
  }
  get hechizos(): readonly number[] {
    return this.d.hechizos;
  }
  get drops(): readonly Drop[] {
    return this.d.drops;
  }
  get enVenta(): readonly EnVenta[] {
    return this.d.enVenta;
  }
  get esEjemplo() {
    return this.d.esEjemplo;
  }

  datos(): DatosNpc {
    return { ...this.d };
  }

  private con(c: Partial<DatosNpc>): Npc {
    return new Npc({ ...this.d, ...c });
  }

  renombrado(nombre: string): Npc {
    asegurar(nombre.length <= 80, "El nombre no puede tener más de 80 caracteres.");
    return this.con({ nombre });
  }
  conNumero(n: number): Npc {
    return this.con({ numero: numeroDeAo(n, "El ID del NPC") });
  }
  conDescripcion(t: string): Npc {
    return this.con({ descripcion: t });
  }
  /** Cambiar de tipo no borra lo cargado: si volvés, sigue estando (igual que en Hechizos). */
  conTipo(id: TipoDeNpcId): Npc {
    asegurar(esTipoDeNpcValido(id), "Tipo de NPC desconocido.");
    return this.con({ tipo: id });
  }
  conCuerpo(n: number): Npc {
    return this.con({ cuerpo: referencia(n, "El cuerpo") });
  }
  conCabeza(n: number): Npc {
    return this.con({ cabeza: referencia(n, "La cabeza") });
  }
  conDireccion(direccion: Direccion): Npc {
    asegurar(DIRECCIONES.some((x) => x.valor === direccion), "Dirección desconocida.");
    return this.con({ direccion });
  }
  conMovimiento(movimiento: MovimientoDeNpc): Npc {
    asegurar(esMovimientoValido(movimiento), "Movimiento de NPC desconocido.");
    return this.con({ movimiento });
  }

  conBandera(clave: string, activa: boolean): Npc {
    asegurar(BANDERAS_DE_NPC.some((b) => b.clave === clave), "Esa opción no existe para un NPC.");
    const s = new Set(this.d.banderas);
    if (activa) s.add(clave);
    else s.delete(clave);
    return this.con({ banderas: [...s] });
  }

  tieneBandera(clave: string): boolean {
    return this.d.banderas.includes(clave);
  }

  conAtributo(clave: string, valor: ValorDeAtributo | null): Npc {
    return this.con({ atributos: aplicarAtributo(this.d.atributos, this.tipo.atributos, clave, valor, "Ese dato no aplica a este tipo de NPC.") });
  }

  conHechizos(numeros: readonly number[]): Npc {
    return this.con({ hechizos: numerosUnicos(numeros, "hechizo") });
  }
  conDrops(drops: readonly Drop[]): Npc {
    return this.con({ drops: drops.map(validarDrop) });
  }
  conEnVenta(items: readonly EnVenta[]): Npc {
    return this.con({ enVenta: items.map(validarEnVenta) });
  }

  atributosVigentes(): Record<string, ValorDeAtributo> {
    return atributosVigentes(this.d.atributos, this.tipo.atributos);
  }
  banderasVigentes(): string[] {
    return banderasVigentes(this.d.banderas, BANDERAS_DE_NPC);
  }

  /** Lo que de verdad cuenta según el tipo: un banquero no vende aunque tenga cosas cargadas. */
  dropsVigentes(): readonly Drop[] {
    return this.tipo.suelta ? this.d.drops : [];
  }
  enVentaVigente(): readonly EnVenta[] {
    return this.tipo.comercia ? this.d.enVenta : [];
  }
  hechizosVigentes(): readonly number[] {
    return this.tipo.lanzaHechizos ? this.d.hechizos : [];
  }

  duplicado(clave: string, numero: number): Npc {
    return new Npc({
      ...this.d,
      clave,
      numero: numeroDeAo(numero, "El ID del NPC"),
      nombre: `${this.d.nombre} (copia)`,
      esEjemplo: false,
    });
  }
}

/** Una referencia a otra familia: 0 es "ninguno", y el resto tiene que ser un entero positivo. */
function referencia(n: number, que: string): number {
  asegurar(Number.isInteger(n) && n >= 0, `${que} tiene que ser un número entero.`);
  asegurar(n <= 2_147_483_647, `${que} es demasiado grande.`);
  return n;
}

function numerosUnicos(numeros: readonly number[], que: string): number[] {
  for (const n of numeros) asegurar(Number.isInteger(n) && n > 0, `El ${que} tiene que ser un entero mayor a 0.`);
  return [...new Set(numeros)];
}

function validarDrop(d: Drop): Drop {
  asegurar(Number.isInteger(d.objeto) && d.objeto > 0, "El objeto que suelta tiene que ser un entero mayor a 0.");
  asegurar(Number.isInteger(d.cantidad) && d.cantidad > 0, "La cantidad tiene que ser un entero mayor a 0.");
  asegurar(Number.isFinite(d.probabilidad) && d.probabilidad > 0 && d.probabilidad <= 100, "La probabilidad va de 1 a 100.");
  return { objeto: d.objeto, cantidad: d.cantidad, probabilidad: Math.round(d.probabilidad) };
}

function validarEnVenta(v: EnVenta): EnVenta {
  asegurar(Number.isInteger(v.objeto) && v.objeto > 0, "El objeto en venta tiene que ser un entero mayor a 0.");
  asegurar(Number.isInteger(v.cantidad) && v.cantidad > 0, "La cantidad tiene que ser un entero mayor a 0.");
  return { objeto: v.objeto, cantidad: v.cantidad };
}
