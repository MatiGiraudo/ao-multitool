import type { EscritorDeGraficosClasicos } from "../aplicacion/puertos";
import type { TablaDeGrh } from "../dominio/TablaDeGrh";

/**
 * Escribe la tabla de GRH como un `Graficos.ini`, en el formato de una línea por GRH.
 *
 * Hace falta porque el editor ya no sólo lee gráficos del clásico: también inventa números nuevos
 * cuando pintás un mapa con un recorte que nunca tuvo GRH. Sin devolver el archivo, el juego no
 * sabría qué dibujar en esas celdas.
 *
 * De los dos formatos que sabe leer `LectorGraficosIni` se escribe el de una línea: es el que usan
 * los clientes actuales y el que guarda el tamaño en píxeles, que es como el editor lo tiene. Ida
 * y vuelta completa: lo que sale de acá, leído de nuevo, da la misma tabla.
 */
export class EscritorGraficosIni implements EscritorDeGraficosClasicos {
  escribir(tabla: TablaDeGrh): string {
    const grhs = tabla.datos();
    const lineas = ["[Graphics]", `NumGrh=${grhs.at(-1)?.numero ?? 0}`];
    for (const g of grhs) {
      const campos = g.cuadros.length ? [g.cuadros.length, ...g.cuadros, g.msDelCiclo] : [1, g.archivo || "0", g.x, g.y, g.ancho, g.alto];
      lineas.push(`Grh${g.numero}=${campos.join("-")}`);
    }
    // Los archivos del clásico son de Windows: fin de línea CRLF.
    return lineas.join("\r\n") + "\r\n";
  }
}
