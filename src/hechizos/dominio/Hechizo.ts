import {
  atributosVigentes,
  banderasVigentes,
  conAtributo as aplicarAtributo,
  type ValorDeAtributo,
} from "@/compartido/dominio/Atributos";
import { asegurar } from "@/compartido/dominio/ErrorDeDominio";
import { numeroDeAo } from "@/compartido/dominio/NumeroDeAo";
import {
  BANDERAS_DE_HECHIZO,
  esObjetivoValido,
  esTipoDeHechizoValido,
  tipoDeHechizo,
  type ObjetivoDeHechizo,
  type TipoDeHechizo,
  type TipoDeHechizoId,
} from "./TipoDeHechizo";

export interface DatosHechizo {
  /** Identidad interna e inmutable. */
  clave: string;
  /** El número de hechizo de AO (el del `Hechizos.dat`). */
  numero: number;
  nombre: string;
  descripcion: string;
  /** Lo que el personaje grita al lanzarlo: "OHL VOR PEK". */
  palabrasMagicas: string;
  tipo: TipoDeHechizoId;
  objetivo: ObjetivoDeHechizo;
  mana: number;
  energia: number;
  skillRequerido: number;
  nivelMinimo: number;
  banderas: readonly string[];
  atributos: Readonly<Record<string, ValorDeAtributo>>;
  /** El FX que se dibuja al lanzarlo, por número. 0 = ninguno. */
  fx: number;
  /** Nombre del archivo de sonido, tal cual lo usa el juego. */
  sonido: string;
  esEjemplo: boolean;
}

/**
 * Raíz de agregado del módulo Hechizos.
 *
 * Igual que un objeto, lo que puede hacer depende de su tipo, y los datos de cada tipo salen de
 * `TIPOS_DE_HECHIZO`. Al FX lo apunta **por número**, como en el juego: el dominio de Hechizos no
 * sabe que existe el módulo FX, sólo que hay un catálogo de números (ver `servicios.ts`).
 */
export class Hechizo {
  private constructor(private readonly d: DatosHechizo) {}

  static crear(clave: string, numero: number): Hechizo {
    return new Hechizo({
      clave,
      numero: numeroDeAo(numero, "El ID del hechizo"),
      nombre: "Hechizo nuevo",
      descripcion: "",
      palabrasMagicas: "",
      tipo: "dano",
      objetivo: "ambos",
      mana: 0,
      energia: 0,
      skillRequerido: 0,
      nivelMinimo: 0,
      banderas: [],
      atributos: {},
      fx: 0,
      sonido: "",
      esEjemplo: false,
    });
  }

