# AO World Editor

Un editor para el contenido de Argentum Online: los gráficos, los objetos, los personajes, los
hechizos y los mapas, todos en la misma herramienta y con una pantalla para cada cosa.

Lee los archivos del AO original —el `Graficos.ini`, el `OBJ.dat`, el `Personajes.ini` y los
demás— y los vuelve a escribir cuando terminás, tocando sólo lo que editaste. También puede
exportar todo como JSON, por si querés leer el mundo desde otro programa.

Corre en el navegador, pero no es un servicio: se levanta en tu máquina y guarda en una carpeta
tuya. No hay cuenta que crear ni nada que subir a ningún lado.

## Requisitos

- Node.js 20 o más nuevo (probado con Node 22).
- Para que sirva de algo: los archivos de un servidor y de un cliente de AO. El editor no trae
  ninguno.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. La app arranca en **Animaciones**.

## Cómo se usa

Las diez pestañas de arriba son las diez cosas que se pueden editar. Se pueden usar en cualquier
orden, pero si estás empezando con un juego que ya existe, el camino corto es éste: **Importar**
para traerlo, las pestañas del medio para cambiar lo que quieras, y **Exportar** para devolverlo.

Todo se guarda solo, unos 400 ms después de cada cambio. No hay botón de guardar y no hace falta:
si cerrás la pestaña con algo a medio escribir, el navegador te avisa.

### 1. Traer lo que ya existe — pestaña *Importar*

Son siete pasos y el primero manda: el **`Graficos.ini`** arma la tabla de GRH, que dice, para
cada número de gráfico del juego, de qué imagen sale y qué recorte es. Sin esa tabla los demás
archivos no se pueden leer, porque todos apuntan a los gráficos por número.

Con la tabla puesta entran el **`Personajes.ini`** (los cuerpos, con sus cuatro direcciones y el
corrimiento donde se apoya la cabeza), el **`Cabezas.ini`**, el **`Fxs.ini`** y el **`OBJ.dat`**,
que trae cada objeto con su nombre, tipo, valor, banderas y atributos, y le engancha el icono
creando en cada hoja las animaciones que hagan falta (las llama `grh505` y así). El
**`Hechizos.dat`** y el **`NPCs.dat`** no necesitan el paso 1: apuntan al FX y a los cuerpos por
número, igual que el editor.

Dos cosas que conviene saber:

- **Los archivos van en ANSI**, como los guarda Windows. Se leen bien, con acentos y todo.
- **Las imágenes son aparte.** El `Graficos.ini` dice «el gráfico 505 es tal recorte de la imagen
  12», pero la imagen no está en el `.ini`. Cargá las que te interesen en **Animaciones**, con el
  mismo nombre que en el juego (`12.png`), y volvé a importar: lo que faltaba se vincula entonces,
  sin duplicar nada. No hace falta cargarlas todas; el editor te dice cuáles le faltan.

### 2. Gráficos — pestaña *Animaciones*

Una **hoja** es una imagen con sus animaciones adentro. Cargás la imagen, marcás los frames y les
ponés nombre; eso es todo lo que el resto del editor necesita para poder apuntarle.

Los frames se marcan de dos maneras: con la **grilla**, cuando los sprites están alineados (ponés
el ancho, el alto y la separación, y hacés clic en las celdas), o con el **recuadro libre**, para
las hojas que no están alineadas. Se pueden mover varios frames juntos, invertir el orden, armar
ida y vuelta, y mirar cómo queda el ciclo con la vista previa al lado.

También podés redimensionar la imagen —los frames se escalan con ella— y sacarle el fondo negro,
que en el AO clásico es el color que no se dibuja.

### 3. El contenido del juego — *Apariencias*, *NPCs*, *Objetos*, *FX*, *Hechizos*

Las cinco funcionan igual: una lista a la izquierda, la ficha de lo que elegiste al lado, y las
ranuras donde se engancha un gráfico.

- **Apariencias** son los cuerpos y las cabezas. Un cuerpo tiene la animación de caminar hacia los
  cuatro lados y el corrimiento donde se le apoya la cabeza; una cabeza, la cara hacia cada lado,
  que es un cuadro fijo y no una animación. Si las cuatro caras están en la misma animación,
  elegila en las cuatro y movelas al cuadro que corresponda con ◀ ▶.
