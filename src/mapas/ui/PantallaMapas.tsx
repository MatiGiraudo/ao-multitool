"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivos, BotonConfirmar, CampoNumero, Cargando } from "@/compartido/ui/componentes";
import { descargar } from "@/compartido/ui/utilidades";
import type { GraficosDelMapa } from "../aplicacion/casosDeUso";
import { Historial } from "../dominio/Historial";
import { AJUSTES_POR_DEFECTO, type Ajustes, type Herramienta } from "../dominio/herramientas";
import { Mapa, type InfoDeMapa } from "../dominio/Mapa";
import type { ResumenDeMapa } from "../dominio/MapaRepositorio";
import type { AnchoDeGrafico } from "../infraestructura/FormatoMapaClasico";
import { baseDeArchivo } from "@/compartido/dominio/nombreDeArchivo";
import { CatalogoDeTiles } from "./CatalogoDeTiles";
import { DatosDelMapa } from "./DatosDelMapa";
import { ATAJOS, BarraDeEdicion, PaletaDeGraficos } from "./HerramientasDeMapa";
import { CAPAS_POR_DEFECTO, LienzoDeMapa, type CapasVisibles } from "./LienzoDeMapa";

/**
 * El editor de mapas: abrís la carpeta `Mundos` del juego, editás, y te llevás los tres archivos.
 *
 * Carga sólo lo que el mapa pide. Un mapa usa unos 180 gráficos distintos, que salen de unas
 * decenas de hojas: esas se piden y ninguna más, aunque tengas miles cargadas.
 *
 * Lo editado todavía no se guarda en el proyecto: la salida es la exportación a `.map`, `.inf` y
 * `.dat`, que es lo que el juego lee. El `.map` se vuelve a escribir con el mismo ancho de gráfico
 * con que vino, así un mapa que se abre y se exporta sin tocar sale idéntico byte a byte.
 */

interface Trio {
  numero: number;
  nombre: string;
  map: File;
  inf: File;
  dat?: File;
}

interface Abierto {
  mapa: Mapa;
  ancho: AnchoDeGrafico;
  nombreArchivo: string;
  graficos: GraficosDelMapa;
  imagenes: Map<string, CanvasImageSource>;
  historial: Historial;
  ms: number;
}

