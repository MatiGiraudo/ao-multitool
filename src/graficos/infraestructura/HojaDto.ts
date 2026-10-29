import { Animacion } from "../dominio/Animacion";
import type { Ancla } from "../dominio/Ancla";
import { Frame } from "../dominio/Frame";
import { Grilla, type DatosGrilla } from "../dominio/Grilla";
import { HojaDeSprites } from "../dominio/HojaDeSprites";
import { Tamanio } from "../dominio/Tamanio";

/*
 * DTO = "objeto de transferencia de datos": la forma plana (JSON) en que una hoja
 * viaja por HTTP y se guarda en disco. El dominio nunca se serializa directo:
 * este mapper traduce en ambos sentidos y es el único que conoce los dos mundos.
 */

export interface FrameDto {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  duracionMs?: number;
}
export interface AnimacionDto {
  id: string;
  nombre: string;
  msPorFrame: number;
  enBucle: boolean;
  ancla: Ancla;
  frames: FrameDto[];
}
export interface TamanioDto {
  ancho: number;
  alto: number;
}
export interface HojaDto {
  id: string;
  nombreArchivo: string;
  /** El `FileNum` que le dio el proyecto. Falta en las hojas que nunca se usaron para pintar. */
  numeroDeArchivo?: number;
  tamanio: TamanioDto | null;
  tamanioOriginal: TamanioDto | null;
  versionImagen: number;
  grilla: DatosGrilla;
  esEjemplo: boolean;
  animaciones: AnimacionDto[];
}

const ANCLAS_VALIDAS: Ancla[] = ["abajo-centro", "centro", "arriba-izquierda"];

export const HojaMapper = {
  aDto(h: HojaDeSprites): HojaDto {
    const t = (x: Tamanio | null): TamanioDto | null => (x ? { ancho: x.ancho, alto: x.alto } : null);
    return {
      id: h.id,
      nombreArchivo: h.nombreArchivo,
      ...(h.numeroDeArchivo !== null ? { numeroDeArchivo: h.numeroDeArchivo } : {}),
      tamanio: t(h.tamanio),
      tamanioOriginal: t(h.tamanioOriginal),
      versionImagen: h.versionImagen,
      grilla: h.grilla.datos(),
      esEjemplo: h.esEjemplo,
      animaciones: h.animaciones.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        msPorFrame: a.msPorFrame,
        enBucle: a.enBucle,
        ancla: a.ancla,
        frames: a.frames.map((f) => {
          const o: FrameDto = { x: f.rect.x, y: f.rect.y, ancho: f.rect.ancho, alto: f.rect.alto };
          if (f.duracionMs !== null) o.duracionMs = f.duracionMs;
          return o;
        }),
      })),
    };
  },

  aDominio(d: HojaDto): HojaDeSprites {
    const t = (x: TamanioDto | null | undefined) => (x ? Tamanio.crear(x.ancho, x.alto) : null);
    return HojaDeSprites.reconstituir({
      id: String(d.id),
      nombreArchivo: d.nombreArchivo,
      numeroDeArchivo: Number.isInteger(d.numeroDeArchivo) && Number(d.numeroDeArchivo) > 0 ? Number(d.numeroDeArchivo) : null,
      tamanio: t(d.tamanio),
      tamanioOriginal: t(d.tamanioOriginal),
      versionImagen: Number(d.versionImagen) || 0,
      grilla: d.grilla ? Grilla.crear(d.grilla) : Grilla.porDefecto(),
      esEjemplo: !!d.esEjemplo,
      animaciones: (d.animaciones ?? []).map((a) =>
        Animacion.reconstituir({
          id: String(a.id),
          nombre: a.nombre,
          msPorFrame: Number(a.msPorFrame) || 120,
          enBucle: a.enBucle !== false,
          ancla: ANCLAS_VALIDAS.includes(a.ancla) ? a.ancla : "abajo-centro",
          frames: (a.frames ?? []).map((f) => Frame.deCoordenadas(f.x, f.y, f.ancho, f.alto, f.duracionMs ?? null)),
        }),
      ),
    });
  },
};
