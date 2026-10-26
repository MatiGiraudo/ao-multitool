"use client";
import { useMemo } from "react";
import { catalogoDe, type CatalogoPorNumero } from "@/compartido/dominio/CatalogoPorNumero";
import { useImagen } from "@/compartido/ui/utilidades";
import { DibujoDeFrame } from "@/graficos/ui/DibujoDeFrame";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { useEfectos } from "./ProveedorDeEfectos";

/**
 * Los efectos vistos como catálogo por número, para los módulos que apuntan a un FX.
 * Es la versión en React del adaptador `catalogoDeEfectos`.
 */
export function useCatalogoDeEfectos(): CatalogoPorNumero {
  const { efectos } = useEfectos();
  return useMemo(() => catalogoDe(efectos.map((e) => ({ numero: e.numero, nombre: e.nombre }))), [efectos]);
}

/** Cómo se ve un FX, para mostrarlo dentro de la ficha de otra cosa (un hechizo, por ejemplo). */
export function MiniaturaDeEfecto({ numero }: { numero: number }) {
  const { efectos, resolver } = useEfectos();
  const graficos = useGraficos();
  const efecto = efectos.find((e) => e.numero === numero);
  const r = resolver(efecto?.animacion);
  const img = useImagen(graficos.urlImagen(r?.hoja));

  if (!numero) return <p className="hint">Sin FX: el hechizo no dibuja nada al lanzarse.</p>;
  if (!efecto) return <p className="hint aviso">No existe un FX con el número {numero}. Crealo en la pestaña FX o cambiá el número.</p>;

  return (
    <div className="slot">
      <DibujoDeFrame img={img} frame={r?.animacion.frames[0]} tamanio={48} />
      <div className="lbl">
        <b>
          #{efecto.numero} {efecto.nombre || "(sin nombre)"}
        </b>
        <span>
          {r ? `${r.hoja.nombreArchivo} › ${r.animacion.nombre}` : "sin animación vinculada"}
          {efecto.offsetX || efecto.offsetY ? ` · corrido ${efecto.offsetX}, ${efecto.offsetY}` : ""}
        </span>
      </div>
    </div>
  );
}
