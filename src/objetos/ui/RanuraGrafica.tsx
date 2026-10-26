"use client";
import { useState } from "react";
import { useImagen } from "@/compartido/ui/utilidades";
import { DibujoDeFrame } from "@/graficos/ui/DibujoDeFrame";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { Referencia, type ReferenciaGrafica } from "../dominio/ReferenciaGrafica";
import { useObjetos } from "./ProveedorDeObjetos";
import { SelectorDeAnimacion } from "./SelectorDeAnimacion";

/** Un "enchufe" de gráfico del objeto: icono, suelo o una dirección de equipado. */
export function RanuraGrafica(p: {
  id: string;
  etiqueta: string;
  tituloSelector: string;
  vacio: string;
  referencia: ReferenciaGrafica | null;
  conFrame: boolean;
  onCambiar(r: ReferenciaGrafica | null): void;
}) {
  const { resolver } = useObjetos();
  const graficos = useGraficos();
  const [abierto, setAbierto] = useState(false);
  const r = resolver(p.referencia);
  const img = useImagen(graficos.urlImagen(r?.hoja));
  const n = r?.animacion.cantidadDeFrames ?? 0;
  const frame = p.referencia ? Math.min(p.referencia.frame, Math.max(0, n - 1)) : 0;
  const roto = !!p.referencia && !r;

  let detalle = p.vacio;
  if (roto) {
    const ref = p.referencia!;
    detalle = `Vínculo roto: ${ref.tipo === "pendiente" ? `${ref.nombreHoja} › ${ref.nombreAnimacion}` : "la animación ya no existe"}`;
  } else if (r) detalle = `${r.hoja.nombreArchivo} › ${r.animacion.nombre}${p.conFrame && n > 1 ? ` · frame ${frame + 1}/${n}` : ""}`;

  return (
    <div className={`slot${!p.referencia ? " unset" : ""}${roto ? " broken" : ""}`}>
      <button className="slot-img" onClick={() => setAbierto(true)} aria-label={`Elegir ${p.etiqueta}`}>
        <DibujoDeFrame img={img} frame={r?.animacion.frame(frame)} tamanio={48} />
      </button>
      <div className="lbl">
        <b>{p.etiqueta}</b>
        <span>{detalle}</span>
      </div>
      <div className="acts">
        {p.conFrame && r && n > 1 && (
          <>
            <button aria-label="Frame anterior" onClick={() => p.onCambiar(Referencia.conFrame(p.referencia!, (frame - 1 + n) % n))}>
              ◀
            </button>
            <button aria-label="Frame siguiente" onClick={() => p.onCambiar(Referencia.conFrame(p.referencia!, (frame + 1) % n))}>
              ▶
            </button>
          </>
        )}
        <button id={`pick_${p.id}`} onClick={() => setAbierto(true)}>
          {p.referencia ? "Cambiar…" : "Elegir…"}
        </button>
        {p.referencia && (
          <button className="danger" aria-label="Quitar vínculo" onClick={() => p.onCambiar(null)}>
            ✕
          </button>
        )}
      </div>
      {abierto && (
        <SelectorDeAnimacion
          titulo={p.tituloSelector}
          actual={p.referencia}
          onCerrar={() => setAbierto(false)}
          onElegir={(ref) => {
            setAbierto(false);
            p.onCambiar(ref);
          }}
        />
      )}
    </div>
  );
}
