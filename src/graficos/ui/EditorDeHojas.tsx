"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivo, BotonConfirmar, CampoNumero, Cargando } from "@/compartido/ui/componentes";
import { copiar, descargar, useImagen } from "@/compartido/ui/utilidades";
import { Animacion } from "../dominio/Animacion";
import { ANCLAS, type Ancla } from "../dominio/Ancla";
import type { Frame } from "../dominio/Frame";
import type { DatosGrilla } from "../dominio/Grilla";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";
import { ACEPTA_IMG, BotonCargarCarpeta } from "./BotonCargarCarpeta";
import { LienzoDeHoja, type ModoDeLienzo } from "./LienzoDeHoja";
import { ListaDeFrames } from "./ListaDeFrames";
import { PanelRedimensionar } from "./PanelRedimensionar";
import { useGraficos } from "./ProveedorDeGraficos";
import { useHistorial } from "./useHistorial";
import { VistaPreviaAnimacion } from "./VistaPreviaAnimacion";

const TOPE_DE_LA_TIRA = 60;
const ZOOMS = [0.125, 0.25, 0.5, 0.75, 1, 2, 3, 4, 5, 6, 8, 10, 12];

const AYUDAS: Record<ModoDeLienzo, ReactNode> = {
  grilla: (
    <>
      Clic en una celda la agrega al final de la animación. <kbd>Shift</kbd>+clic agrega todas las celdas desde la última hasta esa.
    </>
  ),
  recuadro: <>Arrastrá para dibujar un recuadro nuevo. Un clic simple sobre un frame existente lo selecciona.</>,
  mover: (
    <>
      Arrastrá un frame para moverlo; si hay varios seleccionados se mueven juntos. <kbd>Ctrl</kbd>/<kbd>Shift</kbd>+clic suma o quita de la
      selección; arrastrar sobre un espacio vacío selecciona con un recuadro. Mantené <kbd>Alt</kbd> para mover sin ajustar a la grilla.
    </>
  ),
};

/**
 * Pantalla de Animaciones. Es un componente "contenedor": mantiene el estado de la pantalla
 * (hoja y animación elegidas, selección, modo) y traduce gestos del usuario en llamadas al dominio.
 * `renderUso` permite que otro módulo (Objetos) muestre quién usa cada animación sin que Gráficos lo conozca.
 */
