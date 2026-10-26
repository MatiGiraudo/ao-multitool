"use client";
import { useEffect, useMemo, useState } from "react";
import { Autovinculador } from "@/compartido/dominio/Autovinculador";
import { DIRECCIONES } from "@/compartido/dominio/Direccion";
import type { Problema } from "@/compartido/dominio/Problema";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonArchivo, BotonConfirmar, CampoNumero } from "@/compartido/ui/componentes";
import { copiar, descargar, useImagen } from "@/compartido/ui/utilidades";
import { DibujoDeFrame } from "@/graficos/ui/DibujoDeFrame";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { RanuraGrafica } from "@/graficos/ui/RanuraGrafica";
import type { Apariencia } from "../dominio/Apariencia";
import type { Cabeza } from "../dominio/Cabeza";
import type { Cuerpo } from "../dominio/Cuerpo";
import { autovincularDirecciones, ValidadorDeApariencias, type SabeGuardarDirecciones } from "../dominio/servicios";
import { useApariencias, type ColeccionDeApariencias } from "./ProveedorDeApariencias";
import { VistaPreviaDePersonaje } from "./VistaPreviaDePersonaje";

type Pestania = "cuerpos" | "cabezas";

/** Pantalla de Apariencias: dos pestañas (cuerpos y cabezas) sobre el mismo esqueleto. */
export function EditorDeApariencias() {
  const { avisar } = useAplicacion();
  const s = useApariencias();
  const [pestania, setPestania] = useState<Pestania>("cuerpos");
  const [claveCuerpo, setClaveCuerpo] = useState<string | null>(null);
  const [claveCabeza, setClaveCabeza] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [json, setJson] = useState("");
  const [importTxt, setImportTxt] = useState("");

  const enCuerpos = pestania === "cuerpos";
  const coleccion: ColeccionDeApariencias<Apariencia> = enCuerpos ? s.cuerpos : s.cabezas;
  const cuerpo = s.cuerpos.items.find((c) => c.clave === claveCuerpo) ?? (enCuerpos ? s.cuerpos.items[0] : undefined);
  const cabeza = s.cabezas.items.find((c) => c.clave === claveCabeza) ?? (enCuerpos ? undefined : s.cabezas.items[0]);
  const actual: Apariencia | undefined = enCuerpos ? cuerpo : cabeza;

  // El JSON de la pestaña activa, con el mismo caso de uso que la descarga.
  useEffect(() => {
    setJson("");
    const t = setTimeout(async () => {
      const r = await coleccion.exportar();
      if (r) setJson(r.contenido);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestania, s.cuerpos.items, s.cabezas.items, s.catalogo]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return [...coleccion.items].filter((a) => !q || a.nombre.toLowerCase().includes(q) || String(a.numero) === q).sort((a, b) => a.numero - b.numero);
  }, [coleccion.items, busqueda]);

  if (s.cuerpos.cargando || s.cabezas.cargando) return <p className="hint">Cargando apariencias…</p>;

  const elegir = (clave: string | null) => (enCuerpos ? setClaveCuerpo(clave) : setClaveCabeza(clave));

  const nuevo = async () => {
    const a = await coleccion.crear();
    if (a) {
      setBusqueda("");
      elegir(a.clave);
      setTimeout(() => (document.getElementById("ap_nombre") as HTMLInputElement | null)?.select(), 50);
    }
  };

  const importar = async (texto: string) => {
    const r = await coleccion.importar(texto);
    if (!r) return false;
    const que = enCuerpos ? "Cuerpos" : "Cabezas";
    avisar(`${que}: ${r.agregados} nuevos, ${r.reemplazados} reemplazados.${r.pendientes ? ` ${r.pendientes} con gráficos sin encontrar: cargá esas hojas y se vinculan solos.` : ""}`);
    return true;
  };

  return (
    <main className="olayout">
      <section className="panel">
        <div className="seg" role="group" aria-label="Qué estás editando">
          <button className={enCuerpos ? "on" : ""} aria-pressed={enCuerpos} onClick={() => setPestania("cuerpos")}>
            Cuerpos ({s.cuerpos.items.length})
          </button>
          <button className={!enCuerpos ? "on" : ""} aria-pressed={!enCuerpos} onClick={() => setPestania("cabezas")}>
            Cabezas ({s.cabezas.items.length})
          </button>
        </div>
        <div className="row between">
          <input type="search" placeholder="Buscar nombre o ID" aria-label="Buscar apariencias" style={{ flex: "1 1 120px" }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <button className="primary" onClick={nuevo}>
            + Nuevo
          </button>
        </div>
        <div className="olist-items">
          {!lista.length && (
            <div className="empty">
              {coleccion.items.length ? "Ninguno coincide con la búsqueda." : `Todavía no hay ${enCuerpos ? "cuerpos" : "cabezas"}. Tocá «+ Nuevo» para crear el primero.`}
            </div>
          )}
          {lista.map((a) => (
            <ItemDeLista
              key={a.clave}
              apariencia={a}
              activo={a.clave === actual?.clave}
              problemas={ValidadorDeApariencias.problemas(a, coleccion.items, s.catalogo)}
              onClick={() => elegir(a.clave)}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        {actual ? (
          enCuerpos ? (
            <FichaDeCuerpo key={actual.clave} cuerpo={actual as Cuerpo} onBorrado={() => elegir(null)} onDuplicado={elegir} />
          ) : (
            <FichaDeCabeza key={actual.clave} cabeza={actual as Cabeza} onBorrado={() => elegir(null)} onDuplicado={elegir} />
          )
        ) : (
          <>
            <h2>Ficha</h2>
            <div className="empty">Elegí uno de la lista o creá uno nuevo con «+ Nuevo».</div>
          </>
        )}
      </section>

      <aside className="side">
        <VistaPreviaDePersonaje
          cuerpo={cuerpo}
          cabeza={cabeza}
          onElegirCabeza={enCuerpos ? (c) => setClaveCabeza(c || null) : undefined}
          onElegirCuerpo={enCuerpos ? undefined : (c) => setClaveCuerpo(c || null)}
        />
        <section className="panel">
          <div className="row between">
            <h2>{enCuerpos ? "cuerpos.json" : "cabezas.json"}</h2>
            <div className="row">
              <button onClick={async () => avisar((await copiar(json)) ? "JSON copiado." : "No se pudo copiar.")}>Copiar</button>
              <button
                className="primary"
                onClick={async () => {
                  const r = await coleccion.exportar();
                  if (r) descargar(r.nombreArchivo, r.contenido);
                }}
              >
                Descargar
              </button>
            </div>
          </div>
          <textarea className="json" readOnly spellCheck={false} value={json} aria-label="JSON de apariencias" />
          <p className="hint">Los cuerpos exportan la animación de caminar de cada lado; las cabezas, el frame de cada cara.</p>
          <details>
            <summary>Importar {enCuerpos ? "cuerpos" : "cabezas"}</summary>
            <div className="col">
              <textarea
                id="importAp"
                className="json corto"
                spellCheck={false}
                placeholder={`Pegá un ${enCuerpos ? "cuerpos" : "cabezas"}.json. Los que tengan el mismo ID se reemplazan.`}
                value={importTxt}
                onChange={(e) => setImportTxt(e.target.value)}
              />
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
}

function miniatura(a: Apariencia): ReferenciaGrafica | null {
  return a.direcciones.sur ?? a.referenciasVigentes()[0] ?? null;
}

function ItemDeLista({ apariencia, activo, problemas, onClick }: { apariencia: Apariencia; activo: boolean; problemas: Problema[]; onClick(): void }) {
  const { resolver } = useApariencias();
  const graficos = useGraficos();
  const ref = miniatura(apariencia);
  const r = resolver(ref);
  const img = useImagen(graficos.urlImagen(r?.hoja));
  const p = problemas[0];
  return (
    <button className={`oitem${activo ? " on" : ""}`} aria-pressed={activo} onClick={onClick}>
      <DibujoDeFrame img={img} frame={r?.animacion.frame(ref?.frame ?? 0) ?? r?.animacion.frames[0]} tamanio={36} />
      <span style={{ minWidth: 0 }}>
        <span className="nm">{apariencia.nombre || "(sin nombre)"}</span>
        <span className="meta">
          #{apariencia.numero}
          <span className={`pill ${p ? (p.gravedad === "error" ? "bad" : "warn") : "ok"}`} title={problemas.map((x) => x.mensaje).join(" · ")}>
            {p ? p.mensaje : "Listo"}
          </span>
        </span>
      </span>
    </button>
  );
}

/** Encabezado de ficha y botones de duplicar y borrar, iguales para las dos especies. */
function CabeceraDeFicha({ apariencia, children, onBorrado, onDuplicado, coleccion, que }: {
  apariencia: Apariencia;
  children?: React.ReactNode;
  onBorrado(): void;
  onDuplicado(clave: string): void;
  coleccion: ColeccionDeApariencias<Apariencia>;
  que: string;
}) {
  const { avisar } = useAplicacion();
  const { resolver } = useApariencias();
  const graficos = useGraficos();
  const ref = miniatura(apariencia);
  const r = resolver(ref);
  const img = useImagen(graficos.urlImagen(r?.hoja));
  return (
    <div className="ohead">
      <DibujoDeFrame img={img} frame={r?.animacion.frame(ref?.frame ?? 0) ?? r?.animacion.frames[0]} tamanio={56} />
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="tag">#{apariencia.numero}</span>
          <span className="status">{children}</span>
        </div>
        <div className="oname">{apariencia.nombre || "(sin nombre)"}</div>
      </div>
      <div className="row">
        <button
          onClick={async () => {
            const d = await coleccion.duplicar(apariencia);
            if (d) {
              onDuplicado(d.clave);
              avisar(`${que} se duplicó con el ID ${d.numero}.`);
            }
          }}
        >
          Duplicar
        </button>
        <BotonConfirmar
          confirmacion="¿Borrar?"
          onConfirmar={async () => {
            if (await coleccion.eliminar(apariencia.clave)) {
              onBorrado();
              avisar(`${que} se borró.`);
            }
          }}
        >
          Borrar
        </BotonConfirmar>
      </div>
    </div>
  );
}

/** Fila de autovínculo: elegir una hoja y llenar las cuatro direcciones de una. */
function FilaDeAutovinculo<T extends Apariencia & SabeGuardarDirecciones<T>>({ apariencia, aplicar }: { apariencia: T; aplicar(nuevo: T, cantidad: number, hoja: string): void }) {
  const s = useApariencias();
  const [hoja, setHoja] = useState(() => Autovinculador.hojaSugerida(s.catalogo) ?? "");
  return (
    <div className="row">
      <label className="f" style={{ flex: "1 1 160px" }}>
        Autovincular desde
        <select aria-label="Hoja para autovincular" value={hoja} onChange={(e) => setHoja(e.target.value)}>
          {s.catalogo.hojas().map((h) => (
            <option key={h.hojaId} value={h.hojaId}>
              {h.nombreHoja} ({Object.keys(Autovinculador.coincidencias(s.catalogo, h.hojaId)).length}/4)
            </option>
          ))}
        </select>
      </label>
      <button
        style={{ alignSelf: "flex-end" }}
        disabled={!hoja}
        onClick={() => {
          const r = autovincularDirecciones(apariencia, hoja, s.catalogo);
          aplicar(r.apariencia, r.cantidad, s.catalogo.hojas().find((h) => h.hojaId === hoja)?.nombreHoja ?? "");
        }}
      >
        Autovincular
      </button>
    </div>
  );
}

function FichaDeCuerpo({ cuerpo: c, onBorrado, onDuplicado }: { cuerpo: Cuerpo; onBorrado(): void; onDuplicado(clave: string): void }) {
  const { avisar } = useAplicacion();
  const s = useApariencias();
  const cambiar = (fn: () => Cuerpo) => {
    try {
      s.cuerpos.actualizar(fn());
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <CabeceraDeFicha apariencia={c} onBorrado={onBorrado} onDuplicado={onDuplicado} coleccion={s.cuerpos} que="El cuerpo">
        cuerpo
      </CabeceraDeFicha>

      <h3>Datos</h3>
      <div className="form-grid">
        <label className="f" htmlFor="ap_nombre">
          Nombre
          <input id="ap_nombre" type="text" value={c.nombre} maxLength={80} onChange={(e) => cambiar(() => c.renombrado(e.target.value))} />
        </label>
        <CampoNumero id="ap_numero" etiqueta="ID" valor={c.numero} min={1} ancho={90} onCambio={(v) => v !== null && cambiar(() => c.conNumero(v))} />
      </div>

      <h3>Dónde se apoya la cabeza</h3>
      <div className="form-grid">
        <CampoNumero id="ap_ox" etiqueta="Offset X" valor={c.offsetCabezaX} min={-512} max={512} ancho={90} onCambio={(v) => cambiar(() => c.conOffsetCabeza(v ?? 0, c.offsetCabezaY))} />
        <CampoNumero id="ap_oy" etiqueta="Offset Y" valor={c.offsetCabezaY} min={-512} max={512} ancho={90} onCambio={(v) => cambiar(() => c.conOffsetCabeza(c.offsetCabezaX, v ?? 0))} />
        <div className="row" role="group" aria-label="Mover la cabeza">
          <button aria-label="Mover a la izquierda" onClick={() => cambiar(() => c.conOffsetCabeza(c.offsetCabezaX - 1, c.offsetCabezaY))}>
            ←
          </button>
          <button aria-label="Mover arriba" onClick={() => cambiar(() => c.conOffsetCabeza(c.offsetCabezaX, c.offsetCabezaY - 1))}>
            ↑
          </button>
          <button aria-label="Mover abajo" onClick={() => cambiar(() => c.conOffsetCabeza(c.offsetCabezaX, c.offsetCabezaY + 1))}>
            ↓
          </button>
          <button aria-label="Mover a la derecha" onClick={() => cambiar(() => c.conOffsetCabeza(c.offsetCabezaX + 1, c.offsetCabezaY))}>
            →
          </button>
          <button onClick={() => cambiar(() => c.conOffsetCabeza(0, 0))}>Centrar</button>
        </div>
      </div>
      <p className="hint">Con 0, 0 la cabeza se apoya justo arriba del cuerpo, centrada. Mirá el resultado en la vista previa.</p>

      <h3>Caminar</h3>
      <FilaDeAutovinculo
        apariencia={c}
        aplicar={(nuevo, cantidad, hoja) => {
          if (cantidad) cambiar(() => nuevo);
          avisar(cantidad ? `Se vincularon ${cantidad} de 4 direcciones desde ${hoja}.` : `No encontré animaciones con nombres de dirección en ${hoja}.`);
        }}
      />
      <div className="slots">
        {DIRECCIONES.map((d) => (
          <RanuraGrafica
            key={d.valor}
            id={`cuerpo_${d.valor}`}
            etiqueta={`${d.flecha} ${d.etiqueta}`}
            tituloSelector={`Caminar · ${d.etiqueta}`}
            vacio="Sin vincular"
            referencia={c.direcciones[d.valor] ?? null}
            conFrame={false}
            onCambiar={(r) => cambiar(() => c.conDireccion(d.valor, r))}
          />
        ))}
      </div>
    </>
  );
}

function FichaDeCabeza({ cabeza: c, onBorrado, onDuplicado }: { cabeza: Cabeza; onBorrado(): void; onDuplicado(clave: string): void }) {
  const { avisar } = useAplicacion();
  const s = useApariencias();
  const cambiar = (fn: () => Cabeza) => {
    try {
      s.cabezas.actualizar(fn());
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <CabeceraDeFicha apariencia={c} onBorrado={onBorrado} onDuplicado={onDuplicado} coleccion={s.cabezas} que="La cabeza">
        cabeza
      </CabeceraDeFicha>

      <h3>Datos</h3>
      <div className="form-grid">
        <label className="f" htmlFor="ap_nombre">
          Nombre
          <input id="ap_nombre" type="text" value={c.nombre} maxLength={80} onChange={(e) => cambiar(() => c.renombrada(e.target.value))} />
        </label>
        <CampoNumero id="ap_numero" etiqueta="ID" valor={c.numero} min={1} ancho={90} onCambio={(v) => v !== null && cambiar(() => c.conNumero(v))} />
      </div>

      <h3>Caras</h3>
      <FilaDeAutovinculo
        apariencia={c}
        aplicar={(nuevo, cantidad, hoja) => {
          if (cantidad) cambiar(() => nuevo);
          avisar(cantidad ? `Se vincularon ${cantidad} de 4 direcciones desde ${hoja}.` : `No encontré animaciones con nombres de dirección en ${hoja}.`);
        }}
      />
      <div className="slots">
        {DIRECCIONES.map((d) => (
          <RanuraGrafica
            key={d.valor}
            id={`cabeza_${d.valor}`}
            etiqueta={`${d.flecha} ${d.etiqueta}`}
            tituloSelector={`Cara · ${d.etiqueta}`}
            vacio="Sin vincular"
            referencia={c.direcciones[d.valor] ?? null}
            conFrame
            onCambiar={(r) => cambiar(() => c.conDireccion(d.valor, r))}
          />
        ))}
      </div>
      <p className="hint">Si las cuatro caras están en una misma animación, elegila en las cuatro y movelas al frame que corresponda con ◀ ▶.</p>
    </>
  );
}
