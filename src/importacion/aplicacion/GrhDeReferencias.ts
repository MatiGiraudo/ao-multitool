import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import type { Animacion } from "@/graficos/dominio/Animacion";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import type { RectDeGrh } from "../dominio/TablaDeGrh";
import type { GraficoDelProyecto, GrhDelProyecto } from "./casosDeUso";

/**
 * El camino de vuelta del `PuenteDeGrh`: de una referencia del editor a un número de GRH.
 *
 * Importar traduce «el GRH 505» a «tal hoja, tal animación»; esto hace el viaje al revés, que es
 * lo que hace falta para devolverle al clásico sus archivos con los gráficos editados adentro.
 * Sin esto, el `Fxs.ini`, el `Personajes.ini`, el `Cabezas.ini` y el `GrhIndex` del `OBJ.dat`
 * sólo podían volver con el número que traían: cambiar el gráfico acá no se veía allá.
 *
 * El número sale de los recortes, no del nombre: si esos mismos recortes ya son un GRH se devuelve
 * el que ya existe —así un archivo importado y exportado sin tocar nada vuelve a salir igual— y
 * si no existe, el proyecto inventa uno y lo suma a la tabla, igual que al pintar un mapa. Por eso
 * un gráfico hecho acá también llega al juego: sale en el `Graficos.ini` exportado y su hoja sale
 * como imagen al lado.
 */
export class GrhDeReferencias {
  constructor(
    private readonly hojas: HojaRepositorio,
    private readonly grh: GrhDelProyecto,
  ) {}

  /**
   * El número de GRH de cada referencia, en el mismo orden en que se pidieron.
   *
   * `null` es «esto no se puede resolver»: la referencia está vacía, su hoja ya no está, la
   * animación no existe o no tiene cuadros. Quien pregunta deja entonces la línea del archivo
   * como estaba, que es mejor que escribirle un 0 al servidor.
   */
  async resolver(pedidos: readonly PedidoDeGrh[]): Promise<(number | null)[]> {
    const hojas = await this.hojas.listar();
    const porId = new Map(hojas.map((h) => [h.id, h]));
    const porNombre = new Map(hojas.map((h) => [h.nombreArchivo, h]));

    /* Primero se traduce todo a recortes, y después se pide la tanda entera de una: así la tabla
     * de GRH se lee y se guarda una sola vez por exportación. */
    const graficos: GraficoDelProyecto[] = [];
    const dondeCayo = pedidos.map((pedido) => {
      const grafico = this.graficoDe(pedido, porId, porNombre);
      if (!grafico) return -1;
      return graficos.push(grafico) - 1;
    });

    const resueltos = await this.grh.deVarios(graficos);
    return dondeCayo.map((i) => (i < 0 ? null : (resueltos[i]?.numero ?? null)));
  }

  private graficoDe(
    pedido: PedidoDeGrh,
    porId: Map<string, HojaDeSprites>,
    porNombre: Map<string, HojaDeSprites>,
  ): GraficoDelProyecto | null {
    const ref = pedido.referencia;
    if (!ref) return null;
    /* Una referencia pendiente es la de un JSON importado cuya hoja todavía no está cargada; si
     * apareció mientras tanto, se busca por nombre igual que hace el catálogo. */
    const hoja = ref.tipo === "vinculada" ? porId.get(ref.hojaId) : porNombre.get(ref.nombreHoja);
    const animacion =
      ref.tipo === "vinculada" ? hoja?.animacion(ref.animacionId) : hoja?.animacionLlamada(ref.nombreAnimacion);
    if (!hoja || !animacion || !animacion.cantidadDeFrames) return null;

    if (!entera(pedido.modo, ref.frame, animacion)) {
      const frame = animacion.frame(Math.min(ref.frame, animacion.cantidadDeFrames - 1))!;
      return { hojaId: hoja.id, rects: [aRect(frame)], msDelCiclo: animacion.duracionDelCiclo() };
    }
    return {
      hojaId: hoja.id,
      rects: animacion.frames.map(aRect),
      msDelCiclo: animacion.duracionDelCiclo(),
      preferido: grhDelNombre(animacion.nombre),
    };
  }
}

/**
 * Qué parte de la animación se dibuja allá, que es lo que decide si el GRH es animado o estático.
 *
 * No es lo mismo en las tres ranuras del editor que terminan en un archivo del clásico, y el
 * editor ya lo distingue: la ranura del cuerpo no deja elegir frame porque el cuerpo camina, y la
 * de la cabeza sí porque la cara es un dibujo quieto.
 *
 * - `animacion`: la animación entera. El `Animacion` de un FX y los `Walk1..4` de un cuerpo.
 * - `frame`: el cuadro al que apunta la referencia. Los `Head1..4` de una cabeza, que son cuatro
 *   caras y muchas veces cuatro frames de la misma animación.
 * - `icono`: un dibujo solo, que allá puede ser animado. El `GrhIndex` de un objeto: apuntar al
 *   primer cuadro es apuntar a la animación —así es como se importó una antorcha, y así tiene que
 *   volver—, y apuntar a otro es haber elegido ese cuadro a mano.
 */
export type ModoDeGrh = "animacion" | "frame" | "icono";

export interface PedidoDeGrh {
  referencia: ReferenciaGrafica | null | undefined;
  modo: ModoDeGrh;
}

function entera(modo: ModoDeGrh, frame: number, animacion: Animacion): boolean {
  if (modo === "animacion") return true;
  if (modo === "frame") return false;
  return frame === 0 && animacion.cantidadDeFrames > 1;
}

/**
 * De qué GRH salió esta animación, según cómo la llamó el importador (`grh505`).
 *
 * Es lo único que distingue dos GRH que dibujan exactamente lo mismo, y los hay: el
 * `Graficos.ini` de un cliente define la animación del dragón marrón dos veces, con números
 * distintos. Quien lo recibe lo verifica contra la tabla antes de usarlo, así que una animación
 * renombrada o editada no miente: simplemente deja de desempatar.
 *
 * Sólo para la animación entera. Un cuadro suelto no salió de ese GRH sino de uno de sus cuadros.
 */
function grhDelNombre(nombre: string): number | undefined {
  const m = /^grh(\d+)$/.exec(nombre);
  return m ? Number(m[1]) : undefined;
}

function aRect(f: { rect: { x: number; y: number; ancho: number; alto: number } }): RectDeGrh {
  const { x, y, ancho, alto } = f.rect;
  return { x, y, ancho, alto };
}
