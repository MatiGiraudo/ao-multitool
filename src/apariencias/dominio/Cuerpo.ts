import type { Direccion } from "@/compartido/dominio/Direccion";
import { asegurar } from "@/compartido/dominio/ErrorDeDominio";
import { numeroDeAo } from "@/compartido/dominio/NumeroDeAo";
import { conDireccion, valoresPorDireccion, type PorDireccion } from "@/compartido/dominio/PorDireccion";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import type { Apariencia, EspecieDeApariencia, ReferenciaImportada } from "./Apariencia";

export interface DatosCuerpo {
  clave: string;
  /** El número de cuerpo de AO (el del `Body.ind`). */
  numero: number;
  nombre: string;
  /** La animación de caminar hacia cada lado. */
  direcciones: PorDireccion<ReferenciaGrafica>;
  /** Dónde se apoya la cabeza sobre este cuerpo, en píxeles. Negativo es arriba y a la izquierda. */
  offsetCabezaX: number;
  offsetCabezaY: number;
  esEjemplo: boolean;
}

export interface CuerpoImportado {
  numero: number;
  nombre: string;
  direcciones: Partial<Record<Direccion, ReferenciaImportada>>;
  offsetCabezaX: number;
  offsetCabezaY: number;
}

/** Raíz de agregado: el cuerpo de un personaje, caminando hacia los cuatro lados. */
export class Cuerpo implements Apariencia {
  private constructor(private readonly d: DatosCuerpo) {}

  static crear(clave: string, numero: number): Cuerpo {
    return new Cuerpo({
      clave,
      numero: numeroDeAo(numero, "El ID del cuerpo"),
      nombre: "Cuerpo nuevo",
      direcciones: {},
      offsetCabezaX: 0,
      offsetCabezaY: 0,
      esEjemplo: false,
    });
  }

  static reconstituir(d: DatosCuerpo): Cuerpo {
    asegurar(d.clave, "El cuerpo necesita una clave.");
    return new Cuerpo({
      ...d,
      numero: numeroDeAo(d.numero, "El ID del cuerpo"),
      direcciones: { ...d.direcciones },
      offsetCabezaX: offset(d.offsetCabezaX, "El corrimiento horizontal de la cabeza"),
      offsetCabezaY: offset(d.offsetCabezaY, "El corrimiento vertical de la cabeza"),
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
  get direcciones(): PorDireccion<ReferenciaGrafica> {
    return this.d.direcciones;
  }
  get offsetCabezaX() {
    return this.d.offsetCabezaX;
  }
  get offsetCabezaY() {
    return this.d.offsetCabezaY;
  }
  get esEjemplo() {
    return this.d.esEjemplo;
  }

  datos(): DatosCuerpo {
    return { ...this.d };
  }

  private con(c: Partial<DatosCuerpo>): Cuerpo {
    return new Cuerpo({ ...this.d, ...c });
  }

  renombrado(nombre: string): Cuerpo {
    asegurar(nombre.length <= 80, "El nombre no puede tener más de 80 caracteres.");
    return this.con({ nombre });
  }

  conNumero(n: number): Cuerpo {
    return this.con({ numero: numeroDeAo(n, "El ID del cuerpo") });
  }

  /** El cuerpo reproduce la animación entera, así que el frame no se usa: queda siempre en 0. */
  conDireccion(direccion: Direccion, ref: ReferenciaGrafica | null): Cuerpo {
    return this.con({ direcciones: conDireccion(this.d.direcciones, direccion, ref ? { ...ref, frame: 0 } : null) });
  }

  conOffsetCabeza(x: number, y: number): Cuerpo {
    return this.con({
      offsetCabezaX: offset(x, "El corrimiento horizontal de la cabeza"),
      offsetCabezaY: offset(y, "El corrimiento vertical de la cabeza"),
    });
  }

  referenciasVigentes(): ReferenciaGrafica[] {
    return valoresPorDireccion(this.d.direcciones);
  }

  duplicado(clave: string, numero: number): Cuerpo {
    return new Cuerpo({
      ...this.d,
      clave,
      numero: numeroDeAo(numero, "El ID del cuerpo"),
      nombre: `${this.d.nombre} (copia)`,
      esEjemplo: false,
    });
  }
}

function offset(n: number, que: string): number {
  asegurar(Number.isFinite(n), `${que} tiene que ser un número.`);
  asegurar(Math.abs(n) <= 512, `${que} es demasiado grande.`);
  return Math.round(n);
}

/** Cómo el módulo trata a los cuerpos de forma genérica (ver `Apariencia.ts`). */
export const ESPECIE_CUERPO: EspecieDeApariencia<Cuerpo, CuerpoImportado> = {
  singular: "cuerpo",
  plural: "cuerpos",
  crear: (clave, numero) => Cuerpo.crear(clave, numero),
  duplicar: (c, clave, numero) => c.duplicado(clave, numero),
  desdeImportado(clave, i, resolver) {
    let direcciones: PorDireccion<ReferenciaGrafica> = {};
    for (const [dir, r] of Object.entries(i.direcciones) as [Direccion, ReferenciaImportada][]) {
      const ref = resolver(r);
      if (ref) direcciones = conDireccion(direcciones, dir, { ...ref, frame: 0 });
    }
    return Cuerpo.reconstituir({
      clave,
      numero: i.numero,
      nombre: i.nombre,
      direcciones,
      offsetCabezaX: i.offsetCabezaX,
      offsetCabezaY: i.offsetCabezaY,
      esEjemplo: false,
    });
  },
};
