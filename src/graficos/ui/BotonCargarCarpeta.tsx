"use client";
import { useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivos, PuntosDeCarga } from "@/compartido/ui/componentes";
import type { ResultadoDeLote } from "../aplicacion/casosDeUso";

/** Lo que el selector de archivos deja elegir cuando se piden imágenes sueltas. */
export const ACEPTA_IMG = "image/png,image/bmp,image/gif,image/webp,image/jpeg";

/** Al elegir una carpeta el navegador entrega todo lo que hay dentro, así que el filtro va acá. */
const ES_IMAGEN = /\.(png|bmp|gif|webp|jpe?g)$/i;

/**
 * Carga una carpeta entera de imágenes, una hoja por archivo.
 *
 * Es el botón que hace usable la carpeta `Graficos` del AO clásico: son miles de archivos
 * numerados, y de a uno no se termina nunca. Lo comparten la pantalla de Animaciones y la de
 * importación, que lo usa con `soloEstas` para traer nada más que las imágenes que la tabla de GRH
 * está pidiendo.
 *
 * Habla con el caso de uso y después pide `recargarTodo`, en vez de pasar por el proveedor de
 * gráficos: así también sirve en la pantalla de importación, que no monta proveedores.
 */
export function BotonCargarCarpeta({
  soloEstas,
  etiqueta,
  className,
  onCargado,
}: {
  /** Los nombres que hacen falta. Sin esto entra toda la carpeta. */
  soloEstas?: readonly string[];
  etiqueta?: string;
  className?: string;
  /** Para que quien lo puso pueda releer su estado: después del lote faltan menos hojas. */
  onCargado?: () => void;
}) {
  const { casos, avisar, intentar, recargarTodo } = useAplicacion();
  const [avance, setAvance] = useState<{ hechas: number; total: number } | null>(null);
  const [fallidas, setFallidas] = useState<ResultadoDeLote["fallidas"]>([]);

  const cargar = async (archivos: File[]) => {
    const imagenes = archivos.filter((a) => ES_IMAGEN.test(a.name)).map((archivo) => ({ archivo, nombreArchivo: archivo.name }));
    if (!imagenes.length) return avisar("Ahí no había ninguna imagen.");
    setFallidas([]);
    setAvance({ hechas: 0, total: imagenes.length });
    const r = await intentar(() =>
      casos.graficos.cargarEnLote.ejecutar({ imagenes, soloEstas, alAvanzar: (hechas, total) => setAvance({ hechas, total }) }),
    );
    setAvance(null);
    if (!r) return;
    setFallidas(r.fallidas);
    avisar(resumen(r));
    if (r.creadas.length) {
      await recargarTodo();
      onCargado?.();
    }
  };

  return (
    <>
      <BotonArchivos carpeta accept={ACEPTA_IMG} className={className} disabled={!!avance} onArchivos={cargar}>
        {avance ? (
          <>
            <PuntosDeCarga />
            {`Cargando ${avance.hechas.toLocaleString("es-AR")} de ${avance.total.toLocaleString("es-AR")}…`}
          </>
        ) : (
          (etiqueta ?? "Cargar carpeta…")
        )}
      </BotonArchivos>
      {!!fallidas.length && (
        <p className="hint aviso">
          No se {fallidas.length === 1 ? "pudo" : "pudieron"} leer {cuantas(fallidas.length, "imagen", "imágenes")}:{" "}
          {fallidas.slice(0, 10).map((f) => f.nombreArchivo).join(", ")}
          {fallidas.length > 10 ? "…" : ""}.
        </p>
      )}
    </>
  );
}

function resumen(r: ResultadoDeLote): string {
  const partes = [cuantas(r.creadas.length, "hoja nueva", "hojas nuevas")];
  if (r.yaEstaban) partes.push(cuantas(r.yaEstaban, "ya estaba", "ya estaban"));
  if (r.deMas) partes.push(cuantas(r.deMas, "que no hacía falta", "que no hacían falta"));
  if (r.fallidas.length) partes.push(cuantas(r.fallidas.length, "ilegible", "ilegibles"));
  return partes.join(", ") + ".";
}

/** «1 hoja nueva» y no «1 hojas nuevas»: son mensajes que se leen mil veces. */
function cuantas(cantidad: number, singular: string, plural: string): string {
  return `${cantidad.toLocaleString("es-AR")} ${cantidad === 1 ? singular : plural}`;
}
