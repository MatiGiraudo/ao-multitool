"use client";
import { useEffect, useMemo, useState } from "react";
import type { Problema } from "@/compartido/dominio/Problema";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivo, BotonConfirmar, CampoNumero, Cargando } from "@/compartido/ui/componentes";
import { copiar, descargar, useImagen } from "@/compartido/ui/utilidades";
import { DibujoDeFrame } from "@/graficos/ui/DibujoDeFrame";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { RanuraGrafica } from "@/graficos/ui/RanuraGrafica";
import type { Efecto } from "../dominio/Efecto";
import { ValidadorDeEfectos } from "../dominio/servicios";
import { useEfectos } from "./ProveedorDeEfectos";
import { VistaPreviaDeEfecto } from "./VistaPreviaDeEfecto";

/** Pantalla de FX: lista | ficha | vista previa y JSON. */
export function EditorDeEfectos() {
  const { avisar } = useAplicacion();
  const s = useEfectos();
  const [clave, setClave] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [json, setJson] = useState("");
  const [importTxt, setImportTxt] = useState("");

  const efecto = s.efectos.find((e) => e.clave === clave) ?? s.efectos[0];

  // El JSON se recalcula con el mismo caso de uso que la descarga, con una pequeña demora al editar.
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await s.exportar();
      if (r) setJson(r.contenido);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.efectos, s.catalogo]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return [...s.efectos].filter((e) => !q || e.nombre.toLowerCase().includes(q) || String(e.numero) === q).sort((a, b) => a.numero - b.numero);
  }, [s.efectos, busqueda]);

  if (s.cargando) return <Cargando bloque>Cargando efectos…</Cargando>;

  const nuevo = async () => {
    const e = await s.crear();
    if (e) {
      setBusqueda("");
      setClave(e.clave);
      setTimeout(() => (document.getElementById("fx_nombre") as HTMLInputElement | null)?.select(), 50);
    }
  };

  return (
    <main className="olayout">
      <section className="panel">
        <div className="row between">
          <h2>Efectos ({s.efectos.length})</h2>
          <button className="primary" onClick={nuevo}>
            + Nuevo
          </button>
        </div>
        <input type="search" placeholder="Buscar nombre o ID" aria-label="Buscar efectos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <div className="olist-items">
          {!lista.length && <div className="empty">{s.efectos.length ? "Ningún efecto coincide con la búsqueda." : "Todavía no hay efectos. Tocá «+ Nuevo» para crear el primero."}</div>}
          {lista.map((e) => (
            <ItemDeLista key={e.clave} efecto={e} activo={e.clave === efecto?.clave} problemas={ValidadorDeEfectos.problemas(e, s.efectos, s.catalogo)} onClick={() => setClave(e.clave)} />
          ))}
        </div>
      </section>

      <section className="panel">
        {efecto ? (
          <Ficha key={efecto.clave} efecto={efecto} onBorrado={() => setClave(null)} onDuplicado={(c) => setClave(c)} />
        ) : (
          <>
            <h2>Ficha</h2>
            <div className="empty">Elegí un efecto de la lista o creá uno nuevo con «+ Nuevo».</div>
          </>
        )}
      </section>

      <aside className="side">
        {efecto && <VistaPreviaDeEfecto efecto={efecto} />}
        <section className="panel">
          <div className="row between">
            <h2>fx.json</h2>
            <div className="row">
              <button onClick={async () => avisar((await copiar(json)) ? "JSON de efectos copiado." : "No se pudo copiar.")}>Copiar</button>
              <button
                className="primary"
                onClick={async () => {
                  const r = await s.exportar();
                  if (r) descargar(r.nombreArchivo, r.contenido);
                }}
              >
                Descargar
              </button>
            </div>
          </div>
          <textarea className="json" readOnly spellCheck={false} value={json} aria-label="JSON de efectos" />
          <p className="hint">Cada efecto referencia su animación por hoja y nombre, igual que los objetos.</p>
          <details>
            <summary>Importar efectos</summary>
            <div className="col">
              <textarea id="importFx" className="json corto" spellCheck={false} placeholder="Pegá un fx.json. Los efectos con el mismo ID se reemplazan." value={importTxt} onChange={(e) => setImportTxt(e.target.value)} />
              <div className="row">
                <button onClick={() => importar(importTxt).then((ok) => ok && setImportTxt(""))}>Importar</button>
                <BotonArchivo accept=".json,application/json" onArchivo={async (f) => importar(await f.text())}>
                  Desde archivo…
                </BotonArchivo>
              </div>
            </div>
          </details>
        </section>
      </aside>
    </main>
  );

  async function importar(texto: string) {
    const r = await s.importar(texto);
    if (!r) return false;
    avisar(`Efectos: ${r.agregados} nuevos, ${r.reemplazados} reemplazados.${r.pendientes ? ` ${r.pendientes} con la animación sin encontrar: cargá esas hojas y se vinculan solos.` : ""}`);
    return true;
  }
}

