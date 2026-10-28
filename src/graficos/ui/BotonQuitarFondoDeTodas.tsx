"use client";
import { useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { BotonConfirmar, PuntosDeCarga } from "@/compartido/ui/componentes";
import { cuantas } from "@/compartido/ui/utilidades";
import { useGraficos } from "./ProveedorDeGraficos";

/**
 * Le saca el fondo negro a todas las hojas de una vez.
 *
 * Importar un cliente clásico deja miles de hojas y todas vienen con el fondo opaco, así que
 * hacerlo de a una no es una opción. Pide confirmación porque reescribe las imágenes en disco:
 * se puede deshacer, pero volviendo a cargar la imagen con «Reemplazar imagen…».
 */
export function BotonQuitarFondoDeTodas() {
  const { casos, avisar, intentar } = useAplicacion();
  const graficos = useGraficos();
  const [avance, setAvance] = useState<{ hechas: number; total: number } | null>(null);

  const conImagen = graficos.hojas.filter((h) => h.tieneImagen);
  if (!conImagen.length) return null;

  const correr = async () => {
    setAvance({ hechas: 0, total: conImagen.length });
    const r = await intentar(() =>
      casos.graficos.quitarFondoEnLote.ejecutar({
        hojaIds: conImagen.map((h) => h.id),
        alAvanzar: (hechas, total) => setAvance({ hechas, total }),
      }),
    );
    setAvance(null);
    if (!r) return;
    if (r.limpiadas.length) await graficos.recargar();
    const partes = [cuantas(r.limpiadas.length, "hoja sin fondo", "hojas sin fondo")];
    if (r.sinFondo) partes.push(cuantas(r.sinFondo, "ya estaba", "ya estaban"));
    if (r.fallidas.length) partes.push(cuantas(r.fallidas.length, "falló", "fallaron"));
    avisar(partes.join(", ") + ".");
  };

  if (avance)
    return (
      <button disabled>
        <PuntosDeCarga />
        Quitando el fondo {avance.hechas.toLocaleString("es-AR")} de {avance.total.toLocaleString("es-AR")}…
      </button>
    );

  return (
    <BotonConfirmar
      className=""
      confirmacion={`¿Seguro? Son ${conImagen.length.toLocaleString("es-AR")} hojas`}
      onConfirmar={() => void correr()}
    >
      Quitar el fondo negro de todas…
    </BotonConfirmar>
  );
}
