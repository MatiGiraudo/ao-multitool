import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { Direccion } from "@/compartido/dominio/Direccion";
import type { FormatoDeApariencias } from "../aplicacion/puertos";
import type { Cuerpo, CuerpoImportado } from "../dominio/Cuerpo";
import { compactar, graficosAJson, graficosDesdeJson, type RefJson } from "./refsPorDireccion";

/** Formato "ao-bodies" v1: los cuerpos, con la animación de caminar de cada dirección. */

interface BodyJson {
  id?: number;
  name?: string;
  headOffset?: { x?: number; y?: number } | null;
  graphics?: Partial<Record<Direccion, RefJson | null>>;
}

export class FormatoAoBodies implements FormatoDeApariencias<Cuerpo, CuerpoImportado> {
  readonly nombreDeArchivo = "cuerpos.json";

  exportar(cuerpos: readonly Cuerpo[], catalogo: CatalogoGrafico): string {
    const json = {
      format: "ao-bodies",
      version: 1,
      bodies: cuerpos.map((c) => ({
        id: c.numero,
        name: c.nombre,
        headOffset: { x: c.offsetCabezaX, y: c.offsetCabezaY },
        graphics: graficosAJson(c.direcciones, catalogo, false),
      })),
    };
    return compactar(JSON.stringify(json, null, 2)) + "\n";
  }

  leer(texto: string): CuerpoImportado[] {
    let d: { bodies?: BodyJson[] };
    try {
      d = JSON.parse(texto) as { bodies?: BodyJson[] };
    } catch {
      throw new ErrorDeDominio("El texto no es un JSON válido.");
    }
    if (!d || !Array.isArray(d.bodies)) throw new ErrorDeDominio('Falta la lista "bodies".');
    return d.bodies
      .filter((b) => Number.isInteger(Number(b.id)) && Number(b.id) > 0)
      .map((b) => ({
        numero: Number(b.id),
        nombre: String(b.name ?? ""),
        direcciones: graficosDesdeJson(b.graphics),
        offsetCabezaX: Math.round(Number(b.headOffset?.x) || 0),
        offsetCabezaY: Math.round(Number(b.headOffset?.y) || 0),
      }));
  }
}