  static reconstituir(d: DatosHechizo): Hechizo {
    asegurar(d.clave, "El hechizo necesita una clave.");
    asegurar(esTipoDeHechizoValido(d.tipo), `Tipo de hechizo desconocido: ${d.tipo}.`);
    asegurar(esObjetivoValido(d.objetivo), `Objetivo de hechizo desconocido: ${d.objetivo}.`);
    return new Hechizo({
      ...d,
      numero: numeroDeAo(d.numero, "El ID del hechizo"),
      mana: noNegativo(d.mana, "El maná"),
      energia: noNegativo(d.energia, "La energía"),
      skillRequerido: noNegativo(d.skillRequerido, "El skill requerido"),
      nivelMinimo: noNegativo(d.nivelMinimo, "El nivel mínimo"),
      banderas: [...new Set(d.banderas)],
      atributos: { ...d.atributos },
      fx: noNegativo(d.fx, "El FX"),
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
  get palabrasMagicas() {
    return this.d.palabrasMagicas;
  }
  get tipo(): TipoDeHechizo {
    return tipoDeHechizo(this.d.tipo);
  }
  get objetivo() {
    return this.d.objetivo;
  }
  get mana() {
    return this.d.mana;
  }
  get energia() {
    return this.d.energia;
  }
  get skillRequerido() {
    return this.d.skillRequerido;
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
  get fx() {
    return this.d.fx;
  }
  get sonido() {
    return this.d.sonido;
  }
  get esEjemplo() {
    return this.d.esEjemplo;
  }

  datos(): DatosHechizo {
    return { ...this.d };
  }

  private con(c: Partial<DatosHechizo>): Hechizo {
    return new Hechizo({ ...this.d, ...c });
  }

  renombrado(nombre: string): Hechizo {
    asegurar(nombre.length <= 80, "El nombre no puede tener más de 80 caracteres.");
    return this.con({ nombre });
  }
  conNumero(n: number): Hechizo {
    return this.con({ numero: numeroDeAo(n, "El ID del hechizo") });
  }
  conDescripcion(t: string): Hechizo {
    return this.con({ descripcion: t });
  }
  conPalabrasMagicas(t: string): Hechizo {
    asegurar(t.length <= 120, "Las palabras mágicas no pueden tener más de 120 caracteres.");
    return this.con({ palabrasMagicas: t });
  }
  /** Cambiar de efecto no borra los atributos del anterior: si volvés, siguen ahí. */
  conTipo(id: TipoDeHechizoId): Hechizo {
    asegurar(esTipoDeHechizoValido(id), "Tipo de hechizo desconocido.");
    return this.con({ tipo: id });
  }
  conObjetivo(o: ObjetivoDeHechizo): Hechizo {
    asegurar(esObjetivoValido(o), "Objetivo de hechizo desconocido.");
    return this.con({ objetivo: o });
  }
  conMana(n: number): Hechizo {
    return this.con({ mana: noNegativo(n, "El maná") });
  }
  conEnergia(n: number): Hechizo {
    return this.con({ energia: noNegativo(n, "La energía") });
  }
  conSkillRequerido(n: number): Hechizo {
    return this.con({ skillRequerido: noNegativo(n, "El skill requerido") });
  }
  conNivelMinimo(n: number): Hechizo {
    return this.con({ nivelMinimo: noNegativo(n, "El nivel mínimo") });
  }
  conFx(n: number): Hechizo {
    return this.con({ fx: noNegativo(n, "El FX") });
  }
  conSonido(s: string): Hechizo {
    asegurar(s.length <= 60, "El nombre del sonido es demasiado largo.");
    return this.con({ sonido: s });
  }

  conBandera(clave: string, activa: boolean): Hechizo {
    asegurar(BANDERAS_DE_HECHIZO.some((b) => b.clave === clave), "Esa opción no existe para un hechizo.");
    const s = new Set(this.d.banderas);
    if (activa) s.add(clave);
    else s.delete(clave);
    return this.con({ banderas: [...s] });
  }

  tieneBandera(clave: string): boolean {
    return this.d.banderas.includes(clave);
  }

  /** `valor` null borra el atributo. */
  conAtributo(clave: string, valor: ValorDeAtributo | null): Hechizo {
    return this.con({ atributos: aplicarAtributo(this.d.atributos, this.tipo.atributos, clave, valor, "Ese dato no aplica a este tipo de hechizo.") });
  }

  atributosVigentes(): Record<string, ValorDeAtributo> {
    return atributosVigentes(this.d.atributos, this.tipo.atributos);
  }
  banderasVigentes(): string[] {
    return banderasVigentes(this.d.banderas, BANDERAS_DE_HECHIZO);
  }

  duplicado(clave: string, numero: number): Hechizo {
    return new Hechizo({
      ...this.d,
      clave,
      numero: numeroDeAo(numero, "El ID del hechizo"),
      nombre: `${this.d.nombre} (copia)`,
      esEjemplo: false,
    });
  }
}

function noNegativo(n: number, que: string): number {
  asegurar(Number.isFinite(n) && n >= 0, `${que} no puede ser negativo.`);
  return Math.round(n);
}
