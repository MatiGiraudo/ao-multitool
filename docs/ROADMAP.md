# Plan para las herramientas que faltan

Este documento es el plan de trabajo: qué falta para que el AO World Editor cubra todo el mundo del juego, en qué orden conviene hacerlo y, para cada herramienta, los archivos concretos que hay que escribir.

Se apoya en **[ARQUITECTURA.md](ARQUITECTURA.md)**, en especial en la receta de la sección 8. Acá se decide **qué** y **en qué orden**; allá está el **cómo**.

---

## 1. Dónde estamos

| Herramienta | Estado | Módulo | Exporta |
|---|---|---|---|
| Hojas de sprites y animaciones | ✅ Lista | `src/graficos/` | `ao-anim` |
| Objetos (ítems del juego) | ✅ Lista | `src/objetos/` | `ao-objs` |
| FX (efectos visuales) | ✅ Lista | `src/fx/` | `ao-fx` |
| Cuerpos y cabezas (apariencias) | ✅ Lista | `src/apariencias/` | `ao-bodies`, `ao-heads` |
| Importar del AO original (GRH, cuerpos, cabezas, FX, objetos, hechizos) | ✅ Lista | `src/importacion/` | — |
| Importar proyecto del indexador web | ✅ Lista | `src/proyecto/` | — |
| Hechizos | ❌ Falta | — | — |
| NPCs | ❌ Falta | — | — |
| Mapas | ❌ Falta | — | — |
| Exportar todo de una vez | ❌ Falta | — | — |
| Diagnóstico del mundo | ❌ Falta | — | — |

Dos aclaraciones sobre lo que **no** hace falta como módulo nuevo:

- **Cascos, escudos y armas** ya están cubiertos: son objetos equipables, y un objeto equipable guarda sus cuatro direcciones en `graficos.equipado`. En AO clásico tenían índices propios (`Helmet.ind`, `Shield.ind`, `Weapon.ind`); acá vive todo en la ficha del objeto, que es más simple y no se desincroniza.
- **Lo que falta del personaje** es la base: el **cuerpo** (con el offset donde se apoya la cabeza) y la **cabeza**.

---

## 2. Fase 0 — Cimientos compartidos ✅ hecha

> Hecha el 26/10/2026. Al implementarla cambiaron dos cosas respecto de lo planeado, y quedaron así
> porque son mejores: la capa anticorrupción y los dos componentes de UI **no** se mudaron a
> `compartido/`, sino a `graficos/` (lo explica la sección 3.7 de ARQUITECTURA.md: a `compartido/`
> va lo que no conoce a ningún módulo), y la importación de proyecto dejó de depender de los
> proveedores gracias a un registro de recargas.

**Por qué va primero.** Hoy hay dos módulos y tres piezas clave viven dentro de `objetos/`: `ReferenciaGrafica`, `Direccion` y el puerto `CatalogoGrafico`. Los cinco módulos que vienen (apariencias, FX, hechizos, NPCs, mapas) necesitan exactamente esas tres. Si no se mueven ahora, se copian cinco veces.

Lo mismo pasa con tres patrones que ya están duplicados entre `ProveedorDeGraficos` y `ProveedorDeObjetos`: la edición optimista con guardado diferido, el repositorio "todo en un JSON" y el par de rutas de API. Escribirlos una vez acá ahorra unas 200 líneas por módulo nuevo.

**No cambia ningún comportamiento.** Los tests actuales son la red de seguridad: tienen que seguir verdes sin tocarlos.

### 2.1 Mover al núcleo compartido (shared kernel)

