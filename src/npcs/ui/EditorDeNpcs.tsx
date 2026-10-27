"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DIRECCIONES } from "@/compartido/dominio/Direccion";
import type { Problema } from "@/compartido/dominio/Problema";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { CamposDeAtributos, CasillasDeBanderas } from "@/compartido/ui/CamposDeAtributos";
import { BotonArchivo, BotonConfirmar, CampoNumero } from "@/compartido/ui/componentes";
import { SelectorPorNumero } from "@/compartido/ui/SelectorPorNumero";
import { copiar, descargar } from "@/compartido/ui/utilidades";
import type { Drop, EnVenta, Npc } from "../dominio/Npc";
import { ValidadorDeNpcs } from "../dominio/servicios";
import { BANDERAS_DE_NPC, MOVIMIENTOS, TIPOS_DE_NPC, type MovimientoDeNpc, type TipoDeNpcId } from "../dominio/TipoDeNpc";
import { useNpcs } from "./ProveedorDeNpcs";

/**
 * Pantalla de NPCs: lista | ficha por secciones | vista previa y JSON.
 *
 * `renderApariencia` lo pone la página: es el personaje armado con el cuerpo y la cabeza elegidos,
 * y sale del módulo Apariencias. NPCs no lo conoce.
 */
export function EditorDeNpcs({ renderApariencia }: { renderApariencia?: (cuerpo: number, cabeza: number) => ReactNode }) {
  const { avisar } = useAplicacion();
  const s = useNpcs();
  const [clave, setClave] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [json, setJson] = useState("");
  const [importTxt, setImportTxt] = useState("");

  const npc = s.npcs.find((n) => n.clave === clave) ?? s.npcs[0];

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await s.exportar();
      if (r) setJson(r.contenido);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.npcs]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return [...s.npcs]
      .filter((n) => (!filtro || n.tipo.id === filtro) && (!q || n.nombre.toLowerCase().includes(q) || String(n.numero) === q))
      .sort((a, b) => a.numero - b.numero);
  }, [s.npcs, busqueda, filtro]);

  if (s.cargando) return <p className="hint">Cargando NPCs…</p>;

  const nuevo = async () => {
    const n = await s.crear();
    if (n) {
      setBusqueda("");
      setFiltro("");
      setClave(n.clave);
      setTimeout(() => (document.getElementById("n_nombre") as HTMLInputElement | null)?.select(), 50);
    }
  };

  const importar = async (texto: string) => {
    const r = await s.importar(texto);
    if (!r) return false;
    avisar(`NPCs: ${r.agregados} nuevos, ${r.reemplazados} reemplazados.`);
    return true;
  };

  return (
    <main className="olayout">
      <section className="panel">
        <div className="row between">
          <h2>NPCs ({s.npcs.length})</h2>
          <button className="primary" onClick={nuevo}>
            + Nuevo
          </button>
        </div>
        <div className="row">
          <input type="search" placeholder="Buscar nombre o ID" aria-label="Buscar NPCs" style={{ flex: "1 1 120px" }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select aria-label="Filtrar por tipo" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS_DE_NPC.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="olist-items">
          {!lista.length && <div className="empty">{s.npcs.length ? "Ninguno coincide con el filtro." : "Todavía no hay NPCs. Tocá «+ Nuevo» para crear el primero."}</div>}
          {lista.map((n) => (
            <ItemDeLista key={n.clave} npc={n} activo={n.clave === npc?.clave} problemas={ValidadorDeNpcs.problemas(n, s.npcs, s.catalogos)} onClick={() => setClave(n.clave)} />
          ))}
        </div>
      </section>

      <section className="panel">
        {npc ? (
          <Ficha key={npc.clave} npc={npc} onBorrado={() => setClave(null)} onDuplicado={setClave} />
        ) : (
          <>
            <h2>Ficha</h2>
            <div className="empty">Elegí un NPC de la lista o creá uno nuevo con «+ Nuevo».</div>
          </>
        )}
      </section>

      <aside className="side">
        {npc && renderApariencia?.(npc.cuerpo, npc.cabeza)}
        <section className="panel">
          <div className="row between">
            <h2>npcs.json</h2>
            <div className="row">
              <button onClick={async () => avisar((await copiar(json)) ? "JSON de NPCs copiado." : "No se pudo copiar.")}>Copiar</button>
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
          <textarea className="json" readOnly spellCheck={false} value={json} aria-label="JSON de NPCs" />
          <p className="hint">Todo lo que apunta a otra cosa —cuerpo, cabeza, objetos, hechizos— va por número, igual que en el juego.</p>
          <details>
            <summary>Importar NPCs</summary>
            <div className="col">
              <textarea id="importNpcs" className="json corto" spellCheck={false} placeholder="Pegá un npcs.json. Los que tengan el mismo ID se reemplazan." value={importTxt} onChange={(e) => setImportTxt(e.target.value)} />
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

function ItemDeLista({ npc, activo, problemas, onClick }: { npc: Npc; activo: boolean; problemas: Problema[]; onClick(): void }) {
  const p = problemas[0];
  return (
    <button className={`oitem${activo ? " on" : ""}`} aria-pressed={activo} onClick={onClick} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <span style={{ minWidth: 0 }}>
        <span className="nm">{npc.nombre || "(sin nombre)"}</span>
        <span className="meta">
          #{npc.numero} · {npc.tipo.nombre}
          <span className={`pill ${p ? (p.gravedad === "error" ? "bad" : "warn") : "ok"}`} title={problemas.map((x) => x.mensaje).join(" · ")}>
            {p ? p.mensaje : "Listo"}
          </span>
        </span>
      </span>
    </button>
  );
}

function Ficha({ npc: n, onBorrado, onDuplicado }: { npc: Npc; onBorrado(): void; onDuplicado(clave: string): void }) {
  const { avisar } = useAplicacion();
  const s = useNpcs();
  const cambiar = (fn: () => Npc) => {
    try {
      s.actualizar(fn());
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
    }
  };
  const t = n.tipo;

  return (
    <>
      <div className="ohead sin-icono">
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="tag">#{n.numero}</span>
            <span className="status">{t.nombre}</span>
          </div>
          <div className="oname">{n.nombre || "(sin nombre)"}</div>
        </div>
        <div className="row">
          <button
            onClick={async () => {
              const d = await s.duplicar(n);
              if (d) {
                onDuplicado(d.clave);
                avisar(`El NPC se duplicó con el ID ${d.numero}.`);
              }
            }}
          >
            Duplicar
          </button>
          <BotonConfirmar
            confirmacion="¿Borrar?"
            onConfirmar={async () => {
              if (await s.eliminar(n.clave)) {
                onBorrado();
                avisar("El NPC se borró.");
              }
            }}
          >
            Borrar
          </BotonConfirmar>
        </div>
      </div>

      <div className="fset">
        <h3>Datos</h3>
        <div className="form-grid">
          <label className="f" htmlFor="n_nombre">
            Nombre
            <input id="n_nombre" type="text" value={n.nombre} maxLength={80} onChange={(e) => cambiar(() => n.renombrado(e.target.value))} />
          </label>
          <CampoNumero id="n_numero" etiqueta="ID" valor={n.numero} min={1} ancho={90} onCambio={(v) => v !== null && cambiar(() => n.conNumero(v))} />
          <label className="f" htmlFor="n_tipo">
            Tipo
            <select id="n_tipo" value={t.id} onChange={(e) => cambiar(() => n.conTipo(e.target.value as TipoDeNpcId))}>
              {TIPOS_DE_NPC.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="f full" htmlFor="n_desc">
            Descripción
            <textarea id="n_desc" rows={2} value={n.descripcion} onChange={(e) => cambiar(() => n.conDescripcion(e.target.value))} />
          </label>
        </div>
        <CasillasDeBanderas idPrefijo="nf" definiciones={BANDERAS_DE_NPC} activa={(c) => n.tieneBandera(c)} onCambiar={(c, activa) => cambiar(() => n.conBandera(c, activa))} />
      </div>

      <div className="fset">
        <h3>Apariencia</h3>
        <div className="form-grid">
          <SelectorPorNumero id="n_cuerpo" etiqueta="Cuerpo" catalogo={s.catalogos.cuerpos} valor={n.cuerpo} vacio="— sin cuerpo —" onCambiar={(v) => cambiar(() => n.conCuerpo(v))} />
          <SelectorPorNumero id="n_cabeza" etiqueta="Cabeza" catalogo={s.catalogos.cabezas} valor={n.cabeza} vacio="— sin cabeza —" onCambiar={(v) => cambiar(() => n.conCabeza(v))} />
          <label className="f" htmlFor="n_dir">
            Mira hacia
            <select id="n_dir" value={n.direccion} onChange={(e) => cambiar(() => n.conDireccion(e.target.value as typeof n.direccion))}>
              {DIRECCIONES.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.flecha} {d.etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="n_mov">
            Se mueve
            <select id="n_mov" value={n.movimiento} onChange={(e) => cambiar(() => n.conMovimiento(e.target.value as MovimientoDeNpc))}>
              {MOVIMIENTOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">Los animales no tienen cabeza aparte: va en «sin cabeza» y el cuerpo ya la trae dibujada.</p>
      </div>

      {t.pelea && (
        <div className="fset">
          <h3>Combate</h3>
          <CamposDeAtributos idPrefijo="na" definiciones={t.atributos} valores={n.atributos} onCambiar={(clave, valor) => cambiar(() => n.conAtributo(clave, valor))} />
        </div>
      )}

      {t.lanzaHechizos && (
        <div className="fset">
          <h3>Hechizos que lanza</h3>
          <ListaDeNumeros
            idPrefijo="nh"
            catalogo={s.catalogos.hechizos}
            valores={n.hechizos}
            vacio="Todavía no lanza ninguno."
            onCambiar={(numeros) => cambiar(() => n.conHechizos(numeros))}
          />
        </div>
      )}

      {t.suelta && (
        <div className="fset">
          <h3>Suelta al morir</h3>
          <ListaDeObjetos
            idPrefijo="nd"
            catalogo={s.catalogos.objetos}
            filas={n.drops}
            conProbabilidad
            vacio="No suelta nada."
            onCambiar={(filas) => cambiar(() => n.conDrops(filas as Drop[]))}
          />
        </div>
      )}

      {t.comercia && (
        <div className="fset">
          <h3>Vende</h3>
          <ListaDeObjetos
            idPrefijo="nv"
            catalogo={s.catalogos.objetos}
            filas={n.enVenta}
            vacio="No tiene nada para vender."
            onCambiar={(filas) => cambiar(() => n.conEnVenta(filas))}
          />
        </div>
      )}
    </>
  );
}

/** Lista de números de otra familia (los hechizos que lanza), con su selector. */
function ListaDeNumeros(p: {
  idPrefijo: string;
  catalogo: Parameters<typeof SelectorPorNumero>[0]["catalogo"];
  valores: readonly number[];
  vacio: string;
  onCambiar(numeros: number[]): void;
}) {
  return (
    <div className="col">
      {!p.valores.length && <p className="hint">{p.vacio}</p>}
      {p.valores.map((valor, i) => (
        <div key={`${valor}-${i}`} className="row">
          <SelectorPorNumero
            id={`${p.idPrefijo}_${i}`}
            catalogo={p.catalogo}
            valor={valor}
            onCambiar={(n) => p.onCambiar(p.valores.map((v, j) => (j === i ? n : v)).filter((v) => v > 0))}
          />
          <button className="danger" aria-label="Quitar" onClick={() => p.onCambiar(p.valores.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <div className="row">
        <button onClick={() => p.onCambiar([...p.valores, primerNumero(p.catalogo)])} disabled={!p.catalogo.todos().length}>
          + Agregar
        </button>
        {!p.catalogo.todos().length && <span className="hint">No hay de dónde elegir todavía.</span>}
      </div>
    </div>
  );
}

/** Lista de objeto + cantidad (y probabilidad, cuando es lo que suelta al morir). */
function ListaDeObjetos(p: {
  idPrefijo: string;
  catalogo: Parameters<typeof SelectorPorNumero>[0]["catalogo"];
  filas: readonly (EnVenta | Drop)[];
  conProbabilidad?: boolean;
  vacio: string;
  onCambiar(filas: (EnVenta | Drop)[]): void;
}) {
  const cambiarFila = (i: number, cambio: Partial<Drop>) => p.onCambiar(p.filas.map((f, j) => (j === i ? { ...f, ...cambio } : f)));

  return (
    <div className="col">
      {!p.filas.length && <p className="hint">{p.vacio}</p>}
      {p.filas.map((fila, i) => (
        <div key={i} className="row">
          <SelectorPorNumero id={`${p.idPrefijo}_obj_${i}`} catalogo={p.catalogo} valor={fila.objeto} onCambiar={(n) => cambiarFila(i, { objeto: n })} />
          <CampoNumero id={`${p.idPrefijo}_cant_${i}`} etiqueta="Cantidad" valor={fila.cantidad} min={1} ancho={80} onCambio={(v) => cambiarFila(i, { cantidad: Math.max(1, v ?? 1) })} />
          {p.conProbabilidad && "probabilidad" in fila && (
            <CampoNumero
              id={`${p.idPrefijo}_prob_${i}`}
              etiqueta="Prob. %"
              valor={fila.probabilidad}
              min={1}
              max={100}
              ancho={80}
              onCambio={(v) => cambiarFila(i, { probabilidad: Math.min(100, Math.max(1, v ?? 100)) })}
            />
          )}
          <button className="danger" aria-label="Quitar" style={{ alignSelf: "flex-end" }} onClick={() => p.onCambiar(p.filas.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <div className="row">
        <button
          disabled={!p.catalogo.todos().length}
          onClick={() =>
            p.onCambiar([
              ...p.filas,
              p.conProbabilidad ? { objeto: primerNumero(p.catalogo), cantidad: 1, probabilidad: 100 } : { objeto: primerNumero(p.catalogo), cantidad: 1 },
            ])
          }
        >
          + Agregar
        </button>
        {!p.catalogo.todos().length && <span className="hint">No hay objetos cargados todavía.</span>}
      </div>
    </div>
  );
}

function primerNumero(catalogo: Parameters<typeof SelectorPorNumero>[0]["catalogo"]): number {
  return catalogo.todos()[0]?.numero ?? 0;
}
