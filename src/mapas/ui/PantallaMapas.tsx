"use client";
import { useCallback, useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivos, Cargando } from "@/compartido/ui/componentes";
import type { GraficosDelMapa } from "../aplicacion/casosDeUso";
import type { Mapa } from "../dominio/Mapa";
import { CAPAS_POR_DEFECTO, LienzoDeMapa, type CapasVisibles } from "./LienzoDeMapa";

/**
 * El visor de mapas: abrís la carpeta `Mundos` del juego y mirás cualquier mapa.
 *
 * Carga sólo lo que el mapa pide. Un mapa usa unos 180 gráficos distintos, que salen de unas
 * decenas de hojas: esas se piden y ninguna más, aunque tengas miles cargadas.
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
  ancho: number;
  graficos: GraficosDelMapa;
  imagenes: Map<string, CanvasImageSource>;
  ms: number;
}

export function PantallaMapas() {
  const { casos, avisar, intentar } = useAplicacion();
  const [trios, setTrios] = useState<Trio[]>([]);
  const [abierto, setAbierto] = useState<Abierto | null>(null);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const [capas, setCapas] = useState<CapasVisibles>(CAPAS_POR_DEFECTO);
  const [celda, setCelda] = useState<{ x: number; y: number } | null>(null);

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

  const abrir = useCallback(
    async (trio: Trio) => {
      setAbriendo(trio.numero);
      const empezo = performance.now();
      const resultado = await intentar(async () => {
        const [map, inf] = await Promise.all([trio.map.arrayBuffer(), trio.inf.arrayBuffer()]);
        const dat = trio.dat ? await leerAnsi(trio.dat) : undefined;
        const { mapa, ancho } = casos.mapas.abrir.ejecutar({ numero: trio.numero, map, inf, dat });
        const graficos = await casos.mapas.resolverGraficos.ejecutar(mapa);
        const imagenes = await cargarHojas(graficos, (hojaId, version) => casos.ubicadorDeImagenes.urlDe(hojaId, version));
        return { mapa, ancho, graficos, imagenes, ms: Math.round(performance.now() - empezo) };
      }, `Abriendo ${trio.nombre}`);
      setAbriendo(null);
      if (resultado) setAbierto(resultado);
    },
    [casos, intentar],
  );

  return (
    <main className="mapa-layout">
      <section className="panel">
        <h2>Mapas ({trios.length})</h2>
        <BotonArchivos accept=".map,.inf,.dat" carpeta onArchivos={elegirCarpeta} className="primary">
          Elegir la carpeta Mundos…
        </BotonArchivos>
        <p className="hint">Los archivos se leen en tu máquina; no se sube nada ni se guarda todavía.</p>
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
                {abierto.mapa.contar().graficos} gráficos · {abierto.graficos.hojas.length} hojas · {abierto.ms} ms
              </span>
            </div>
            <LienzoDeMapa
              mapa={abierto.mapa}
              graficos={abierto.graficos.porGrh}
              imagenes={abierto.imagenes}
              capas={capas}
              onCelda={(x, y) => setCelda({ x, y })}
            />
            <div className="flags">
              {(Object.keys(CAPAS_POR_DEFECTO) as (keyof CapasVisibles)[]).map((k) => (
                <label key={k}>
                  <input type="checkbox" checked={capas[k]} onChange={(e) => setCapas({ ...capas, [k]: e.target.checked })} /> {ETIQUETAS[k]}
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="side">
        {abierto && (
          <>
            <section className="panel">
              <h2>La celda</h2>
              {celda ? <DetalleDeCelda mapa={abierto.mapa} x={celda.x} y={celda.y} /> : <p className="hint">Pasá el mouse por el mapa.</p>}
            </section>
            <section className="panel">
              <h2>El mapa</h2>
              <Resumen abierto={abierto} />
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

function DetalleDeCelda({ mapa, x, y }: { mapa: Mapa; x: number; y: number }) {
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

function Resumen({ abierto }: { abierto: Abierto }) {
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
async function cargarHojas(graficos: GraficosDelMapa, url: (hojaId: string, version: number) => string): Promise<Map<string, CanvasImageSource>> {
  const porHoja = new Map<string, number>();
  for (const r of graficos.porGrh.values()) porHoja.set(r.hojaId, r.versionImagen);

  const out = new Map<string, CanvasImageSource>();
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