| De | A |
|---|---|
| `objetos/dominio/ReferenciaGrafica.ts` | `compartido/dominio/ReferenciaGrafica.ts` |
| `objetos/dominio/Direccion.ts` | `compartido/dominio/Direccion.ts` |
| `objetos/dominio/CatalogoGrafico.ts` | `compartido/dominio/CatalogoGrafico.ts` |
| `objetos/dominio/servicios.ts` → `Problema` y `Autovinculador` | `compartido/dominio/Problema.ts` y `compartido/dominio/Autovinculador.ts` |
| `objetos/infraestructura/CatalogoGraficoDesdeHojas.ts` | `graficos/infraestructura/CatalogoGraficoDesdeHojas.ts` |
| `objetos/ui/RanuraGrafica.tsx` y `SelectorDeAnimacion.tsx` | `graficos/ui/` |

Las dos últimas filas no van a `compartido/` porque conocen a Gráficos: son Gráficos el que implementa
el puerto compartido y el que sabe dibujar sus animaciones. `ProveedorDeGraficos` pasó a exponer
`catalogo` y `resolver`, así que cualquier módulo que vincule gráficos los tiene servidos.

En `objetos/dominio/servicios.ts` queda sólo `ValidadorDeObjetos`, que es lo único propio de objetos.

Esto **no** rompe la regla de los contextos delimitados: `CatalogoGraficoDesdeHojas` sigue siendo el **único** archivo que traduce desde `graficos/`, y ningún dominio importa a otro dominio. Lo que pasa a `compartido/` es vocabulario que todos los contextos comparten; DDD lo llama *shared kernel* y está pensado justo para esto.

### 2.2 Piezas genéricas nuevas

- `compartido/dominio/ColeccionRepositorio.ts` — el puerto que repiten todos: `listar / guardar / guardarVarios / eliminar`.
- `compartido/infraestructura/servidor/ArchivosColeccionRepositorio.ts` — "todos los registros en un JSON", con cola de escrituras, escritura atómica y orden por número. `ArchivosObjetoRepositorio` pasa a ser tres líneas sobre esta clase.
- `compartido/infraestructura/navegador/HttpColeccionRepositorio.ts` — el adaptador HTTP equivalente.
- `compartido/infraestructura/memoria.ts` — `MemoriaColeccionRepositorio` para los tests.
- `compartido/infraestructura/rutasDeColeccion.ts` — arma el `GET/POST` y el `PUT/DELETE` a partir de un mapper y los casos de uso. Cada módulo nuevo aporta dos archivos de API de tres líneas.
- `compartido/ui/useColeccionEditable.ts` — el patrón "se ve al instante, se guarda 400 ms después, se vacían los pendientes antes de crear o exportar". Estaba escrito dos veces.
- `registrarRecarga` / `recargarTodo` en `ProveedorDeAplicacion` — cada colección se anota sola (lo hace el hook), así "Importar proyecto…" refresca lo que esté montado sin importar un solo módulo. Sin esto, cada herramienta nueva obligaba a tocar el botón de importar.

### 2.3 Navegación y proveedores

Con siete pestañas, el encabezado y el `layout.tsx` actuales no alcanzan:

- `app/_componentes/secciones.ts`: la lista de pestañas pasa a ser datos, con su familia — **Gráficos**, **Personajes** (apariencias, NPCs), **Reglas** (objetos, hechizos, FX) y **Mundo** (mapas, diagnóstico). Agregar una herramienta es una línea acá. El encabezado dibuja un grupo por familia; mientras una tenga una sola pestaña se ve como un botón suelto.
- Hoy `layout.tsx` anida todos los proveedores, así que cada pestaña carga los datos de todas. Que cada página componga sólo los proveedores que usa: Objetos necesita Gráficos; NPCs necesita Apariencias, Objetos y Hechizos; Animaciones no necesita nada más.

**Tamaño:** ~1 día. **Riesgo:** bajo (es mover y extraer, con tests verdes de testigo).

**Cómo quedó:** 17 tests y el typecheck en verde sin tocarlos, el build pasa, y los módulos de objetos
perdieron 148 líneas netas. Un repositorio de módulo son ahora 10 líneas y un par de rutas de API, 30.

---

## 3. Fase 1 — Apariencias (cuerpos y cabezas) ✅ hecha

