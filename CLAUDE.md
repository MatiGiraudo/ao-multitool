# AO World Editor — contexto para agentes

Editor del contenido de **Argentum Online**: hojas de sprites y animaciones, objetos, cuerpos y
cabezas, FX, hechizos, NPCs y mapas. Lee los archivos del AO original (`Graficos.ini`, `OBJ.dat`,
`Personajes.ini`, `Mundos/`…) y los vuelve a escribir tocando sólo lo editado. Corre en el
navegador pero no es un servicio: se levanta en la máquina de quien lo usa y guarda en una carpeta
suya.

Next.js 16 · React 19 · TypeScript 5.9 · vitest. **Todo el código, los comentarios y los nombres
están en español**, y eso incluye lo que escribas: `HojaDeSprites`, `casosDeUso.ts`,
`CarpetaDelProyecto`. No hay una sola clase con nombre en inglés.

## Antes de tocar nada

- `docs/ARQUITECTURA.md` — cómo está organizado y por qué. **La sección 8 es la receta para
  agregar un módulo**: seguila en vez de improvisar una estructura nueva.
- `docs/ROADMAP.md` — qué falta y en qué orden. `docs/PENDIENTES.md` — lo que sabemos que está mal
  y se decidió dejar para después. `docs/FLUIDEZ.md` — lo que frena el uso diario.
- `AGENTS.md` — el bloque que `next dev` escribe solo: esta versión de Next tiene cambios que
  rompen, y los docs están en `node_modules/next/dist/docs/`.

## Comandos

```bash
npm run dev        # http://localhost:3000, arranca en Animaciones
npm test           # vitest run (src/**/*.test.ts)
npm run typecheck  # tsc --noEmit
npm run build
```

`npm test` y `npm run typecheck` son la red de seguridad de cualquier cambio: corrélos los dos.
Los tests no necesitan navegador ni servidor —es el beneficio directo de los puertos—, así que no
hay excusa para no correrlos.

## La arquitectura, en cuatro reglas

1. **Screaming architecture.** `src/` grita de qué trata el sistema (`graficos/`, `objetos/`,
   `apariencias/`, `fx/`, `hechizos/`, `npcs/`, `mapas/`, `importacion/`, `proyecto/`), no con qué
   está hecho. Next queda arrinconado en `src/app/`: es un detalle de entrega.
2. **Las dependencias apuntan hacia adentro.** Cada módulo tiene `dominio/` (reglas puras, no
   importa nada externo), `aplicacion/` (casos de uso: una clase con un `ejecutar`),
   `infraestructura/` (disco, HTTP, canvas, formatos) y `ui/` (React). `dominio/` no sabe que
   existe React, ni Next, ni el navegador.
3. **`compartido/` no importa a ningún módulo.** Si una pieza necesita saber de hojas, de objetos o
   de mapas, no va ahí: va en el módulo dueño del concepto, implementando lo que `compartido/`
   define. Un módulo no importa a otro módulo: pide un puerto (`CatalogoGrafico`,
   `CatalogoPorNumero`) y la página los junta.
4. **Puertos y adaptadores.** Un puerto por necesidad, tres familias de adaptadores para los
   mismos puertos:

   | Familia | Dónde está el disco | Prefijo |
   |---|---|---|
   | `infraestructura/servidor/` | en la máquina que corre Next | `Archivos*` |
   | `infraestructura/navegador/` | del otro lado de la API | `Http*` |
   | `infraestructura/carpeta/` | en la máquina del usuario, elegida por él | `Carpeta*` |
   | `infraestructura/memoria.ts` | en un `Map`, para los tests | `Memoria*` |

   Quién se enchufa con quién se decide en **un solo lugar por entorno**:
   `src/contenedor/servidor.ts` y `src/contenedor/cliente.ts`. Los casos de uso reciben interfaces
   por constructor y nunca hacen `new` de un adaptador.

## Los dos modos de datos

`MODO_DE_DATOS` en `contenedor/cliente.ts` se fija **al compilar**, con `NEXT_PUBLIC_AO_MODO`:

- **`servidor`** (por defecto): el navegador le habla por HTTP a `app/api/`, que escribe en `data/`.
  Las rutas se llaman `route.servidor.ts` y sólo existen en este modo (ver `next.config.ts`).
- **`carpeta`**: no hay API de datos; el navegador lee y escribe directo en una carpeta que elige
  el usuario con la File System Access API (`CarpetaDelProyecto`). Necesita Chromium, y
  `PuertaDeCarpeta` lo dice en vez de fallar raro. El build sale estático (`out/`).

Los dos escriben **exactamente el mismo formato**, así que la misma carpeta sirve para los dos. Si
cambiás un formato en disco, cambialo en las dos familias de adaptadores o el proyecto se parte en
dos: hay tests en `src/compartido/carpeta.test.ts` que cuidan justo eso.

## Convenciones que no se negocian

- **Entidades inmutables.** `rect.desplazado(5, 0)` devuelve uno nuevo; `hoja.conAnimacion(a)`
  también. Encaja con React, que compara referencias.
- **Dos números distintos.** `clave` es la identidad interna y no cambia nunca; `numero` es el ID
  de AO, editable. No los confundas.
- **DTO y mapper por entidad** (`ObjetoDto.ts` con `aDto` / `aDominio`): el dominio nunca se
  serializa directo, y el mapper **valida de nuevo** lo que entra.
- **Las colecciones van en un JSON** (`data/objetos/objetos.json`) sobre
  `ColeccionRepositorio` + los tres adaptadores genéricos de `compartido/infraestructura/`. Un
  repositorio de módulo son diez líneas.
- **Edición optimista con guardado diferido** (`compartido/ui/useColeccionEditable.ts`): se ve al
  instante, se guarda 400 ms después. La regla al usarlo: antes de cualquier operación que vuelva a
  leer (crear, duplicar, importar, exportar) hay que llamar a `guardarPendientes()`.
- **Los errores pasan por `intentar`** (`useAplicacion`), que los muestra como aviso y los mide. Un
  error boundary solo no alcanza: atrapa las caídas al renderizar, que son las menos.
- **La telemetría no manda datos del usuario.** Se mide que algo pasó y dónde, nunca qué decía: los
  archivos del clásico traen nombres, rutas y datos de quien los usa.
- **Los comentarios explican por qué, no qué.** Mirá cualquier archivo del proyecto: los bloques de
  arriba cuentan la decisión y la alternativa que se descartó. Escribí en ese registro, y no
  agregues comentarios que repitan el código.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_AO_MODO=carpeta` | el modo carpeta (por defecto, `servidor`) |
| `AO_DATA_DIR`, `AO_MAPAS_DIR` | dónde escribe el modo servidor |
| `AO_INIT_DIR`, `AO_DAT_DIR` | un `INIT/` y un `Dat/` de verdad, para los tests del clásico |
| `AO_DEV_ORIGINS` | sumar orígenes al `npm run dev` (WSL, Docker, la IP de la red) |
| `NEXT_PUBLIC_AO_UMAMI_ID`, `…_SRC` | la medición de uso del sitio publicado |

## Al terminar un cambio

`npm test` y `npm run typecheck`. Si lo que arreglaste estaba anotado en `docs/PENDIENTES.md` o en
`docs/FLUIDEZ.md`, cerrá el punto ahí mismo contando **qué salida se tomó y por qué, y cuál se
descartó**: así están escritos todos los demás, y es la mitad del valor de esos documentos.
