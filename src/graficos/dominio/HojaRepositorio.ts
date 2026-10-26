import type { HojaDeSprites } from "./HojaDeSprites";

/**
 * Puerto (interfaz) de persistencia de hojas.
 * El dominio dice QUÉ necesita; la infraestructura decide CÓMO (archivos, HTTP, memoria…).
 */
export interface HojaRepositorio {
  listar(): Promise<HojaDeSprites[]>;
  obtener(id: string): Promise<HojaDeSprites | null>;
  guardar(hoja: HojaDeSprites): Promise<void>;
  eliminar(id: string): Promise<void>;
}
