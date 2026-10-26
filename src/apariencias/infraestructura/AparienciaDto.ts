import type { Direccion } from "@/compartido/dominio/Direccion";
import type { PorDireccion } from "@/compartido/dominio/PorDireccion";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { referenciaValida } from "@/compartido/infraestructura/ReferenciaDto";
import { Cabeza } from "../dominio/Cabeza";
import { Cuerpo } from "../dominio/Cuerpo";

/** Formas planas para guardar en disco y mandar por HTTP. */

export interface CuerpoDto {
  clave: string;
  numero: number;
  nombre: string;
  direcciones: Partial<Record<Direccion, ReferenciaGrafica>>;
  offsetCabezaX: number;
  offsetCabezaY: number;
  esEjemplo?: boolean;
}

export interface CabezaDto {
  clave: string;
  numero: number;
  nombre: string;
  direcciones: Partial<Record<Direccion, ReferenciaGrafica>>;
  esEjemplo?: boolean;
}

function direccionesValidas(d: Partial<Record<string, unknown>> | undefined): PorDireccion<ReferenciaGrafica> {
  const out: Partial<Record<Direccion, ReferenciaGrafica>> = {};
  for (const [k, v] of Object.entries(d ?? {})) {
    const r = referenciaValida(v);
    if (r) out[k as Direccion] = r;
  }
  return out;
}

export const CuerpoMapper = {
  aDto(c: Cuerpo): CuerpoDto {
    const d = c.datos();
    return {
      clave: d.clave,
      numero: d.numero,
      nombre: d.nombre,
      direcciones: { ...d.direcciones },
      offsetCabezaX: d.offsetCabezaX,
      offsetCabezaY: d.offsetCabezaY,
      ...(d.esEjemplo ? { esEjemplo: true } : {}),
    };
  },
  aDominio(d: CuerpoDto): Cuerpo {
    return Cuerpo.reconstituir({
      clave: String(d.clave),
      numero: Number(d.numero),
      nombre: String(d.nombre ?? ""),
      direcciones: direccionesValidas(d.direcciones),
      offsetCabezaX: Number(d.offsetCabezaX) || 0,
      offsetCabezaY: Number(d.offsetCabezaY) || 0,
      esEjemplo: !!d.esEjemplo,
    });
  },
};

export const CabezaMapper = {
  aDto(c: Cabeza): CabezaDto {
    const d = c.datos();
    return {
      clave: d.clave,
      numero: d.numero,
      nombre: d.nombre,
      direcciones: { ...d.direcciones },
      ...(d.esEjemplo ? { esEjemplo: true } : {}),
    };
  },
  aDominio(d: CabezaDto): Cabeza {
    return Cabeza.reconstituir({
      clave: String(d.clave),
      numero: Number(d.numero),
      nombre: String(d.nombre ?? ""),
      direcciones: direccionesValidas(d.direcciones),
      esEjemplo: !!d.esEjemplo,
    });
  },
};
