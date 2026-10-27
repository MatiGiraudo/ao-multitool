# AO World Editor

Editor de mundo para el remake de Argentum Online. Hoy incluye:

- **Animaciones**: hojas de sprites, frames marcados por grilla o recuadro libre, movimiento en grupo, redimensionado de imágenes, vista previa y exportación `ao-anim`.
- **Objetos**: ítems del juego con sus atributos por tipo, icono, gráfico en el suelo y animaciones de equipado por dirección, con exportación `ao-objs`.
- **Apariencias**: los cuerpos y las cabezas de los personajes, con su gráfico en cada dirección y dónde se apoya la cabeza sobre el cuerpo, con exportación `ao-bodies` y `ao-heads`.
- **Hechizos**: qué hace cada hechizo, cuánto cuesta, sus palabras mágicas y con qué FX se ve, con exportación `ao-spells`.
- **NPCs**: criaturas y gente del mundo, con su apariencia, su combate, los hechizos que lanzan y lo que sueltan o venden, con exportación `ao-npcs`.
- **Exportar todo**: los JSON de todo el mundo juntos, guardados en `data/exportado/` de una vez.
- **Diagnóstico**: qué quedó roto o a medio terminar en todo el mundo, incluidos los cruces que ningún módulo ve solo.
- **Importar del AO original**: la tabla de GRH del `Graficos.ini`, el `OBJ.dat` y el `Hechizos.dat`, creando las animaciones que hagan falta y vinculando los iconos.
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
├── importacion/
│   └── grh.json             ← la tabla de GRH del AO original, para traducir sus gráficos
└── exportado/
    └── *.json               ← lo que escribe «Exportar todo», listo para el juego
```

Esa carpeta está pensada para versionarla con **git**: cada cambio aparece claro en el historial y nada se pierde. Si querés guardar los datos en otro lugar, definí la variable `AO_DATA_DIR`, por ejemplo `AO_DATA_DIR=/ruta/a/mis-datos npm run dev`.

La carpeta trae dos hojas de ejemplo y tres objetos. Podés borrarlos desde la app («Quitar hoja» y «Borrar») o borrar esos archivos a mano.

## Traer los archivos del AO original

En la pestaña **Importar** hay tres pasos. Primero el `Graficos.ini`, que arma la tabla de GRH: ahí está, para cada número de gráfico del juego, de qué imagen sale y qué recorte es. Después el `OBJ.dat`, que trae todos los objetos con su nombre, tipo, valor, banderas y atributos, y les vincula el icono creando en cada hoja las animaciones que hagan falta (las llama `grh505` y así). Y el `Hechizos.dat`, que trae los hechizos con sus palabras mágicas, su costo y su efecto; ese no necesita el paso 1, porque apunta al FX por número.

Los archivos van en ANSI, como los guarda Windows: se leen bien, con acentos y todo. Cargá las imágenes que te interesen (con el mismo nombre que en el juego, por ejemplo `12.png`) y volvé a importar el `OBJ.dat`: lo que faltaba se vincula entonces, sin duplicar nada.

## Traer lo que hiciste en el indexador web

En el indexador web usá **Guardar proyecto** para bajar `proyecto-ao.json`. Acá, tocá **Importar proyecto del indexador web…** arriba a la derecha. Se importan las hojas con sus imágenes, las animaciones y los objetos con sus vínculos.

Si ya existe una hoja con el mismo nombre de archivo, se actualiza en lugar de duplicarse. Los objetos con el mismo ID se reemplazan.

## Arquitectura

El código está organizado con screaming architecture, arquitectura hexagonal / clean architecture, DDD y SOLID. Está explicado paso a paso, con ejemplos de este mismo código, en **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**. Ahí también está la receta para agregar el próximo módulo (NPCs, Mapas…).

## Qué falta

El plan de lo que todavía no está (NPCs, mapas, diagnóstico), fase por fase y con lo que ya se hizo marcado, está en **[docs/ROADMAP.md](docs/ROADMAP.md)**.

Hay además una hoja de ruta anterior, escrita antes de empezar, con las dependencias entre módulos y qué define cada uno: **[docs/HOJA_DE_RUTA.md](docs/HOJA_DE_RUTA.md)**. Lo que propone para cuerpos, cabezas, FX y hechizos quedó resuelto de otra manera; conviene leerla sabiendo eso.
