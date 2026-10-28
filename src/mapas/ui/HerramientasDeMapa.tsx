"use client";
import { memo, useEffect, useRef } from "react";
import { CampoNumero } from "@/compartido/ui/componentes";
import type { RecorteDeGrh } from "../aplicacion/casosDeUso";
import { NOMBRES, usaTamanio, type Ajustes, type Herramienta } from "../dominio/herramientas";
import { TRIGGERS } from "../dominio/triggers";
import { CELDA, dibujarGrh } from "./dibujo";

/*
 * La barra de herramientas y la paleta.
 *
 * La paleta no es la grilla de miles de gráficos del juego: es la lista de los que ya usa este
 * mapa. Editando se pinta casi siempre con algo que ya está puesto —el mismo pasto, la misma
 * pared— y para traer uno nuevo están el número a mano y el cuentagotas.
 */

const ORDEN: Herramienta[] = ["pincel", "rectangulo", "balde", "goma", "bloquear", "desbloquear", "trigger", "traslado", "cuentagotas"];

/** La misma letra que escucha la pantalla, para que el botón la pueda mostrar. */
export const ATAJOS: Record<Herramienta, string> = {
  pincel: "b",
  rectangulo: "r",
  balde: "f",
  goma: "e",
  bloquear: "x",
  desbloquear: "d",
  trigger: "t",
  traslado: "p",
  cuentagotas: "i",
};

const TAMANIOS = [1, 3, 5, 7];

export function BarraDeEdicion({
  ajustes,
  onAjustes,
  puedeDeshacer,
  puedeRehacer,
  onDeshacer,
  onRehacer,
  ultimo,
}: {
  ajustes: Ajustes;
  onAjustes: (cambios: Partial<Ajustes>) => void;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  onDeshacer: () => void;
  onRehacer: () => void;
  ultimo: string | null;
}) {
  const conTamanio = usaTamanio(ajustes.herramienta);
  const destino = ajustes.traslado;
  return (
    <div className="mapa-barra">
      <div className="seg">
        {ORDEN.map((h) => (
          <button
            key={h}
            className={ajustes.herramienta === h ? "on" : ""}
            onClick={() => onAjustes({ herramienta: h })}
            title={`${NOMBRES[h]} (${ATAJOS[h].toUpperCase()})`}
          >
            {NOMBRES[h]}
          </button>
        ))}
      </div>

      <div className="seg" title="En qué capa se pinta (1 es el piso)">
        {[1, 2, 3, 4].map((capa) => (
          <button key={capa} className={ajustes.capa === capa ? "on" : ""} onClick={() => onAjustes({ capa })}>
            {capa}
          </button>
        ))}
      </div>

      {ajustes.herramienta === "trigger" && (
        <label className="f" title="El servidor los interpreta por número; la lista son los que conoce el AO clásico">
          Trigger
          <select
            id="mapa_trigger"
            value={TRIGGERS.some((x) => x.valor === ajustes.trigger) ? ajustes.trigger : "otro"}
            onChange={(e) => e.target.value !== "otro" && onAjustes({ trigger: Number(e.target.value) })}
          >
            {TRIGGERS.map((x) => (
              <option key={x.valor} value={x.valor} title={x.que}>
                {x.valor} · {x.nombre}
              </option>
            ))}
            <option value="otro">otro…</option>
          </select>
        </label>
      )}

      {ajustes.herramienta === "trigger" && (
        <CampoNumero id="mapa_trigger_n" etiqueta="N°" valor={ajustes.trigger} min={0} max={65535} ancho={70} onCambio={(v) => onAjustes({ trigger: v ?? 0 })} />
      )}

      {ajustes.herramienta === "traslado" && (
        <>
          <CampoNumero
            id="mapa_tr_mapa"
            etiqueta="Al mapa"
            valor={destino?.mapa ?? ""}
            min={1}
            ancho={70}
            onCambio={(v) => onAjustes({ traslado: v === null ? null : { mapa: v, x: destino?.x ?? 50, y: destino?.y ?? 50 } })}
          />
          <CampoNumero
            id="mapa_tr_x"
            etiqueta="X"
            valor={destino?.x ?? ""}
            min={1}
            max={100}
            ancho={60}
            onCambio={(v) => destino && v !== null && onAjustes({ traslado: { ...destino, x: v } })}
          />
          <CampoNumero
            id="mapa_tr_y"
            etiqueta="Y"
            valor={destino?.y ?? ""}
            min={1}
            max={100}
            ancho={60}
            onCambio={(v) => destino && v !== null && onAjustes({ traslado: { ...destino, y: v } })}
          />
          <button className={destino ? "" : "on"} title="Clic en una celda le saca el traslado que tenga" onClick={() => onAjustes({ traslado: destino ? null : { mapa: 1, x: 50, y: 50 } })}>
            {destino ? "Sacar traslado" : "Sacando"}
          </button>
        </>
      )}

      {conTamanio && (
        <div className="seg" title="Tamaño del pincel">
          {TAMANIOS.map((t) => (
            <button key={t} className={ajustes.tamanio === t ? "on" : ""} onClick={() => onAjustes({ tamanio: t })}>
              {t}×{t}
            </button>
          ))}
        </div>
      )}

      <div className="seg">
        <button onClick={onDeshacer} disabled={!puedeDeshacer} title={ultimo ? `Deshacer ${ultimo.toLowerCase()} (ctrl+Z)` : "Deshacer (ctrl+Z)"}>
          ↶ Deshacer
        </button>
        <button onClick={onRehacer} disabled={!puedeRehacer} title="Rehacer (ctrl+Y)">
          ↷
        </button>
      </div>
    </div>
  );
}