> Hecha el 26/10/2026. La decisión de juntarlas en un módulo se confirmó al escribirlo: `Cuerpo` y
> `Cabeza` comparten el contrato `Apariencia` (clave, número, nombre y un gráfico por dirección) y
> se diferencian en dos líneas — el cuerpo guarda el corrimiento de la cabeza, la cabeza usa un
> frame fijo. Gracias a eso, el validador, los siete casos de uso y la pantalla están escritos una
> sola vez y se usan dos, parametrizados por `EspecieDeApariencia`.
>
> La vista previa es lo que justifica el módulo compartido: edites un cuerpo o una cabeza, se ve el
> personaje armado y del otro lado elegís con qué mirarlo.
>
> Al núcleo compartido se sumó `PorDireccion` (el mapa de datos por dirección, con sus tres
> operaciones) y `referenciaValida` en infraestructura, que estaba copiada en tres mappers.

Lo que el juego necesita para dibujar un personaje antes de vestirlo.

**Decisión de diseño:** cuerpos y cabezas van en **un solo módulo** `src/apariencias/`, con dos entidades y una pantalla de dos pestañas. Comparten el 90 % de la ficha (número, nombre, cuatro direcciones) y, sobre todo, la vista previa útil es la de los dos juntos: el cuerpo caminando con la cabeza apoyada en su offset. Separarlos en dos módulos gemelos duplicaría pantalla y proveedor para no ganar nada. (Alternativa descartada: `src/cuerpos/` y `src/cabezas/` por separado.)

```
src/apariencias/
├── dominio/
│   ├── Cuerpo.ts              ← clave, numero, nombre, refs por dirección (caminar), offsetCabeza {x,y}
│   ├── Cabeza.ts              ← clave, numero, nombre, un frame por dirección
│   ├── CuerpoRepositorio.ts   ← puertos sobre ColeccionRepositorio
│   ├── CabezaRepositorio.ts
│   └── servicios.ts           ← ValidadorDeApariencias (número repetido, vínculo roto, direcciones faltantes)
├── aplicacion/
│   ├── casosDeUso.ts          ← Listar/Crear/Guardar/Duplicar/Eliminar/Exportar/Importar, por entidad
│   └── puertos.ts             ← FormatoDeApariencias
├── infraestructura/
│   ├── CuerpoDto.ts, CabezaDto.ts
│   ├── FormatoAoBodies.ts     ← format "ao-bodies": { id, name, offsetHead:{x,y}, graphics:{ sur,norte,este,oeste } }
│   ├── FormatoAoHeads.ts      ← format "ao-heads"
│   ├── servidor/, navegador/, memoria.ts
└── ui/
    ├── ProveedorDeApariencias.tsx
    ├── EditorDeApariencias.tsx  ← lista | ficha con 4 ranuras | vista previa
    └── VistaPreviaDePersonaje.tsx ← cuerpo + cabeza + (opcional) casco/arma/escudo de un objeto
```

Más: `app/api/cuerpos/`, `app/api/cabezas/`, `app/apariencias/page.tsx`, las líneas en los dos contenedores y `apariencias.test.ts`.

Se reusa tal cual: `RanuraGrafica`, `SelectorDeAnimacion`, `DibujoDeFrame`, `VistaPreviaAnimacion` y el `Autovinculador` (al elegir una hoja llena las cuatro direcciones por el sufijo del nombre).

**Datos:** `data/apariencias/cuerpos.json` y `data/apariencias/cabezas.json`.
**Tamaño:** ~1,5 días. **Depende de:** Fase 0.

---

## 4. Fase 1.5 — Importar los archivos clásicos de AO ✅ hecha (salvo NPCs)

