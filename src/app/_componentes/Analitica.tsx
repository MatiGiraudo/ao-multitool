import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SE_MIDE, SE_MIDEN_EVENTOS, UMAMI_ID, UMAMI_SRC } from "@/compartido/infraestructura/medicion";

/*
 * La medición de uso del sitio publicado, y sólo del sitio publicado.
 *
 * Acá se cargan los scripts de afuera; los eventos propios los manda `TelemetriaUmami`, que sólo le
 * habla al que deja este archivo colgado del `window`.
 *
 * Son dos proveedores y hacen cosas distintas:
 *
 * - **Vercel** (Web Analytics y Speed Insights) cuenta cuánta gente entra, de qué país, con qué
 *   navegador, qué pestañas abre —cada módulo es una ruta— y cuánto tarda la app en responder en
 *   máquinas que no son la nuestra. Se prende con un switch y no cuesta nada, pero en el plan
 *   gratuito no acepta eventos propios y guarda un mes de historial.
 * - **Umami** recibe los eventos propios, que son los que contestan lo que las visitas no dicen:
 *   cuántos de los que entran abren una carpeta, con qué tamaño de mundo trabajan y en qué paso del
 *   importador se traban. No usa cookies ni guarda nada que identifique a nadie, así que tampoco
 *   hay cartel de consentimiento que poner. Umami cuenta además sus propias visitas, con seis meses
 *   de historial: cuando haya suficiente, lo de Vercel se puede apagar.
 *
 * El `if` es lo importante de este archivo. `SE_MIDE` pide modo carpeta Y producción, que juntos son
 * exactamente el sitio publicado; si levantás el editor en tu máquina acá no se monta nada: ningún
 * script, ningún pedido. Umami pide además que haya un sitio configurado, así el que se lleva el
 * código y lo publica no manda nada a ninguna parte hasta que pone el suyo.
 *
 * Umami va con `next/script` y no con un `<script>` a mano, y eso tiene una razón concreta: un
 * `<script>` escrito acá es un nodo más del árbol que React hidrata, y el árbol de la puerta de
 * carpeta no hidrata limpio —el servidor no tiene `showDirectoryPicker`, así que prerenderiza la
 * pantalla de «este navegador no puede abrir carpetas» y el cliente dibuja otra—. Cuando React
 * rehace el árbol por esa diferencia, vuelve a crear el nodo y queda el script dos veces en el
 * `<body>`. `next/script` lo inyecta por fuera de lo hidratado, así que entra una sola vez y no
 * depende de que ese árbol hidrate bien.
 *
 * Qué se mide y qué no, contado para quien usa el editor, está en el README.
 */
export function Analitica() {
  if (!SE_MIDE) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
      {SE_MIDEN_EVENTOS && <Script src={UMAMI_SRC} data-website-id={UMAMI_ID} strategy="afterInteractive" />}
    </>
  );
}
