import type { Direccion } from "@/compartido/dominio/Direccion";
import { asegurar } from "@/compartido/dominio/ErrorDeDominio";
import { numeroDeAo } from "@/compartido/dominio/NumeroDeAo";
import { conDireccion, valoresPorDireccion, type PorDireccion } from "@/compartido/dominio/PorDireccion";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import type { Apariencia, EspecieDeApariencia, ReferenciaImportada } from "./Apariencia";

export interface DatosCabeza {
  clave: string;
  /** El número de cabeza de AO (el del `Head.ind`). */
  numero: number;
  nombre: string;
  /** La cara hacia cada lado. A diferencia del cuerpo, es un frame fijo y no una animación. */
  direcciones: PorDireccion<ReferenciaGrafica>;
  esEjemplo: boolean;
}

export interface CabezaImportada {
  numero: number;
  nombre: string;
  direcciones: Partial<Record<Direccion, ReferenciaImportada>>;
}

/** Raíz de agregado: la cabeza de un personaje, mirando hacia los cuatro lados. */
export class Cabeza implements Apariencia {
  private constructor(private readonly d: DatosCabeza) {}

  static crear(clave: string, numero: number): Cabeza {
    return new Cabeza({
      clave,
      numero: numeroDeAo(numero, "El ID de la cabeza"),
      nombre: "Cabeza nueva",
      direcciones: {},
      esEjemplo: false,
    });
  }

  static reconstituir(d: DatosCabeza): Cabeza {
    asegurar(d.clave, "La cabeza necesita una clave.");
    return new Cabeza({ ...d, numero: numeroDeAo(d.numero, "El ID de la cabeza"), direcciones: { ...d.direcciones } });
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
  get esEjemplo() {
    return this.d.esEjemplo;
  }

  datos(): DatosCabeza {
    return { ...this.d };
  }

  private con(c: Partial<DatosCabeza>): Cabeza {
    return new Cabeza({ ...this.d, ...c });
  }

  renombrada(nombre: string): Cabeza {
    asegurar(nombre.length <= 80, "El nombre no puede tener más de 80 caracteres.");
    return this.con({ nombre });
  }

  conNumero(n: number): Cabeza {
    return this.con({ numero: numeroDeAo(n, "El ID de la cabeza") });
  }

  /** Acá el frame SÍ importa: una hoja de caras suele tener las cuatro en la misma animación. */
  conDireccion(direccion: Direccion, ref: ReferenciaGrafica | null): Cabeza {
    return this.con({ direcciones: conDireccion(this.d.direcciones, direccion, ref) });
  }

  referenciasVigentes(): ReferenciaGrafica[] {
    return valoresPorDireccion(this.d.direcciones);
  }

  duplicada(clave: string, numero: number): Cabeza {
    return new Cabeza({
      ...this.d,
      clave,
      numero: numeroDeAo(numero, "El ID de la cabeza"),
      nombre: `${this.d.nombre} (copia)`,
      esEjemplo: false,
    });
  }
}

/** Cómo el módulo trata a las cabezas de forma genérica (ver `Apariencia.ts`). */
export const ESPECIE_CABEZA: EspecieDeApariencia<Cabeza, CabezaImportada> = {
  singular: "cabeza",
  plural: "cabezas",
  crear: (clave, numero) => Cabeza.crear(clave, numero),
  duplicar: (c, clave, numero) => c.duplicada(clave, numero),
  desdeImportado(clave, i, resolver) {
    let direcciones: PorDireccion<ReferenciaGrafica> = {};
    for (const [dir, r] of Object.entries(i.direcciones) as [Direccion, ReferenciaImportada][]) {
      const ref = resolver(r);
      if (ref) direcciones = conDireccion(direcciones, dir, ref);
    }
    return Cabeza.reconstituir({ clave, numero: i.numero, nombre: i.nombre, direcciones, esEjemplo: false });
  },
};
