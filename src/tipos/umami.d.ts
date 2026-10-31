/*
 * Lo que el script de Umami deja colgado del `window`.
 *
 * Es una sola función y no hay tipos publicados que valga la pena traer, así que se declara acá, al
 * lado de los de la File System Access API, en vez de castear en el adaptador.
 *
 * Va opcional a propósito: el script se carga con `defer` y sólo en el sitio publicado, así que en
 * tu máquina `window.umami` no existe nunca y el adaptador tiene que saberlo.
 */
interface Window {
  umami?: {
    track(nombre: string, datos?: Record<string, unknown>): void;
  };
}
