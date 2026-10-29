# AO World Editor

Editor de mundo para el remake de Argentum Online. Hoy incluye:

- **Animaciones**: hojas de sprites, frames marcados por grilla o recuadro libre, movimiento en grupo, redimensionado de imágenes, vista previa y exportación `ao-anim`.
- **Objetos**: ítems del juego con sus atributos por tipo, icono, gráfico en el suelo y animaciones de equipado por dirección, con exportación `ao-objs`.
- **Apariencias**: los cuerpos y las cabezas de los personajes, con su gráfico en cada dirección y dónde se apoya la cabeza sobre el cuerpo, con exportación `ao-bodies` y `ao-heads`.
- **Hechizos**: qué hace cada hechizo, cuánto cuesta, sus palabras mágicas y con qué FX se ve, con exportación `ao-spells`.
- **NPCs**: criaturas y gente del mundo, con su apariencia, su combate, los hechizos que lanzan y lo que sueltan o venden, con exportación `ao-npcs`.
- **Mapas**: el mundo donde pasa todo. Se pinta el piso y las tres capas de arriba con los gráficos del proyecto o del clásico, se marcan bloqueos, traslados, NPCs y objetos, y sale como el `.map`, el `.inf` y el `.dat` que lee el servidor.
- **Exportar todo**: cuatro cosas que casi nunca se quieren juntas —los catálogos JSON del remake, las animaciones, el mundo del juego y los archivos del AO clásico—, elegibles por separado y guardadas en `data/exportado/` de una vez.
- **Diagnóstico**: qué quedó roto o a medio terminar en todo el mundo, incluidos los cruces que ningún módulo ve solo.
- **Importar del AO original**: en siete pasos, la tabla de GRH del `Graficos.ini`, los cuerpos, las cabezas, los FX, el `OBJ.dat`, el `Hechizos.dat` y el `NPCs.dat`, creando las animaciones que hagan falta y vinculando los gráficos.
- **Devolvérselos al AO original**: el `OBJ.dat`, el `NPCs.dat` y el `Hechizos.dat` del servidor, y el `Fxs.ini`, el `Personajes.ini` y el `Cabezas.ini` del cliente. Se reescribe sólo lo que el editor maneja; el resto de cada entrada vuelve tal como vino, con sus comentarios y su espaciado.
- **FX**: efectos visuales, con su animación, el corrimiento en píxeles respecto de donde se lanzan y cuántas veces se repiten, con exportación `ao-fx`.

Es la continuación del indexador web. Los JSON que exporta tienen exactamente el mismo formato, así que lo que ya armaste sigue sirviendo para Unity.

## Requisitos

- Node.js 20 o más nuevo (probado con Node 22).

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. La app redirige a **Animaciones**.

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Modo desarrollo, con recarga automática al editar el código |
| `npm run build` y `npm start` | Versión optimizada |
| `npm test` | Tests del dominio y de los casos de uso |
| `npm run typecheck` | Chequeo de tipos de TypeScript |

Si abrís la app desde otra dirección que no sea `localhost` (por ejemplo desde WSL, Docker o una VM, con una IP como `172.19.0.1`), ya está permitido para las redes privadas habituales. Si usás un nombre o una IP distinta, agregala con `AO_DEV_ORIGINS=mi-pc.local npm run dev`.

## Dónde quedan tus datos

Todo lo que hacés se guarda solo, unos 400 ms después de cada cambio, en la carpeta `data/`:

```
data/
├── graficos/
│   ├── <id>.json            ← una hoja: grilla y animaciones
│   ├── <id>.png             ← la imagen actual
│   └── <id>.original.png    ← la imagen como la cargaste (para "Volver al original")
├── objetos/
│   └── objetos.json         ← todos los objetos, ordenados por ID
├── fx/
│   └── fx.json              ← todos los efectos, ordenados por ID
├── apariencias/
│   ├── cuerpos.json         ← todos los cuerpos, ordenados por ID
│   └── cabezas.json         ← todas las cabezas, ordenadas por ID
├── hechizos/
│   └── hechizos.json        ← todos los hechizos, ordenados por ID
├── npcs/
│   └── npcs.json            ← todos los NPCs, ordenados por ID
├── mapas/
│   └── <numero>.json        ← un mapa: sus capas, bloqueos, traslados, NPCs y objetos
├── importacion/
│   └── grh.json             ← la tabla de GRH del AO original, para traducir sus gráficos
└── exportado/
    └── *                    ← lo que escribe «Exportar todo», listo para el juego
```

Esa carpeta está pensada para versionarla con **git**: cada cambio aparece claro en el historial y nada se pierde. Si querés guardar los datos en otro lugar, definí la variable `AO_DATA_DIR`, por ejemplo `AO_DATA_DIR=/ruta/a/mis-datos npm run dev`.

Dos cosas quedan afuera de git, y están en el `.gitignore`: las **imágenes** de las hojas y la carpeta `exportado/`. Las imágenes son las del cliente que importaste —después de un cliente entero son miles de archivos y cientos de megas—, y lo que el editor te deja escrito de cada hoja (la grilla y las animaciones) está en el `.json` de al lado, que sí se versiona. Si las querés igual en el repositorio, borrá esa línea del `.gitignore`.

