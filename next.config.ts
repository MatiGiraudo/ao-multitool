import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las imágenes de las hojas pueden ser grandes: subimos el límite del cuerpo de las rutas de API.
  experimental: { serverActions: { bodySizeLimit: "50mb" } },
};

export default nextConfig;
