"use client";
import { BotonConfirmar } from "@/compartido/ui/componentes";
import type { ImagenDibujable } from "@/compartido/ui/negroTransparente";
import type { Animacion } from "../dominio/Animacion";
import type { Frame } from "../dominio/Frame";
import { DibujoDeFrame } from "./DibujoDeFrame";

interface Props {
  animacion: Animacion | undefined;
  img: ImagenDibujable | null;
  seleccion: ReadonlySet<number>;
  frameActual: number;
  vacioTexto: string;
  onCambiar(a: Animacion): void;
  onClicFrame(i: number, e: React.MouseEvent): void;
  onSeleccion(sel: Set<number>): void;
  onError(msg: string): void;
}

const CAMPOS = [
  ["x", "x"],
  ["y", "y"],
  ["ancho", "w"],
  ["alto", "h"],
] as const;

export function ListaDeFrames(p: Props) {
  const a = p.animacion;
  const cambiarFrame = (i: number, f: Frame) => p.onCambiar(a!.conFrameReemplazado(i, f));
  const intentar = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      p.onError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="panel">
      <div className="row between">
        <h2>Frames {a ? `(${a.cantidadDeFrames})` : ""}</h2>
        <div className="row">
          <button disabled={!a?.cantidadDeFrames} onClick={() => intentar(() => p.onCambiar(a!.invertida()))} title="Invertir el orden">
            Invertir
          </button>
          <button disabled={!a} onClick={() => intentar(() => p.onCambiar(a!.conIdaYVuelta()))} title="Agrega los frames en reversa">
            Ida y vuelta
          </button>
          <BotonConfirmar disabled={!a?.cantidadDeFrames} onConfirmar={() => p.onCambiar(a!.vaciada())}>
            Vaciar
          </BotonConfirmar>
        </div>
      </div>
      <div className="frames">
        {!a || !a.cantidadDeFrames ? (
          <div className="empty">{p.vacioTexto}</div>
        ) : (
          a.frames.map((f, i) => (
            <div
              key={i}
              className={`fr${p.seleccion.has(i) ? " sel" : ""}${p.frameActual === i ? " playing" : ""}`}
              onClick={(e) => p.onClicFrame(i, e)}
            >
              <span className="idx">{i + 1}</span>
              <DibujoDeFrame img={p.img} frame={f} tamanio={40} />
              <div className="nums" onClick={(e) => e.stopPropagation()}>
                {CAMPOS.map(([k, ph]) => (
                  <input
                    key={k}
                    id={`f${i}${k}`}
                    type="number"
                    title={k}
                    aria-label={`${k} del frame ${i + 1}`}
                    placeholder={ph}
                    min={k === "ancho" || k === "alto" ? 1 : 0}
                    value={f.rect[k]}
                    onFocus={() => !p.seleccion.has(i) && p.onSeleccion(new Set([i]))}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) intentar(() => cambiarFrame(i, f.conRect(f.rect.con({ [k]: v }))));
                    }}
                  />
                ))}
                <input
                  id={`f${i}ms`}
                  type="number"
                  min={1}
                  title="Duración propia de este frame (vacío = la de la animación)"
                  aria-label={`Duración del frame ${i + 1}`}
                  placeholder={String(a.msPorFrame)}
                  value={f.duracionMs ?? ""}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    intentar(() => cambiarFrame(i, f.conDuracion(Number.isNaN(v) || v <= 0 ? null : v)));
                  }}
                />
              </div>
              <div className="acts" onClick={(e) => e.stopPropagation()}>
                <button title="Subir" aria-label="Subir" onClick={() => p.onCambiar(a.conFrameMovido(i, -1))}>
                  ↑
                </button>
                <button title="Bajar" aria-label="Bajar" onClick={() => p.onCambiar(a.conFrameMovido(i, 1))}>
                  ↓
                </button>
                <button title="Duplicar" aria-label="Duplicar" onClick={() => p.onCambiar(a.conFrameDuplicado(i))}>
                  ⧉
                </button>
                <button className="danger" title="Quitar" aria-label="Quitar" onClick={() => p.onCambiar(a.sinFrames([i]))}>
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="hint">
        Flechas <kbd>←↑↓→</kbd> mueven los frames seleccionados (con <kbd>Shift</kbd>, de a 8 px). <kbd>Ctrl</kbd>+clic o <kbd>Shift</kbd>+clic
        en la lista para elegir varios, <kbd>Ctrl</kbd>+<kbd>A</kbd> todos, <kbd>Esc</kbd> ninguno, <kbd>Supr</kbd> borra. Modos: <kbd>G</kbd>{" "}
        grilla, <kbd>R</kbd> recuadro, <kbd>V</kbd> mover. <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshace y <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>{" "}
        rehace; la rueda sobre la hoja hace zoom.
      </p>
    </section>
  );
}