> Hecha el 26/10/2026 la parte que tiene a dónde ir: la **tabla de GRH** (desde `Graficos.ini`) y el
> **`OBJ.dat`** completo. Lo que se confirmó al escribirlo:
>
> - El `Graficos.ini` es texto, así que no hizo falta ningún lector binario para empezar.
> - El puente GRH → editor terminó siendo más lindo de lo planeado: el importador **crea la animación
>   en la hoja que corresponda** (la llama `grh505`) y recién ahí vincula el objeto. Es incremental:
>   cargás más imágenes, volvés a importar y se vincula lo que faltaba, sin duplicar nada.
> - Los `.dat` vienen en ANSI (windows-1252), no en UTF-8. Leerlos como UTF-8 rompe cada acento, así
>   que el lector prueba UTF-8 estricto y, si no es válido, decodifica como windows-1252.
>
> Completada el 26/10/2026 con cuerpos, cabezas y FX, y ahí se cayó la decisión abierta número 2:
> **no hizo falta ningún lector binario**. Los `.ind` que carga el cliente se generan desde archivos
> de texto que están al lado, con el mismo formato `[SECCION] clave=valor` de siempre:
> `Personajes.ini` (cuerpos), `Cabezas.ini`, `Cascos.ini` y `fxs.ini`. Lo que se aprendió:
>
> - **El archivo de cuerpos es `Personajes.ini`, no `Cuerpos.ini`.** Lo dice `CargarCuerpos` en
>   `modCarga.bas`: el cliente abre `Personajes.ind`. El `Cuerpos.ini` que anda dando vueltas es de
>   otra versión y está corrido — en 477 de sus 597 entradas el `HeadOffsetX` tiene adentro un
>   número de GRH. La pantalla lo avisa.
> - **Las direcciones se numeran 1 norte, 2 este, 3 sur, 4 oeste** (`Declares.bas`), y es el mismo
>   orden en cuerpos, cabezas, cascos, armas y escudos. Por eso los tres archivos de apariencias los
>   lee una sola clase parametrizada por el prefijo de sección y de clave.
> - **El puente GRH → animación se extrajo a `PuenteDeGrh`.** Estaba dentro de `ImportarObjetosClasicos`
>   y ahora lo comparten los cuatro importadores que traen gráficos; cada caso de uso quedó en unas
>   treinta líneas.
> - **Hay dos `Hechizos.dat` distintos.** El del servidor trae la mecánica (`SubeHP`, `Paraliza`,
>   `Target`, `FXgrh`); el del cliente sólo nombre, descripción, palabras mágicas y costos. Con el
>   del cliente el importador trae el texto y avisa en `sinEfecto` cuáles quedaron sin mecánica, en
>   vez de dejar cuarenta y seis hechizos que dicen curar.
> - **Sin carga masiva de imágenes, el importador no servía de nada.** La tabla de GRH de un cliente
>   nombra unos 2.850 archivos, y las hojas se cargaban de a una: nadie hace ese clic dos mil veces.
>   `CargarHojasEnLote` crea una hoja por imagen de una carpeta entera, saltea lo que ya está cargado
>   y acepta `soloEstas` para traer nada más que lo que la tabla pide. El botón está en el paso 1 y
>   en «Animaciones». La carpeta `data/graficos` no es un buzón: una hoja es su `.json` más su PNG,
>   así que copiar imágenes ahí a mano no carga nada.
>
> **Lo que falta de esta fase**, por orden de valor:
>
> 1. Los gráficos de **equipado** de los objetos (arma en la mano, escudo en el brazo): `Armas.dat` y
>    `Escudos.dat`, que son texto y tienen la misma forma que los de apariencias, pero van a
>    `graficos.equipado` de la ficha del objeto y no a una entidad propia.
> 2. **Cascos como entidad aparte.** Hoy `Cascos.ini` entra por el importador de cabezas y queda
>    mezclado con ellas, porque el editor no distingue las dos cosas (ver la decisión abierta 3).
> 3. `NPCs.dat`, cuando exista ese módulo: es un lector y un caso de uso, igual que el de hechizos.

**Es la fase con mejor relación valor/esfuerzo y conviene adelantarla.** Cargar a mano cientos de cuerpos, cabezas, hechizos y NPCs es inviable; los `.dat` y `.ind` del AO original ya tienen todo eso.