function ItemDeLista({ efecto, activo, problemas, onClick }: { efecto: Efecto; activo: boolean; problemas: Problema[]; onClick(): void }) {
  const { resolver } = useEfectos();
  const graficos = useGraficos();
  const r = resolver(efecto.animacion);
  const img = useImagen(graficos.urlImagen(r?.hoja));
  const p = problemas[0];
  return (
    <button className={`oitem${activo ? " on" : ""}`} aria-pressed={activo} onClick={onClick}>
      <DibujoDeFrame img={img} frame={r?.animacion.frames[0]} tamanio={36} />
      <span style={{ minWidth: 0 }}>
        <span className="nm">{efecto.nombre || "(sin nombre)"}</span>
        <span className="meta">
          #{efecto.numero} · {efecto.enBucle ? "en bucle" : `${efecto.repeticiones}×`}
          <span className={`pill ${p ? (p.gravedad === "error" ? "bad" : "warn") : "ok"}`} title={problemas.map((x) => x.mensaje).join(" · ")}>
            {p ? p.mensaje : "Listo"}
          </span>
        </span>
      </span>
    </button>
  );
}

function Ficha({ efecto: e, onBorrado, onDuplicado }: { efecto: Efecto; onBorrado(): void; onDuplicado(clave: string): void }) {
  const { avisar } = useAplicacion();
  const s = useEfectos();
  const graficos = useGraficos();
  const r = s.resolver(e.animacion);
  const img = useImagen(graficos.urlImagen(r?.hoja));

  const cambiar = (fn: () => Efecto) => {
    try {
      s.actualizar(fn());
    } catch (err) {
      avisar(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <div className="ohead">
        <DibujoDeFrame img={img} frame={r?.animacion.frames[0]} tamanio={56} />
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="tag">#{e.numero}</span>
            <span className="status">{r ? `${r.hoja.nombreArchivo} › ${r.animacion.nombre}` : "sin animación"}</span>
          </div>
          <div className="oname">{e.nombre || "(sin nombre)"}</div>
        </div>
        <div className="row">
          <button
            onClick={async () => {
              const d = await s.duplicar(e);
              if (d) {
                onDuplicado(d.clave);
                avisar(`Efecto duplicado con ID ${d.numero}.`);
              }
            }}
          >
            Duplicar
          </button>
          <BotonConfirmar
            confirmacion="¿Borrar?"
            onConfirmar={async () => {
              if (await s.eliminar(e.clave)) {
                onBorrado();
                avisar("Efecto borrado.");
              }
            }}
          >
            Borrar
          </BotonConfirmar>
        </div>
      </div>

      <h3>Datos</h3>
      <div className="form-grid">
        <label className="f" htmlFor="fx_nombre">
          Nombre
          <input id="fx_nombre" type="text" value={e.nombre} maxLength={80} onChange={(ev) => cambiar(() => e.renombrado(ev.target.value))} />
        </label>
        <CampoNumero id="fx_numero" etiqueta="ID" valor={e.numero} min={1} ancho={90} onCambio={(v) => v !== null && cambiar(() => e.conNumero(v))} />
        <CampoNumero
          id="fx_loops"
          etiqueta="Repeticiones"
          valor={e.repeticiones}
          min={0}
          max={999}
          ancho={90}
          onCambio={(v) => v !== null && cambiar(() => e.conRepeticiones(v))}
        />
      </div>

      <h3>Animación</h3>
      <RanuraGrafica
        id="fx_anim"
        etiqueta="Animación del efecto"
        tituloSelector="Animación del efecto"
        vacio="Sin vincular"
        referencia={e.animacion}
        conFrame={false}
        onCambiar={(ref) => cambiar(() => e.conAnimacion(ref))}
      />

      <h3>Corrimiento</h3>
      <div className="form-grid">
        <CampoNumero id="fx_ox" etiqueta="Offset X" valor={e.offsetX} min={-4096} max={4096} ancho={90} onCambio={(v) => cambiar(() => e.conOffset(v ?? 0, e.offsetY))} />
        <CampoNumero id="fx_oy" etiqueta="Offset Y" valor={e.offsetY} min={-4096} max={4096} ancho={90} onCambio={(v) => cambiar(() => e.conOffset(e.offsetX, v ?? 0))} />
        <div className="row" role="group" aria-label="Mover el efecto">
          <button aria-label="Mover a la izquierda" onClick={() => cambiar(() => e.conOffset(e.offsetX - 1, e.offsetY))}>
            ←
          </button>
          <button aria-label="Mover arriba" onClick={() => cambiar(() => e.conOffset(e.offsetX, e.offsetY - 1))}>
            ↑
          </button>
          <button aria-label="Mover abajo" onClick={() => cambiar(() => e.conOffset(e.offsetX, e.offsetY + 1))}>
            ↓
          </button>
          <button aria-label="Mover a la derecha" onClick={() => cambiar(() => e.conOffset(e.offsetX + 1, e.offsetY))}>
            →
          </button>
          <button onClick={() => cambiar(() => e.conOffset(0, 0))}>Centrar</button>
        </div>
      </div>
      <p className="hint">
        El corrimiento se mide desde donde se apoya el sprite (la cruz de la vista previa). Negativo es arriba y a la izquierda; 0 repeticiones es «en bucle».
      </p>
    </>
  );
}
