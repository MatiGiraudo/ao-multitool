# AO World Editor

Editor de mundo para el remake de Argentum Online. Hoy incluye:

- **Animaciones**: hojas de sprites, frames marcados por grilla o recuadro libre, movimiento en grupo, redimensionado de imágenes, vista previa y exportación `ao-anim`.
- **Objetos**: ítems del juego con sus atributos por tipo, icono, gráfico en el suelo y animaciones de equipado por dirección, con exportación `ao-objs`.

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

## Dónde quedan tus datos

Todo lo que hacés se guarda solo, unos 400 ms después de cada cambio, en la carpeta `data/`:

```
data/
├── graficos/
│   ├── <id>.json            ← una hoja: grilla y animaciones
│   ├── <id>.png             ← la imagen actual
│   └── <id>.original.png    ← la imagen como la cargaste (para "Volver al original")
└── objetos/
    └── objetos.json         ← todos los objetos, ordenados por ID
```

Esa carpeta está pensada para versionarla con **git**: cada cambio aparece claro en el historial y nada se pierde. Si querés guardar los datos en otro lugar, definí la variable `AO_DATA_DIR`, por ejemplo `AO_DATA_DIR=/ruta/a/mis-datos npm run dev`.

La carpeta trae dos hojas de ejemplo y tres objetos. Podés borrarlos desde la app («Quitar hoja» y «Borrar») o borrar esos archivos a mano.

## Traer lo que hiciste en el indexador web

En el indexador web usá **Guardar proyecto** para bajar `proyecto-ao.json`. Acá, tocá **Importar proyecto del indexador web…** arriba a la derecha. Se importan las hojas con sus imágenes, las animaciones y los objetos con sus vínculos.

Si ya existe una hoja con el mismo nombre de archivo, se actualiza en lugar de duplicarse. Los objetos con el mismo ID se reemplazan.

## Arquitectura

El código está organizado con screaming architecture, arquitectura hexagonal / clean architecture, DDD y SOLID. Está explicado paso a paso, con ejemplos de este mismo código, en **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**. Ahí también está la receta para agregar el próximo módulo (Hechizos, Cabezas, NPCs…).