```
src/importacion/
├── aplicacion/ImportarDatosClasicos.ts   ← coordina: lee un .dat/.ind y llama al Importar<X> del módulo
└── infraestructura/
    ├── LectorIni.ts            ← el formato [SECCION] clave=valor que usan todos los .dat
    ├── LectorBodyInd.ts        ← Body.ind / Head.ind (binarios o su versión .dat)
    ├── LectorHechizosDat.ts
    ├── LectorNpcsDat.ts
    └── LectorObjDat.ts         ← OBJ.dat → objetos (el módulo ya existe)
```

Cada lector devuelve los mismos `…Importado` que ya usan los casos de uso `Importar<X>`, así que no hace falta tocar los módulos. Se agrega por lector, a medida que la fase correspondiente exista.

**Lo que hay que resolver:** los clásicos referencian gráficos por **número de GRH**, no por hoja y nombre de animación. Hace falta una tabla de equivalencia GRH → animación, que se puede armar una vez al importar `Graficos.ind` y guardar en `data/importacion/grh.json`.

**Tamaño:** ~1 día por lector. **Pregunta abierta:** ¿están a mano los archivos del AO original de referencia?

---

## 5. Fase 2 — FX ✅ hecha

> Hecha el 26/10/2026, y sirvió para lo que se esperaba: estrenar los cimientos. El módulo entero
> (dominio, casos de uso, formato, tres adaptadores, dos rutas de API y la pantalla) son 945 líneas,
> más 120 de tests, y las piezas genéricas de la Fase 0 se llevaron puestos los repositorios (32
> líneas entre los tres) y las rutas de API (29). En el camino
> se sumaron al núcleo compartido `NumeroDeAo` (el "ID de AO" con su validación y el próximo número
> libre) y `ReferenciaPorNombre` con su resolución contra el catálogo, que vivían dentro de Objetos.
>
> La vista previa sobre un cuerpo de muestra quedó resuelta de forma genérica: se elige cualquier
> animación como gráfico de muestra, con la misma `RanuraGrafica` que usa todo el editor. Cuando
> exista Apariencias, sólo hay que preseleccionarle un cuerpo.

Los efectos visuales que usan los hechizos (y después los NPCs y los objetos).

- `src/fx/dominio/Efecto.ts`: clave, numero, nombre, referencia a una animación, `offsetX`, `offsetY`, repeticiones (0 = en bucle).
- Formato `ao-fx`: `{ id, name, anim:{ sheet, anim }, offset:{x,y}, loops }`.
- UI: lista | ficha | vista previa del FX **encima de un cuerpo de muestra**, que es la única forma de acertarle al offset. El selector de cuerpo de muestra sale del módulo Apariencias.

**Tamaño:** ~1 día (es el módulo más chico; buen primer módulo para rodar los cimientos de la Fase 0 si se quiere validar antes de Apariencias). **Depende de:** Fase 0; la vista previa, de Fase 1.

---

## 6. Fase 3 — Hechizos ✅ hecha

> Hecha el 26/10/2026, junto con el lector de `Hechizos.dat` que faltaba de la Fase 1.5. Lo que
> conviene saber:
>
> - El catálogo de efectos como dato funcionó igual que en Objetos: los doce efectos, con los datos
>   que necesita cada uno, son una lista en `TipoDeHechizo.ts`, y la ficha los dibuja sola.
> - Para eso se subieron a `compartido/` las definiciones de atributos con sus validaciones
>   (`dominio/Atributos.ts`) y los campos que las dibujan (`ui/CamposDeAtributos.tsx`), que vivían
>   dentro de Objetos. Objetos pasó a usar esas mismas piezas.
> - El vínculo con FX estrenó `CatalogoPorNumero`: el puerto para mirar otra familia de entidades por
>   su número sin importar su módulo. Lo implementa FX, que es el dueño de los datos, y la página es
>   la que junta los dos. Es exactamente lo que NPCs va a necesitar tres veces.
> - En el `Hechizos.dat` clásico el efecto no es un campo sino un montón de banderas sueltas
>   (`Paraliza=1`, `SubeHP=2`…). El lector las traduce al tipo del editor, mirándolas en orden.

