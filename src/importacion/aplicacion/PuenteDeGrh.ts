import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import { Animacion } from "@/graficos/dominio/Animacion";
import { Frame } from "@/graficos/dominio/Frame";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import { esElArchivo } from "../dominio/nombres";
import type { TablaDeGrh } from "../dominio/TablaDeGrh";

/** Lo que dejó un vinculado: qué se pudo resolver y qué falta para resolver el resto. */
export interface VinculosDeGrh {
  /** La animación que quedó para cada GRH que se pudo resolver. */
  referencias: Map<number, ReferenciaPorNombre>;
  animacionesCreadas: number;
  /** Archivos de imagen que hacían falta y todavía no están cargados como hoja. */
  hojasFaltantes: string[];
  /** GRH que la tabla no conoce (o que la tabla no está cargada). */
  grhSinResolver: number[];
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
 */
export class PuenteDeGrh {
  constructor(
    private readonly hojas: HojaRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}

  async vincular(tabla: TablaDeGrh, grhs: Iterable<number>): Promise<VinculosDeGrh> {
    const hojas = await this.hojas.listar();
    const hojasFaltantes = new Set<string>();
    const grhSinResolver = new Set<number>();
    const referencias = new Map<number, ReferenciaPorNombre>();
    const tocadas = new Map<string, HojaDeSprites>();
    let animacionesCreadas = 0;

    for (const grh of new Set([...grhs].filter((n) => n > 0))) {
      const recortes = tabla.recortes(grh);
      if (!recortes) {
        grhSinResolver.add(grh);
        continue;
      }
      const original = hojas.find((h) => esElArchivo(h, recortes.archivo));
      if (!original) {
        hojasFaltantes.add(recortes.archivo);
        continue;
      }
      let hoja = tocadas.get(original.id) ?? original;
      const nombre = `grh${grh}`;
      if (!hoja.animacionLlamada(nombre)) {
        const animacion = Animacion.crear(this.ids.nuevo(), nombre)
          .conMsPorFrame(recortes.msPorFrame || 120)
          .conFramesAgregados(recortes.rects.map((r) => Frame.deCoordenadas(r.x, r.y, r.ancho, r.alto)));
        hoja = hoja.conAnimacionAgregada(animacion);
        tocadas.set(hoja.id, hoja);
        animacionesCreadas++;
      }
      referencias.set(grh, { hoja: hoja.nombreArchivo, animacion: nombre, frame: 0 });
    }

    for (const hoja of tocadas.values()) await this.hojas.guardar(hoja);

    return {
      referencias,
      animacionesCreadas,
      hojasFaltantes: [...hojasFaltantes].sort(porNumeroDeArchivo),
      grhSinResolver: [...grhSinResolver].sort((a, b) => a - b),
    };
  }
}

/** Los archivos del clásico se llaman por número, así que "9" va antes que "10". */
function porNumeroDeArchivo(a: string, b: string): number {
  return Number(a) - Number(b) || a.localeCompare(b);
}