- **NPCs**: qué apariencia tienen, cómo pelean, qué hechizos lanzan, y qué sueltan o venden.
- **Objetos**: el tipo manda. Un arma pide daño mínimo y máximo, una armadura defensa, una poción
  qué sube y cuánto dura. Cada objeto tiene su icono de inventario, su gráfico en el suelo y, si
  se equipa, su animación por dirección.
- **FX**: qué animación se dibuja, cuánto se corre en píxeles respecto de donde se lanza, y
  cuántas veces se repite (0 es en bucle). El corrimiento es lo que de verdad cuesta acertar, así
  que la pantalla lo deja previsualizar encima de un personaje.
- **Hechizos**: qué hacen, cuánto cuestan, las palabras mágicas y con qué FX se ven.

Donde haga falta un gráfico vas a ver una **ranura**: tocás, elegís hoja y animación, y listo. Las
que muestran ◀ ▶ son las que apuntan a un cuadro suelto en vez de a la animación entera.

### 4. Mapas

Se abre un mapa de la carpeta `Mundos` del juego, o se arranca uno nuevo. Los archivos se leen en
tu máquina y no se sube nada.

Un mapa son 100×100 celdas y cuatro capas: la 1 es el piso y las otras tres van encima. Se cambia
de capa con las teclas **1** a **4**, y se puede apagar la vista de cada una para ver qué hay
abajo.

Las herramientas, con su atajo:

| Atajo | Herramienta | Atajo | Herramienta |
|---|---|---|---|
| **B** | Pincel | **X** | Bloquear |
| **R** | Rectángulo | **D** | Desbloquear |
| **F** | Balde | **T** | Trigger |
| **E** | Goma | **P** | Traslado |
| **I** | Cuentagotas | **N** | NPC |
| | | **O** | Objeto |

Pintás con el botón izquierdo. Para moverte por el mapa, arrastrá con **shift** o con el botón del
medio; el zoom es con la rueda. **Ctrl+Z** y **Ctrl+Y** deshacen y rehacen.

El gráfico del pincel se elige de dos maneras: por número, si lo sabés, o con **«Elegir de una
hoja del proyecto»**, que muestra tus hojas con su grilla y te deja hacer clic en el recorte que
quieras. Si ese recorte todavía no tenía número de gráfico, el editor le da el primero libre, así
que podés pintar con dibujos que nunca estuvieron en el juego. El cuentagotas (**I**) toma el
gráfico de una celda que ya está pintada.

Mientras falte alguna imagen, esas celdas se ven como colores planos: alcanza para reconocer la
forma del mapa y seguir trabajando.

### 5. Revisar — pestaña *Diagnóstico*

Junta en una sola lista todo lo que quedó roto o a medio terminar: vínculos gráficos que no
resuelven, nombres de animación repetidos, hojas sin imagen, y los cruces que ninguna pantalla ve
sola —un pergamino que apunta a un hechizo que no existe, un NPC sin cuerpo—. Conviene pasar por
acá antes de exportar: lo que está roto se exporta igual y del otro lado aparece como un gráfico
que no carga.

### 6. Devolverlo — pestaña *Exportar*

Son cuatro cosas distintas y casi nunca se quieren las cuatro, así que se eligen por separado:

- **Los archivos del AO original.** El `OBJ.dat`, el `NPCs.dat` y el `Hechizos.dat` del servidor, y
  el `Fxs.ini`, el `Personajes.ini` y el `Cabezas.ini` del cliente. Se reescribe solamente lo que
  el editor maneja, gráficos incluidos; el resto de cada entrada vuelve tal como vino, con sus
  comentarios y su espaciado. Un archivo importado y exportado sin tocar nada sale idéntico al que
  entró.
- **El mundo.** Los mapas como los `.map`, `.inf` y `.dat` que lee el servidor, el `Graficos.ini`
  con los gráficos que hayas agregado, y las imágenes de las hojas que armaste acá.
- **Los catálogos JSON.** Todo el mundo en archivos de texto (`objetos.json`, `npcs.json`,
  `cuerpos.json`, `cabezas.json`, `hechizos.json`, `fx.json`), por si querés leerlo desde otro
  programa.
- **Las animaciones.** Un `.anim.json` por cada hoja que tenga alguna.

Todo sale en `data/exportado/`, con los archivos del juego ya repartidos en `Dat/`, `Init/`,
`Mundos/` y `Graficos/`, que es donde los busca.

