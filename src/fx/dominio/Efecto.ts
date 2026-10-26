import { asegurar } from "@/compartido/dominio/ErrorDeDominio";
import { numeroDeAo } from "@/compartido/dominio/NumeroDeAo";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";

export interface DatosEfecto {
  /** Identidad interna e inmutable de la entidad. */
  clave: string;
  /** El número de FX de AO (el del `FXs.ind`). Se puede editar; el validador avisa si se repite. */
  numero: number;
  nombre: string;
  /** La animación que se dibuja. null mientras todavía no se vinculó. */
  animacion: ReferenciaGrafica | null;
  /** Corrimiento desde donde se lanza el efecto, en píxeles. Negativo es arriba y a la izquierda. */
  offsetX: number;
  offsetY: number;
  /** Cuántas veces se repite la animación. 0 = sin fin, hasta que el juego lo corte. */
  repeticiones: number;
  esEjemplo: boolean;
}

/**
 * Raíz de agregado del módulo FX: un efecto visual (una explosión, un humo, el destello de un hechizo).
 *
 * Un FX es poco más que "esta animación, corrida tantos píxeles". El offset es lo que de verdad
 * cuesta acertar, porque depende de dónde se apoya el sprite sobre el que se dibuja; por eso la
 * pantalla deja previsualizarlo encima de otro gráfico.
 */
export class Efecto {
  private constructor(private readonly d: DatosEfecto) {}

  static crear(clave: string, numero: number): Efecto {
    return new Efecto({
      clave,
      numero: numeroDeAo(numero, "El ID del efecto"),
      nombre: "Efecto nuevo",
      animacion: null,
      offsetX: 0,
      offsetY: 0,
      repeticiones: 1,
      esEjemplo: false,
    });
  }

  static reconstituir(d: DatosEfecto): Efecto {
    asegurar(d.clave, "El efecto necesita una clave.");
    return new Efecto({
      ...d,
      numero: numeroDeAo(d.numero, "El ID del efecto"),
      offsetX: entero(d.offsetX, "El corrimiento horizontal"),
      offsetY: entero(d.offsetY, "El corrimiento vertical"),
      repeticiones: repeticionesValidas(d.repeticiones),
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
  get animacion(): ReferenciaGrafica | null {
    return this.d.animacion;
  }
  get offsetX() {
    return this.d.offsetX;
  }
  get offsetY() {
    return this.d.offsetY;
  }
  get repeticiones() {
    return this.d.repeticiones;
  }
  get enBucle() {
    return this.d.repeticiones === 0;
  }
  get esEjemplo() {
    return this.d.esEjemplo;
  }

  datos(): DatosEfecto {
    return { ...this.d };
  }

  private con(c: Partial<DatosEfecto>): Efecto {
    return new Efecto({ ...this.d, ...c });
  }

  renombrado(nombre: string): Efecto {
    asegurar(nombre.length <= 80, "El nombre no puede tener más de 80 caracteres.");
    return this.con({ nombre });
  }
  conNumero(n: number): Efecto {
    return this.con({ numero: numeroDeAo(n, "El ID del efecto") });
  }
  conAnimacion(ref: ReferenciaGrafica | null): Efecto {
    return this.con({ animacion: ref });
  }
  conOffset(x: number, y: number): Efecto {
    return this.con({ offsetX: entero(x, "El corrimiento horizontal"), offsetY: entero(y, "El corrimiento vertical") });
  }
  conRepeticiones(n: number): Efecto {
    return this.con({ repeticiones: repeticionesValidas(n) });
  }

  /** Las referencias que hay que poder resolver para que el efecto esté sano. */
  referenciasVigentes(): ReferenciaGrafica[] {
    return this.d.animacion ? [this.d.animacion] : [];
  }

  duplicado(clave: string, numero: number): Efecto {
    return new Efecto({ ...this.d, clave, numero: numeroDeAo(numero, "El ID del efecto"), nombre: `${this.d.nombre} (copia)`, esEjemplo: false });
  }
}

/** Los corrimientos sí pueden ser negativos: un FX suele dibujarse por encima del personaje. */
function entero(n: number, que: string): number {
  asegurar(Number.isFinite(n), `${que} tiene que ser un número.`);
  asegurar(Math.abs(n) <= 4096, `${que} es demasiado grande.`);
  return Math.round(n);
}

function repeticionesValidas(n: number): number {
  asegurar(Number.isFinite(n) && n >= 0, "Las repeticiones no pueden ser negativas.");
  asegurar(n <= 999, "Son demasiadas repeticiones.");
  return Math.round(n);
}
