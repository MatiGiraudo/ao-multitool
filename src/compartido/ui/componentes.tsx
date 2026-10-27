"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Botón que pide un segundo clic para confirmar (en lugar de un diálogo modal del navegador). */
export function BotonConfirmar(props: {
  id?: string;
  children: ReactNode;
  confirmacion?: string;
  onConfirmar: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [armado, setArmado] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (t.current && clearTimeout(t.current)), []);
  return (
    <button
      id={props.id}
      className={props.className ?? "danger"}
      disabled={props.disabled}
      onClick={() => {
        if (!armado) {
          setArmado(true);
          t.current = setTimeout(() => setArmado(false), 2800);
          return;
        }
        if (t.current) clearTimeout(t.current);
        setArmado(false);
        props.onConfirmar();
      }}
    >
      {armado ? (props.confirmacion ?? "¿Seguro?") : props.children}
    </button>
  );
}

/**
 * «Esto está cargando»: los cuadraditos y un texto.
 *
 * `bloque` es para cuando ocupa el lugar de lo que todavía no está (una pantalla, un panel);
 * sin eso queda en una línea, para ponerlo al lado de otra cosa.
 */
export function Cargando(props: { children?: ReactNode; bloque?: boolean; className?: string }) {
  return (
    <p className={`cargando${props.bloque ? " bloque" : ""}${props.className ? ` ${props.className}` : ""}`} role="status" aria-live="polite">
      <PuntosDeCarga />
      {props.children ?? "Cargando…"}
    </p>
  );
}

/** Los cuadraditos solos, para donde ya hay un texto (un botón que dice «Leyendo…»). */
export function PuntosDeCarga() {
  return (
    <span className="puntos" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/** Botón que abre el selector de archivos del sistema. */
export function BotonArchivo(props: { children: ReactNode; accept: string; onArchivo: (f: File) => void; className?: string; id?: string }) {
  return (
    <label className={`btn ${props.className ?? ""}`}>
      {props.children}
      <input
        id={props.id}
        type="file"
        accept={props.accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onArchivo(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/**
 * Botón que trae muchos archivos de una vez, o una carpeta entera.
 *
 * Está aparte de `BotonArchivo` porque elegir carpeta no es un `accept` más: el navegador entrega
 * todos los archivos de todas las subcarpetas, sin filtrar por tipo y de a miles, así que decidir
 * qué sirve es trabajo de quien recibe.
 */
export function BotonArchivos(props: {
  children: ReactNode;
  accept: string;
  onArchivos: (archivos: File[]) => void;
  /** Elegir una carpeta entera en vez de archivos sueltos. */
  carpeta?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`btn ${props.className ?? ""}${props.disabled ? " off" : ""}`}>
      {props.children}
      <input
        id={props.id}
        type="file"
        accept={props.accept}
        multiple
        disabled={props.disabled}
        {...(props.carpeta ? ATRIBUTOS_DE_CARPETA : {})}
        onChange={(e) => {
          const archivos = [...(e.target.files ?? [])];
          if (archivos.length) props.onArchivos(archivos);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** Los atributos con los que el input pide una carpeta. React no los tipa; los navegadores sí los entienden. */
const ATRIBUTOS_DE_CARPETA = { webkitdirectory: "", directory: "" } as Record<string, string>;

export function CampoNumero(props: {
  id: string;
  etiqueta: string;
  valor: number | "";
  min?: number;
  max?: number;
  step?: number;
  ancho?: number;
  placeholder?: string;
  onCambio: (v: number | null) => void;
}) {
  return (
    <label className="f" htmlFor={props.id}>
      {props.etiqueta}
      <input
        id={props.id}
        type="number"
        value={props.valor}
        min={props.min}
        max={props.max}
        step={props.step}
        placeholder={props.placeholder}
        style={props.ancho ? { width: props.ancho } : undefined}
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          props.onCambio(v === null || Number.isFinite(v) ? v : null);
        }}
      />
    </label>
  );
}