La carpeta trae dos hojas de ejemplo y tres objetos. Podés borrarlos desde la app («Quitar hoja» y «Borrar») o borrar esos archivos a mano.

### Publicarlo en un servidor, sin que los datos salgan de tu máquina

Lo de arriba es el modo por defecto: el disco lo toca el servidor. Está pensado para correrlo en
tu máquina, y **no tiene usuarios ni contraseñas**: cualquiera que llegue a esa dirección escribe
en tu `data/`. Mientras sea `localhost` no hay problema; si lo vas a dejar levantado donde lo
alcance alguien más, usá el modo de abajo.

El segundo modo está pensado justamente para eso: desplegar el editor en un servidor público
(Vercel, por ejemplo) y que **cada uno trabaje con su propia carpeta**. No se sube ningún archivo
a ningún lado: el navegador abre un selector de carpetas y lee y escribe ahí directamente.

Se enciende con una variable al compilar:

```bash
NEXT_PUBLIC_AO_MODO=carpeta npm run build
```

Con esa variable el build cambia de forma: las rutas de `app/api/` quedan afuera —no hace falta
ninguna, y en un servidor sin disco donde escribir sólo podrían fallar— y lo que sale es un
**sitio estático** en `out/`, que se sube tal cual. No queda nada corriendo del otro lado.

En Vercel alcanza con poner `NEXT_PUBLIC_AO_MODO=carpeta` en *Settings → Environment Variables*:
detecta el export solo.

Un par de cosas que conviene saber:

- **Necesita Chromium** (Chrome, Edge, Brave, Opera). La API que abre carpetas,
  `showDirectoryPicker`, todavía no está en Firefox ni en Safari; ahí la app lo dice y no te deja
  entrar, en vez de fallar raro.
- **El permiso se pide una vez por sesión.** El navegador recuerda cuál era tu carpeta, pero no
  te deja volver a entrar sin un clic tuyo. Es un botón, no hay que volver a buscarla.
- **El formato es el mismo** que el del modo servidor, así que podés abrir con el modo carpeta la
  misma `data/` que usás en tu máquina, y al revés.

## Traer los archivos del AO original

En la pestaña **Importar** hay siete pasos, y el primero manda. El `Graficos.ini` arma la tabla de GRH: ahí está, para cada número de gráfico del juego, de qué imagen sale y qué recorte es. Con esa tabla se leen después el `Personajes.ini` y el `Cabezas.ini` (los cuerpos y las cabezas, con sus cuatro direcciones y el corrimiento de la cabeza), el `Fxs.ini` y el `OBJ.dat`, que trae todos los objetos con su nombre, tipo, valor, banderas y atributos, y les vincula el icono creando en cada hoja las animaciones que hagan falta (las llama `grh505` y así). El `Hechizos.dat` y el `NPCs.dat` no necesitan el paso 1: apuntan al FX y a los cuerpos por número, igual que acá.

Los archivos van en ANSI, como los guarda Windows: se leen bien, con acentos y todo. Cargá las imágenes que te interesen (con el mismo nombre que en el juego, por ejemplo `12.png`) y volvé a importar el `OBJ.dat`: lo que faltaba se vincula entonces, sin duplicar nada.

## Traer lo que hiciste en el indexador web

En el indexador web usá **Guardar proyecto** para bajar `proyecto-ao.json`. Acá, tocá **Importar proyecto del indexador web…** arriba a la derecha. Se importan las hojas con sus imágenes, las animaciones y los objetos con sus vínculos.

Si ya existe una hoja con el mismo nombre de archivo, se actualiza en lugar de duplicarse. Los objetos con el mismo ID se reemplazan.

## Arquitectura

El código está organizado con screaming architecture, arquitectura hexagonal / clean architecture, DDD y SOLID. Está explicado paso a paso, con ejemplos de este mismo código, en **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**. Ahí también está la receta para agregar el próximo módulo (NPCs, Mapas…).

## Qué falta

El plan fase por fase, con lo hecho marcado, está en **[docs/ROADMAP.md](docs/ROADMAP.md)**. Las siete fases que tenía están cerradas: lo que sigue son las decisiones abiertas del final de ese documento.

Hay además una hoja de ruta anterior, escrita antes de empezar, con las dependencias entre módulos y qué define cada uno: **[docs/HOJA_DE_RUTA.md](docs/HOJA_DE_RUTA.md)**. Lo que propone para cuerpos, cabezas, FX y hechizos quedó resuelto de otra manera; conviene leerla sabiendo eso.

Lo que ya se puede reproducir y todavía no está arreglado vive en **[docs/PENDIENTES.md](docs/PENDIENTES.md)**. De ésos conviene saber uno: con el editor abierto en dos pestañas a la vez, las dos pueden repartir el mismo número de GRH y la segunda pisa a la primera. Abrilo en una sola.

## Licencia

MIT, en **[LICENSE](LICENSE)**. Hacé lo que quieras con el código, incluso usarlo en algo tuyo;
lo único que pide es que la nota de copyright viaje con él.

Los archivos del AO original que importes son otra cosa: son del juego, no de este editor, y acá
no viene ninguno. El `.gitignore` deja afuera las imágenes de las hojas, así que no se te van a
subir al repositorio sin querer.