## Dónde quedan tus datos

En la carpeta `data/`:

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
    └── *                    ← lo que escribe «Exportar»
```

Esa carpeta está pensada para versionarla con **git**: cada cambio aparece claro en el historial y
nada se pierde. Si querés guardar los datos en otro lugar, definí `AO_DATA_DIR`, por ejemplo
`AO_DATA_DIR=/ruta/a/mis-datos npm run dev`.

Dos cosas quedan afuera de git, y están en el `.gitignore`: las **imágenes** de las hojas y la
carpeta `exportado/`. Las imágenes son las del cliente que importaste —después de un cliente
entero son miles de archivos y cientos de megas—, y lo que el editor te deja escrito de cada hoja
(la grilla y las animaciones) está en el `.json` de al lado, que sí se versiona. Si las querés
igual en el repositorio, borrá esa línea del `.gitignore`.

La carpeta trae dos hojas de ejemplo y tres objetos. Podés borrarlos desde la app («Quitar hoja» y
«Borrar») o borrar esos archivos a mano.

## Publicarlo en un servidor, sin que los datos salgan de tu máquina

Lo de arriba es el modo por defecto: el disco lo toca el servidor. Está pensado para correrlo en
tu máquina, y **no tiene usuarios ni contraseñas**: cualquiera que llegue a esa dirección escribe
en tu `data/`. Mientras sea `localhost` no hay problema; si lo vas a dejar levantado donde lo
alcance alguien más, usá el modo de abajo.

El segundo modo está pensado justamente para eso: dejar el editor en un servidor público (Vercel,
por ejemplo) y que **cada uno trabaje con su propia carpeta**. No se sube ningún archivo a ningún
lado: el navegador abre un selector de carpetas y lee y escribe ahí directamente.

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
- **El permiso se pide una vez por sesión.** El navegador recuerda cuál era tu carpeta, pero no te
  deja volver a entrar sin un clic tuyo. Es un botón, no hay que volver a buscarla.
- **El formato es el mismo** que el del modo servidor, así que podés abrir con el modo carpeta la
  misma `data/` que usás en tu máquina, y al revés.

## Qué se mide

El sitio publicado mide uso, y conviene saber exactamente qué.

**Las visitas**: cuánta gente entra, de qué país, con qué navegador y qué pestañas abre, más cuánto
tarda la app en cargar y en responder. Eso lo cuentan Vercel Web Analytics y Speed Insights.

**Seis eventos propios**, que son los que contestan lo que las visitas no dicen:

| Evento | Qué dice |
|---|---|
| `carpeta elegida` | Cuántos de los que entran abren una carpeta y se ponen a trabajar |
| `navegador sin soporte` | Cuántos rebotan por estar en Firefox o en Safari |
| `mundo medido` | Con qué tamaño de proyecto se trabaja, en tramos: `11-100`, `1000+` |
| `exportado` | Qué partes del mundo se llevan |
| `importado` | Qué paso del importador del clásico corrió y si salió bien |
| `error inesperado` | Qué clase de error se rompió y en qué pantalla |

Los recibe [Umami](https://umami.is), que no usa cookies ni guarda nada que identifique a nadie: por
eso no hay cartel de consentimiento que aceptar.

Lo que **no** sale, y no tiene por dónde salir: ningún archivo, ningún nombre de archivo, ninguna
imagen, ningún dato de lo que estás editando, ni el mensaje de ningún error —que acá trae nombres de
tus hojas y rutas de tu disco—. Los eventos son una unión cerrada de TypeScript donde cada campo es
otra unión cerrada: no hay un solo lugar donde quepa un texto libre, así que no es que nos acordemos
de no mandar nada, es que no hay dónde ponerlo. Está en
[`src/compartido/aplicacion/Telemetria.ts`](src/compartido/aplicacion/Telemetria.ts). Los tamaños
van en tramos por lo mismo: un número exacto identifica a una persona entre pocas.

De los errores sale la clase y nada más: si fue una regla del editor, un permiso de carpeta que el
navegador retiró, un archivo que ya no está, quedarse sin espacio, quedarse sin memoria, la red, o
algo sin clasificar. El mensaje **se lee en tu máquina** para decidir cuál de esas clases es —sin
mirarlo, medio error de red sería indistinguible de un bug— y lo único que viaja es la clase. Está
en [`clasificarError.ts`](src/compartido/infraestructura/clasificarError.ts), y cancelar no cuenta
como error: cerrar el selector de carpetas no mide nada.

Y si levantás el editor en tu máquina, que es el modo por defecto, **no se mide nada**: no se baja
ningún script de medición ni sale un solo pedido. Son dos condiciones en
[`src/compartido/infraestructura/medicion.ts`](src/compartido/infraestructura/medicion.ts) —modo
carpeta y producción— y las dos tienen que darse.

Si te llevás el editor y lo publicás vos, no se mide ningún evento hasta que pongas tu propio sitio
de Umami en `NEXT_PUBLIC_AO_UMAMI_ID`: los números son tuyos y no pasan por acá. Con
`NEXT_PUBLIC_AO_UMAMI_SRC` podés apuntar a un Umami hospedado por vos en lugar de a su nube, que
además tiene la ventaja de que los bloqueadores no lo cortan.

### Los que lo corren en su máquina

Todo lo de arriba es del sitio publicado. La otra mitad del público probable se clona el repositorio
y corre el editor en su máquina, donde **no se mide nada**, y está bien que no se mida. De ésos lo
único que se puede saber es el tráfico del repositorio: clones, visitas, estrellas y forks.

GitHub guarda **catorce días** de eso y después lo tira. Así que hay un workflow,
[`trafico.yml`](.github/workflows/trafico.yml), que una vez por semana lo baja y lo acumula en
`docs/metricas/trafico.json`, indexado por fecha: una semana da margen de sobra sobre la ventana de
catorce días, y correrlo de nuevo no duplica ni pierde nada.

Hace falta un token propio en el secreto `TRAFICO_TOKEN`, porque la API de tráfico pide permiso de
escritura sobre el repositorio y el `GITHUB_TOKEN` de Actions no lo puede tener. Sirve uno de grano
fino con lectura de **Administration**, o uno clásico con el scope `repo`, y va en *Settings →
Secrets and variables → Actions*. Sin ese secreto el workflow falla con un mensaje que explica
exactamente esto, en vez de no hacer nada en silencio.

## Para desarrollar

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Modo desarrollo, con recarga automática al editar el código |
| `npm run build` y `npm start` | Versión optimizada |
| `npm test` | Tests del dominio y de los casos de uso |
| `npm run typecheck` | Chequeo de tipos de TypeScript |

Hay además tres grupos de pruebas que miden el ida y vuelta contra archivos de verdad, y que se
saltean solos si no les decís dónde están. Son los que dicen si lo que el editor devuelve le sirve
al juego, así que si tenés un servidor y un cliente a mano vale la pena correrlos: los `.dat` del
servidor, los `.ini` del cliente y los mapas de un mundo (`Mundos/Alkon`, no `Mundos`).

```bash
AO_DAT_DIR=".../ao-server/Dat" AO_INIT_DIR=".../ao-cliente/INIT" AO_MAPAS_DIR=".../Mundos/Alkon" npm test
```

Si abrís la app desde otra dirección que no sea `localhost` (por ejemplo desde WSL, Docker o una
VM, con una IP como `172.19.0.1`), ya está permitido para las redes privadas habituales. Si usás
un nombre o una IP distinta, agregala con `AO_DEV_ORIGINS=mi-pc.local npm run dev`.

El código está organizado con screaming architecture, arquitectura hexagonal, DDD y SOLID, y está
explicado paso a paso, con ejemplos de este mismo código, en
**[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**.

Lo que ya se puede reproducir y todavía no está arreglado vive en
**[docs/PENDIENTES.md](docs/PENDIENTES.md)**. Hoy queda uno, y es chico: con el editor abierto en
dos pestañas, las dos reparten números de gráfico mirando la tabla del disco, pero entre mirarla y
escribirla queda una ventana de milisegundos en la que podrían elegir el mismo. Antes la ventana
duraba lo que durara la sesión; ahora hay que tener mala suerte en el mismo instante.

## Licencia

MIT, en **[LICENSE](LICENSE)**. Hacé lo que quieras con el código, incluso usarlo en algo tuyo; lo
único que pide es que la nota de copyright viaje con él.

Los archivos del AO original que importes son otra cosa: son del juego, no de este editor, y acá
no viene ninguno. El `.gitignore` deja afuera las imágenes de las hojas, así que no se te van a
subir al repositorio sin querer.
