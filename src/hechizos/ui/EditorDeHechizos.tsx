"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Problema } from "@/compartido/dominio/Problema";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { CamposDeAtributos, CasillasDeBanderas } from "@/compartido/ui/CamposDeAtributos";
import { BotonArchivo, BotonConfirmar, CampoNumero } from "@/compartido/ui/componentes";
import { copiar, descargar } from "@/compartido/ui/utilidades";
import type { Hechizo } from "../dominio/Hechizo";
import { ValidadorDeHechizos } from "../dominio/servicios";
import { BANDERAS_DE_HECHIZO, OBJETIVOS, TIPOS_DE_HECHIZO, type TipoDeHechizoId } from "../dominio/TipoDeHechizo";
import { useHechizos } from "./ProveedorDeHechizos";

/**
 * Pantalla de Hechizos: lista | ficha | FX y JSON.
 *
 * `renderFx` lo pone la página: es cómo se ve el FX elegido, y viene del módulo FX. Hechizos no lo
 * conoce, igual que Animaciones no conoce a Objetos cuando muestra «Usada por».
 */
export function EditorDeHechizos({ renderFx }: { renderFx?: (numero: number) => ReactNode }) {
  const { avisar } = useAplicacion();
  const s = useHechizos();
  const [clave, setClave] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [json, setJson] = useState("");
  const [importTxt, setImportTxt] = useState("");

  const hechizo = s.hechizos.find((h) => h.clave === clave) ?? s.hechizos[0];

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await s.exportar();
      if (r) setJson(r.contenido);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.hechizos]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return [...s.hechizos]
      .filter((h) => (!filtro || h.tipo.id === filtro) && (!q || h.nombre.toLowerCase().includes(q) || h.palabrasMagicas.toLowerCase().includes(q) || String(h.numero) === q))
      .sort((a, b) => a.numero - b.numero);
  }, [s.hechizos, busqueda, filtro]);

  if (s.cargando) return <p className="hint">Cargando hechizos…</p>;

  const nuevo = async () => {
    const h = await s.crear();
    if (h) {
      setBusqueda("");
      setFiltro("");
      setClave(h.clave);
      setTimeout(() => (document.getElementById("h_nombre") as HTMLInputElement | null)?.select(), 50);
    }
  };

  const importar = async (texto: string) => {
    const r = await s.importar(texto);
    if (!r) return false;
    avisar(`Hechizos: ${r.agregados} nuevos, ${r.reemplazados} reemplazados.`);
    return true;
  };

  return (
    <main className="olayout">
      <section className="panel">
        <div className="row between">
          <h2>Hechizos ({s.hechizos.length})</h2>
          <button className="primary" onClick={nuevo}>
            + Nuevo
          </button>
        </div>
        <div className="row">
          <input type="search" placeholder="Buscar nombre, palabras o ID" aria-label="Buscar hechizos" style={{ flex: "1 1 120px" }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select aria-label="Filtrar por efecto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los efectos</option>
            {TIPOS_DE_HECHIZO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="olist-items">
          {!lista.length && <div className="empty">{s.hechizos.length ? "Ninguno coincide con el filtro." : "Todavía no hay hechizos. Tocá «+ Nuevo» para crear el primero."}</div>}
          {lista.map((h) => (
            <ItemDeLista key={h.clave} hechizo={h} activo={h.clave === hechizo?.clave} problemas={ValidadorDeHechizos.problemas(h, s.hechizos, s.fx)} onClick={() => setClave(h.clave)} />
          ))}
        </div>
      </section>

      <section className="panel">
        {hechizo ? (
          <Ficha key={hechizo.clave} hechizo={hechizo} onBorrado={() => setClave(null)} onDuplicado={setClave} />
        ) : (
          <>
            <h2>Ficha</h2>
            <div className="empty">Elegí un hechizo de la lista o creá uno nuevo con «+ Nuevo».</div>
          </>
        )}
      </section>

      <aside className="side">
        {hechizo && (
          <section className="panel">
            <div className="row between">
              <h2>FX</h2>
              <span className="status">{hechizo.fx ? `n.º ${hechizo.fx}` : "ninguno"}</span>
            </div>
            {renderFx ? renderFx(hechizo.fx) : <p className="hint">El FX se elige por número, igual que en el juego.</p>}
          </section>
        )}
        <section className="panel">
          <div className="row between">
            <h2>hechizos.json</h2>
            <div className="row">
              <button onClick={async () => avisar((await copiar(json)) ? "JSON de hechizos copiado." : "No se pudo copiar.")}>Copiar</button>
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
          <textarea className="json" readOnly spellCheck={false} value={json} aria-label="JSON de hechizos" />
          <details>
            <summary>Importar hechizos</summary>
            <div className="col">
              <textarea id="importHechizos" className="json corto" spellCheck={false} placeholder="Pegá un hechizos.json. Los que tengan el mismo ID se reemplazan." value={importTxt} onChange={(e) => setImportTxt(e.target.value)} />
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

function ItemDeLista({ hechizo, activo, problemas, onClick }: { hechizo: Hechizo; activo: boolean; problemas: Problema[]; onClick(): void }) {
  const p = problemas[0];
  return (
    <button className={`oitem${activo ? " on" : ""}`} aria-pressed={activo} onClick={onClick} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <span style={{ minWidth: 0 }}>
        <span className="nm">{hechizo.nombre || "(sin nombre)"}</span>
        <span className="meta">
          #{hechizo.numero} · {hechizo.tipo.nombre}
          <span className={`pill ${p ? (p.gravedad === "error" ? "bad" : "warn") : "ok"}`} title={problemas.map((x) => x.mensaje).join(" · ")}>
            {p ? p.mensaje : "Listo"}
          </span>
        </span>
      </span>
    </button>
  );
}

function Ficha({ hechizo: h, onBorrado, onDuplicado }: { hechizo: Hechizo; onBorrado(): void; onDuplicado(clave: string): void }) {
  const { avisar } = useAplicacion();
  const s = useHechizos();
  const cambiar = (fn: () => Hechizo) => {
    try {
      s.actualizar(fn());
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
    }
  };
  const t = h.tipo;

  return (
    <>
      <div className="ohead sin-icono">
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="tag">#{h.numero}</span>
            <span className="status">{t.nombre}</span>
          </div>
          <div className="oname">{h.nombre || "(sin nombre)"}</div>
        </div>
        <div className="row">
          <button
            onClick={async () => {
              const d = await s.duplicar(h);
              if (d) {
                onDuplicado(d.clave);
                avisar(`Hechizo duplicado con el ID ${d.numero}.`);
              }
            }}
          >
            Duplicar
          </button>
          <BotonConfirmar
            confirmacion="¿Borrar?"
            onConfirmar={async () => {
              if (await s.eliminar(h.clave)) {
                onBorrado();
                avisar("El hechizo se borró.");
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
          <label className="f" htmlFor="h_nombre">
            Nombre
            <input id="h_nombre" type="text" value={h.nombre} maxLength={80} onChange={(e) => cambiar(() => h.renombrado(e.target.value))} />
          </label>
          <CampoNumero id="h_numero" etiqueta="ID" valor={h.numero} min={1} ancho={90} onCambio={(v) => v !== null && cambiar(() => h.conNumero(v))} />
          <label className="f full" htmlFor="h_palabras">
            Palabras mágicas
            <input id="h_palabras" type="text" value={h.palabrasMagicas} maxLength={120} placeholder="OHL VOR PEK" onChange={(e) => cambiar(() => h.conPalabrasMagicas(e.target.value))} />
          </label>
          <label className="f full" htmlFor="h_desc">
            Descripción
            <textarea id="h_desc" rows={2} value={h.descripcion} onChange={(e) => cambiar(() => h.conDescripcion(e.target.value))} />
          </label>
        </div>
        <CasillasDeBanderas idPrefijo="hf" definiciones={BANDERAS_DE_HECHIZO} activa={(c) => h.tieneBandera(c)} onCambiar={(c, activa) => cambiar(() => h.conBandera(c, activa))} />
      </div>

      <div className="fset">
        <h3>Qué hace</h3>
        <div className="form-grid">
          <label className="f" htmlFor="h_tipo">
            Efecto
            <select id="h_tipo" value={t.id} onChange={(e) => cambiar(() => h.conTipo(e.target.value as TipoDeHechizoId))}>
              {TIPOS_DE_HECHIZO.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="h_objetivo">
            Se lanza
            <select id="h_objetivo" value={h.objetivo} onChange={(e) => cambiar(() => h.conObjetivo(e.target.value as typeof h.objetivo))}>
              {OBJETIVOS.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>
        <CamposDeAtributos idPrefijo="ha" definiciones={t.atributos} valores={h.atributos} onCambiar={(clave, valor) => cambiar(() => h.conAtributo(clave, valor))} />
        {!t.atributos.length && <p className="hint">Este efecto no necesita más datos.</p>}
      </div>

      <div className="fset">
        <h3>Qué cuesta</h3>
        <div className="form-grid">
          <CampoNumero id="h_mana" etiqueta="Maná" valor={h.mana} min={0} ancho={90} onCambio={(v) => cambiar(() => h.conMana(v ?? 0))} />
          <CampoNumero id="h_energia" etiqueta="Energía" valor={h.energia} min={0} ancho={90} onCambio={(v) => cambiar(() => h.conEnergia(v ?? 0))} />
          <CampoNumero id="h_skill" etiqueta="Skill mín." valor={h.skillRequerido} min={0} ancho={90} onCambio={(v) => cambiar(() => h.conSkillRequerido(v ?? 0))} />
          <CampoNumero id="h_nivel" etiqueta="Nivel mín." valor={h.nivelMinimo} min={0} ancho={90} onCambio={(v) => cambiar(() => h.conNivelMinimo(v ?? 0))} />
        </div>
      </div>

      <div className="fset">
        <h3>Cómo se ve y se escucha</h3>
        <div className="form-grid">
          <CampoNumero id="h_fx" etiqueta="FX (n.º)" valor={h.fx} min={0} ancho={90} placeholder="0 = ninguno" onCambio={(v) => cambiar(() => h.conFx(v ?? 0))} />
          <label className="f" htmlFor="h_sonido">
            Sonido
            <input id="h_sonido" type="text" value={h.sonido} maxLength={60} placeholder="61.wav" onChange={(e) => cambiar(() => h.conSonido(e.target.value))} />
          </label>
        </div>
        <p className="hint">El FX se apunta por número, igual que en el juego. A la derecha ves cuál es.</p>
      </div>
    </>
  );
}
