import type { NextConfig } from "next";

/*
 * En modo desarrollo Next.js sólo acepta conexiones desde localhost.
 * Si abrís la app desde otra dirección (WSL, Docker, una VM o la IP de tu PC en la red),
 * la recarga automática falla con "WebSocket connection to ws://…/_next/hmr failed".
 * Acá permitimos las redes privadas típicas. Para sumar otra, usá la variable AO_DEV_ORIGINS
 * con una lista separada por comas, por ejemplo: AO_DEV_ORIGINS=mi-pc.local,10.0.0.5
 * Esto sólo afecta a `npm run dev`; no cambia nada en producción.
 */
const origenesExtra = (process.env.AO_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/*
 * El modo carpeta no tiene servidor de datos.
 *
 * Las rutas de `app/api/` se llaman `route.servidor.ts`, y Next sólo las toma como rutas cuando
 * `servidor.ts` está en `pageExtensions`. En modo carpeta no está, así que no existen en el
 * build: nada de funciones desplegadas que nadie va a llamar y que, en un servidor sin disco
 * donde escribir, sólo podrían fallar.
 *
 * Sin rutas, lo que queda es un sitio estático, y eso es lo que se genera: `out/` se sube tal
 * cual y no hay nada corriendo del otro lado.
 */
const enCarpeta = process.env.NEXT_PUBLIC_AO_MODO === "carpeta";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "10.*.*.*", "172.*.*.*", "192.168.*.*", "*.local", ...origenesExtra],
  // Las imágenes de las hojas pueden ser grandes: subimos el límite del cuerpo de las rutas de API.
  experimental: { serverActions: { bodySizeLimit: "50mb" } },
  pageExtensions: enCarpeta ? ["tsx", "ts", "jsx", "js"] : ["servidor.ts", "tsx", "ts", "jsx", "js"],
  ...(enCarpeta ? { output: "export" as const } : {}),
};

export default nextConfig;
