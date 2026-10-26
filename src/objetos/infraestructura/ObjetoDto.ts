import { referenciaValida } from "@/compartido/infraestructura/ReferenciaDto";
import type { Direccion } from "@/compartido/dominio/Direccion";
import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import { Objeto } from "../dominio/Objeto";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import type { TipoDeObjetoId } from "../dominio/TipoDeObjeto";

/** Forma plana de un objeto para guardarlo en disco y mandarlo por HTTP. */
export interface ObjetoDto {
  clave: string;
  numero: number;
  nombre: string;
  tipo: TipoDeObjetoId;
  valor: number;
  descripcion: string;
  apilable: boolean;
  nivelMinimo: number;
  banderas: string[];
  atributos: Record<string, ValorDeAtributo>;
  graficos: {
    icono: ReferenciaGrafica | null;
    suelo: ReferenciaGrafica | null;
    equipado: Partial<Record<Direccion, ReferenciaGrafica>>;
  };
  esEjemplo?: boolean;
}

export const ObjetoMapper = {
  aDto(o: Objeto): ObjetoDto {
    const d = o.datos();
    return {
      clave: d.clave,
      numero: d.numero,
      nombre: d.nombre,
      tipo: d.tipo,
      valor: d.valor,
      descripcion: d.descripcion,
      apilable: d.apilable,
      nivelMinimo: d.nivelMinimo,
      banderas: [...d.banderas],
      atributos: { ...d.atributos },
      graficos: { icono: d.graficos.icono, suelo: d.graficos.suelo, equipado: { ...d.graficos.equipado } },
      ...(d.esEjemplo ? { esEjemplo: true } : {}),
    };
  },
  aDominio(d: ObjetoDto): Objeto {
    const equipado: Partial<Record<Direccion, ReferenciaGrafica>> = {};
    for (const [k, v] of Object.entries(d.graficos?.equipado ?? {})) {
      const r = referenciaValida(v);
      if (r) equipado[k as Direccion] = r;
    }
    return Objeto.reconstituir({
      clave: String(d.clave),
      numero: Number(d.numero),
      nombre: String(d.nombre ?? ""),
      tipo: d.tipo,
      valor: Number(d.valor) || 0,
      descripcion: String(d.descripcion ?? ""),
      apilable: !!d.apilable,
      nivelMinimo: Number(d.nivelMinimo) || 0,
      banderas: Array.isArray(d.banderas) ? d.banderas.map(String) : [],
      atributos: d.atributos ?? {},
      graficos: { icono: referenciaValida(d.graficos?.icono), suelo: referenciaValida(d.graficos?.suelo), equipado },
      esEjemplo: !!d.esEjemplo,
    });
  },
};
