#!/usr/bin/env node
/*
 * Junta el tráfico del repositorio en un archivo que no pierde días.
 *
 * GitHub guarda **catorce días** de clones y de visitas, y después los tira. Si nadie los baja, no
 * hay forma de recuperarlos: ésta es la mitad del público que la medición del sitio no ve, la que
 * se clona el repo y lo corre en su máquina, y está bien que ahí no se mida nada.
 *
 * El archivo se indexa por fecha, así que correrlo de nuevo no duplica ni pierde: los días que ya
 * estaban quedan como están y los nuevos se suman. Volver a correrlo el mismo día corrige el
 * número de hoy, que llega incompleto. Un día que no está es un día sin actividad: la API no los
 * manda, y guardar catorce ceros por semana sería engordar el archivo para no decir nada.
 *
 * No lleva fecha de actualización a propósito. Sería un campo que cambia todas las semanas aunque
 * no haya pasado nada, y entonces el workflow commitearía siempre: cuándo corrió ya lo dice el
 * historial de git. Así el archivo cambia sólo cuando cambian los números.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [clonesPath, vistasPath, repoPath, salidaPath] = process.argv.slice(2);

if (!clonesPath || !vistasPath || !repoPath || !salidaPath) {
  console.error("uso: node scripts/juntar-trafico.mjs <clones.json> <vistas.json> <repo.json> <salida.json>");
  process.exit(1);
}

const leer = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));

/** La salida no existe la primera vez, y eso no es un error. */
function leerLoQueHaya(ruta) {
  try {
    return leer(ruta);
  } catch {
    return { porDia: {} };
  }
}

const clones = leer(clonesPath);
const vistas = leer(vistasPath);
const repo = leer(repoPath);
const anterior = leerLoQueHaya(salidaPath);

/** "2026-10-20T00:00:00Z" → "2026-10-20". La API manda el día a medianoche UTC. */
const dia = (marca) => String(marca).slice(0, 10);

const porDia = { ...anterior.porDia };

for (const c of clones.clones ?? []) {
  porDia[dia(c.timestamp)] = { ...porDia[dia(c.timestamp)], clones: c.count, clonesUnicos: c.uniques };
}
for (const v of vistas.views ?? []) {
  porDia[dia(v.timestamp)] = { ...porDia[dia(v.timestamp)], visitas: v.count, visitantesUnicos: v.uniques };
}

// Ordenado por fecha para que el diff de cada semana se lea: lo nuevo va siempre al final.
const ordenado = Object.fromEntries(Object.entries(porDia).sort(([a], [b]) => a.localeCompare(b)));
const nuevos = Object.keys(ordenado).filter((d) => !(d in (anterior.porDia ?? {})));

const salida = {
  repositorio: repo.full_name,
  estrellas: repo.stargazers_count,
  forks: repo.forks_count,
  dias: Object.keys(ordenado).length,
  porDia: ordenado,
};

mkdirSync(dirname(salidaPath), { recursive: true });
writeFileSync(salidaPath, `${JSON.stringify(salida, null, 2)}\n`);

console.log(`${salida.dias} días en ${salidaPath}; ${nuevos.length} nuevos${nuevos.length ? `: ${nuevos.join(", ")}` : ""}`);
