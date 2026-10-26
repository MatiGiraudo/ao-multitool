import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { referenciaValida } from "@/compartido/infraestructura/ReferenciaDto";
import { Efecto } from "../dominio/Efecto";

/** Forma plana de un efecto para guardarlo en disco y mandarlo por HTTP. */
export interface EfectoDto {
  clave: string;
  numero: number;
  nombre: string;
  animacion: ReferenciaGrafica | null;
  offsetX: number;
  offsetY: number;
  repeticiones: number;
  esEjemplo?: boolean;
}

export const EfectoMapper = {
  aDto(e: Efecto): EfectoDto {
    const d = e.datos();
    return {
      clave: d.clave,
      numero: d.numero,
      nombre: d.nombre,
      animacion: d.animacion,
      offsetX: d.offsetX,
      offsetY: d.offsetY,
      repeticiones: d.repeticiones,
      ...(d.esEjemplo ? { esEjemplo: true } : {}),
    };
  },
  aDominio(d: EfectoDto): Efecto {
    return Efecto.reconstituir({
      clave: String(d.clave),
      numero: Number(d.numero),
      nombre: String(d.nombre ?? ""),
      animacion: referenciaValida(d.animacion),
      offsetX: Number(d.offsetX) || 0,
      offsetY: Number(d.offsetY) || 0,
      repeticiones: Number(d.repeticiones) || 0,
      esEjemplo: !!d.esEjemplo,
    });
  },
};
