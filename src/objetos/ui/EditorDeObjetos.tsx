"use client";
import { useEffect, useMemo, useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { CamposDeAtributos, CasillasDeBanderas } from "@/compartido/ui/CamposDeAtributos";
import { BotonArchivo, BotonConfirmar, Cargando } from "@/compartido/ui/componentes";
import { copiar, descargar, useImagen } from "@/compartido/ui/utilidades";
import { DibujoDeFrame } from "@/graficos/ui/DibujoDeFrame";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { DIRECCIONES } from "@/compartido/dominio/Direccion";
import type { Objeto } from "../dominio/Objeto";
import { Autovinculador } from "@/compartido/dominio/Autovinculador";
import type { Problema } from "@/compartido/dominio/Problema";
import { ValidadorDeObjetos } from "../dominio/servicios";
import { banderasPermitidas, TIPOS_DE_OBJETO, type TipoDeObjetoId } from "../dominio/TipoDeObjeto";
import { useObjetos } from "./ProveedorDeObjetos";
import { RanuraGrafica } from "@/graficos/ui/RanuraGrafica";
import { VistaPreviaDeObjeto } from "./VistaPreviaDeObjeto";

/** Pantalla de Objetos: lista | ficha | vista previa y JSON. */
export function EditorDeObjetos() {
  const { avisar } = useAplicacion();
  const s = useObjetos();
  const [clave, setClave] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [json, setJson] = useState("");
  const [importTxt, setImportTxt] = useState("");

  const objeto = s.objetos.find((o) => o.clave === clave) ?? s.objetos[0];

  // El JSON se recalcula con los mismos casos de uso que la descarga (con una pequeña demora al editar).
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await s.exportar();
      if (r) setJson(r.contenido);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.objetos, s.catalogo]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return [...s.objetos]
      .filter((o) => (!filtro || o.tipo.id === filtro) && (!q || o.nombre.toLowerCase().includes(q) || String(o.numero) === q))
      .sort((a, b) => a.numero - b.numero);
  }, [s.objetos, busqueda, filtro]);

  if (s.cargando) return <Cargando bloque>Cargando objetos…</Cargando>;

  const nuevo = async () => {
    const o = await s.crear();
    if (o) {
      setBusqueda("");
      setFiltro("");
      setClave(o.clave);
      setTimeout(() => (document.getElementById("o_nombre") as HTMLInputElement | null)?.select(), 50);
    }
  };

  return (
    <main className="olayout">
      <section className="panel">
        <div className="row between">
          <h2>Objetos ({s.objetos.length})</h2>
          <button className="primary" onClick={nuevo}>
            + Nuevo
          </button>
        </div>
        <div className="row">
          <input type="search" placeholder="Buscar nombre o ID" aria-label="Buscar objetos" style={{ flex: "1 1 120px" }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select aria-label="Filtrar por tipo" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS_DE_OBJETO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="olist-items">
          {!lista.length && <div className="empty">{s.objetos.length ? "Ningún objeto coincide con el filtro." : "Todavía no hay objetos. Tocá «+ Nuevo» para crear el primero."}</div>}
          {lista.map((o) => (
            <ItemDeLista key={o.clave} objeto={o} activo={o.clave === objeto?.clave} problemas={ValidadorDeObjetos.problemas(o, s.objetos, s.catalogo)} onClick={() => setClave(o.clave)} />
          ))}
        </div>
      </section>

      <section className="panel">
        {objeto ? (
          <Ficha key={objeto.clave} objeto={objeto} onBorrado={() => setClave(null)} onDuplicado={(c) => setClave(c)} />
        ) : (
          <>
            <h2>Ficha</h2>
            <div className="empty">Elegí un objeto de la lista o creá uno nuevo con «+ Nuevo».</div>
          </>
        )}
      </section>

      <aside className="side">
        {objeto && <VistaPreviaDeObjeto objeto={objeto} />}
        <section className="panel">
          <div className="row between">
            <h2>objetos.json</h2>
            <div className="row">
              <button onClick={async () => avisar((await copiar(json)) ? "JSON de objetos copiado." : "No se pudo copiar.")}>Copiar</button>
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
          <textarea className="json" readOnly spellCheck={false} value={json} aria-label="JSON de objetos" />
          <p className="hint">Cada gráfico se referencia por hoja y nombre de animación, igual que en los .anim.json.</p>
          <details>
            <summary>Importar objetos</summary>
            <div className="col">
              <textarea id="importObjs" className="json corto" spellCheck={false} placeholder="Pegá un objetos.json. Los objetos con el mismo ID se reemplazan." value={importTxt} onChange={(e) => setImportTxt(e.target.value)} />
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

  async function importar(texto: string) {
    const r = await s.importar(texto);
    if (!r) return false;
    avisar(`Objetos: ${r.agregados} nuevos, ${r.reemplazados} reemplazados.${r.pendientes ? ` ${r.pendientes} con gráficos sin encontrar: cargá esas hojas y se vinculan solos.` : ""}`);
    return true;
  }
}

function ItemDeLista({ objeto, activo, problemas, onClick }: { objeto: Objeto; activo: boolean; problemas: Problema[]; onClick(): void }) {
  const { resolver } = useObjetos();
  const graficos = useGraficos();
  const r = resolver(objeto.graficos.icono);
  const img = useImagen(graficos.urlImagen(r?.hoja));
  const p = problemas[0];
  return (
    <button className={`oitem${activo ? " on" : ""}`} aria-pressed={activo} onClick={onClick}>
      <DibujoDeFrame img={img} frame={r?.animacion.frame(objeto.graficos.icono?.frame ?? 0) ?? r?.animacion.frames[0]} tamanio={36} />
      <span style={{ minWidth: 0 }}>
        <span className="nm">{objeto.nombre || "(sin nombre)"}</span>
        <span className="meta">
          #{objeto.numero} · {objeto.tipo.nombre}
          <span className={`pill ${p ? (p.gravedad === "error" ? "bad" : "warn") : "ok"}`} title={problemas.map((x) => x.mensaje).join(" · ")}>
            {p ? p.mensaje : "Listo"}
          </span>
        </span>
      </span>
    </button>
  );
}

function Ficha({ objeto: o, onBorrado, onDuplicado }: { objeto: Objeto; onBorrado(): void; onDuplicado(clave: string): void }) {
  const { avisar, casos, intentar } = useAplicacion();
  const s = useObjetos();
  const graficos = useGraficos();
  const icono = s.resolver(o.graficos.icono);
  const imgIcono = useImagen(graficos.urlImagen(icono?.hoja));
  const [hojaAuto, setHojaAuto] = useState(() => Autovinculador.hojaSugerida(s.catalogo) ?? "");

  const cambiar = (fn: () => Objeto) => {
    try {
      s.actualizar(fn());
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
    }
  };
  const t = o.tipo;

  return (
    <>
      <div className="ohead">
        <DibujoDeFrame img={imgIcono} frame={icono?.animacion.frame(o.graficos.icono?.frame ?? 0) ?? icono?.animacion.frames[0]} tamanio={56} />
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="tag">#{o.numero}</span>
            <span className="status">{t.nombre}</span>
          </div>
          <div className="oname">{o.nombre || "(sin nombre)"}</div>
        </div>
        <div className="row">
          <button
            onClick={async () => {
              const d = await s.duplicar(o);
              if (d) {
                onDuplicado(d.clave);
                avisar(`Objeto duplicado con ID ${d.numero}.`);
              }
            }}
          >
            Duplicar
          </button>
          <BotonConfirmar onConfirmar={async () => (await s.eliminar(o.clave)) && (onBorrado(), avisar("Objeto borrado."))}>Borrar</BotonConfirmar>
        </div>
      </div>

      <div className="fset">
        <h3>Datos</h3>
        <div className="form-grid">
          <label className="f wide">
            Nombre
            <input id="o_nombre" type="text" value={o.nombre} onChange={(e) => cambiar(() => o.renombrado(e.target.value))} />
          </label>
          <label className="f">
            ID
            <input id="o_numero" type="number" min={1} value={o.numero} onChange={(e) => +e.target.value >= 1 && cambiar(() => o.conNumero(Math.floor(+e.target.value)))} />
          </label>
          <label className="f">
            Tipo
            <select id="o_tipo" value={t.id} onChange={(e) => cambiar(() => o.conTipo(e.target.value as TipoDeObjetoId))}>
              {TIPOS_DE_OBJETO.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="f">
            Valor (oro)
            <input id="o_valor" type="number" min={0} value={o.valor} onChange={(e) => cambiar(() => o.conValor(Math.max(0, +e.target.value || 0)))} />
          </label>
          <label className="f">
            Nivel mínimo
            <input id="o_nivel" type="number" min={0} value={o.nivelMinimo} onChange={(e) => cambiar(() => o.conNivelMinimo(Math.max(0, +e.target.value || 0)))} />
          </label>
          <label className="f full">
            Descripción
            <textarea id="o_desc" rows={2} value={o.descripcion} onChange={(e) => cambiar(() => o.conDescripcion(e.target.value))} />
          </label>
        </div>
        <CasillasDeBanderas idPrefijo="of" definiciones={banderasPermitidas(t)} activa={(c) => o.tieneBandera(c)} onCambiar={(c, activa) => cambiar(() => o.conBandera(c, activa))}>
          <label>
            <input id="o_apilable" type="checkbox" checked={o.apilable} onChange={(e) => cambiar(() => o.conApilable(e.target.checked))} /> Apilable
          </label>
        </CasillasDeBanderas>
      </div>

      {t.atributos.length > 0 && (
        <div className="fset">
          <h3>Atributos de {t.nombre.toLowerCase()}</h3>
          <CamposDeAtributos idPrefijo="os" definiciones={t.atributos} valores={o.atributos} onCambiar={(clave, valor) => cambiar(() => o.conAtributo(clave, valor))} />
        </div>
      )}

      <div className="fset">
        <h3>Gráficos</h3>
        <div className="slots">
          <RanuraGrafica id="icono" etiqueta="Icono de inventario" tituloSelector="Icono de inventario" vacio="Sin vincular" referencia={o.graficos.icono} conFrame onCambiar={(r) => cambiar(() => o.conIcono(r))} />
          <RanuraGrafica id="suelo" etiqueta="Gráfico en el suelo" tituloSelector="Gráfico en el suelo" vacio="Vacío: se usa el icono" referencia={o.graficos.suelo} conFrame onCambiar={(r) => cambiar(() => o.conSuelo(r))} />
        </div>
      </div>

      {t.equipable && (
        <div className="fset">
          <div className="row between">
            <h3>Equipado, por dirección</h3>
            <div className="row">
              <select id="hojaAuto" aria-label="Hoja para autovincular" value={hojaAuto} onChange={(e) => setHojaAuto(e.target.value)}>
                {s.catalogo.hojas().map((h) => (
                  <option key={h.hojaId} value={h.hojaId}>
                    {h.nombreHoja} ({Object.keys(Autovinculador.coincidencias(s.catalogo, h.hojaId)).length}/4)
                  </option>
                ))}
              </select>
              <button
                disabled={!hojaAuto}
                onClick={async () => {
                  const r = await intentar(() => casos.objetos.autovincular.ejecutar(o, hojaAuto, s.catalogo), "Vinculando gráficos…");
                  if (!r) return;
                  if (r.cantidad) s.actualizar(r.objeto);
                  const nombre = s.catalogo.hojas().find((h) => h.hojaId === hojaAuto)?.nombreHoja;
                  avisar(r.cantidad ? `Se vincularon ${r.cantidad} de 4 direcciones desde ${nombre}.` : `No encontré animaciones con nombres de dirección en ${nombre}.`);
                }}
              >
                Autovincular
              </button>
            </div>
          </div>
          <div className="slots">
            {DIRECCIONES.map((d) => (
              <RanuraGrafica
                key={d.valor}
                id={`eq_${d.valor}`}
                etiqueta={`${d.flecha} ${d.etiqueta}`}
                tituloSelector={`Equipado · ${d.etiqueta}`}
                vacio="Sin vincular"
                referencia={o.graficos.equipado[d.valor] ?? null}
                conFrame={false}
                onCambiar={(r) => cambiar(() => o.conEquipado(d.valor, r))}
              />
            ))}
          </div>
          <p className="hint">«Autovincular» busca en la hoja elegida animaciones que terminen en _sur, _norte, _este y _oeste (también _s/_n/_e/_o y down/up/right/left).</p>
        </div>
      )}
    </>
  );
}
