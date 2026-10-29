# Hoja de ruta

Qué módulos tiene el editor, cuáles faltan, qué define cada uno y en qué orden conviene construirlos. Cada módulo nuevo sigue el molde explicado en [ARQUITECTURA.md](ARQUITECTURA.md): carpetas `dominio/`, `aplicacion/`, `infraestructura/` y `ui/`; datos en `data/<modulo>/`; y un formato JSON de intercambio, para que lo editado acá se pueda leer desde otro programa.

> **Sobre los formatos originales de AO.** Las referencias a archivos como `Cuerpos.ind` o los `.map` describen cómo los usa el cliente clásico, para orientar el diseño. Antes de escribir un importador, verificá los tamaños y el orden exacto de los campos contra el código de la versión que uses (por ejemplo, las rutinas que cargan esos archivos en el cliente VB6), porque cambian entre versiones (`Integer` de 16 bits contra `Long` de 32). Mirar código ajeno para entender un formato está bien; escribí el tuyo en lugar de copiarlo, que cada proyecto viene con su licencia.

---

## Estado

| # | Módulo | Estado | Carpeta | Datos | Formato de intercambio |
|---|---|---|---|---|---|
| 1 | Gráficos (hojas y animaciones) | ✅ Hecho | `src/graficos/` | `data/graficos/` | `ao-anim` v1 |
| 2 | Objetos | ✅ Hecho | `src/objetos/` | `data/objetos/` | `ao-objs` v1 |
| 3 | Cuerpos | ⬜ Siguiente | `src/cuerpos/` | `data/cuerpos/` | `ao-cuerpos` v1 |
| 4 | Cabezas y cascos | ⬜ | `src/cabezas/` | `data/cabezas/` | `ao-cabezas` v1 |
| 5 | FX (efectos) | ⬜ | `src/fx/` | `data/fx/` | `ao-fx` v1 |
| 6 | Hechizos | ⬜ | `src/hechizos/` | `data/hechizos/` | `ao-hechizos` v1 |
| 7 | NPCs | ⬜ | `src/npcs/` | `data/npcs/` | `ao-npcs` v1 |
| 8 | Mapas (WorldEditor) | ⬜ | `src/mapas/` | `data/mapas/` | `ao-mapa` v1 |
| — | Extras: sonidos, clases y razas, recetas | ⬜ Opcional | | | |

## Dependencias

Cada flecha significa "necesita a".

```
Mapas ──► NPCs ──► Hechizos ──► FX ──► Gráficos
  │        ├────► Objetos ───────────► Gráficos
  │        ├────► Cuerpos ───────────► Gráficos
  │        └────► Cabezas ──► Cuerpos (offset)
  └──► todo lo anterior + tiles (Gráficos)
```

El orden de la tabla respeta esas dependencias: nunca vas a construir un módulo que apunte a algo que todavía no existe.

---

## 3. Cuerpos

**Para qué:** el cuerpo base del personaje o del NPC (desnudo, o la ropa cuando la armadura reemplaza el cuerpo, como en AO).

**Qué define**
- `numero`: el ID de AO, editable, como en Objetos.
- Una animación por dirección (sur, norte, este, oeste), por referencia a Gráficos, igual que el equipado de Objetos.
- **Offset de cabeza** (X, Y en píxeles): dónde se dibuja la cabeza encima del cuerpo. Es el dato clave que hoy falta para que la vista previa de cascos quede bien.
- Opcional: nombre o descripción para encontrarlo fácil ("humano hombre", "elfo mujer", "esqueleto").

**En AO clásico:** `Cuerpos.ind`. Por cada cuerpo, 4 gráficos (uno por dirección) más el offset de cabeza X/Y.

**Pantalla:** lista y ficha (como Objetos), 4 ranuras de animación con «Autovincular» (reusar `Autovinculador`), y una vista previa con una cabeza de prueba que se arrastra con el mouse para fijar el offset.

**Reutiliza:** `ReferenciaGrafica`, `Direccion`, `RanuraGrafica`, `SelectorDeAnimacion`. Conviene mover `Direccion` y `ReferenciaGrafica` a `compartido/dominio/`, porque los van a usar cuatro módulos.

**Listo cuando:** se puede crear un cuerpo, vincular las 4 direcciones, ajustar el offset de cabeza viéndolo en vivo, y exportar e importar `ao-cuerpos`.

---

## 4. Cabezas y cascos

**Para qué:** las cabezas de personajes y NPCs, y los cascos que se dibujan encima de ellas.

**Qué define**
- `numero`, `tipo` ("cabeza" o "casco") y un gráfico por dirección. Normalmente es un solo frame, no una animación, así que la referencia lleva frame, como el icono de Objetos.
- Para cascos, opcionalmente un offset propio respecto de la cabeza.

