import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import { idSeguro } from "@/compartido/infraestructura/nombresSeguros";
import type { AlmacenDeImagenes, UbicadorDeImagenes, VarianteDeImagen } from "../../aplicacion/puertos";

/**
 * Los PNG de las hojas en la carpeta del usuario: `graficos/<id>.png` y `<id>.original.png`.
 *
 * Lo que tiene de distinto al adaptador HTTP es cómo le da una URL a la interfaz. Allá la URL es
 * la de la API y existe siempre; acá el archivo está en el disco del usuario y la única forma de
 * dibujarlo es un `blob:` hecho con `URL.createObjectURL`, que hay que leer primero.
 *
 * Como `urlDe` tiene que seguir siendo sincrónica —la llama la interfaz mientras dibuja—, acá se
 * guarda un caché: la primera vez devuelve vacío y dispara la lectura, y cuando la URL está lista
 * avisa para que la pantalla se vuelva a dibujar. Es el mismo parpadeo que ya tenía una imagen que
 * todavía no bajó por HTTP.
 */
export class CarpetaAlmacenDeImagenes implements AlmacenDeImagenes, UbicadorDeImagenes {
  private readonly urls = new Map<string, { version: number; url: string }>();
  private readonly pidiendo = new Set<string>();
  private readonly escuchas = new Set<() => void>();

  constructor(private readonly carpeta: CarpetaDelProyecto) {}

  private ruta(id: string, variante: VarianteDeImagen): string[] {
    return ["graficos", `${idSeguro(id)}${variante === "original" ? ".original" : ""}.png`];
  }

  async guardar(hojaId: string, png: Blob, variante: VarianteDeImagen): Promise<void> {
    await this.carpeta.escribir(this.ruta(hojaId, variante), png);
    if (variante === "actual") this.olvidar(hojaId);
  }

  async leer(hojaId: string, variante: VarianteDeImagen): Promise<Blob | null> {
    return await this.carpeta.leerBlob(this.ruta(hojaId, variante));
  }

  async eliminar(hojaId: string): Promise<void> {
    await this.carpeta.borrar(this.ruta(hojaId, "actual"));
    await this.carpeta.borrar(this.ruta(hojaId, "original"));
    this.olvidar(hojaId);
  }

  /** La URL para dibujar, o vacío mientras se lee el archivo por primera vez. */
  urlDe(hojaId: string, version: number): string {
    const guardada = this.urls.get(hojaId);
    if (guardada?.version === version) return guardada.url;
    void this.traer(hojaId, version);
    // Mientras tanto sirve la anterior: cambiar una imagen no tiene por qué dejar el hueco en blanco.
    return guardada?.url ?? "";
  }

  /** Avisa cuando una URL que no estaba ya se puede usar. */
  alCambiar(escuchar: () => void): () => void {
    this.escuchas.add(escuchar);
    return () => this.escuchas.delete(escuchar);
  }

  private async traer(hojaId: string, version: number): Promise<void> {
    const clave = `${hojaId}@${version}`;
    if (this.pidiendo.has(clave)) return;
    this.pidiendo.add(clave);
    try {
      const png = await this.leer(hojaId, "actual");
      if (!png) return;
      this.olvidar(hojaId);
      this.urls.set(hojaId, { version, url: URL.createObjectURL(png) });
      for (const avisar of this.escuchas) avisar();
    } finally {
      this.pidiendo.delete(clave);
    }
  }

  /** La URL de un blob ocupa memoria hasta que se la suelta a mano. */
  private olvidar(hojaId: string): void {
    const vieja = this.urls.get(hojaId);
    if (!vieja) return;
    URL.revokeObjectURL(vieja.url);
    this.urls.delete(hojaId);
  }
}
