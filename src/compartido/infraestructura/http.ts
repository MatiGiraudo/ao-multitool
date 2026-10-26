/** Helpers mínimos para los adaptadores HTTP del navegador. */
export async function pedirJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...init });
  if (!r.ok) throw new Error(await mensajeDeError(r));
  return (await r.json()) as T;
}

export async function enviar(url: string, init: RequestInit): Promise<void> {
  const r = await fetch(url, { cache: "no-store", ...init });
  if (!r.ok) throw new Error(await mensajeDeError(r));
}

async function mensajeDeError(r: Response): Promise<string> {
  try {
    const cuerpo = (await r.json()) as { error?: string };
    if (cuerpo.error) return cuerpo.error;
  } catch {
    /* sin cuerpo JSON */
  }
  return `El servidor respondió ${r.status}.`;
}