export function EditorDeHojas({ renderUso }: { renderUso?: (hoja: HojaDeSprites, animacion: Animacion) => ReactNode }) {
  const { casos, avisar } = useAplicacion();
  const graficos = useGraficos();
  const formatoVista = casos.graficos.formato;
  const [hojaId, setHojaId] = useState<string | null>(null);
  const [animPorHoja, setAnimPorHoja] = useState<Record<string, string>>({});
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [ancla, setAnclaSel] = useState(-1);
  const [modo, setModo] = useState<ModoDeLienzo>("grilla");
  const [zoom, setZoom] = useState(3);
  const [mostrarGrilla, setMostrarGrilla] = useState(true);
  const [ajustar, setAjustar] = useState(true);
  const [estado, setEstado] = useState<{ posicion?: string; detalle?: string }>({});
  const [frameActual, setFrameActual] = useState(-1);
  const [irA, setIrA] = useState<{ indice: number; n: number } | null>(null);
  const [importTxt, setImportTxt] = useState("");
  const [filtro, setFiltro] = useState("");

  const hoja = graficos.hoja(hojaId) ?? graficos.hojas[0];
  const animacion = hoja ? (hoja.animacion(animPorHoja[hoja.id] ?? "") ?? hoja.animaciones[0]) : undefined;
  const img = useImagen(graficos.urlImagen(hoja));

  /*
   * La tira de hojas se dibuja recortada. Importar la carpeta del clásico deja miles de hojas, y
   * miles de miniaturas juntas cuelgan la página: se ven las primeras y el filtro busca el resto.
   */
  const { tira, coinciden } = useMemo(() => {
    const buscado = filtro.trim().toLowerCase();
    const todas = buscado ? graficos.hojas.filter((h) => h.nombreArchivo.toLowerCase().includes(buscado)) : graficos.hojas;
    const primeras = todas.slice(0, TOPE_DE_LA_TIRA);
    // La hoja abierta siempre se ve, aunque el filtro la deje afuera.
    const tira = hoja && !primeras.some((h) => h.id === hoja.id) ? [hoja, ...primeras] : primeras;
    return { tira, coinciden: todas.length };
  }, [graficos.hojas, filtro, hoja]);

  // Al cambiar de hoja o de imagen: zoom para que entre a lo ancho.
  useEffect(() => {
    if (!hoja?.tamanio) return;
    const disponible = Math.max(200, (document.querySelector(".lienzo")?.clientWidth ?? 800) - 4);
    let z = ZOOMS[0]!;
    for (const k of ZOOMS) if (k <= 6 && hoja.tamanio.ancho * k <= disponible) z = k;
    setZoom(z);
  }, [hoja?.id, hoja?.tamanio]);

  useEffect(() => {
    setSeleccion(new Set());
    setAnclaSel(-1);
  }, [hoja?.id, animacion?.id]);

  // ---------- helpers de edición ----------
  // Todo cambio a la hoja pasa por acá, así el historial ve siempre el paso anterior completo.
  const historial = useHistorial(hoja, graficos.actualizar);
  const { cambiar, deshacer, rehacer } = historial;
  const aplicar = useCallback(
    (fn: () => HojaDeSprites) => {
      try {
        cambiar(fn());
      } catch (e) {
        avisar(e instanceof Error ? e.message : String(e));
      }
    },
    [cambiar, avisar],
  );
  // Devuelve el zoom que quedó: el lienzo lo necesita para no mover la hoja cuando ya está en el tope.
  const cambiarZoom = useCallback(
    (d: 1 | -1) => {
      const siguiente = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + d))] ?? zoom;
      setZoom(siguiente);
      return siguiente;
    },
    [zoom],
  );
  const cambiarAnimacion = useCallback((a: Animacion) => hoja && aplicar(() => hoja.conAnimacion(a)), [hoja, aplicar]);
  const elegirAnimacion = (id: string) => hoja && setAnimPorHoja((m) => ({ ...m, [hoja.id]: id }));

  const agregarFrames = (frames: Frame[]) => {
    if (!hoja) return;
    /*
     * Sin animación elegida, el primer frame crea una.
     *
     * Las hojas que deja el cargador masivo nacen sin animaciones, así que ese es el estado normal
     * de una hoja recién traída: antes el lienzo no respondía al clic, justo cuando el panel de al
     * lado decía «hacé clic en las celdas de la hoja».
     */
    const base = animacion ?? Animacion.crear(casos.graficos.nuevoId(), nombreLibre(hoja));
    const a = base.conFramesAgregados(frames);
    aplicar(() => (animacion ? hoja.conAnimacion(a) : hoja.conAnimacionAgregada(a)));
    if (!animacion) elegirAnimacion(a.id);
    setSeleccion(new Set([a.cantidadDeFrames - 1]));
  };

  const desplazarSeleccion = (dx: number, dy: number) => {
    if (!animacion || !hoja?.tamanio || !seleccion.size) return;
    cambiarAnimacion(animacion.conFramesDesplazados(seleccion, dx, dy, hoja.tamanio).animacion);
  };

  const cambiarGrilla = (k: keyof DatosGrilla, v: number | null) => {
    if (hoja && v !== null) aplicar(() => hoja.conGrilla(hoja.grilla.con({ [k]: v })));
  };

  // ---------- archivos ----------
  const nuevaHoja = async (f: File) => {
    const h = await graficos.crearDesdeImagen(f);
    if (h) {
      setHojaId(h.id);
      avisar(h.tamanio && (h.tamanio.ancho > 1024 || h.tamanio.alto > 1024) ? `La imagen es grande (${h.tamanio}). Podés achicarla en «Redimensionar imagen».` : `Hoja nueva: ${h.nombreArchivo}`);
    }
  };
  const reemplazar = async (f: File) => {
    if (!hoja) return nuevaHoja(f);
    const h = await graficos.reemplazarImagen(hoja.id, f);
    if (h) avisar(`Imagen reemplazada: ${f.name}`);
  };

  // ---------- teclado ----------
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.matches("input,textarea,select")) return;
      const k = e.key.toLowerCase(),
        mod = e.ctrlKey || e.metaKey;
      if (!mod && !e.altKey) {
        if (k === "g") return setModo("grilla");
        if (k === "r") return setModo("recuadro");
        if (k === "v" || k === "m") return setModo("mover");
      }
      // Deshacer va antes que todo lo demás: también tiene que andar sin animación elegida.
      if (mod && (k === "z" || k === "y")) {
        e.preventDefault();
        return k === "y" || e.shiftKey ? rehacer() : deshacer();
      }
      if (!animacion) return;
      if (mod && k === "a") {
        e.preventDefault();
        setSeleccion(new Set(animacion.frames.map((_, i) => i)));
        return;
      }
      if (e.key === "Escape") return setSeleccion(new Set());
      if (!seleccion.size) return;
      const st = e.shiftKey ? 8 : 1;
      const mv = ({ ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] } as Record<string, [number, number]>)[e.key];
      if (mv) {
        e.preventDefault();
        desplazarSeleccion(mv[0], mv[1]);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        cambiarAnimacion(animacion.sinFrames(seleccion));
        setSeleccion(new Set());
      }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });

  const json = useMemo(() => (hoja ? formatoVista.exportar(hoja) : ""), [hoja, formatoVista]);
  const onFrameActual = useCallback((i: number) => setFrameActual(i), []);

  if (graficos.cargando) return <Cargando bloque>Cargando hojas…</Cargando>;

  const clicEnLista = (i: number, e: React.MouseEvent) => {
    const s = new Set(seleccion);
    if (e.ctrlKey || e.metaKey) s.has(i) ? s.delete(i) : s.add(i);
    else if (e.shiftKey && ancla >= 0) {
      s.clear();
      for (let k = Math.min(ancla, i); k <= Math.max(ancla, i); k++) s.add(k);
    } else {
      s.clear();
      s.add(i);
    }
    setSeleccion(s);
    if (!e.shiftKey) setAnclaSel(i);
    setIrA({ indice: i, n: Date.now() });
  };

  const repetidos = hoja?.nombresRepetidos() ?? [];

  return (
    <>
      <nav className="sheets" aria-label="Hojas de sprites">
        <span className="lbl">Hojas</span>
        {(graficos.hojas.length > TOPE_DE_LA_TIRA || filtro) && (
          <input
            id="filtroHojas"
            type="search"
            placeholder="Filtrar por nombre…"
            style={{ width: 150 }}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        )}
        <div className="sheet-tabs">
          {tira.map((h) => (
            <button key={h.id} className={`stab${h.id === hoja?.id ? " on" : ""}`} aria-pressed={h.id === hoja?.id} onClick={() => setHojaId(h.id)}>
              <MiniaturaHoja hoja={h} />
              {h.nombreArchivo}
              <span className="n">{h.animaciones.length} anim.</span>
              {h.esEjemplo && <span className="tg">ejemplo</span>}
              {!h.tieneImagen && <span className="tg">sin imagen</span>}
            </button>
          ))}
        </div>
        <BotonArchivo className="primary" accept={ACEPTA_IMG} onArchivo={nuevaHoja} id="nuevaHoja">
          + Agregar hoja…
        </BotonArchivo>
        <BotonCargarCarpeta etiqueta="+ Cargar carpeta…" />
        {coinciden > tira.length && (
          <span className="hint">
            {tira.length} de {coinciden.toLocaleString("es-AR")} hojas; filtrá para ver otras
          </span>
        )}
        <span className={`guardado ${graficos.estadoGuardado}`}>
          {graficos.estadoGuardado === "guardando" ? "Guardando…" : graficos.estadoGuardado === "error" ? "No se pudo guardar" : "Guardado en data/graficos"}
        </span>
      </nav>

      {!hoja ? (
        <div className="empty grande">
          Todavía no hay hojas. Tocá <b>+ Agregar hoja…</b> para cargar tu primera imagen, o importá un proyecto del indexador web.
        </div>
      ) : (
        <main className="layout">
          <section className="panel">
            <div className="row between">
              <div className="row">
                <div className="seg" role="group" aria-label="Modo de selección">
                  {(
                    [
                      ["grilla", "Grilla"],
                      ["recuadro", "Recuadro libre"],
                      ["mover", "Mover"],
                    ] as const
                  ).map(([m, t]) => (
                    <button key={m} className={modo === m ? "on" : ""} aria-pressed={modo === m} onClick={() => setModo(m)}>
                      {t}
                    </button>
                  ))}
                </div>
                {modo === "mover" && (
                  <label className="row chk sin-pad">
                    <input id="ajustar" type="checkbox" checked={ajustar} onChange={(e) => setAjustar(e.target.checked)} /> Ajustar a la grilla
                  </label>
                )}
                <label className="f">
                  Archivo
                  <input
                    id="nombreHoja"
                    type="text"
                    style={{ width: 170 }}
                    value={hoja.nombreArchivo}
                    onChange={(e) => e.target.value.trim() && aplicar(() => hoja.renombrada(e.target.value))}
                  />
                </label>
                <BotonArchivo accept={ACEPTA_IMG} onArchivo={reemplazar} className="abajo">
                  Reemplazar imagen…
                </BotonArchivo>
                <BotonConfirmar className="danger abajo" confirmacion="¿Seguro? Se borra del disco" onConfirmar={async () => (await graficos.eliminar(hoja.id)) && avisar("Hoja eliminada.")}>
                  Quitar hoja
                </BotonConfirmar>
              </div>
              <div className="row">
                <div className="seg" role="group" aria-label="Historial">
                  <button title="Deshacer (Ctrl+Z)" aria-label="Deshacer" disabled={!historial.puedeDeshacer} onClick={deshacer}>
                    ↶
                  </button>
                  <button title="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer" disabled={!historial.puedeRehacer} onClick={rehacer}>
                    ↷
                  </button>
                </div>
                <button aria-label="Alejar" title="Alejar (o rueda sobre la hoja)" onClick={() => cambiarZoom(-1)}>
                  −
                </button>
                <span className="status">x{zoom}</span>
                <button aria-label="Acercar" title="Acercar (o rueda sobre la hoja)" onClick={() => cambiarZoom(1)}>
                  +
                </button>
              </div>
            </div>

            <div className="row" style={{ opacity: modo === "recuadro" ? 0.55 : 1 }}>
              <CampoNumero id="gAncho" etiqueta="Ancho" valor={hoja.grilla.anchoCelda} min={1} onCambio={(v) => cambiarGrilla("anchoCelda", v)} />
              <CampoNumero id="gAlto" etiqueta="Alto" valor={hoja.grilla.altoCelda} min={1} onCambio={(v) => cambiarGrilla("altoCelda", v)} />
              <CampoNumero id="gOX" etiqueta="Offset X" valor={hoja.grilla.offsetX} min={0} onCambio={(v) => cambiarGrilla("offsetX", v)} />
              <CampoNumero id="gOY" etiqueta="Offset Y" valor={hoja.grilla.offsetY} min={0} onCambio={(v) => cambiarGrilla("offsetY", v)} />
              <CampoNumero id="gSX" etiqueta="Sep. X" valor={hoja.grilla.separacionX} min={0} onCambio={(v) => cambiarGrilla("separacionX", v)} />
              <CampoNumero id="gSY" etiqueta="Sep. Y" valor={hoja.grilla.separacionY} min={0} onCambio={(v) => cambiarGrilla("separacionY", v)} />
              <label className="f">
                Ver grilla
                <input id="verGrilla" type="checkbox" className="check-grande" checked={mostrarGrilla} onChange={(e) => setMostrarGrilla(e.target.checked)} />
              </label>
            </div>

            <PanelRedimensionar hoja={hoja} />

            <LienzoDeHoja
              hoja={hoja}
              img={img}
              animacion={animacion}
              seleccion={seleccion}
              modo={modo}
              zoom={zoom}
              mostrarGrilla={mostrarGrilla}
              ajustarAGrilla={ajustar}
              onZoom={cambiarZoom}
              onAgregarFrames={agregarFrames}
              onSeleccion={(s, u) => {
                setSeleccion(s);
                if (u >= 0) setIrA({ indice: u, n: Date.now() });
              }}
              onDesplazar={(indices, dx, dy) => animacion && hoja.tamanio && cambiarAnimacion(animacion.conFramesDesplazados(indices, dx, dy, hoja.tamanio).animacion)}
              onEstado={(e) => setEstado((x) => ({ ...x, ...e }))}
              onSoltarArchivo={(f) => (hoja.tieneImagen ? nuevaHoja(f) : reemplazar(f))}
            />
            <div className="status">
              <span>{hoja.tamanio ? `${hoja.nombreArchivo} · ${hoja.tamanio} px` : "sin imagen"}</span>
              <span>{estado.posicion ?? "x — y —"}</span>
              <span>{estado.detalle}</span>
              <span>{seleccion.size > 1 ? `${seleccion.size} frames seleccionados` : seleccion.size === 1 ? "1 frame seleccionado" : ""}</span>
            </div>
            <p className="hint">{AYUDAS[modo]}</p>
          </section>

          <aside className="side">
            <section className="panel">
              <div className="row between">
                <h2>Animaciones</h2>
                <div className="row">
                  <button
                    onClick={() => {
                      const a = Animacion.crear(casos.graficos.nuevoId(), nombreLibre(hoja));
                      aplicar(() => hoja.conAnimacionAgregada(a));
                      elegirAnimacion(a.id);
                    }}
                  >
                    + Nueva
                  </button>
                  <BotonConfirmar disabled={!animacion} onConfirmar={() => animacion && aplicar(() => hoja.sinAnimacion(animacion.id))}>
                    Borrar
                  </BotonConfirmar>
                </div>
              </div>
              <div className="anims">
                {hoja.animaciones.map((a) => (
                  <button key={a.id} className={a.id === animacion?.id ? "on" : ""} onClick={() => elegirAnimacion(a.id)}>
                    {a.nombre || "(sin nombre)"} <span className="n">{a.cantidadDeFrames}</span>
                  </button>
                ))}
              </div>
              {animacion && (
                <>
                  <div className="row">
                    <label className="f" style={{ flex: "1 1 140px" }}>
                      Nombre
                      <input id="aNombre" type="text" value={animacion.nombre} onChange={(e) => cambiarAnimacion(animacion.renombrada(e.target.value))} />
                    </label>
                    <CampoNumero id="aMs" etiqueta="ms/frame" valor={animacion.msPorFrame} min={10} step={10} onCambio={(v) => v && v >= 10 && cambiarAnimacion(animacion.conMsPorFrame(v))} />
                    <label className="f">
                      Pivote
                      <select id="aAncla" value={animacion.ancla} onChange={(e) => cambiarAnimacion(animacion.conAncla(e.target.value as Ancla))}>
                        {ANCLAS.map((x) => (
                          <option key={x.valor} value={x.valor}>
                            {x.etiqueta}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="f">
                      Loop
                      <input id="aLoop" type="checkbox" className="check-grande" checked={animacion.enBucle} onChange={(e) => cambiarAnimacion(animacion.conBucle(e.target.checked))} />
                    </label>
                  </div>
                  {repetidos.length > 0 && <p className="hint aviso">Nombres repetidos en esta hoja: {repetidos.join(", ")}. Al exportar se referencian por nombre.</p>}
                  {renderUso?.(hoja, animacion)}
                </>
              )}
            </section>

            <VistaPreviaAnimacion animacion={animacion} img={img} irA={irA} onFrameActual={onFrameActual} />

            <ListaDeFrames
              animacion={animacion}
              img={img}
              seleccion={seleccion}
              frameActual={frameActual}
              vacioTexto={modo === "grilla" ? "Todavía no hay frames. Hacé clic en las celdas de la hoja, en el orden del ciclo." : "Todavía no hay frames. Arrastrá sobre la hoja para marcar el primero."}
              onCambiar={cambiarAnimacion}
              onClicFrame={clicEnLista}
              onSeleccion={setSeleccion}
              onError={avisar}
            />

            <section className="panel">
              <div className="row between">
                <h2>{formatoVista.nombreDeArchivoPara(hoja)}</h2>
                <div className="row">
                  <button onClick={async () => avisar((await copiar(json)) ? "JSON copiado." : "No se pudo copiar.")}>Copiar</button>
                  <button className="primary" onClick={() => descargar(formatoVista.nombreDeArchivoPara(hoja), json)}>
                    Descargar
                  </button>
                </div>
              </div>
              <textarea className="json" readOnly spellCheck={false} value={json} aria-label="JSON de la hoja" />
              <details>
                <summary>Importar un .anim.json</summary>
                <div className="col">
                  <textarea id="importAnim" className="json corto" spellCheck={false} value={importTxt} onChange={(e) => setImportTxt(e.target.value)} placeholder="Pegá acá un .anim.json" />
                  <div className="row">
                    <button
                      onClick={async () => {
                        const r = await graficos.importar(importTxt);
                        if (!r) return;
                        setHojaId(r.hoja.id);
                        setImportTxt("");
                        avisar(r.hoja.tieneImagen ? `Animaciones importadas en ${r.hoja.nombreArchivo}.` : `Importado. Cargá la imagen «${r.hoja.nombreArchivo}» con «Reemplazar imagen…».`);
                      }}
                    >
                      Importar
                    </button>
                    <BotonArchivo
                      accept=".json,application/json"
                      onArchivo={async (f) => {
                        const r = await graficos.importar(await f.text());
                        if (r) {
                          setHojaId(r.hoja.id);
                          avisar(`Animaciones importadas en ${r.hoja.nombreArchivo}.`);
                        }
                      }}
                    >
                      Desde archivo…
                    </BotonArchivo>
                  </div>
                </div>
              </details>
            </section>
          </aside>
        </main>
      )}
    </>
  );
}

/** El primer `animacion_N` que no esté usado en la hoja: al exportar, las animaciones van por nombre. */
function nombreLibre(hoja: HojaDeSprites): string {
  const usados = new Set(hoja.animaciones.map((a) => a.nombre));
  let n = 1;
  while (usados.has(`animacion_${n}`)) n++;
  return `animacion_${n}`;
}

function MiniaturaHoja({ hoja }: { hoja: HojaDeSprites }) {
  const graficos = useGraficos();
  const img = useImagen(graficos.urlImagen(hoja));
  return (
    <canvas
      width={22}
      height={22}
      ref={(c) => {
        if (!c) return;
        const x = c.getContext("2d")!;
        x.clearRect(0, 0, 22, 22);
        if (!img) return;
        const k = Math.min(22 / img.width, 22 / img.height);
        x.imageSmoothingEnabled = k < 1;
        x.drawImage(img, (22 - img.width * k) / 2, (22 - img.height * k) / 2, img.width * k, img.height * k);
      }}
    />
  );
}