export function PantallaMapas() {
  const { casos, avisar, intentar } = useAplicacion();
  const [trios, setTrios] = useState<Trio[]>([]);
  const [abierto, setAbierto] = useState<Abierto | null>(null);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const [capas, setCapas] = useState<CapasVisibles>(CAPAS_POR_DEFECTO);
  const [celda, setCelda] = useState<{ x: number; y: number } | null>(null);
  const [editando, setEditando] = useState(true);
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_POR_DEFECTO);
  /* `sello` sube con cada cambio del mapa, y es lo que refresca los contadores y la paleta;
   * `revision` sólo con lo que el lienzo no hizo él mismo, porque ahí hay que rehornear todo. */
  const [sello, setSello] = useState(0);
  const [revision, setRevision] = useState(0);
  const [sinGuardar, setSinGuardar] = useState(false);
  const [numeroNuevo, setNumeroNuevo] = useState(1);
  /** Mientras el usuario no elija uno, el número del mapa nuevo sigue al primero libre. */
  const numeroAMano = useRef(false);
  const [guardados, setGuardados] = useState<ResumenDeMapa[]>([]);
  /* El mapa abierto ya vive en el proyecto: a partir de ahí se guarda solo, como el resto del editor. */
  const [enProyecto, setEnProyecto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  /** Gráficos que ya se pidieron para el pincel, resueltos o no, para no pedirlos en cada tecla. */
  const intentados = useRef(new Set<number>());
  const usadosAnteriores = useRef<number[]>([]);

  /** De la carpeta elegida salen los tríos .map + .inf + .dat que estén completos. */
  const elegirCarpeta = (archivos: File[]) => {
    const porBase = new Map<string, { map?: File; inf?: File; dat?: File }>();
    for (const f of archivos) {
      const m = /^(.*?)\.(map|inf|dat)$/i.exec(f.name);
      if (!m) continue;
      const base = m[1]!.toLowerCase();
      const grupo = porBase.get(base) ?? {};
      grupo[m[2]!.toLowerCase() as "map" | "inf" | "dat"] = f;
      porBase.set(base, grupo);
    }
    const encontrados: Trio[] = [];
    for (const [base, g] of porBase) {
      if (!g.map || !g.inf) continue;
      encontrados.push({ numero: Number(base.replace(/[^0-9]/g, "")) || 0, nombre: base, map: g.map, inf: g.inf, dat: g.dat });
    }
    encontrados.sort((a, b) => a.numero - b.numero || a.nombre.localeCompare(b.nombre));
    setTrios(encontrados);
    setAbierto(null);
    avisar(encontrados.length ? `${encontrados.length} mapas encontrados.` : "No encontré ningún .map con su .inf al lado.");
  };

  /** Lo que hace falta para poner un mapa en pantalla, venga de donde venga. */
  const montar = useCallback(
    async (mapa: Mapa, ancho: AnchoDeGrafico, nombreArchivo: string, empezo: number): Promise<Abierto> => {
      const graficos = await casos.mapas.resolverGraficos.ejecutar(mapa);
      const imagenes = await cargarHojas(graficos, (hojaId, version) => casos.ubicadorDeImagenes.urlDe(hojaId, version));
      return { mapa, ancho, nombreArchivo, graficos, imagenes, historial: new Historial(), ms: Math.round(performance.now() - empezo) };
    },
    [casos],
  );

  const refrescarGuardados = useCallback(async () => {
    const lista = await intentar(() => casos.mapas.listarGuardados.ejecutar());
    if (lista) setGuardados(lista);
  }, [casos, intentar]);

  useEffect(() => {
    void refrescarGuardados();
  }, [refrescarGuardados]);

  useEffect(() => {
    if (numeroAMano.current) return;
    setNumeroNuevo(guardados.reduce((mayor, g) => Math.max(mayor, g.numero), 0) + 1);
  }, [guardados]);

  const abrirDelProyecto = useCallback(
    async (numero: number) => {
      if (sinGuardar && !confirm("Tenés cambios sin exportar en el mapa abierto. ¿Abrir otro y perderlos?")) return;
      setAbriendo(numero);
      const empezo = performance.now();
      const resultado = await intentar(async () => {
        const guardado = await casos.mapas.abrirGuardado.ejecutar(numero);
        if (!guardado) throw new Error("Ese mapa ya no está guardado.");
        return montar(guardado.mapa, guardado.anchoDeGrafico, guardado.nombreArchivo, empezo);
      }, `Abriendo el mapa ${numero}`);
      setAbriendo(null);
      if (!resultado) return;
      intentados.current.clear();
      setAbierto(resultado);
      setSinGuardar(false);
      setEnProyecto(true);
      setSello((n) => n + 1);
      setRevision((n) => n + 1);
    },
    [casos, intentar, montar, sinGuardar],
  );

  const guardarEnProyecto = useCallback(
    async (abierto: Abierto) => {
      setGuardando(true);
      const ok = await intentar(async () => {
        await casos.mapas.guardar.ejecutar({ mapa: abierto.mapa, anchoDeGrafico: abierto.ancho, nombreArchivo: abierto.nombreArchivo });
        return true;
      });
      setGuardando(false);
      if (!ok) return;
      setEnProyecto(true);
      void refrescarGuardados();
    },
    [casos, intentar, refrescarGuardados],
  );

  const abrir = useCallback(
    async (trio: Trio) => {
      if (sinGuardar && !confirm("Tenés cambios sin exportar en el mapa abierto. ¿Abrir otro y perderlos?")) return;
      setAbriendo(trio.numero);
      const empezo = performance.now();
      const resultado = await intentar(async () => {
        const [map, inf] = await Promise.all([trio.map.arrayBuffer(), trio.inf.arrayBuffer()]);
        const dat = trio.dat ? await leerAnsi(trio.dat) : undefined;
        const { mapa, ancho } = casos.mapas.abrir.ejecutar({ numero: trio.numero, map, inf, dat });
        return montar(mapa, ancho, trio.nombre, empezo);
      }, `Abriendo ${trio.nombre}`);
      setAbriendo(null);
      if (!resultado) return;
      intentados.current.clear();
      setAbierto(resultado);
      setSinGuardar(false);
      setEnProyecto(false);
      setSello((n) => n + 1);
      setRevision((n) => n + 1);
    },
    [casos, intentar, montar, sinGuardar],
  );

  /**
   * Un mapa desde cero.
   *
   * Arranca sin gráficos cargados a propósito: la hoja de cada uno se trae recién cuando lo ponés
   * en el pincel, igual que al abrir uno del juego. La cabecera del archivo queda en cero, que es
   * lo que el servidor espera de un mapa que no viene de otro (no valida ni el CRC ni la palabra
   * mágica: los lee y los descarta).
   */
  const crearNuevo = () => {
    if (sinGuardar && !confirm("Tenés cambios sin exportar en el mapa abierto. ¿Empezar uno nuevo y perderlos?")) return;
    const creado = avisandoSiFalla(() => Mapa.vacio(numeroNuevo, { nombre: `Mapa ${numeroNuevo}` }));
    if (!creado) return;
    intentados.current.clear();
    setAbierto({
      mapa: creado,
      ancho: 4,
      nombreArchivo: `Mapa${numeroNuevo}`,
      graficos: { porGrh: new Map(), hojasFaltantes: [], sinResolver: [], hojas: [] },
      imagenes: new Map(),
      historial: new Historial(),
      ms: 0,
    });
    setSinGuardar(false);
    setEnProyecto(false);
    setEditando(true);
    setSello((n) => n + 1);
    setRevision((n) => n + 1);
    avisar(`Mapa ${numeroNuevo} vacío. Elegí un gráfico y empezá por el piso.`);
  };

  /** La versión sincrónica de `intentar`: crear el mapa valida el número y puede fallar. */
  const avisandoSiFalla = <T,>(fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
      return undefined;
    }
  };

  /**
   * Un tile elegido de una hoja pasa a ser el gráfico del pincel.
   *
   * El mapa guarda números de GRH —es lo único que el juego entiende—, así que el recorte se
   * traduce a uno: si ya tenía número se reusa, y si no, el editor le da el primero libre y lo
   * suma a la tabla. Esos gráficos nuevos salen por «Exportar Graficos.ini», en Importar.
   */
  const elegirTile = async (hoja: { nombreArchivo: string }, recorte: { x: number; y: number; ancho: number; alto: number }) => {
    const r = await intentar(
      () => casos.clasico.grhDeRecorte.ejecutar({ archivo: baseDeArchivo(hoja.nombreArchivo), ...recorte }),
      "Buscando el gráfico…",
    );
    if (!r) return;
    setAjustes((a) => ({ ...a, grh: r.numero, herramienta: a.herramienta === "cuentagotas" ? "pincel" : a.herramienta }));
    avisar(r.creado ? `Gráfico nuevo: grh ${r.numero}.` : `Ese recorte ya era el grh ${r.numero}.`);
  };

  /**
   * Guardar es escribir `data/mapas/<numero>.json`, así que si ese número ya es de otro mapa hay
   * que preguntar: pasa solo, porque un mapa nuevo arranca en el primer número libre pero nada
   * impide escribir uno ocupado, y un mapa abierto del juego trae el número que trae.
   *
   * Va acá y no adentro de `guardarEnProyecto` para no meter `guardados` en sus dependencias: el
   * guardado automático depende de esa función, y la lista cambia justo después de cada guardado.
   */
  const guardarPreguntandoSiPisa = (abierto: Abierto) => {
    const pisa = guardados.some((g) => g.numero === abierto.mapa.numero);
    if (pisa && !confirm(`Ya hay un mapa ${abierto.mapa.numero} guardado en el proyecto. ¿Reemplazarlo por este?`)) return;
    void guardarEnProyecto(abierto);
  };

  const cambiarInfo = (cambios: Partial<InfoDeMapa>) => {
    if (!abierto) return;
    abierto.mapa.conInfo(cambios);
    setSinGuardar(true);
    setSello((n) => n + 1);
  };

  const deshacer = useCallback(() => {
    if (!abierto?.historial.deshacer(abierto.mapa)) return;
    setRevision((n) => n + 1);
    setSello((n) => n + 1);
  }, [abierto]);

  const rehacer = useCallback(() => {
    if (!abierto?.historial.rehacer(abierto.mapa)) return;
    setRevision((n) => n + 1);
    setSello((n) => n + 1);
  }, [abierto]);

  // Los atajos de siempre: ctrl+Z, ctrl+Y, las letras de cada herramienta y las capas con 1-4.
  useEffect(() => {
    if (!abierto || !editando) return;
    const letras = new Map(Object.entries(ATAJOS).map(([h, k]) => [k, h as Herramienta]));
    const alTeclado = (e: KeyboardEvent) => {
      const foco = e.target as HTMLElement | null;
      if (foco && /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName)) return;
      const tecla = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && tecla === "z") {
        e.preventDefault();
        if (e.shiftKey) rehacer();
        else deshacer();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && tecla === "y") {
        e.preventDefault();
        rehacer();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const herramienta = letras.get(tecla);
      if (herramienta) {
        setAjustes((a) => ({ ...a, herramienta }));
        return;
      }
      if (tecla >= "1" && tecla <= "4") setAjustes((a) => ({ ...a, capa: Number(tecla) }));
    };
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [abierto, deshacer, editando, rehacer]);

  /*
   * Si el pincel carga un gráfico que este mapa no usaba, hay que traer su hoja. Se intenta una
   * sola vez por número: si no está en la tabla de GRH no va a aparecer por preguntar de nuevo.
   */
  useEffect(() => {
    const grh = ajustes.grh;
    if (!abierto || !grh || abierto.graficos.porGrh.has(grh) || intentados.current.has(grh)) return;
    intentados.current.add(grh);
    let vivo = true;
    void (async () => {
      const graficos = await casos.mapas.resolverGraficos.ejecutar(abierto.mapa, [grh]);
      const imagenes = await cargarHojas(graficos, (hojaId, version) => casos.ubicadorDeImagenes.urlDe(hojaId, version), abierto.imagenes);
      if (vivo) setAbierto((prev) => (prev?.mapa === abierto.mapa ? { ...prev, graficos, imagenes } : prev));
    })();
    return () => {
      vivo = false;
    };
  }, [abierto, ajustes.grh, casos]);

  /*
   * Una vez que el mapa está en el proyecto se guarda solo, como todo el resto del editor: un
   * segundo después del último cambio. Antes no, porque guardar sería decidir por el usuario que
   * un mapa del juego que sólo estaba mirando ahora vive en `data/mapas`.
   */
  useEffect(() => {
    if (!abierto || !enProyecto || !sello) return;
    const t = setTimeout(() => void guardarEnProyecto(abierto), 1000);
    return () => clearTimeout(t);
  }, [abierto, enProyecto, sello, guardarEnProyecto]);

  // Avisar antes de cerrar la pestaña con cambios sin exportar.
  useEffect(() => {
    if (!sinGuardar) return;
    const antesDeCerrar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", antesDeCerrar);
    return () => window.removeEventListener("beforeunload", antesDeCerrar);
  }, [sinGuardar]);

  /**
   * Los gráficos que el mapa usa ahora: la paleta sale de acá y se actualiza al pintar.
   *
   * Si la lista quedó igual se devuelve la de antes, no una nueva con los mismos números: la
   * paleta son cientos de miniaturas y así React no tiene que recorrerlas en cada pincelada.
   */
  const usados = useMemo(() => {
    void sello;
    const nuevos = abierto ? [...abierto.mapa.graficosUsados()].sort((a, b) => a - b) : [];
    const previos = usadosAnteriores.current;
    if (previos.length === nuevos.length && previos.every((v, i) => v === nuevos[i])) return previos;
    usadosAnteriores.current = nuevos;
    return nuevos;
  }, [abierto, sello]);

  const exportar = () => {
    if (!abierto) return;
    const { map, inf, dat } = casos.mapas.abrir.escribir(abierto.mapa, abierto.ancho);
    const base = abierto.nombreArchivo || `mapa${abierto.mapa.numero}`;
    descargar(`${base}.map`, new Blob([map as BlobPart]), "application/octet-stream");
    descargar(`${base}.inf`, new Blob([inf as BlobPart]), "application/octet-stream");
    descargar(`${base}.dat`, dat, "text/plain");
    setSinGuardar(false);
    avisar(`${base}.map, .inf y .dat descargados. Copialos a la carpeta Mundos del servidor.`);
  };

  return (
    <main className="mapa-layout">
      <section className="panel">
        <h2>Mapas</h2>
        <BotonArchivos accept=".map,.inf,.dat" carpeta onArchivos={elegirCarpeta} className="primary">
          Elegir la carpeta Mundos…
        </BotonArchivos>
        <p className="hint">Los archivos se leen en tu máquina; lo que edites sale por «Exportar».</p>
        <div className="row">
          <CampoNumero
            id="mapa_nuevo"
            etiqueta="Número"
            valor={numeroNuevo}
            min={1}
            ancho={80}
            onCambio={(v) => {
              numeroAMano.current = true;
              setNumeroNuevo(v ?? 1);
            }}
          />
          <button className="abajo" onClick={crearNuevo} title="Un mapa vacío de 100×100, para pintarlo de cero">
            + Mapa nuevo
          </button>
        </div>
        {!!guardados.length && (
          <>
            <h2>En el proyecto ({guardados.length})</h2>
            <div className="olist-items">
              {guardados.map((g) => (
                <div key={g.numero} className="row between">
                  <button
                    className={`oitem${abierto?.mapa.numero === g.numero && enProyecto ? " on" : ""}`}
                    style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
                    onClick={() => void abrirDelProyecto(g.numero)}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className="nm">{g.nombre || g.nombreArchivo}</span>
                      <span className="meta">#{g.numero}</span>
                    </span>
                  </button>
                  <BotonConfirmar
                    confirmacion="¿Seguro?"
                    onConfirmar={async () => {
                      await intentar(async () => (await casos.mapas.eliminarGuardado.ejecutar(g.numero), true));
                      if (abierto?.mapa.numero === g.numero) setEnProyecto(false);
                      void refrescarGuardados();
                    }}
                  >
                    ✕
                  </BotonConfirmar>
                </div>
              ))}
            </div>
            <h2>Del juego ({trios.length})</h2>
          </>
        )}
        <div className="olist-items">
          {trios.map((t) => (
            <button
              key={t.nombre}
              className={`oitem${abierto?.mapa.numero === t.numero ? " on" : ""}`}
              style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
              onClick={() => abrir(t)}
            >
              <span style={{ minWidth: 0 }}>
                <span className="nm">
                  {t.nombre}
                  {abriendo === t.numero ? " …" : ""}
                </span>
                <span className="meta">
                  #{t.numero}
                  {!t.dat && <span className="pill warn">sin .dat</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel mapa-panel">
        {!abierto ? (
          abriendo !== null ? (
            <Cargando bloque>Leyendo el mapa…</Cargando>
          ) : (
            <div className="empty grande">Elegí la carpeta `Mundos` del juego y después un mapa de la lista.</div>
          )
        ) : (
          <>
            <div className="row between">
              <h2>
                {abierto.mapa.info.nombre || abierto.mapa.numero} <span className="status">#{abierto.mapa.numero}</span>
              </h2>
              <span className="status">
                {usados.length} gráficos · {abierto.graficos.hojas.length} hojas · {abierto.ms} ms
              </span>
            </div>

            <div className="row between">
              <button className={editando ? "on" : ""} onClick={() => setEditando((v) => !v)}>
                {editando ? "✎ Editando" : "✎ Editar"}
              </button>
              {/* El aviso va acá y no en el título: ahí aparecería al dar la primera pincelada y
                  correría el mapa para abajo justo mientras se pinta. */}
              <div className="row">
                {sinGuardar && <span className="pill warn">sin exportar</span>}
                <span className="status">{guardando ? "Guardando…" : enProyecto ? "Guardado en data/mapas" : ""}</span>
                <button onClick={() => guardarPreguntandoSiPisa(abierto)} disabled={guardando || enProyecto} title="Para no perderlo al recargar">
                  {enProyecto ? "En el proyecto" : "Guardar en el proyecto"}
                </button>
                <button className="primary" onClick={exportar}>
                  Exportar .map .inf .dat
                </button>
              </div>
            </div>

            {editando && (
              <BarraDeEdicion
                ajustes={ajustes}
                onAjustes={(cambios) => setAjustes((a) => ({ ...a, ...cambios }))}
                puedeDeshacer={abierto.historial.puedeDeshacer}
                puedeRehacer={abierto.historial.puedeRehacer}
                onDeshacer={deshacer}
                onRehacer={rehacer}
                ultimo={abierto.historial.ultimo}
              />
            )}

            <LienzoDeMapa
              mapa={abierto.mapa}
              graficos={abierto.graficos.porGrh}
              imagenes={abierto.imagenes}
              capas={capas}
              onCelda={(x, y) => setCelda({ x, y })}
              revision={revision}
              edicion={
                editando
                  ? {
                      ajustes,
                      historial: abierto.historial,
                      onCambio: () => {
                        setSinGuardar(true);
                        setSello((n) => n + 1);
                      },
                      onCuentagotas: (grh) => setAjustes((a) => ({ ...a, grh, herramienta: "pincel" })),
                    }
                  : undefined
              }
            />
            <div className="flags">
              {(Object.keys(CAPAS_POR_DEFECTO) as (keyof CapasVisibles)[]).map((k) => (
                <label key={k}>
                  <input type="checkbox" checked={capas[k]} onChange={(e) => setCapas({ ...capas, [k]: e.target.checked })} /> {ETIQUETAS[k]}
                </label>
              ))}
            </div>
            {editando && (
              <p className="hint">
                Pintás con el botón izquierdo. Para moverte, arrastrá con <kbd>shift</kbd> o con el botón del medio; el zoom es con la rueda.
              </p>
            )}
          </>
        )}
      </section>

      <aside className="side">
        {abierto && (
          <>
            {editando && (
              <section className="panel">
                <h2>El pincel</h2>
                <PaletaDeGraficos
                  usados={usados}
                  grh={ajustes.grh}
                  onGrh={(grh) => setAjustes((a) => ({ ...a, grh }))}
                  graficos={abierto.graficos.porGrh}
                  imagenes={abierto.imagenes}
                />
                <details>
                  <summary>Elegir de una hoja del proyecto</summary>
                  <div className="col">
                    <CatalogoDeTiles onElegir={elegirTile} />
                  </div>
                </details>
              </section>
            )}
            <section className="panel">
              <h2>La celda</h2>
              {celda ? <DetalleDeCelda mapa={abierto.mapa} x={celda.x} y={celda.y} sello={sello} /> : <p className="hint">Pasá el mouse por el mapa.</p>}
            </section>
            <section className="panel">
              <h2>El mapa</h2>
              {editando && <DatosDelMapa mapa={abierto.mapa} onCambio={cambiarInfo} />}
              <Resumen abierto={abierto} sello={sello} />
            </section>
          </>
        )}
      </aside>
    </main>
  );
}

const ETIQUETAS: Record<keyof CapasVisibles, string> = {
  piso: "Piso",
  superiores: "Capas 2-4",
  bloqueos: "Bloqueos",
  triggers: "Triggers",
  traslados: "Traslados",
  npcs: "NPCs",
  objetos: "Objetos",
  grilla: "Grilla",
};

/* `sello` no se usa adentro: está para que el detalle se vuelva a dibujar cuando el mapa cambió,
 * porque el mapa es el mismo objeto y React no tiene cómo notarlo. */
function DetalleDeCelda({ mapa, x, y, sello }: { mapa: Mapa; x: number; y: number; sello: number }) {
  void sello;
  const traslado = mapa.traslado(x, y);
  const objeto = mapa.objeto(x, y);
  const npc = mapa.npc(x, y);
  return (
    <div className="form-grid">
      <Dato que="Posición" valor={`${x}, ${y}`} />
      {[1, 2, 3, 4].map((capa) => {
        const grh = mapa.grafico(x, y, capa);
        return grh ? <Dato key={capa} que={`Capa ${capa}`} valor={`grh ${grh}`} /> : null;
      })}
      {mapa.bloqueada(x, y) && <Dato que="Bloqueada" valor="sí" />}
      {!!mapa.trigger(x, y) && <Dato que="Trigger" valor={String(mapa.trigger(x, y))} />}
      {traslado && <Dato que="Traslado" valor={`mapa ${traslado.mapa} · ${traslado.x}, ${traslado.y}`} />}
      {!!npc && <Dato que="NPC" valor={`#${npc}`} />}
      {objeto && <Dato que="Objeto" valor={`#${objeto.objeto} ×${objeto.cantidad}`} />}
    </div>
  );
}

function Resumen({ abierto, sello }: { abierto: Abierto; sello: number }) {
  void sello;
  const c = abierto.mapa.contar();
  const i = abierto.mapa.info;
  return (
    <>
      <div className="form-grid">
        <Dato que="Zona" valor={`${i.zona} · ${i.terreno}`} />
        <Dato que="Combate" valor={i.seCombate ? "sí" : "zona segura"} />
        <Dato que="Música" valor={String(i.musicaMp3 || i.musica || "—")} />
        <Dato que="Gráficos" valor={String(c.graficos)} />
        <Dato que="Bloqueadas" valor={String(c.bloqueadas)} />
        <Dato que="Traslados" valor={String(c.traslados)} />
        <Dato que="NPCs" valor={String(c.npcs)} />
        <Dato que="Objetos" valor={String(c.objetos)} />
        <Dato que="Gráficos de" valor={`${abierto.ancho} bytes`} />
      </div>
      {!!abierto.graficos.hojasFaltantes.length && (
        <p className="hint aviso">
          Faltan {abierto.graficos.hojasFaltantes.length} imágenes para dibujarlo entero: {abierto.graficos.hojasFaltantes.slice(0, 15).join(", ")}
          {abierto.graficos.hojasFaltantes.length > 15 ? "…" : ""}. Cargalas desde «Importar» y volvé a abrir el mapa.
        </p>
      )}
      {!!abierto.graficos.sinResolver.length && (
        <p className="hint aviso">{abierto.graficos.sinResolver.length} gráficos no están en la tabla de GRH. ¿Importaste el Graficos.ini?</p>
      )}
      <p className="hint">Mientras falte una imagen, esas celdas se ven como colores planos: alcanza para reconocer la forma del mapa.</p>
    </>
  );
}

function Dato({ que, valor }: { que: string; valor: string }) {
  return (
    <label className="f">
      {que}
      <span className="status">{valor}</span>
    </label>
  );
}

/** Los .dat del juego son ANSI, igual que el resto de los archivos del clásico. */
async function leerAnsi(archivo: File): Promise<string> {
  return new TextDecoder("windows-1252").decode(await archivo.arrayBuffer());
}

/**
 * Trae las hojas que el mapa necesita, decodificadas fuera del hilo principal.
 *
 * `createImageBitmap` evita el parpadeo de decodificar imágenes grandes mientras se dibuja, y
 * `drawImage` las copia más rápido que a un `<img>`.
 */
async function cargarHojas(
  graficos: GraficosDelMapa,
  url: (hojaId: string, version: number) => string,
  ya?: Map<string, CanvasImageSource>,
): Promise<Map<string, CanvasImageSource>> {
  const porHoja = new Map<string, number>();
  for (const r of graficos.porGrh.values()) if (!ya?.has(r.hojaId)) porHoja.set(r.hojaId, r.versionImagen);

  const out = new Map<string, CanvasImageSource>(ya);
  await Promise.all(
    [...porHoja].map(async ([hojaId, version]) => {
      try {
        const respuesta = await fetch(url(hojaId, version), { cache: "force-cache" });
        if (!respuesta.ok) return;
        out.set(hojaId, await createImageBitmap(await respuesta.blob()));
      } catch {
        // Una hoja que no carga no puede voltear el mapa entero: esas celdas quedan en color plano.
      }
    }),
  );
  return out;
}
