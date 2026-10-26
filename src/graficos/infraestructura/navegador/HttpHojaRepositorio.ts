import { enviar, pedirJson } from "@/compartido/infraestructura/http";
import type { HojaDeSprites } from "../../dominio/HojaDeSprites";
import type { HojaRepositorio } from "../../dominio/HojaRepositorio";
import { HojaMapper, type HojaDto } from "../HojaDto";

/** El mismo puerto que el repositorio en disco, pero desde el navegador: habla con la API de Next. */
export class HttpHojaRepositorio implements HojaRepositorio {
  constructor(private readonly base = "/api/hojas") {}

  async listar(): Promise<HojaDeSprites[]> {
    return (await pedirJson<HojaDto[]>(this.base)).map(HojaMapper.aDominio);
  }

  async obtener(id: string): Promise<HojaDeSprites | null> {
    const r = await fetch(`${this.base}/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`No se pudo leer la hoja (${r.status}).`);
    return HojaMapper.aDominio((await r.json()) as HojaDto);
  }

  async guardar(hoja: HojaDeSprites): Promise<void> {
    await enviar(`${this.base}/${encodeURIComponent(hoja.id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(HojaMapper.aDto(hoja)),
    });
  }

  async eliminar(id: string): Promise<void> {
    await enviar(`${this.base}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}