La receta de la sección 8 de ARQUITECTURA.md, con el detalle completo del dominio:

- `Hechizo.ts`: clave, numero, nombre, descripción, palabras mágicas, objetivo (`usuario` / `npc` / `terreno` / `ambos`), maná, energía, skill requerido, nivel mínimo, referencia al FX **por número** (igual que AO), sonido.
- `TipoDeHechizo.ts`: el catálogo de efectos como **dato**, al estilo de `TIPOS_DE_OBJETO` — daño (min/máx), curación, resucitar, paralizar, remover parálisis, invisibilidad, ceguera, estupidez, invocar NPC, cambiar stats. Cada efecto declara sus atributos; la ficha, el validador y la exportación los toman solos. Agregar un efecto nuevo no toca código.
- Formato `ao-spells`.
- **Cruce con Objetos:** el objeto tipo `pergamino` ya tiene el atributo `hechizo`. El validador cruzado ("este pergamino apunta a un hechizo que no existe") va en el diagnóstico de la Fase 6, no dentro de ninguno de los dos dominios.

**Tamaño:** ~2 días. **Depende de:** Fase 0 y Fase 2.

---

## 7. Fase 4 — NPCs

El módulo más grande después de Mapas, porque consume tres catálogos.

- `Npc.ts`: clave, numero, nombre, descripción, tipo (hostil, comerciante, sacerdote, banquero, entrenador, guardia, quest), cuerpo y cabeza (por número), dirección inicial, movimiento (quieto / aleatorio / persigue), combate (vida, golpe mín/máx, defensa, evasión, experiencia, oro), hechizos que lanza, drops (objeto + cantidad + probabilidad), inventario de comercio, respawn, domable, atacable.
- `TipoDeNpc.ts`: igual que `TIPOS_DE_OBJETO`, cada tipo declara qué secciones de la ficha aplican (un banquero no tiene golpe; un comerciante sí tiene inventario).
- Puertos propios para lo que necesita de otros contextos: `CatalogoDeApariencias`, `CatalogoDeObjetos`, `CatalogoDeHechizos` — con sus capas anticorrupción en `npcs/infraestructura/`. El dominio de NPCs no importa nada de los otros dominios.
- Acá se paga solo un `compartido/ui/SelectorDeEntidad.tsx` (buscar por número o nombre en cualquier catálogo), que se usa cinco veces en la misma ficha.
- Formato `ao-npcs`.
- UI: lista | ficha con secciones (datos, apariencia, combate, drops, comercio, hechizos) | vista previa animada del NPC.

**Tamaño:** ~3 días. **Depende de:** Fases 0, 1, 3 y Objetos.

---

## 8. Fase 5 — Mapas

Equivale, sola, a todas las fases anteriores juntas. Conviene partirla en dos entregas y no empezarla hasta que los catálogos tengan datos reales.

**Entrega A — visor (sólo lectura).** Importar un mapa clásico (`.map` + `.inf` + `.dat`), dibujarlo y navegarlo. Valida el modelo de datos y el rendimiento antes de escribir una sola herramienta de edición.

**Entrega B — editor.** Pincel, rectángulo, relleno, capa activa, paleta de tiles, bloqueos, colocar NPCs y objetos, traslados, deshacer/rehacer.

Lo que hace a Mapas distinto de todo lo anterior:

