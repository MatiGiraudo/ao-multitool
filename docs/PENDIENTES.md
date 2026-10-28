# Lo que sabemos que está mal

Problemas encontrados y **no** arreglados todavía, con dónde están y qué haría falta. No es una
lista de deseos: cada uno es algo que ya se puede reproducir hoy.

Los que se encuentran revisando una rama y se arreglan en el momento no llegan acá; esto es para
lo que se decidió dejar para después, así no se pierde.

> Revisión del 27/10/2026, sobre la rama `mapas-de-cero`. Los dos hallazgos graves de esa misma
> revisión —guardar un mapa pisaba otro con el mismo número, y elegir dos tiles seguidos se llevaba
> el mismo número de GRH— ya están arreglados en `d925788`.

---

## 1. Si falla el guardado, la pantalla sigue diciendo «Guardado»

**Dónde:** `src/mapas/ui/PantallaMapas.tsx`, en `guardarEnProyecto`.

Cuando el guardado falla —disco lleno, permisos, el `PUT /api/mapas/<n>` que devuelve 500—,
`intentar` muestra el error en un aviso de tres segundos y la función vuelve sin tocar `enProyecto`,
que ya estaba en true. La barra sigue mostrando «Guardado en data/mapas», el botón sigue
deshabilitado y no hay reintento: el próximo intento recién llega si el usuario hace otro cambio.
O sea que se puede seguir editando creyendo que está todo guardado.

**Qué haría falta:** que el estado del guardado sea uno solo y refleje el error (`guardado`,
`guardando`, `error`, como el `EstadoGuardado` que ya usa `useColeccionEditable`), que el botón
vuelva a habilitarse para reintentar a mano, y que un guardado automático que falla no se quede en
silencio.

## 2. Una hoja con nombre no numérico rompe el `Graficos.ini` exportado

**Dónde:** `src/importacion/infraestructura/EscritorGraficosIni.ts`, y el camino que la lleva ahí
es el catálogo de tiles (`src/mapas/ui/CatalogoDeTiles.tsx`).

El catálogo deja elegir cualquier hoja del proyecto. Si la hoja se llama `pasto.png`, el GRH queda
con `archivo: "pasto"` y el exportador escribe `Grh32927=1-pasto-0-0-32-32`. Al volver a leer ese
archivo, `LectorGraficosIni` parsea ese campo con `parseInt`, le da `NaN` y lo deja en `"0"`: el GRH
apunta al archivo 0 y el tile no se resuelve ni acá ni en el juego, que busca `<FileNum>` por
número. Nadie avisa nada al elegir el tile.

**Qué haría falta:** decidir qué queremos de los nombres de hoja. Lo mínimo es avisar en el catálogo
cuando el nombre no es numérico; lo correcto, que el proyecto le asigne un `FileNum` propio a cada
hoja (como hace con los números de GRH) y que exportar las imágenes las copie con ese nombre.

## 3. Cambiar de mapa descarta el guardado automático pendiente

**Dónde:** `src/mapas/ui/PantallaMapas.tsx`, el efecto que programa el guardado un segundo después
del último cambio.

El efecto depende de `abierto`, así que al abrir otro mapa su limpieza hace `clearTimeout` y lo que
se editó en ese último segundo nunca llega al disco. El diálogo de confirmación que aparece al
cambiar de mapa sólo mira `sinGuardar`, que es lo de exportar, no el guardado del proyecto.

**Qué haría falta:** vaciar lo pendiente antes de cambiar de mapa, igual que
`useColeccionEditable.guardarPendientes()` antes de cualquier operación que relea del servidor.

## 4. Listar los mapas guardados los parsea enteros

**Dónde:** `src/mapas/infraestructura/servidor/ArchivosMapaRepositorio.ts`, en `listar()`.

Lee y parsea cada JSON completo para devolver tres campos. Con los 317 mapas de Alkon guardados
(~83 KB cada uno) son unos 26 MB leídos y parseados por cada `GET /api/mapas`, que la pantalla pide
al montarse y después de cada guardado automático. El propio `ResumenDeMapa` dice que es «lo que
alcanza para la lista, sin leer las 40.000 celdas de cada uno», así que hoy la implementación no
cumple lo que promete el tipo.

**Qué haría falta:** guardar el resumen aparte (un `data/mapas/indice.json`, escrito en el mismo
guardado) o leer sólo la cabecera de cada archivo. La primera opción es la que ya usan las
colecciones de un solo JSON.
