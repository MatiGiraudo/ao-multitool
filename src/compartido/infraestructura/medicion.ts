/*
 * Si se mide, y con qué. Se decide al compilar, igual que el modo de datos.
 *
 * Son dos condiciones y las dos tienen que darse. `SE_MIDE` pide modo carpeta Y producción, que
 * juntos son exactamente el sitio publicado: si levantás el editor en tu máquina no se mide nada,
 * ni se baja un script, y lo que hacés con tus archivos no sale a ninguna parte. `SE_MIDEN_EVENTOS`
 * pide además que haya un sitio de Umami configurado, así el que se lleva el código y lo publica no
 * manda nada a ningún lado hasta que pone el suyo.
 *
 * `AO_UMAMI_SRC` está para el día que convenga dejar la nube y hospedar Umami en el propio dominio:
 * desde una ruta propia los bloqueadores no lo cortan, y acá es cambiar una variable.
 *
 * Este archivo no es de cliente ni de servidor —son tres constantes que Next reemplaza en el
 * build—, así que lo pueden importar el layout y el contenedor del navegador por igual.
 */

/** El sitio publicado, y nada más que el sitio publicado. */
export const SE_MIDE = process.env.NEXT_PUBLIC_AO_MODO === "carpeta" && process.env.NODE_ENV === "production";

/** El sitio de Umami que recibe los eventos. Sin esto no se manda ninguno. */
export const UMAMI_ID = process.env.NEXT_PUBLIC_AO_UMAMI_ID ?? "";

/** De dónde sale el script de Umami. Por defecto, su nube. */
export const UMAMI_SRC = process.env.NEXT_PUBLIC_AO_UMAMI_SRC ?? "https://cloud.umami.is/script.js";

/** Si además de las visitas se mandan los eventos propios. */
export const SE_MIDEN_EVENTOS = SE_MIDE && !!UMAMI_ID;
