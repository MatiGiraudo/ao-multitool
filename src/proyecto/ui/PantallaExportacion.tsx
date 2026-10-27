"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { Cargando } from "@/compartido/ui/componentes";
import { descargar } from "@/compartido/ui/utilidades";
import type { ArchivoExportado, ResultadoDeGuardado } from "../aplicacion/ExportarTodo";

/**
 * Todo el mundo exportado de una vez: los cinco catálogos y un `.anim.json` por hoja con
 * animaciones. Es lo que el lado de Unity quiere leer, junto y en una sola carpeta.
 */
export function PantallaExportacion() {
  const { casos, avisar, intentar } = useAplicacion();
  const [archivos, setArchivos] = useState<ArchivoExportado[] | null>(null);
  const [guardado, setGuardado] = useState<ResultadoDeGuardado | null>(null);
  const [guardando, setGuardando] = useState(false);

  const armar = useCallback(async () => {
    const r = await intentar(() => casos.proyecto.exportarTodo.ejecutar());
    if (r) setArchivos(r);
  }, [casos, intentar]);

  useEffect(() => {
    void armar();
  }, [armar]);

  const guardar = async () => {
    if (!archivos) return;
    setGuardando(true);
    const r = await intentar(() => casos.proyecto.guardarExportacion.ejecutar(archivos), "Guardando la exportación");
    setGuardando(false);
    if (!r) return;
    setGuardado(r);
    avisar(`${r.escritos} archivos escritos en ${r.carpeta}.`);
  };

  const total = archivos?.reduce((n, a) => n + a.contenido.length, 0) ?? 0;
  const catalogos = archivos?.filter((a) => !a.nombreArchivo.endsWith(".anim.json")) ?? [];
  const animaciones = archivos?.filter((a) => a.nombreArchivo.endsWith(".anim.json")) ?? [];

  return (
    <main className="layout">
      <div className="col">
        <section className="panel">
          <div className="row between">
            <h2>Exportar todo</h2>
            {archivos && (
              <span className="status">
                {archivos.length} archivos · {pesar(total)}
              </span>
            )}
          </div>
          <p className="hint">
            Arma los cinco catálogos del mundo y un <code>.anim.json</code> por cada hoja que tenga animaciones. Se puede guardar la carpeta entera
            de una vez, que es lo práctico cuando son cientos, o bajar un archivo suelto para mirarlo.
          </p>

          {!archivos ? (
            <Cargando bloque>Armando la exportación…</Cargando>
          ) : (
            <>
              <div className="row">
                <button className="primary" onClick={guardar} disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar en data/exportado"}
                </button>
                <button onClick={armar}>Volver a armar</button>
              </div>
              {guardado && (
                <p className="hint">
                  Última vez: {guardado.escritos} archivos en <code>{guardado.carpeta}</code>.
                </p>
              )}
            </>
          )}
        </section>

        {archivos && (
          <section className="panel">
            <h3>Catálogos ({catalogos.length})</h3>
            <ListaDeArchivos archivos={catalogos} />
            <h3>Animaciones ({animaciones.length})</h3>
            {animaciones.length ? (
              <ListaDeArchivos archivos={animaciones} limite={40} />
            ) : (
              <p className="hint">Ninguna hoja tiene animaciones todavía. Marcá frames en «Animaciones» o importá los gráficos del clásico.</p>
            )}
          </section>
        )}
      </div>

      <aside className="side">
        <section className="panel">
          <h2>Qué sale de acá</h2>
          <p className="hint">
            Los mismos archivos que bajás desde cada pantalla, con los mismos nombres y el mismo contenido: <code>objetos.json</code>,{" "}
            <code>fx.json</code>, <code>cuerpos.json</code>, <code>cabezas.json</code>, <code>hechizos.json</code> y un{" "}
            <code>&lt;hoja&gt;.anim.json</code> por hoja. Exportar de a uno y exportar todo pasan por el mismo caso de uso de cada módulo, así que
            no pueden quedar distintos.
          </p>
          <h3>Antes de exportar</h3>
          <p className="hint">
            Pasá por <Link href="/diagnostico">Diagnóstico</Link>: los vínculos rotos y los nombres de animación repetidos se exportan igual, y del otro
            lado aparecen como gráficos que no cargan.
          </p>
        </section>
      </aside>
    </main>
  );
}

function ListaDeArchivos({ archivos, limite }: { archivos: ArchivoExportado[]; limite?: number }) {
  const [verTodos, setVerTodos] = useState(false);
  const visibles = limite && !verTodos ? archivos.slice(0, limite) : archivos;
  return (
    <>
      <div className="olist-items">
        {visibles.map((a) => (
          <div key={a.nombreArchivo} className="fr" style={{ gridTemplateColumns: "minmax(0, 1fr) auto auto" }}>
            <span className="nm">{a.nombreArchivo}</span>
            <span className="status">{pesar(a.contenido.length)}</span>
            <button onClick={() => descargar(a.nombreArchivo, a.contenido)}>Bajar</button>
          </div>
        ))}
      </div>
      {limite && !verTodos && archivos.length > limite && (
        <button onClick={() => setVerTodos(true)}>Ver los {archivos.length}</button>
      )}
    </>
  );
}

/** El tamaño en texto. Es una cuenta de interfaz: el dominio no sabe de kilobytes. */
function pesar(caracteres: number): string {
  if (caracteres < 1024) return `${caracteres} B`;
  if (caracteres < 1024 * 1024) return `${Math.round(caracteres / 1024)} kB`;
  return `${(caracteres / 1024 / 1024).toFixed(1)} MB`;
}