**En AO clásico:** `Cabezas.ind` y `Cascos.ind`, con la misma estructura: 4 gráficos por entrada.

**Vínculo con Objetos:** un objeto de tipo Casco hoy apunta a animaciones de equipado. Cuando exista este módulo, conviene que el casco apunte a un **número de casco** (como en AO), y que la vista previa lo dibuje sobre cuerpo + cabeza usando el offset del cuerpo. Lo mismo para armas y escudos, si se decide manejarlos como "gráficos de equipo" con su propio índice.

**Pantalla:** grilla de cabezas (se ven muchas a la vez), ficha con 4 ranuras, y una vista previa compuesta (cuerpo → cabeza → casco) eligiendo un cuerpo de prueba.

**Listo cuando:** un personaje se ve compuesto con cuerpo, cabeza, casco, arma y escudo en las 4 direcciones, bien alineado.

---

## 5. FX (efectos)

**Para qué:** las animaciones de hechizos, golpes críticos, curaciones, apuñaladas y efectos de ambiente.

**Qué define**
- `numero`, una animación (referencia a Gráficos), un offset X/Y respecto del objetivo, y **cuántas veces se repite** (1 = una sola vez; −1 = en bucle mientras dure el efecto).
- Opcional: capa (debajo o encima del personaje) y modo de mezcla (normal o aditivo para brillos), por si del otro lado se usan.

**En AO clásico:** `Fxs.ind`. Por cada FX, el gráfico de la animación más su offset.

**Pantalla:** lista, ficha y una vista previa que reproduce el FX sobre un personaje compuesto (para eso conviene tener hechos los módulos 3 y 4), con botón «Disparar».

**Listo cuando:** se ve el FX alineado sobre el personaje y se exporta `ao-fx`.

---

## 6. Hechizos

**Para qué:** todos los conjuros del juego.

**Qué define** (los campos típicos de `Hechizos.dat` en AO)
- `numero`, nombre, descripción, **palabras mágicas** y los mensajes que ven el lanzador y el objetivo.
- **Tipo**: modifica atributos (daño, curación, maná, energía, fuerza, agilidad…) o aplica un estado (paraliza, inmoviliza, envenena, cura veneno, invisibilidad, invoca, resucita…).
- **Objetivo**: usuario, NPC, ambos o terreno.
- **Costos y requisitos**: maná, energía y skill mínimo de Magia.
- **Valores**: mínimo y máximo de lo que modifica, y duración si aplica.
- **Presentación**: FX (referencia al módulo 5) y sonido (número de WAV, o referencia al módulo de sonidos si se hace).

**Reglas de dominio a modelar:** que el mínimo no supere al máximo, que un hechizo de daño tenga objetivo, y que un FX referenciado exista (con el mismo patrón de vínculos pendientes que Objetos).

**Pantalla:** lista con filtros por tipo, ficha con secciones que cambian según el tipo (igual que los atributos por tipo de Objetos), y vista previa del FX.

**Vínculo con Objetos:** el objeto tipo Pergamino tiene un atributo "N.º de hechizo". Cuando exista este módulo, ese atributo pasa a ser un selector de hechizos, con validación de vínculo roto.

**Listo cuando:** CRUD completo, `ao-hechizos` de ida y vuelta, y los pergaminos apuntando a hechizos reales.

---

## 7. NPCs

**Para qué:** criaturas, guardias, comerciantes, banqueros, sacerdotes, entrenadores…

**Qué define** (los campos típicos de `NPCs.dat`)
- `numero`, nombre, descripción, **cuerpo** (módulo 3), **cabeza** (módulo 4) y dirección inicial.
- **Comportamiento**: estático, camina al azar, hostil, persigue, huye, guardia… y si es atacable o domable.
- **Rol**: común, comerciante, banquero, sacerdote, entrenador o revividor.
- **Stats**: vida, golpe mínimo y máximo, defensa, evasión, experiencia y oro que da, y velocidad.
- **Hechizos que lanza** (módulo 6).
- **Inventario de venta** (comerciantes): objetos con cantidad, con referencias a Objetos.
- **Drops**: objeto, cantidad y probabilidad.
- **Sonidos**: aparece, ataca, recibe golpe, muere.

**Reglas de dominio:** un comerciante necesita inventario, las probabilidades de drop van de 0 a 100 %, y todas las referencias tienen que existir.

**Pantalla:** lista y ficha por pestañas (Datos · Combate · Comercio · Drops), con vista previa compuesta animada (cuerpo + cabeza) en las 4 direcciones.

**Listo cuando:** se puede crear un NPC completo y verlo animado, con todas sus referencias validadas.

---

