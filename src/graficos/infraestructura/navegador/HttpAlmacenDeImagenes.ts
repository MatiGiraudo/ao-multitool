import { enviar } from "@/compartido/infraestructura/http";
import type { AlmacenDeImagenes, UbicadorDeImagenes, VarianteDeImagen } from "../../aplicacion/puertos";

/** Sube y baja los PNG de las hojas por la API. También sabe armar la URL para dibujarlos. */
export class HttpAlmacenDeImagenes implements AlmacenDeImagenes, UbicadorDeImagenes {
  constructor(private readonly base = "/api/hojas") {}

  private url(hojaId: string, variante: VarianteDeImagen) {
    return `${this.base}/${encodeURIComponent(hojaId)}/imagen?variante=${variante}`;
  }

  async guardar(hojaId: string, png: Blob, variante: VarianteDeImagen): Promise<void> {
    await enviar(this.url(hojaId, variante), { method: "PUT", headers: { "content-type": "image/png" }, body: png });
  }

  async leer(hojaId: string, variante: VarianteDeImagen): Promise<Blob | null> {
    const r = await fetch(this.url(hojaId, variante), { cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`No se pudo leer la imagen (${r.status}).`);
    return await r.blob();
  }

  async eliminar(hojaId: string): Promise<void> {
    await enviar(`${this.base}/${encodeURIComponent(hojaId)}/imagen`, { method: "DELETE" });
  }

  urlDe(hojaId: string, version: number): string {
    return `${this.url(hojaId, "actual")}&v=${version}`;
  }
}
