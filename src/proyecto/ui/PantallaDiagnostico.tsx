"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { Cargando } from "@/compartido/ui/componentes";
import type { RevisionDelMundo } from "../aplicacion/RevisarMundo";

/**
 * El estado de salud de todo el mundo junto.
 *
 * Cada pantalla ya marca sus propios problemas, pero sólo los de lo que estás mirando. Acá se ven
 * todos, ordenados por gravedad, y aparecen los cruzados que ningún módulo puede detectar solo.
 */
export function PantallaDiagnostico() {
  const { casos, intentar } = useAplicacion();
  const [revision, setRevision] = useState<RevisionDelMundo | null>(null);
  const [revisando, setRevisando] = useState(false);

  const revisar = useCallback(async () => {
    setRevisando(true);
    const r = await intentar(() => casos.proyecto.revisar.ejecutar());
    setRevisando(false);
    if (r) setRevision(r);
  }, [casos, intentar]);

  useEffect(() => {
    void revisar();
  }, [revisar]);

  if (!revision) return <Cargando bloque>Revisando el mundo…</Cargando>;

  const sano = !revision.errores && !revision.avisos;

  return (
    <main className="layout">
      <div className="col">
        <section className="panel">
          <div className="row between">
            <h2>Diagnóstico</h2>
            <button onClick={revisar} disabled={revisando}>
              {revisando ? "Revisando…" : "Revisar de nuevo"}
            </button>
          </div>
          <div className="row">
            <span className={`pill ${revision.errores ? "bad" : "ok"}`}>{plural(revision.errores, "error", "errores")}</span>
            <span className={`pill ${revision.avisos ? "warn" : "ok"}`}>{plural(revision.avisos, "aviso", "avisos")}</span>
            <span className="status">{plural(revision.revisadas, "cosa revisada", "cosas revisadas")}</span>
          </div>
          <p className="hint">
            Un <b>error</b> rompe la exportación o deja algo sin dibujar del otro lado: un ID repetido, un vínculo gráfico roto, un pergamino que
            apunta a un hechizo que no existe, un traslado a un mapa que no está en el proyecto. Un <b>aviso</b> es algo a medio terminar que el juego
            igual puede leer.
          </p>
          <p className="hint">
            De los mapas se revisan los que guardaste en el proyecto; los que abrís desde la carpeta del juego viven en memoria y no entran.
          </p>
        </section>

        <section className="panel">
          <h3>Por familia</h3>
          <div className="olist-items">
            {revision.familias.map((f) => (
              <Link key={f.familia} href={f.href} className="fr" style={{ gridTemplateColumns: "minmax(0, 1fr) auto auto auto", textDecoration: "none" }}>
                <span className="nm">{f.familia}</span>
                <span className="status">{f.revisadas}</span>
                <span className={`pill ${f.errores ? "bad" : "ok"}`}>{f.errores}</span>
                <span className={`pill ${f.avisos ? "warn" : "ok"}`}>{f.avisos}</span>
              </Link>
            ))}
          </div>
          <p className="hint">Las columnas son: cuántas se revisaron, cuántos errores y cuántos avisos. Tocá una familia para ir a su pantalla.</p>
        </section>
      </div>

      <aside className="side">
        <section className="panel">
          <h2>{sano ? "Todo en orden" : `Qué revisar (${revision.items.length})`}</h2>
          {sano ? (
            <p className="hint">No hay nada roto ni a medio terminar. Buen momento para exportar.</p>
          ) : (
            <div className="olist-items">
              {revision.items.map((item) => (
                <Link key={`${item.familia}-${item.etiqueta}`} href={item.href} className="oitem" style={{ gridTemplateColumns: "minmax(0, 1fr)", textDecoration: "none" }}>
                  <span style={{ minWidth: 0 }}>
                    <span className="nm">{item.etiqueta}</span>
                    <span className="meta">
                      {item.familia}
                      {item.problemas.map((p) => (
                        <span key={p.mensaje} className={`pill ${p.gravedad === "error" ? "bad" : "warn"}`}>
                          {p.mensaje}
                        </span>
                      ))}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </aside>
    </main>
  );
}

/** "1 error" y no "1 errores": el resumen es lo primero que se lee. */
function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
