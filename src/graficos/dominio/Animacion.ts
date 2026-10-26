import { asegurar, ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { Ancla } from "./Ancla";
import { Frame } from "./Frame";
import { limitarDesplazamiento } from "./Grilla";
import { Rect } from "./Rect";
import type { Tamanio } from "./Tamanio";

export interface DatosAnimacion {
  id: string;
  nombre: string;
  msPorFrame: number;
  enBucle: boolean;
  ancla: Ancla;
  frames: readonly Frame[];
}

/**
 * Entidad: un ciclo de animación dentro de una hoja (por ejemplo "caminar_sur").
 *
 * Es inmutable: cada método devuelve una animación nueva en lugar de modificar esta.
 * Eso hace que React detecte los cambios sin trucos y que deshacer/rehacer sea trivial más adelante.
 */
export class Animacion {
  private constructor(private readonly d: DatosAnimacion) {}

  static crear(id: string, nombre: string): Animacion {
    return new Animacion({ id, nombre: normalizarNombre(nombre), msPorFrame: 120, enBucle: true, ancla: "abajo-centro", frames: [] });
  }

  /** Reconstruye una animación guardada, validando sus datos. */
  static reconstituir(d: DatosAnimacion): Animacion {
    asegurar(d.id, "La animación necesita un id.");
    asegurar(Number.isFinite(d.msPorFrame) && d.msPorFrame >= 10, "Los ms por frame tienen que ser al menos 10.");
    return new Animacion({ ...d, nombre: normalizarNombre(d.nombre), msPorFrame: Math.round(d.msPorFrame), frames: [...d.frames] });
  }

  get id() {
    return this.d.id;
  }
  get nombre() {
    return this.d.nombre;
  }
  get msPorFrame() {
    return this.d.msPorFrame;
  }
  get enBucle() {
    return this.d.enBucle;
  }
  get ancla() {
    return this.d.ancla;
  }
  get frames(): readonly Frame[] {
    return this.d.frames;
  }
  get cantidadDeFrames() {
    return this.d.frames.length;
  }

  frame(i: number): Frame | undefined {
    return this.d.frames[i];
  }

  private con(cambios: Partial<DatosAnimacion>): Animacion {
    return new Animacion({ ...this.d, ...cambios });
  }

  // ---------- propiedades ----------
  renombrada(nombre: string): Animacion {
    return this.con({ nombre: normalizarNombre(nombre) });
  }
  conMsPorFrame(ms: number): Animacion {
    asegurar(Number.isFinite(ms) && ms >= 10, "Los ms por frame tienen que ser al menos 10.");
    return this.con({ msPorFrame: Math.round(ms) });
  }
  conBucle(enBucle: boolean): Animacion {
    return this.con({ enBucle });
  }
  conAncla(ancla: Ancla): Animacion {
    return this.con({ ancla });
  }

  // ---------- frames ----------
  conFramesAgregados(nuevos: readonly Frame[]): Animacion {
    return this.con({ frames: [...this.d.frames, ...nuevos] });
  }

  conFrameReemplazado(i: number, frame: Frame): Animacion {
    this.verificarIndice(i);
    const frames = [...this.d.frames];
    frames[i] = frame;
    return this.con({ frames });
  }

  sinFrames(indices: Iterable<number>): Animacion {
    const quitar = new Set(indices);
    return this.con({ frames: this.d.frames.filter((_, i) => !quitar.has(i)) });
  }

  vaciada(): Animacion {
    return this.con({ frames: [] });
  }

  /** Mueve el frame `i` una posición hacia arriba (-1) o hacia abajo (+1) en el orden del ciclo. */
  conFrameMovido(i: number, direccion: -1 | 1): Animacion {
    this.verificarIndice(i);
    const j = i + direccion;
    if (j < 0 || j >= this.d.frames.length) return this;
    const frames = [...this.d.frames];
    [frames[i], frames[j]] = [frames[j]!, frames[i]!];
    return this.con({ frames });
  }

  conFrameDuplicado(i: number): Animacion {
    this.verificarIndice(i);
    const frames = [...this.d.frames];
    frames.splice(i + 1, 0, frames[i]!);
    return this.con({ frames });
  }

  invertida(): Animacion {
    return this.con({ frames: [...this.d.frames].reverse() });
  }

  /** 1-2-3-4 → 1-2-3-4-3-2: el ciclo vuelve sobre sus pasos sin repetir los extremos. */
  conIdaYVuelta(): Animacion {
    if (this.d.frames.length < 3) throw new ErrorDeDominio("Hacen falta al menos 3 frames para armar ida y vuelta.");
    return this.con({ frames: [...this.d.frames, ...this.d.frames.slice(1, -1).reverse()] });
  }

  /**
   * Desplaza un grupo de frames como un bloque, sin dejar que salga de la imagen.
   * Devuelve la animación nueva y el desplazamiento que realmente se aplicó.
   */
  conFramesDesplazados(indices: Iterable<number>, dx: number, dy: number, limites: Tamanio, paso?: { x: number; y: number }) {
    const set = new Set([...indices].filter((i) => i >= 0 && i < this.d.frames.length));
    const caja = Rect.cajaDe([...set].map((i) => this.d.frames[i]!.rect));
    if (!caja) return { animacion: this as Animacion, dx: 0, dy: 0 };
    const lim = limitarDesplazamiento(caja, dx, dy, limites, paso);
    if (!lim.dx && !lim.dy) return { animacion: this as Animacion, dx: 0, dy: 0 };
    const frames = this.d.frames.map((f, i) => (set.has(i) ? f.desplazado(lim.dx, lim.dy) : f));
    return { animacion: this.con({ frames }), dx: lim.dx, dy: lim.dy };
  }

  escalada(fx: number, fy: number): Animacion {
    return this.con({ frames: this.d.frames.map((f) => f.escalado(fx, fy)) });
  }

  // ---------- tiempo ----------
  duracionDe(i: number): number {
    return this.d.frames[i]?.duracionMs ?? this.d.msPorFrame;
  }

  duracionDelCiclo(): number {
    return this.d.frames.reduce((t, _, i) => t + this.duracionDe(i), 0);
  }

  /** Qué frame se ve a los `ms` milisegundos de empezar. Si no está en bucle, se queda en el último. */
  indiceEnTiempo(ms: number): number {
    const n = this.d.frames.length;
    if (!n) return -1;
    const total = this.duracionDelCiclo();
    if (total <= 0) return 0;
    let resto = this.d.enBucle ? ((ms % total) + total) % total : Math.min(Math.max(0, ms), total - 1);
    for (let i = 0; i < n; i++) {
      const d = this.duracionDe(i);
      if (resto < d) return i;
      resto -= d;
    }
    return n - 1;
  }

  /** El tamaño máximo de los frames: la caja donde entra cualquier frame del ciclo. */
  cajaMaxima(): { ancho: number; alto: number } {
    let ancho = 0,
      alto = 0;
    for (const f of this.d.frames) {
      ancho = Math.max(ancho, f.rect.ancho);
      alto = Math.max(alto, f.rect.alto);
    }
    return { ancho, alto };
  }

  private verificarIndice(i: number) {
    asegurar(Number.isInteger(i) && i >= 0 && i < this.d.frames.length, "Ese frame no existe.");
  }
}

/** Los nombres de animación terminan en archivos y código: sin espacios. */
export function normalizarNombre(nombre: string): string {
  return String(nombre ?? "").trim().replace(/\s+/g, "_");
}
