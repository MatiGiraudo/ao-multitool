"use client";
import { useEffect, useRef, useState } from "react";
import { useImagen } from "@/compartido/ui/utilidades";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { DibujoDeFrame } from "@/graficos/ui/DibujoDeFrame";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { Referencia, type ReferenciaGrafica } from "../dominio/ReferenciaGrafica";
import { useObjetos } from "./ProveedorDeObjetos";

/** Ventana para elegir una animación de cualquier hoja. */
export function SelectorDeAnimacion(p: { titulo: string; actual: ReferenciaGrafica | null; onElegir(r: ReferenciaGrafica): void; onCerrar(): void }) {
  const graficos = useGraficos();
  const { resolver } = useObjetos();
  const [filtro, setFiltro] = useState("");
  const buscador = useRef<HTMLInputElement>(null);
  const actual = resolver(p.actual);
  const q = filtro.trim().toLowerCase();

  const cerrar = useRef(p.onCerrar);
  cerrar.current = p.onCerrar;
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    buscador.current?.focus();
    const f = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current();
    addEventListener("keydown", f);
    return () => {
      removeEventListener("keydown", f);
      antes?.focus?.();
    };
  }, []);

  const grupos = graficos.hojas
    .map((h) => ({ h, animaciones: h.animaciones.filter((a) => !q || a.nombre.toLowerCase().includes(q) || h.nombreArchivo.toLowerCase().includes(q)) }))
    .filter((g) => g.animaciones.length);

  return (
    <div className="ovl" onPointerDown={(e) => e.target === e.currentTarget && p.onCerrar()}>
      <div className="panel pick" role="dialog" aria-modal="true" aria-labelledby="pickTitle">
        <div className="row between">
          <h2 id="pickTitle">{p.titulo}</h2>
          <button onClick={p.onCerrar}>Cerrar</button>
        </div>
        <input ref={buscador} type="search" placeholder="Filtrar por hoja o animación" aria-label="Filtrar" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <div className="pick-body">
          {!grupos.length && <div className="empty">{q ? "Ninguna animación coincide." : "Todavía no hay animaciones. Armalas en la pestaña Animaciones."}</div>}
          {grupos.map(({ h, animaciones }) => (
            <GrupoDeHoja key={h.id} hoja={h} animaciones={animaciones} actualId={actual?.animacion.id} onElegir={(id) => p.onElegir(Referencia.vinculada(h.id, id))} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GrupoDeHoja(p: { hoja: HojaDeSprites; animaciones: HojaDeSprites["animaciones"]; actualId?: string; onElegir(id: string): void }) {
  const graficos = useGraficos();
  const img = useImagen(graficos.urlImagen(p.hoja));
  return (
    <>
      <h3>
        {p.hoja.nombreArchivo}
        {p.hoja.tieneImagen ? "" : " · sin imagen"}
      </h3>
      <div className="ptiles">
        {p.animaciones.map((a) => (
          <button key={a.id} className={`ptile${a.id === p.actualId ? " on" : ""}`} onClick={() => p.onElegir(a.id)}>
            <DibujoDeFrame img={img} frame={a.frames[0]} tamanio={72} />
            <span className="pn">{a.nombre}</span>
            <span className="pm">
              {a.cantidadDeFrames} {a.cantidadDeFrames === 1 ? "frame" : "frames"}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