## 8. Mapas (WorldEditor)

El módulo más grande, y el que usa todo lo anterior.

**Qué define**

Un **mapa** tiene:
- `numero`, nombre, música, zona (segura o insegura), terreno (bosque, desierto, nieve, dungeon…), si permite invocar o robar, y clima.
- Una grilla de **100×100 tiles** de 32×32 px.

Cada **tile** tiene:
- **4 capas gráficas**:
  - Capa 1: suelo (agua, pasto, piso).
  - Capa 2: detalles del suelo (bordes, caminos).
  - Capa 3: objetos que tapan al personaje (árboles, techos, paredes altas).
  - Capa 4: techos que se ocultan al entrar a un edificio.
- **Bloqueo**: no se puede caminar.
- **Trigger**: zona segura, bajo techo, anti-piquete, zona de pelea…
- **Traslado**: al pisarlo, te lleva a mapa / x / y.
- **NPC** colocado (módulo 7) y **objeto** en el suelo (módulo 2) con cantidad.
- Opcional, por lo que vimos en ao-org: **luces** y **partículas** por tile.

**En AO clásico:** cada mapa se reparte en `.map` (capas gráficas y banderas por tile), `.inf` (traslados, NPCs y objetos por tile) y `.dat` (datos generales del mapa). El importador tiene que leer los tres y combinarlos en un solo `mapa_XXX.json`.

**Modelo en el editor**
- **Tiles como gráficos**: una hoja con grilla de 32×32 (por ejemplo `tiles_bosque.png`) cuyas celdas son animaciones de 1 frame, o de varios para el agua. No hace falta un módulo aparte; sí conviene una vista de "paleta" que muestre la hoja entera como pinceles.
- **Datos**: `data/mapas/mapa_001.json`, con las capas en arreglos compactos (por ejemplo `capas[1]` como un arreglo de 10 000 referencias a tiles en un índice local del mapa), para que el archivo no pese varios MB y los diffs de git sigan siendo legibles.
- **Dominio**:
  - `Mapa` es el agregado; `Tile` y `Traslado` son objetos de valor.
  - Las **operaciones de pincel** (pintar, rellenar área, balde de pintura, borrar) son métodos del agregado.
  - El **deshacer/rehacer** sale casi gratis porque el dominio es inmutable: alcanza con guardar versiones anteriores.

**Pantalla**
- Lienzo con zoom y desplazamiento, cámara de 17×13 tiles para ver "lo que ve el jugador", y capas que se pueden mostrar u ocultar.
- **Herramientas**: pincel, rectángulo, balde, goma, cuentagotas, bloqueo, trigger, traslado, colocar NPC y colocar objeto.
- **Paleta** de tiles a la derecha y **minimapa**.
- Un navegador de mapas que muestra los traslados como conexiones entre mapas.

**Rendimiento:** 100×100 tiles con 4 capas se dibujan bien en canvas si se redibuja solo la zona visible y se cachean las capas que no cambian. Si hace falta más, se puede pasar a WebGL más adelante sin tocar el dominio.

**Listo cuando:** se puede abrir un mapa, pintarlo, poner bloqueos, traslados, NPCs y objetos, guardarlo, y exportar `ao-mapa`. Importar los mapas originales (`.map` + `.inf` + `.dat`) es un hito aparte.

---

## Transversal (en paralelo a los módulos)

- **Importadores de AO clásico**: `Graficos.ind` → hojas y animaciones; `Cuerpos.ind`, `Cabezas.ind`, `Cascos.ind`, `Fxs.ind`; `Obj.dat`, `Hechizos.dat`, `NPCs.dat`; y los mapas. Cada uno va como un adaptador más en la infraestructura de su módulo (por ejemplo `objetos/infraestructura/LectorObjDat.ts`), usando el mismo puerto que el importador JSON.
- **Validación global**: una pantalla de "Problemas" que junte vínculos rotos, IDs repetidos y referencias faltantes de todos los módulos.
- **Mover piezas a `compartido/`**: `Direccion`, `ReferenciaGrafica`, `RanuraGrafica`, `SelectorDeAnimacion` y la vista previa compuesta, cuando el segundo módulo las necesite (no antes).
- **Tests**: cada módulo arranca con tests de dominio, como los de `graficos.test.ts` y `objetos.test.ts`.

## Cómo encarar cada módulo

1. Escribir el dominio y sus tests (sin interfaz).
2. Escribir los casos de uso con los adaptadores en memoria y sus tests.
3. Escribir el DTO, el repositorio en archivos, el HTTP y las rutas de API.
4. Hacer la pantalla.
5. Hacer el formato de exportación e importación, y probar la ida y vuelta.
6. Agregar el módulo a esta tabla de estado.
