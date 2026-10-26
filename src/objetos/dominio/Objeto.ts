import { asegurar, ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { DIRECCIONES, type Direccion } from "./Direccion";
import type { ReferenciaGrafica } from "./ReferenciaGrafica";
import { banderasPermitidas, esTipoValido, tipoDeObjeto, type TipoDeObjeto, type TipoDeObjetoId } from "./TipoDeObjeto";

export type ValorDeAtributo = string | number;

export interface GraficosDeObjeto {
  icono: ReferenciaGrafica | null;
  /** null = en el suelo se usa el icono. */
  suelo: ReferenciaGrafica | null;
  equipado: Readonly<Partial<Record<Direccion, ReferenciaGrafica>>>;
}

export interface DatosObjeto {
  /** Identidad interna e inmutable de la entidad. */
  clave: string;
  /** El número de objeto de AO (el "ID" del OBJ.dat). Se puede editar; el validador avisa si se repite. */
  numero: number;
  nombre: string;
  tipo: TipoDeObjetoId;
  valor: number;
  descripcion: string;
  apilable: boolean;
  nivelMinimo: number;
  banderas: readonly string[];
  atributos: Readonly<Record<string, ValorDeAtributo>>;
  graficos: GraficosDeObjeto;
  esEjemplo: boolean;
}

/**
 * Raíz de agregado del módulo Objetos: un ítem del juego.
 *
 * Fijate la diferencia entre `clave` y `numero`: la clave identifica a la entidad para siempre
 * (aunque le cambies el número), y el número es un dato del negocio que el usuario controla.
 */
export class Objeto {
  private constructor(private readonly d: DatosObjeto) {}

  static crear(clave: string, numero: number): Objeto {
    return new Objeto({
      clave,
      numero: validarNumero(numero),
      nombre: "Objeto nuevo",
      tipo: "otro",
      valor: 0,
      descripcion: "",
      apilable: true,
      nivelMinimo: 0,
      banderas: [],
      atributos: {},
      graficos: { icono: null, suelo: null, equipado: {} },
      esEjemplo: false,
    });
  }

  static reconstituir(d: DatosObjeto): Objeto {
    asegurar(d.clave, "El objeto necesita una clave.");
    asegurar(esTipoValido(d.tipo), `Tipo de objeto desconocido: ${d.tipo}.`);
    return new Objeto({
      ...d,
      numero: validarNumero(d.numero),
      valor: noNegativo(d.valor, "El valor"),
      nivelMinimo: noNegativo(d.nivelMinimo, "El nivel mínimo"),
      banderas: [...new Set(d.banderas)],
      atributos: { ...d.atributos },
      graficos: { icono: d.graficos.icono, suelo: d.graficos.suelo, equipado: { ...d.graficos.equipado } },
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
  get tipo(): TipoDeObjeto {
    return tipoDeObjeto(this.d.tipo);
  }
  get valor() {
    return this.d.valor;
  }
  get descripcion() {
    return this.d.descripcion;
  }
  get apilable() {
    return this.d.apilable;
  }
  get nivelMinimo() {
    return this.d.nivelMinimo;
  }
  get banderas(): readonly string[] {
    return this.d.banderas;
  }
  get atributos(): Readonly<Record<string, ValorDeAtributo>> {
    return this.d.atributos;
  }
  get graficos(): GraficosDeObjeto {
    return this.d.graficos;
  }
  get esEjemplo() {
    return this.d.esEjemplo;
  }

  datos(): DatosObjeto {
    return { ...this.d };
  }

  private con(c: Partial<DatosObjeto>): Objeto {
    return new Objeto({ ...this.d, ...c });
  }

  renombrado(nombre: string): Objeto {
    asegurar(nombre.length <= 80, "El nombre no puede tener más de 80 caracteres.");
    return this.con({ nombre });
  }
  conNumero(n: number): Objeto {
    return this.con({ numero: validarNumero(n) });
  }
  conValor(v: number): Objeto {
    return this.con({ valor: noNegativo(v, "El valor") });
  }
  conNivelMinimo(n: number): Objeto {
    return this.con({ nivelMinimo: noNegativo(n, "El nivel mínimo") });
  }
  conDescripcion(t: string): Objeto {
    return this.con({ descripcion: t });
  }
  conApilable(a: boolean): Objeto {
    return this.con({ apilable: a });
  }

  /** Al pasar de no equipable a equipable (o al revés) cambia lo esperable de "apilable". */
  conTipo(id: TipoDeObjetoId): Objeto {
    asegurar(esTipoValido(id), "Tipo de objeto desconocido.");
    const antes = this.tipo.equipable,
      despues = tipoDeObjeto(id).equipable;
    return this.con({ tipo: id, apilable: antes === despues ? this.d.apilable : !despues });
  }

  conBandera(clave: string, activa: boolean): Objeto {
    asegurar(banderasPermitidas(this.tipo).some((b) => b.clave === clave), "Esa opción no aplica a este tipo de objeto.");
    const s = new Set(this.d.banderas);
    if (activa) s.add(clave);
    else s.delete(clave);
    return this.con({ banderas: [...s] });
  }

  tieneBandera(clave: string): boolean {
    return this.d.banderas.includes(clave);
  }

  /** `valor` null borra el atributo. */
  conAtributo(clave: string, valor: ValorDeAtributo | null): Objeto {
    const def = this.tipo.atributos.find((a) => a.clave === clave);
    if (!def) throw new ErrorDeDominio("Ese atributo no aplica a este tipo de objeto.");
    const atributos = { ...this.d.atributos };
    if (valor === null || valor === "") delete atributos[clave];
    else if (def.clase === "numero") {
      const n = Number(valor);
      asegurar(Number.isFinite(n), `${def.etiqueta} tiene que ser un número.`);
      atributos[clave] = n;
    } else if (def.clase === "opcion") {
      asegurar(def.opciones?.some(([v]) => v === valor), `Opción inválida para ${def.etiqueta}.`);
      atributos[clave] = String(valor);
    } else atributos[clave] = String(valor);
    return this.con({ atributos });
  }

  /** Atributos y banderas que corresponden al tipo actual (los de otros tipos se conservan pero no cuentan). */
  atributosVigentes(): Record<string, ValorDeAtributo> {
    const out: Record<string, ValorDeAtributo> = {};
    for (const a of this.tipo.atributos) {
      const v = this.d.atributos[a.clave];
      if (v !== undefined && v !== "") out[a.clave] = v;
    }
    return out;
  }
  banderasVigentes(): string[] {
    const ok = new Set(banderasPermitidas(this.tipo).map((b) => b.clave));
    return this.d.banderas.filter((b) => ok.has(b));
  }

  // ---------- gráficos ----------
  conIcono(ref: ReferenciaGrafica | null): Objeto {
    return this.con({ graficos: { ...this.d.graficos, icono: ref } });
  }
  conSuelo(ref: ReferenciaGrafica | null): Objeto {
    return this.con({ graficos: { ...this.d.graficos, suelo: ref } });
  }
  conEquipado(dir: Direccion, ref: ReferenciaGrafica | null): Objeto {
    asegurar(this.tipo.equipable, "Este tipo de objeto no se equipa.");
    const equipado = { ...this.d.graficos.equipado };
    if (ref) equipado[dir] = { ...ref, frame: 0 };
    else delete equipado[dir];
    return this.con({ graficos: { ...this.d.graficos, equipado } });
  }

  /** Gráfico que se ve en el suelo: el propio, o si no hay, el icono. */
  graficoEnSuelo(): ReferenciaGrafica | null {
    return this.d.graficos.suelo ?? this.d.graficos.icono;
  }

  /** Las referencias que importan para el tipo actual. */
  referenciasVigentes(): ReferenciaGrafica[] {
    const g = this.d.graficos;
    const eq = this.tipo.equipable ? DIRECCIONES.map((d) => g.equipado[d.valor]) : [];
    return [g.icono, g.suelo, ...eq].filter((r): r is ReferenciaGrafica => !!r);
  }

  duplicado(clave: string, numero: number): Objeto {
    return new Objeto({ ...this.d, clave, numero: validarNumero(numero), nombre: `${this.d.nombre} (copia)`, esEjemplo: false });
  }
}

function validarNumero(n: number): number {
  asegurar(Number.isInteger(n) && n >= 1, "El ID del objeto tiene que ser un entero mayor a 0.");
  asegurar(n <= 2_147_483_647, "El ID del objeto es demasiado grande.");
  return n;
}

function noNegativo(n: number, que: string): number {
  asegurar(Number.isFinite(n) && n >= 0, `${que} no puede ser negativo.`);
  return Math.round(n);
}

/** El próximo número libre: uno más que el mayor. */
export function siguienteNumero(objetos: readonly Objeto[]): number {
  return objetos.reduce((m, o) => Math.max(m, o.numero), 0) + 1;
}
