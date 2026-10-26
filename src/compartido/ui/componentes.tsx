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
