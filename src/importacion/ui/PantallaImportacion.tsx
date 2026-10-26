"use client";
import { useCallback, useEffect, useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivo } from "@/compartido/ui/componentes";
import type { ResultadoDeImportacionDeHechizos } from "@/hechizos/aplicacion/casosDeUso";
import type { ResultadoDeObjetosClasicos, ResultadoDeTablaDeGrh } from "../aplicacion/casosDeUso";
import { textoDeArchivoClasico } from "../infraestructura/navegador/textoDeArchivoClasico";

/**
 * Traer lo que ya existe en los archivos del AO original.
 *
 * Son dos pasos, y el orden importa: primero el `Graficos.ini`, que arma la tabla de GRH, y después
 * los archivos de datos, que la usan para traducir sus números de gráfico a hojas y animaciones.
 */
export function PantallaImportacion() {
  const { casos, avisar, intentar } = useAplicacion();
  const [tabla, setTabla] = useState<ResultadoDeTablaDeGrh | null>(null);
  const [objetos, setObjetos] = useState<ResultadoDeObjetosClasicos | null>(null);
  const [hechizos, setHechizos] = useState<ResultadoDeImportacionDeHechizos | null>(null);
  const [ocupado, setOcupado] = useState("");

  const refrescarEstado = useCallback(async () => {
    const r = await intentar(() => casos.clasico.tablaDeGrh.estado());
    setTabla(r ?? null);
  }, [casos, intentar]);

  useEffect(() => {
    void refrescarEstado();
  }, [refrescarEstado]);

  const importarGraficos = async (archivo: File) => {
    setOcupado("graficos");
    const r = await intentar(async () => casos.clasico.tablaDeGrh.ejecutar(await textoDeArchivoClasico(archivo)));
    setOcupado("");
    if (!r) return;
    setTabla(r);
    avisar(`Tabla de GRH lista: ${r.grhs.toLocaleString("es-AR")} gráficos de ${r.archivos.length} archivos.`);
  };

  const importarObjetos = async (archivo: File) => {
    setOcupado("objetos");
    const r = await intentar(async () => casos.clasico.objetos.ejecutar(await textoDeArchivoClasico(archivo)));
    setOcupado("");
    if (!r) return;
    setObjetos(r);
    avisar(`Objetos: ${r.objetos.agregados} nuevos, ${r.objetos.reemplazados} reemplazados.`);
  };

  const importarHechizos = async (archivo: File) => {
    setOcupado("hechizos");
    const r = await intentar(async () => casos.clasico.hechizos.ejecutar(await textoDeArchivoClasico(archivo)));
    setOcupado("");
    if (!r) return;
    setHechizos(r);
    avisar(`Hechizos: ${r.agregados} nuevos, ${r.reemplazados} reemplazados.`);
  };

  return (
    <main className="layout">
      <div className="col">
        <section className="panel">
          <h2>Paso 1 · Graficos.ini</h2>
          <p className="hint">
            En el AO original los gráficos se referencian por número de GRH. Este archivo dice qué recorte de qué imagen es cada número, y es lo que
            permite que lo demás se vincule solo. Se guarda en <code>data/importacion/grh.json</code>, así que se hace una vez.
          </p>
          <div className="row">
            <BotonArchivo accept=".ini,.txt,text/plain" onArchivo={importarGraficos} className="primary">
              {ocupado === "graficos" ? "Leyendo…" : "Elegir Graficos.ini…"}
            </BotonArchivo>
            {tabla && <span className="status">{tabla.grhs.toLocaleString("es-AR")} GRH leídos</span>}
          </div>

          {tabla && (
            <>
              <div className="row">
                <span className={`pill ${tabla.cargados.length ? "ok" : "warn"}`}>{tabla.cargados.length} hojas cargadas</span>
                {!!tabla.faltantes.length && <span className="pill warn">{tabla.faltantes.length} sin cargar</span>}
              </div>
              {!!tabla.faltantes.length && (
                <details>
                  <summary>Qué imágenes faltan</summary>
                  <p className="hint">
                    Son los archivos que menciona el Graficos.ini y todavía no cargaste como hoja. Cargá los que te interesen desde
                    «Animaciones» (con el mismo nombre de archivo, por ejemplo <code>{tabla.faltantes[0]}.png</code>) y volvé a importar: lo que
                    falte se vincula entonces.
                  </p>
                  <p className="json corto" style={{ overflow: "auto", maxHeight: 140 }}>
                    {tabla.faltantes.join(", ")}
                  </p>
                </details>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <h2>Paso 2 · OBJ.dat</h2>
          <p className="hint">
            Trae todos los objetos con su nombre, tipo, valor, banderas y atributos. Para cada icono crea la animación que haga falta en la hoja que
            corresponda (la llama <code>grh505</code> y demás) y la vincula. Los objetos con el mismo ID se reemplazan.
          </p>
          <div className="row">
            <BotonArchivo accept=".dat,.txt,text/plain" onArchivo={importarObjetos} className="primary">
              {ocupado === "objetos" ? "Importando…" : "Elegir OBJ.dat…"}
            </BotonArchivo>
            {!tabla && <span className="hint">Sin el paso 1 se importan los datos, pero sin iconos.</span>}
          </div>

          {objetos && (
            <>
              <div className="row">
                <span className="pill ok">{objetos.objetos.agregados} nuevos</span>
                <span className="pill ok">{objetos.objetos.reemplazados} reemplazados</span>
                <span className={`pill ${objetos.animacionesCreadas ? "ok" : "warn"}`}>{objetos.animacionesCreadas} animaciones creadas</span>
                {!!objetos.hojasFaltantes.length && <span className="pill warn">{objetos.hojasFaltantes.length} hojas sin cargar</span>}
                {!!objetos.grhSinResolver.length && <span className="pill bad">{objetos.grhSinResolver.length} GRH desconocidos</span>}
              </div>
              {!!objetos.hojasFaltantes.length && (
                <p className="hint">
                  Los iconos que faltan salen de estas imágenes: {objetos.hojasFaltantes.slice(0, 40).join(", ")}
                  {objetos.hojasFaltantes.length > 40 ? "…" : ""}. Cargalas y volvé a importar el OBJ.dat.
                </p>
              )}
              {!!objetos.grhSinResolver.length && (
                <p className="hint aviso">
                  Estos GRH no están en la tabla: {objetos.grhSinResolver.slice(0, 20).join(", ")}
                  {objetos.grhSinResolver.length > 20 ? "…" : ""}. Suele querer decir que el Graficos.ini es de otra versión que el OBJ.dat.
                </p>
              )}
            </>
          )}
        </section>
        <section className="panel">
          <h2>Paso 3 · Hechizos.dat</h2>
          <p className="hint">
            Trae los hechizos con sus palabras mágicas, su costo y su efecto. En el clásico el efecto son banderas sueltas
            (<code>Paraliza=1</code>, <code>SubeHP=2</code>…): acá se traducen al tipo que usa la ficha. El FX se apunta por número, así que no
            necesita el paso 1.
          </p>
          <div className="row">
            <BotonArchivo accept=".dat,.txt,text/plain" onArchivo={importarHechizos} className="primary">
              {ocupado === "hechizos" ? "Importando…" : "Elegir Hechizos.dat…"}
            </BotonArchivo>
          </div>
          {hechizos && (
            <div className="row">
              <span className="pill ok">{hechizos.agregados} nuevos</span>
              <span className="pill ok">{hechizos.reemplazados} reemplazados</span>
            </div>
          )}
        </section>
      </div>

      <aside className="side">
        <section className="panel">
          <h2>Cómo sigue</h2>
          <p className="hint">
            Importar es incremental: podés hacer el paso 1, cargar algunas imágenes, volver a importar el OBJ.dat y vincular más iconos. Nada se
            duplica — los objetos con el mismo ID se reemplazan y las animaciones ya creadas se reusan.
          </p>
          <h3>Lo que todavía no trae</h3>
          <p className="hint">
            De los objetos, los gráficos de equipado (el arma en la mano, el casco en la cabeza): en el clásico viven en sus propios índices y
            todavía no los leemos. Tampoco NPCs.dat, porque ese módulo no existe en el editor. Los cuerpos y las cabezas vienen en archivos
            binarios (<code>.ind</code>), que necesitan un lector aparte.
          </p>
        </section>
      </aside>
    </main>
  );
}