- **Escala.** 100×100 celdas × 4 capas = 40 000 celdas por mapa. El dominio inmutable "una clase por celda" no sirve: las capas van como arreglos tipados (`Int32Array`) dentro del agregado `Mapa`, con métodos inmutables sólo a nivel de capa o de región.
- **Guardado.** El patrón "guardar todo 400 ms después" no escala a un pincel que pinta cien celdas por segundo. Hace falta guardado por región con debounce más largo e indicador de estado visible. Un archivo por mapa: `data/mapas/<numero>.json`.
- **Tiles.** Un tile es, hoy, una animación de un frame. Alcanza para empezar, pero conviene un `CatalogoDeTiles` que liste frames de la grilla de una hoja directamente, sin obligar a crear una animación por tile.
- **Deshacer/rehacer de verdad.** Es el primer módulo donde es indispensable. El dominio inmutable ya lo deja casi servido: una pila de estados por región.
- **Lienzo.** Pan, zoom, grilla de 32 px, capa activa con las demás atenuadas, minimapa.

**Tamaño:** 1–2 semanas por entrega. **Depende de:** todo lo anterior.

---

## 9. Fase 6 — Transversales

Chicas, de mucho valor, y conviene hacerlas en cuanto haya tres o cuatro módulos (no al final).

- **Exportar todo.** Un caso de uso en `src/proyecto/` que junta los JSON de todos los módulos en una carpeta o un `.zip`: es lo que Unity quiere consumir de una vez, en lugar de siete descargas sueltas. Costo: medio día.
- **Diagnóstico del mundo.** `src/proyecto/aplicacion/RevisarMundo.ts` junta los `Problema[]` de todos los módulos y agrega los cruzados que ningún dominio puede ver solo: pergamino sin hechizo, NPC sin cuerpo, hechizo sin FX, mapa con tiles inexistentes, números repetidos. Con una página `/diagnostico`. Es el lugar natural para los chequeos entre contextos, sin ensuciar ningún dominio.
- **Guardar y versionar.** Ya funciona por módulo; sólo hay que sumar las carpetas nuevas a `data/` y mencionarlas en el README.

---

## 10. Orden recomendado

```
Fase 0  Cimientos compartidos        ✅ hecha
Fase 2  FX                           ✅ hecha
Fase 1  Apariencias                  ✅ hecha
Fase 1.5 Importadores clásicos       ✅ hecha (falta NPCs.dat, y el equipado de los objetos)
Fase 3  Hechizos                     ✅ hecha
Fase 6  Exportar todo + diagnóstico  1 día
Fase 4  NPCs                         3 días
Fase 5  Mapas (A visor, B editor)    1–2 semanas por entrega
```

FX va antes que Apariencias a propósito: es el módulo más chico y sirve para comprobar que las piezas genéricas de la Fase 0 son las correctas, cuando corregirlas todavía cuesta poco. Su vista previa sobre un cuerpo de muestra se completa después de la Fase 1.

Los importadores se adelantan porque diseñar fichas con dos registros de ejemplo lleva a equivocarse; con los datos reales del juego cargados, cada ficha se diseña contra lo que de verdad hay.

---

## 11. Decisiones abiertas

1. **Apariencias juntas o separadas.** El plan propone un módulo con dos entidades y una pantalla de dos pestañas. La alternativa es `src/cuerpos/` y `src/cabezas/` por separado, más fiel a "una carpeta por concepto" pero con pantalla y proveedor duplicados.
2. ~~**Los archivos binarios del AO original.**~~ **Resuelta el 26/10/2026: no hacen falta.** Al lado de cada `.ind` está el `.ini` de texto desde el que se genera, y es el que conviene leer. Si alguna vez aparece un cliente que sólo traiga los binarios, ahí sí habrá que escribir el lector.
3. **Cascos, escudos y armas.** El plan los deja como objetos equipables (lo que ya funciona). Si el cliente de Unity espera índices separados, hay que sumar un módulo.
4. **Mapas.** ¿Tamaño fijo 100×100 como el clásico, o libre? Afecta al modelo de datos y al formato, así que conviene decidirlo antes de la Entrega A.
5. **Nombres de formato.** `ao-bodies`, `ao-heads`, `ao-fx`, `ao-spells`, `ao-npcs`, `ao-maps` siguen la convención de `ao-anim` y `ao-objs` (claves en inglés, `format` + `version`). Si el lado de Unity ya espera otros nombres, hay que fijarlos antes de escribir los formatos.
