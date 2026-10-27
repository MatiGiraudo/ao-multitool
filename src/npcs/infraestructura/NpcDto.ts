import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import type { Direccion } from "@/compartido/dominio/Direccion";
import { Npc, type Drop, type EnVenta } from "../dominio/Npc";
import { esMovimientoValido, esTipoDeNpcValido, type MovimientoDeNpc, type TipoDeNpcId } from "../dominio/TipoDeNpc";

/** Forma plana de un NPC para guardarlo en disco y mandarlo por HTTP. */
export interface NpcDto {
  clave: string;
  numero: number;
  nombre: string;
  descripcion: string;
  tipo: TipoDeNpcId;
  cuerpo: number;
  cabeza: number;
  direccion: Direccion;
  movimiento: MovimientoDeNpc;
  banderas: string[];
  atributos: Record<string, ValorDeAtributo>;
  hechizos: number[];
  drops: Drop[];
  enVenta: EnVenta[];
  esEjemplo?: boolean;
}

const DIRECCIONES_VALIDAS = ["sur", "norte", "este", "oeste"];

export const NpcMapper = {
  aDto(n: Npc): NpcDto {
    const d = n.datos();
    return {
      clave: d.clave,
      numero: d.numero,
      nombre: d.nombre,
      descripcion: d.descripcion,
      tipo: d.tipo,
      cuerpo: d.cuerpo,
      cabeza: d.cabeza,
      direccion: d.direccion,
      movimiento: d.movimiento,
      banderas: [...d.banderas],
      atributos: { ...d.atributos },
      hechizos: [...d.hechizos],
      drops: d.drops.map((x) => ({ ...x })),
      enVenta: d.enVenta.map((x) => ({ ...x })),
      ...(d.esEjemplo ? { esEjemplo: true } : {}),
    };
  },
  aDominio(d: NpcDto): Npc {
    return Npc.reconstituir({
      clave: String(d.clave),
      numero: Number(d.numero),
      nombre: String(d.nombre ?? ""),
      descripcion: String(d.descripcion ?? ""),
      tipo: esTipoDeNpcValido(d.tipo) ? d.tipo : "otro",
      cuerpo: Number(d.cuerpo) || 0,
      cabeza: Number(d.cabeza) || 0,
      direccion: (DIRECCIONES_VALIDAS.includes(d.direccion) ? d.direccion : "sur") as Direccion,
      movimiento: esMovimientoValido(d.movimiento) ? d.movimiento : "quieto",
      banderas: Array.isArray(d.banderas) ? d.banderas.map(String) : [],
      atributos: d.atributos ?? {},
      hechizos: Array.isArray(d.hechizos) ? d.hechizos.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [],
      drops: Array.isArray(d.drops) ? d.drops.filter((x) => Number(x?.objeto) > 0) : [],
      enVenta: Array.isArray(d.enVenta) ? d.enVenta.filter((x) => Number(x?.objeto) > 0) : [],
      esEjemplo: !!d.esEjemplo,
    });
  },
};
