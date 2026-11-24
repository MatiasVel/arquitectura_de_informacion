# Arquitectura de información

Sitio web que muestra, con un diagrama interactivo, cómo viaja la información **del registro operativo al tablero de decisión**: la base de datos transaccional, el Data Warehouse en PostgreSQL, el datalake, Power BI Desktop, el gateway, Power BI Service y SharePoint.

Acompaña al paper «Del registro operativo al tablero de decisión: arquitectura y flujo de información de un Data Warehouse integrado con Power BI». A diferencia del [simulador](https://github.com/MatiasVel/flujo_de_informacion_dwh), este sitio no simula datos ni tiene perfiles de acceso: explica la arquitectura y muestra la pantalla que usa cada persona en cada etapa.

> La organización está anonimizada: el sitio muestra la arquitectura, no datos ni nombres reales.

## Páginas

| Página | Qué muestra |
|---|---|
| **Arquitectura** (`index.html`) | El diagrama del flujo, dividido entre la red interna (on-premises) y la nube. Cada rectángulo abre el detalle de su etapa: qué se hace, quién interviene, con qué herramienta, cada cuánto, qué control de seguridad aplica y la captura de la interfaz que se usa ahí. |
| **Glosario** (`glosario.html`) | 44 términos con buscador y filtro por tema. Cada término lleva a las etapas del diagrama donde se usa, y cada etapa enlaza con sus términos. Al final, las referencias del paper. |

El diagrama reúne los elementos de las dos figuras del trabajo: la de las fuentes al tablero analítico (red interna, nube, gateway, workspaces) y la del flujo de información (registro operativo, capas del Data Warehouse, registro de ejecución y consumo de sólo lectura).

### Cómo se usa en una presentación

- **Clic en un rectángulo**: abre el detalle de la etapa. El diagrama se desplaza para que la etapa quede a la vista y se resaltan sus conexiones.
- **Recorrer las etapas**: abre la primera etapa. Con *Siguiente* (o la flecha →) el dato viaja por la conexión hasta la etapa nueva.
- **Reproducir el flujo**: anima el recorrido completo del dato, con una frase por paso. Al cruzar hacia la nube se enciende el candado de la conexión cifrada.
- **Teclado**: ← y → pasan de etapa; Esc cierra el detalle.
- **Enlaces directos**: cada etapa tiene su dirección, por ejemplo `index.html#gateway`, para abrir el sitio directamente en esa etapa.
- Si el sistema tiene activado *reducir movimiento*, el sitio funciona igual pero sin animaciones.

## Etapas y capturas de las interfaces

Mientras una etapa no tenga captura, su detalle muestra una ventana de ejemplo con el aviso «Captura pendiente» y la descripción de la pantalla que va ahí.

| # | Etapa | Zona | Captura esperada | Archivo sugerido |
|---|---|---|---|---|
| 1 | Registro operativo | Red interna | El formulario del sistema de gestión donde se cargan los datos del día. | `registro-operativo.png` |
| 2 | Base de datos transaccional | Red interna | Las tablas de la base de producción vistas desde un cliente de base de datos. | `base-transaccional.png` |
| 3 | Data Warehouse | Red interna | El árbol de objetos del Data Warehouse (capas y unidades de negocio) en el cliente SQL. | `data-warehouse.png` |
| 4 | Capa de extracción | Red interna | La definición de una tabla foránea y de su vista materializada en el cliente SQL. | `capa-extraccion.png` |
| 5 | Capa de cálculo | Red interna | La consulta SQL de una tabla de cálculo intermedio. | `capa-calculo.png` |
| 6 | Consumo agregado | Red interna | El resultado de un cubo (query definition) en el cliente SQL. | `consumo-agregado.png` |
| 7 | Consumo de detalle | Red interna | Una vista de detalle consultada desde el cliente SQL. | `consumo-detalle.png` |
| 8 | Registro de ejecución | Red interna | La tabla del registro de ejecución, o el aviso que recibe el equipo. | `registro-ejecucion.png` |
| 9 | Datalake (NAS) | Red interna | La carpeta compartida del NAS con las planillas, vista desde el explorador de archivos. | `datalake.png` |
| 10 | Power BI Desktop | Red interna | Power BI Desktop con el modelo semántico y el lienzo del tablero. | `powerbi-desktop.png` |
| 11 | Gateway (middleware) | Red interna | La aplicación del gateway de datos local con su estado. | `gateway.png` |
| 12 | Power BI Service | Nube | El área de trabajo en Power BI Service con la actualización programada del modelo. | `powerbi-service.png` |
| 13 | Workspaces y SharePoint | Nube | El tablero publicado en SharePoint, tal como lo ve la gerencia. | `sharepoint.png` |

### Agregar una captura

1. Guardá la imagen en `public/img/capturas/` con el nombre sugerido (PNG o JPG; con 1600 px de ancho alcanza).
2. En `public/js/datos/etapas.js`, buscá la etapa y completá `archivos`:

   ```js
   captura: {
     esperada: 'Power BI Desktop con el modelo semántico y el lienzo del tablero.',
     archivos: [{ archivo: 'img/capturas/powerbi-desktop.png', pie: 'Modelo semántico del tablero' }],
   },
   ```

   Se pueden poner varias capturas por etapa: el detalle muestra flechas para pasar de una a otra, y cada captura se puede ampliar a pantalla completa.
3. Corré `npm test`: verifica que cada archivo nombrado exista.

> **Antes de subir una captura**: el repositorio es público. Tapá o difuminá nombres de personas y de clientes, datos reales, nombres de servidores y de bases, direcciones IP, rutas de red (`\\servidor\carpeta`), correos y cualquier otro dato que identifique a la organización.

## Cómo está hecho

Es un sitio **estático y sin dependencias**: HTML, CSS y JavaScript. No hay paso de compilación.

```
├── netlify.toml              # publicación en Netlify y encabezados de seguridad
├── package.json              # npm start y npm test (sin paquetes que instalar)
├── public/                   # lo que se publica
│   ├── index.html            # página Arquitectura
│   ├── glosario.html         # página Glosario
│   ├── 404.html
│   ├── css/estilos.css
│   ├── fuentes/              # DM Sans (licencia OFL)
│   ├── img/capturas/         # capturas de las interfaces
│   └── js/
│       ├── comun.js          # utilidades compartidas
│       ├── diagrama.js       # dibujo, detalle de cada etapa, recorrido y animaciones
│       ├── glosario.js       # buscador y filtros
│       └── datos/
│           ├── etapas.js         # contenido de cada etapa y sus capturas
│           ├── disposicion.js    # conexiones y posición de cada caja (horizontal y vertical)
│           └── terminos.js       # términos del glosario y referencias
├── scripts/servidor.mjs      # servidor local mínimo
└── tests/datos.test.mjs      # pruebas de los datos
```

Todo el contenido está en `public/js/datos/`: para cambiar un texto, agregar un término o mover una caja no hace falta tocar el código del diagrama. Las pruebas controlan que cada etapa tenga su contenido, que ninguna caja se superponga con otra, que los enlaces entre el diagrama y el glosario existan y que las capturas nombradas estén en la carpeta.

### Diseño

- **Negro** para la red interna, **azul** para la nube y **blanco** para lo que se lee, sobre una trama de puntos de plano técnico.
- Un **candado** marca el cruce hacia la nube: la conexión del gateway es saliente y cifrada. Cada etapa tiene además su apartado de *Control y seguridad*.
- En pantallas anchas (desde 1080 px) el diagrama es horizontal y el detalle se abre a la derecha. En celulares y tabletas el diagrama es vertical y el detalle sube como una hoja desde abajo.
- Transiciones: el diagrama se arma etapa por etapa al cargar, el dato viaja por las conexiones, las capturas aparecen con un barrido de escaneo y el cambio entre páginas usa *View Transitions* (en los navegadores que no la soportan, la navegación es normal).

## Verlo en tu computadora

Requiere [Node.js](https://nodejs.org/) 20 o superior. No hay que instalar paquetes.

```bash
npm start   # abre el sitio en http://localhost:8080
npm test    # corre las pruebas de los datos
```

También se puede abrir `public/index.html` con doble clic, o servir la carpeta `public/` con cualquier servidor estático.

## Publicarlo en Netlify

La configuración ya está en `netlify.toml`: carpeta `public`, sin compilación y con encabezados de seguridad. Antes de cada despliegue se corren las pruebas; si alguna falla, Netlify no publica.

1. Entrá a [app.netlify.com](https://app.netlify.com/) e iniciá sesión con GitHub.
2. Elegí **Add new site → Import an existing project → GitHub** y seleccioná `MatiasVel/arquitectura_de_informacion`.
3. Netlify toma la configuración de `netlify.toml`: tocá **Deploy**.
4. Cada cambio en `main` vuelve a publicar el sitio.

## Créditos

- Tipografía [DM Sans](https://github.com/googlefonts/dm-fonts), bajo SIL Open Font License (ver `public/fuentes/`).
- Referencias bibliográficas: las del paper, listadas en el Glosario.
