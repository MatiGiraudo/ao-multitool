import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import { Animacion } from "@/graficos/dominio/Animacion";
import { Frame } from "@/graficos/dominio/Frame";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import { esElArchivo } from "../dominio/nombres";
import type { RecortesDeGrh, TablaDeGrh } from "../dominio/TablaDeGrh";

/** Lo que dejó un vinculado: qué se pudo resolver y qué falta para resolver el resto. */
export interface VinculosDeGrh {
  /** La animación que quedó para cada GRH que se pudo resolver. */
  referencias: Map<number, ReferenciaPorNombre>;
  /** La de cada gráfico que no vino con número de GRH, por la clave con la que se pidió. */
  sueltas: Map<string, ReferenciaPorNombre>;
  animacionesCreadas: number;
  /** Archivos de imagen que hacían falta y todavía no están cargados como hoja. */
  hojasFaltantes: string[];
  /** GRH que la tabla no conoce (o que la tabla no está cargada). */
  grhSinResolver: number[];
}

/**
 * Un gráfico que no tiene número de GRH: viene con sus recortes puestos y se pide por una clave.
 *
 * Es lo que necesitan los cuerpos con molde del AO20, que no nombran ningún GRH. La clave la
 * elige quien pide —ahí se decide qué se considera el mismo dibujo— y con ella vuelve la
 * referencia; el nombre es cómo va a quedar llamada la animación en la hoja.
 */
export interface GraficoSuelto {
  clave: string;
  nombre: string;
  recortes: RecortesDeGrh;
}

/**
 * El puente entre los números de GRH del clásico y las animaciones del editor.
 *
 * Es el trabajo que comparten todos los importadores del clásico: allá un gráfico es "el GRH 505"
 * y acá es "tal hoja, tal animación". Para cada número pedido, este puente busca sus recortes en
 * la tabla y, si la hoja está cargada, crea la animación (la llama grh505) y devuelve la
 * referencia ya lista para vincular.
 *
 * Dos propiedades hacen que la importación se pueda repetir sin miedo: una animación que ya
 * existe se reusa en vez de duplicarse, y lo que no se pudo resolver queda anotado —la imagen que
 * falta cargar, el GRH que la tabla no conoce— para volver a intentarlo después.
 *
 * Los gráficos sueltos entran por el mismo lugar: una vez que un GRH se resolvió a recortes, la
 * diferencia con un recorte que ya venía resuelto es nada más de dónde salió.
 */
export class PuenteDeGrh {
  constructor(
    private readonly hojas: HojaRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}

  async vincular(tabla: TablaDeGrh, grhs: Iterable<number>, sueltos: Iterable<GraficoSuelto> = []): Promise<VinculosDeGrh> {
    const hojas = new HojasConAnimaciones(await this.hojas.listar(), this.ids);
    const grhSinResolver = new Set<number>();
    const referencias = new Map<number, ReferenciaPorNombre>();
    const sueltas = new Map<string, ReferenciaPorNombre>();

    for (const grh of new Set([...grhs].filter((n) => n > 0))) {
      const recortes = tabla.recortes(grh);
      if (!recortes) {
        grhSinResolver.add(grh);
        continue;
      }
      const ref = hojas.animacion(`grh${grh}`, recortes);
      if (ref) referencias.set(grh, ref);
    }

    for (const suelto of sueltos) {
      if (sueltas.has(suelto.clave)) continue;
      const ref = hojas.animacion(suelto.nombre, suelto.recortes);
      if (ref) sueltas.set(suelto.clave, ref);
    }

    await hojas.guardarLasTocadas(this.hojas);

    return {
      referencias,
      sueltas,
      animacionesCreadas: hojas.creadas,
      hojasFaltantes: [...hojas.faltantes].sort(porNumeroDeArchivo),
      grhSinResolver: [...grhSinResolver].sort((a, b) => a - b),
    };
  }
}

/**
 * Las hojas del proyecto mientras se las va llenando de animaciones, que es lo único que los dos
 * caminos del puente comparten.
 *
 * Existe porque hay que acumular: dos GRH de la misma hoja la tocan uno después del otro, y la
 * entidad es inmutable, así que la segunda vez hay que partir de la que dejó la primera y no de
 * la que está en disco. Se guarda todo junto al final.
 */
class HojasConAnimaciones {
  readonly faltantes = new Set<string>();
  private readonly tocadas = new Map<string, HojaDeSprites>();
  creadas = 0;

  constructor(
    private readonly hojas: readonly HojaDeSprites[],
    private readonly ids: GeneradorDeIds,
  ) {}

  /** La referencia a la animación que dibuja estos recortes, creándola si todavía no estaba. */
  animacion(nombre: string, recortes: RecortesDeGrh): ReferenciaPorNombre | null {
    const original = this.hojas.find((h) => esElArchivo(h, recortes.archivo));
    if (!original) {
      this.faltantes.add(recortes.archivo);
      return null;
    }
    let hoja = this.tocadas.get(original.id) ?? original;
    if (!hoja.animacionLlamada(nombre)) {
      const animacion = Animacion.crear(this.ids.nuevo(), nombre)
        .conMsPorFrame(recortes.msPorFrame || 120)
        .conFramesAgregados(recortes.rects.map((r) => Frame.deCoordenadas(r.x, r.y, r.ancho, r.alto)));
      hoja = hoja.conAnimacionAgregada(animacion);
      this.tocadas.set(hoja.id, hoja);
      this.creadas++;
    }
    return { hoja: hoja.nombreArchivo, animacion: nombre, frame: 0 };
  }

  async guardarLasTocadas(repositorio: HojaRepositorio): Promise<void> {
    for (const hoja of this.tocadas.values()) await repositorio.guardar(hoja);
  }
}

/** Los archivos del clásico se llaman por número, así que "9" va antes que "10". */
function porNumeroDeArchivo(a: string, b: string): number {
  return Number(a) - Number(b) || a.localeCompare(b);
}
