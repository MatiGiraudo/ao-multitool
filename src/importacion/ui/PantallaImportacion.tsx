"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivo, PuntosDeCarga } from "@/compartido/ui/componentes";
import { BotonCargarCarpeta } from "@/graficos/ui/BotonCargarCarpeta";
import type {
  ResultadoDeAparienciasClasicas,
  ResultadoDeEfectosClasicos,
  ResultadoDeHechizosClasicos,
  ResultadoDeObjetosClasicos,
  ResultadoDeTablaDeGrh,
  ResumenDeVinculos,
} from "../aplicacion/casosDeUso";
import { textoDeArchivoClasico } from "../infraestructura/navegador/textoDeArchivoClasico";

/**
 * Traer lo que ya existe en los archivos del AO original.
 *
 * El orden importa: primero el `Graficos.ini`, que arma la tabla de GRH, y después los archivos de
 * datos, que la usan para traducir sus números de gráfico a hojas y animaciones. Todos los pasos
 * del 2 en adelante son independientes entre sí y se pueden repetir: lo que no se pudo vincular
 * queda anotado, cargás esa imagen y volvés a importar.
 */
export function PantallaImportacion() {
  const { casos, avisar, intentar } = useAplicacion();
  const [tabla, setTabla] = useState<ResultadoDeTablaDeGrh | null>(null);
  const [cuerpos, setCuerpos] = useState<ResultadoDeAparienciasClasicas | null>(null);
  const [cabezas, setCabezas] = useState<ResultadoDeAparienciasClasicas | null>(null);
  const [fx, setFx] = useState<ResultadoDeEfectosClasicos | null>(null);
  const [objetos, setObjetos] = useState<ResultadoDeObjetosClasicos | null>(null);
  const [hechizos, setHechizos] = useState<ResultadoDeHechizosClasicos | null>(null);
  const [ocupado, setOcupado] = useState("");

  const refrescarEstado = useCallback(async () => {
    const r = await intentar(() => casos.clasico.tablaDeGrh.estado());
    setTabla(r ?? null);
  }, [casos, intentar]);

  useEffect(() => {
    void refrescarEstado();
  }, [refrescarEstado]);

  /** Todos los pasos hacen lo mismo: leer el archivo, importarlo, guardar el resultado y avisar. */
  function importador<T>(paso: string, correr: (texto: string) => Promise<T>, guardar: (r: T) => void, mensaje: (r: T) => string) {
    return async (archivo: File) => {
      setOcupado(paso);
      const r = await intentar(async () => correr(await textoDeArchivoClasico(archivo)), `Leyendo ${archivo.name}…`);
      setOcupado("");
      if (r === undefined || r === null) return;
      guardar(r);
      avisar(mensaje(r));
    };
  }

  const importarGraficos = importador(
    "graficos",
    (t) => casos.clasico.tablaDeGrh.ejecutar(t),
    setTabla,
    (r) => `Tabla de GRH lista: ${r.grhs.toLocaleString("es-AR")} gráficos de ${r.archivos.length} archivos.`,
  );
  const importarCuerpos = importador(
    "cuerpos",
    (t) => casos.clasico.cuerpos.ejecutar(t),
    setCuerpos,
    (r) => `Cuerpos: ${r.apariencias.agregados} nuevos, ${r.apariencias.reemplazados} reemplazados.`,
  );
  const importarCabezas = importador(
    "cabezas",
    (t) => casos.clasico.cabezas.ejecutar(t),
    setCabezas,
    (r) => `Cabezas: ${r.apariencias.agregados} nuevas, ${r.apariencias.reemplazados} reemplazadas.`,
  );
  const importarFx = importador(
    "fx",
    (t) => casos.clasico.fx.ejecutar(t),
    setFx,
    (r) => `FX: ${r.efectos.agregados} nuevos, ${r.efectos.reemplazados} reemplazados.`,
  );
  const importarObjetos = importador(
    "objetos",
    (t) => casos.clasico.objetos.ejecutar(t),
    setObjetos,
    (r) => `Objetos: ${r.objetos.agregados} nuevos, ${r.objetos.reemplazados} reemplazados.`,
  );
  const importarHechizos = importador(
    "hechizos",
    (t) => casos.clasico.hechizos.ejecutar(t),
    setHechizos,
    (r) => `Hechizos: ${r.agregados} nuevos, ${r.reemplazados} reemplazados.`,
  );

  return (
    <main className="layout">
      <div className="col">
        <section className="panel">
          <h2>Paso 1 · Graficos.ini</h2>
          <p className="hint">
            En el AO original los gráficos se referencian por número de GRH. Este archivo dice qué recorte de qué imagen es cada número, y es lo que
            permite que todo lo demás se vincule solo. Se guarda en <code>data/importacion/grh.json</code>, así que se hace una vez.
          </p>
          <div className="row">
            <BotonArchivo accept=".ini,.txt,text/plain" onArchivo={importarGraficos} className="primary">
              {ocupado === "graficos" ? <Leyendo /> : "Elegir Graficos.ini…"}
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
                <div className="row">
                  <BotonCargarCarpeta
                    className="primary"
                    etiqueta={`Cargar la carpeta Graficos (faltan ${tabla.faltantes.length.toLocaleString("es-AR")})…`}
                    soloEstas={tabla.faltantes}
                    onCargado={refrescarEstado}
                  />
                  <span className="hint">
                    Elegí la carpeta <code>Graficos</code> del cliente: de todo lo que hay adentro entran nada más que las imágenes que esta tabla
                    pide, una hoja por archivo.
                  </span>
                </div>
              )}
              {!!tabla.faltantes.length && (
                <details>
                  <summary>Qué imágenes faltan</summary>
                  <p className="hint">
                    Son los archivos que menciona el Graficos.ini y todavía no están cargados como hoja. El botón de arriba los trae todos de una
                    vez; si preferís unos pocos, cargalos desde «Animaciones» con el mismo nombre de archivo (por ejemplo{" "}
                    <code>{tabla.faltantes[0]}.png</code>) y volvé a importar: lo que falte se vincula entonces.
                  </p>
                  <p className="json corto" style={{ overflow: "auto", maxHeight: 140 }}>
                    {tabla.faltantes.join(", ")}
                  </p>
                </details>
              )}
            </>
          )}
        </section>

        <Paso
          titulo="Paso 2 · Personajes.ini"
          boton="Elegir Personajes.ini…"
          ocupado={ocupado === "cuerpos"}
          onArchivo={importarCuerpos}
          sinTabla={!tabla}
        >
          <p className="hint">
            Los cuerpos: las cuatro animaciones de caminar y el corrimiento donde se apoya la cabeza, que es el dato imposible de cargar a mano.
            Ojo con cuál elegís: el cliente usa <code>Personajes.ini</code>, no <code>Cuerpos.ini</code> — ese último es un sobrante de otra versión
            y trae los corrimientos pisados por números de GRH.
          </p>
          {cuerpos && (
            <Resultado vinculos={cuerpos}>
              <span className="pill ok">{cuerpos.apariencias.agregados} nuevos</span>
              <span className="pill ok">{cuerpos.apariencias.reemplazados} reemplazados</span>
            </Resultado>
          )}
        </Paso>

        <Paso
          titulo="Paso 3 · Cabezas.ini"
          boton="Elegir Cabezas.ini…"
          ocupado={ocupado === "cabezas"}
          onArchivo={importarCabezas}
          sinTabla={!tabla}
        >
          <p className="hint">
            Las caras, una por dirección. <code>Cascos.ini</code> tiene exactamente la misma forma y entra por acá, pero ojo:{" "}
            <strong>pisaría las cabezas con ese número</strong> (el casco 1 reemplaza a la cabeza 1), porque el editor todavía no distingue las dos
            cosas. Mientras tanto, los cascos conviene manejarlos como objetos equipables.
          </p>
          {cabezas && (
            <Resultado vinculos={cabezas}>
              <span className="pill ok">{cabezas.apariencias.agregados} nuevas</span>
              <span className="pill ok">{cabezas.apariencias.reemplazados} reemplazadas</span>
            </Resultado>
          )}
        </Paso>

        <Paso titulo="Paso 4 · Fxs.ini" boton="Elegir Fxs.ini…" ocupado={ocupado === "fx"} onArchivo={importarFx} sinTabla={!tabla}>
          <p className="hint">
            Los efectos visuales, con su animación y su corrimiento. El clásico no les guarda nombre ni repeticiones: quedan como «FX n», se
            reproducen una vez, y el nombre lo cambiás en su ficha.
          </p>
          {fx && (
            <Resultado vinculos={fx}>
              <span className="pill ok">{fx.efectos.agregados} nuevos</span>
              <span className="pill ok">{fx.efectos.reemplazados} reemplazados</span>
            </Resultado>
          )}
        </Paso>

        <Paso titulo="Paso 5 · OBJ.dat" boton="Elegir OBJ.dat…" ocupado={ocupado === "objetos"} onArchivo={importarObjetos} sinTabla={!tabla}>
          <p className="hint">
            Todos los objetos con su nombre, tipo, valor, banderas y atributos, y el icono vinculado. Este archivo es del <strong>servidor</strong>:
            en la carpeta del cliente no está.
          </p>
          {objetos && (
            <Resultado vinculos={objetos}>
              <span className="pill ok">{objetos.objetos.agregados} nuevos</span>
              <span className="pill ok">{objetos.objetos.reemplazados} reemplazados</span>
            </Resultado>
          )}
        </Paso>

        <section className="panel">
          <h2>Paso 6 · Hechizos.dat</h2>
          <p className="hint">
            Nombre, descripción, palabras mágicas y costos. No necesita el paso 1, porque el hechizo apunta al FX por número igual que acá. Hay dos
            archivos con este nombre: el del <strong>servidor</strong> trae además qué hace cada hechizo (<code>SubeHP</code>,{" "}
            <code>Paraliza</code>, <code>Target</code>…), y el del cliente sólo el texto que se muestra en pantalla.
          </p>
          <div className="row">
            <BotonArchivo accept=".dat,.txt,text/plain" onArchivo={importarHechizos} className="primary">
              {ocupado === "hechizos" ? <Leyendo /> : "Elegir Hechizos.dat…"}
            </BotonArchivo>
          </div>
          {hechizos && (
            <>
              <div className="row">
                <span className="pill ok">{hechizos.agregados} nuevos</span>
                <span className="pill ok">{hechizos.reemplazados} reemplazados</span>
                {!!hechizos.sinEfecto.length && <span className="pill warn">{hechizos.sinEfecto.length} sin efecto</span>}
              </div>
              {!!hechizos.sinEfecto.length && (
                <p className="hint aviso">
                  Este archivo no dice qué hace {hechizos.sinEfecto.length === hechizos.agregados + hechizos.reemplazados ? "ninguno" : "parte"} de
                  los hechizos, así que esos quedaron con el efecto en blanco: entró el texto, que es real, y no se inventó la mecánica. Para
                  completarla hace falta el <code>Hechizos.dat</code> del servidor.
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <aside className="side">
        <section className="panel">
          <h2>Cómo sigue</h2>
          <p className="hint">
            Importar es incremental: podés hacer el paso 1, cargar algunas imágenes, volver a importar y vincular más gráficos. Nada se duplica — lo
            que tiene el mismo ID se reemplaza y las animaciones ya creadas se reusan.
          </p>
          <h3>Lo que todavía no trae</h3>
          <p className="hint">
            Los gráficos de equipado de los objetos (el arma en la mano, el casco en la cabeza): en el clásico viven en <code>Armas.dat</code> y{" "}
            <code>Escudos.dat</code>, que tienen la misma forma que los de acá pero van a la ficha del objeto, no a una apariencia propia. Tampoco
            <code>NPCs.dat</code>, porque ese módulo no existe en el editor, ni los mapas.
          </p>
        </section>
      </aside>
    </main>
  );
}

/** Lo que dice el botón del paso mientras lee el archivo. */
function Leyendo() {
  return (
    <>
      <PuntosDeCarga />
      Leyendo…
    </>
  );
}

/** Un paso de los que dependen de la tabla de GRH: todos se ven igual. */
function Paso({
  titulo,
  boton,
  ocupado,
  onArchivo,
  sinTabla,
  children,
}: {
  titulo: string;
  boton: string;
  ocupado: boolean;
  onArchivo: (archivo: File) => void;
  sinTabla: boolean;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <h2>{titulo}</h2>
      {children}
      <div className="row">
        <BotonArchivo accept=".ini,.dat,.txt,text/plain" onArchivo={onArchivo} className="primary">
          {ocupado ? <Leyendo /> : boton}
        </BotonArchivo>
        {sinTabla && <span className="hint">Sin el paso 1 se importan los datos, pero sin gráficos.</span>}
      </div>
    </section>
  );
}

/** Lo que dejó un paso: lo suyo (los pills de `children`) y qué gráficos pudo vincular. */
function Resultado({ vinculos, children }: { vinculos: ResumenDeVinculos; children: ReactNode }) {
  return (
    <>
      <div className="row">
        {children}
        <span className={`pill ${vinculos.animacionesCreadas ? "ok" : "warn"}`}>{vinculos.animacionesCreadas} animaciones creadas</span>
        {!!vinculos.hojasFaltantes.length && <span className="pill warn">{vinculos.hojasFaltantes.length} hojas sin cargar</span>}
        {!!vinculos.grhSinResolver.length && <span className="pill bad">{vinculos.grhSinResolver.length} GRH desconocidos</span>}
      </div>
      {!!vinculos.hojasFaltantes.length && (
        <p className="hint">
          Los gráficos que faltan salen de estas imágenes: {vinculos.hojasFaltantes.slice(0, 40).join(", ")}
          {vinculos.hojasFaltantes.length > 40 ? "…" : ""}. Cargalas con «Cargar la carpeta Graficos» del paso 1 y volvé a importar este archivo.
        </p>
      )}
      {!!vinculos.grhSinResolver.length && (
        <p className="hint aviso">
          Estos GRH no están en la tabla: {vinculos.grhSinResolver.slice(0, 20).join(", ")}
          {vinculos.grhSinResolver.length > 20 ? "…" : ""}. Suele querer decir que el Graficos.ini es de otra versión que este archivo.
        </p>
      )}
    </>
  );
}