/* Va con `memo` porque son cientos de miniaturas y el mapa avisa de cada pincelada: sin esto,
 * React recorrería la paleta entera cada vez que se suelta el mouse. */
export const PaletaDeGraficos = memo(function PaletaDeGraficos({
  usados,
  grh,
  onGrh,
  graficos,
  imagenes,
}: {
  usados: number[];
  grh: number;
  onGrh: (grh: number) => void;
  graficos: Map<number, RecorteDeGrh>;
  imagenes: Map<string, CanvasImageSource>;
}) {
  return (
    <>
      <div className="row mapa-pincel">
        <MiniaturaDeGrh grh={grh} graficos={graficos} imagenes={imagenes} grande />
        <CampoNumero id="grh_pincel" etiqueta="Gráfico" valor={grh || ""} min={0} ancho={90} onCambio={(v) => onGrh(v ?? 0)} />
      </div>
      <p className="hint">
        Con el cuentagotas (<kbd>I</kbd>) tomás el gráfico de una celda del mapa.
      </p>
      <div className="mapa-paleta">
        {usados.map((n) => (
          <button key={n} className={n === grh ? "on" : ""} onClick={() => onGrh(n)} title={`grh ${n}`}>
            <MiniaturaDeGrh grh={n} graficos={graficos} imagenes={imagenes} />
          </button>
        ))}
      </div>
      {!usados.length && <p className="hint">El mapa está vacío: escribí un número de gráfico para empezar a pintar.</p>}
    </>
  );
});

/** Un gráfico suelto, dibujado con la misma cuenta que el mapa para que se vea igual. */
function MiniaturaDeGrh({
  grh,
  graficos,
  imagenes,
  grande,
}: {
  grh: number;
  graficos: Map<number, RecorteDeGrh>;
  imagenes: Map<string, CanvasImageSource>;
  grande?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CELDA, CELDA);
    ctx.imageSmoothingEnabled = false;
    if (grh) dibujarGrh(ctx, grh, 0, 0, 0, graficos, imagenes);
  }, [grh, graficos, imagenes]);
  return <canvas ref={canvas} width={CELDA} height={CELDA} className={grande ? "grande" : ""} aria-label={`grh ${grh}`} />;
}
