import { asegurar, ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { Animacion } from "./Animacion";
import { Grilla } from "./Grilla";
import type { Tamanio } from "./Tamanio";

export interface DatosHoja {
  id: string;
  nombreArchivo: string;
  /** null mientras la hoja no tenga imagen (por ejemplo, si importaste un .anim.json sin su PNG). */
  tamanio: Tamanio | null;
  /** El tamaño con el que se cargó la imagen, para poder volver a él después de redimensionar. */
  tamanioOriginal: Tamanio | null;
  /** Sube cada vez que cambia la imagen: sirve para que el navegador no muestre una copia vieja. */
  versionImagen: number;
  grilla: Grilla;
  animaciones: readonly Animacion[];
  esEjemplo: boolean;
}

/**
 * Raíz de agregado del módulo Gráficos: una imagen con sus animaciones.
 *
 * Todo cambio a una animación pasa por la hoja. Así la hoja puede garantizar
 * sus reglas (por ejemplo, que al redimensionar la imagen también se escalen los frames)
 * y el repositorio guarda la hoja completa de una sola vez.
 */
export class HojaDeSprites {
  private constructor(private readonly d: DatosHoja) {}

  static crear(id: string, nombreArchivo: string, idPrimeraAnimacion: string): HojaDeSprites {
    return new HojaDeSprites({
      id,
      nombreArchivo: validarNombreArchivo(nombreArchivo),
      tamanio: null,
      tamanioOriginal: null,
      versionImagen: 0,
      grilla: Grilla.porDefecto(),
      animaciones: [Animacion.crear(idPrimeraAnimacion, "animacion_1")],
      esEjemplo: false,
    });
  }

  static reconstituir(d: DatosHoja): HojaDeSprites {
    asegurar(d.id, "La hoja necesita un id.");
    const ids = new Set<string>();
    for (const a of d.animaciones) {
      asegurar(!ids.has(a.id), `Hay dos animaciones con el mismo id (${a.id}).`);
      ids.add(a.id);
    }
    return new HojaDeSprites({ ...d, nombreArchivo: validarNombreArchivo(d.nombreArchivo), animaciones: [...d.animaciones] });
  }

  get id() {
    return this.d.id;
  }
  get nombreArchivo() {
    return this.d.nombreArchivo;
  }
  get tamanio() {
    return this.d.tamanio;
  }
  get tamanioOriginal() {
    return this.d.tamanioOriginal;
  }
  get versionImagen() {
    return this.d.versionImagen;
  }
  get grilla() {
    return this.d.grilla;
  }
  get animaciones(): readonly Animacion[] {
    return this.d.animaciones;
  }
  get esEjemplo() {
    return this.d.esEjemplo;
  }
  get tieneImagen() {
    return this.d.tamanio !== null;
  }
  /** Hay un original guardado con otro tamaño: se puede "volver al original". */
  get fueRedimensionada() {
    return !!this.d.tamanio && !!this.d.tamanioOriginal && !this.d.tamanio.igualA(this.d.tamanioOriginal);
  }

  datos(): DatosHoja {
    return { ...this.d };
  }

  private con(cambios: Partial<DatosHoja>): HojaDeSprites {
    return new HojaDeSprites({ ...this.d, ...cambios });
  }

  // ---------- imagen ----------
  renombrada(nombreArchivo: string): HojaDeSprites {
    return this.con({ nombreArchivo: validarNombreArchivo(nombreArchivo) });
  }

  /** Imagen nueva (la primera o un reemplazo): ese tamaño pasa a ser el original. */
  conImagenNueva(tamanio: Tamanio, nombreArchivo?: string): HojaDeSprites {
    return this.con({
      tamanio,
      tamanioOriginal: tamanio,
      versionImagen: this.d.versionImagen + 1,
      esEjemplo: false,
      ...(nombreArchivo ? { nombreArchivo: validarNombreArchivo(nombreArchivo) } : {}),
    });
  }

  /**
   * La imagen cambió de tamaño. Si `escalarContenido` es true, frames y grilla
   * se escalan en la misma proporción para que los recortes sigan calzando.
   */
  redimensionada(nuevo: Tamanio, escalarContenido: boolean): HojaDeSprites {
    const actual = this.d.tamanio;
    if (!actual) throw new ErrorDeDominio("Esta hoja todavía no tiene imagen.");
    if (actual.igualA(nuevo)) throw new ErrorDeDominio("La imagen ya tiene ese tamaño.");
    const fx = nuevo.ancho / actual.ancho,
      fy = nuevo.alto / actual.alto;
    return this.con({
      tamanio: nuevo,
      tamanioOriginal: this.d.tamanioOriginal ?? actual,
      versionImagen: this.d.versionImagen + 1,
      ...(escalarContenido
        ? { animaciones: this.d.animaciones.map((a) => a.escalada(fx, fy)), grilla: this.d.grilla.escalada(fx, fy) }
        : {}),
    });
  }

  conGrilla(grilla: Grilla): HojaDeSprites {
    return this.con({ grilla });
  }

  // ---------- animaciones ----------
  animacion(id: string): Animacion | undefined {
    return this.d.animaciones.find((a) => a.id === id);
  }

  animacionLlamada(nombre: string): Animacion | undefined {
    return this.d.animaciones.find((a) => a.nombre === nombre);
  }

  conAnimacionAgregada(a: Animacion): HojaDeSprites {
    asegurar(!this.animacion(a.id), "Ya existe una animación con ese id.");
    return this.con({ animaciones: [...this.d.animaciones, a] });
  }

  conAnimacion(a: Animacion): HojaDeSprites {
    asegurar(this.animacion(a.id), "Esa animación no pertenece a esta hoja.");
    return this.con({ animaciones: this.d.animaciones.map((x) => (x.id === a.id ? a : x)) });
  }

  sinAnimacion(id: string): HojaDeSprites {
    return this.con({ animaciones: this.d.animaciones.filter((a) => a.id !== id) });
  }

  /**
   * Trae animaciones de afuera (un .anim.json). Si ya hay una con el mismo nombre,
   * se actualiza conservando su id, así los objetos que la usan no pierden el vínculo.
   */
  conAnimacionesImportadas(importadas: readonly Animacion[]): HojaDeSprites {
    let animaciones = [...this.d.animaciones];
    for (const nueva of importadas) {
      const i = animaciones.findIndex((a) => a.nombre === nueva.nombre);
      if (i >= 0) {
        const vieja = animaciones[i]!;
        animaciones[i] = Animacion.reconstituir({
          id: vieja.id,
          nombre: vieja.nombre,
          msPorFrame: nueva.msPorFrame,
          enBucle: nueva.enBucle,
          ancla: nueva.ancla,
          frames: nueva.frames,
        });
      } else animaciones = [...animaciones, nueva];
    }
    return this.con({ animaciones });
  }

  /** Nombres de animación repetidos: al exportar se referencian por nombre, así que es un problema. */
  nombresRepetidos(): string[] {
    const vistos = new Set<string>(),
      rep = new Set<string>();
    for (const a of this.d.animaciones) (vistos.has(a.nombre) ? rep : vistos).add(a.nombre);
    return [...rep];
  }
}

function validarNombreArchivo(nombre: string): string {
  const n = String(nombre ?? "").trim();
  asegurar(n.length > 0, "La hoja necesita un nombre de archivo.");
  asegurar(n.length <= 120, "El nombre de archivo es demasiado largo.");
  return n;
}
