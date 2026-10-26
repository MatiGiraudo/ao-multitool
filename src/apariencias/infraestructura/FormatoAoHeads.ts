import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Direccion } from "@/compartido/dominio/Direccion";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { FormatoDeApariencias } from "../aplicacion/puertos";
import type { Cabeza, CabezaImportada } from "../dominio/Cabeza";
import { compactar, graficosAJson, graficosDesdeJson, type RefJson } from "./refsPorDireccion";

/** Formato "ao-heads" v1: las cabezas. Van con frame, porque cada cara es un cuadro fijo. */

interface HeadJson {
  id?: number;
  name?: string;
  graphics?: Partial<Record<Direccion, RefJson | null>>;
}

export class FormatoAoHeads implements FormatoDeApariencias<Cabeza, CabezaImportada> {
  readonly nombreDeArchivo = "cabezas.json";

  exportar(cabezas: readonly Cabeza[], catalogo: CatalogoGrafico): string {
    const json = {
      format: "ao-heads",
      version: 1,
      heads: cabezas.map((c) => ({
        id: c.numero,
        name: c.nombre,
        graphics: graficosAJson(c.direcciones, catalogo, true),
      })),
    };
    return compactar(JSON.stringify(json, null, 2)) + "\n";
  }

  leer(texto: string): CabezaImportada[] {
    let d: { heads?: HeadJson[] };
    try {
      d = JSON.parse(texto) as { heads?: HeadJson[] };
    } catch {
      throw new ErrorDeDominio("El texto no es un JSON válido.");
    }
    if (!d || !Array.isArray(d.heads)) throw new ErrorDeDominio('Falta la lista "heads".');
    return d.heads
      .filter((h) => Number.isInteger(Number(h.id)) && Number(h.id) > 0)
      .map((h) => ({
        numero: Number(h.id),
        nombre: String(h.name ?? ""),
        direcciones: graficosDesdeJson(h.graphics),
      }));
  }
}
