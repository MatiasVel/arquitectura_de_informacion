// Contenido de cada etapa del diagrama: qué se hace, quién interviene y qué pantalla usa.
//
// Para agregar la captura de una etapa:
//   1. Guardá la imagen en public/img/capturas/ (por ejemplo, powerbi-desktop.png; el README
//      sugiere un nombre para cada etapa).
//   2. Agregala en "archivos" de esa etapa:
//        archivos: [{ archivo: 'img/capturas/powerbi-desktop.png', pie: 'Modelo semántico del tablero' }]
//      Se pueden poner varias capturas por etapa; se muestran en el orden de la lista.
//   3. Corré "npm test": verifica que cada archivo nombrado exista.
// Mientras "archivos" esté vacío, el panel muestra una ventana de ejemplo con el aviso
// "Captura pendiente" y el texto de "esperada".

(function (Arq) {
  'use strict';

  Arq.zonas = {
    local: { nombre: 'Red interna', largo: 'Red interna de la organización (on-premises)' },
    nube: { nombre: 'Nube', largo: 'Nube (Power BI Service)' },
  };

  Arq.etapas = [
    {
      id: 'registro-operativo',
      titulo: 'Registro operativo',
      zona: 'local',
      resumen: 'Donde nace el dato: el personal registra la operación del día en los sistemas de gestión.',
      texto: [
        'Cada día, el personal de las distintas áreas carga a mano los datos de la operación en los sistemas de gestión de la organización. Esa carga es el punto de partida de todo el flujo: lo que no se registra acá no llega a ningún tablero.',
        'Los datos quedan guardados en la base de datos transaccional, que es el origen de todo lo que sigue.',
      ],
      quien: 'Personal operativo de cada área',
      herramienta: 'Sistemas de gestión (formularios de carga)',
      frecuencia: 'Todos los días, a medida que ocurre la operación',
      control: 'El flujo va en un solo sentido: el Data Warehouse y Power BI sólo leen estos datos. Si algo está mal, se corrige en el sistema de origen y el cambio llega al tablero con la siguiente actualización.',
      captura: {
        esperada: 'El formulario del sistema de gestión donde se cargan los datos del día.',
        archivos: [],
      },
      terminos: ['base-de-datos-transaccional', 'latencia-de-los-datos'],
    },
    {
      id: 'base-transaccional',
      titulo: 'Base de datos transaccional',
      zona: 'local',
      resumen: 'Guarda la operación diaria en el servidor de producción. Está pensada para registrar, no para analizar.',
      texto: [
        'Es la base que usan los sistemas de gestión, alojada en el servidor de producción. Está optimizada para registrar muchas operaciones chicas al mismo tiempo, no para recorrer grandes volúmenes como lo hace un análisis.',
        'Por el volumen de la operación, los tableros no la consultan en tiempo real. Un script la replica una vez por día hacia el Data Warehouse, y todo el trabajo analítico se hace sobre esa copia.',
      ],
      quien: 'Los sistemas de gestión, que escriben en ella durante la operación',
      herramienta: 'Cliente de base de datos (tablas de origen)',
      frecuencia: 'Uso continuo; se replica una vez por día',
      control: 'Recibe una sola lectura por día desde el Data Warehouse. Así, las consultas analíticas no compiten con la operación ni le quitan rendimiento al servidor de producción.',
      captura: {
        esperada: 'Las tablas de la base de producción vistas desde un cliente de base de datos.',
        archivos: [],
      },
      terminos: ['base-de-datos-transaccional', 'replicacion'],
    },
    {
      id: 'data-warehouse',
      titulo: 'Data Warehouse',
      zona: 'local',
      resumen: 'La base estructurada en PostgreSQL donde se preparan los datos para cada tablero.',
      texto: [
        'Es una base PostgreSQL en un servidor separado del de producción. Recibe la copia diaria de la base transaccional y la procesa en cuatro capas, que se repiten en cada unidad de negocio: extracción, cálculo, consumo agregado y consumo de detalle.',
        'Acá se desarrollan las query definitions y los cubos: consultas y tablas pre-procesadas que entregan a cada tablero justo los datos que necesita. Así el trabajo pesado lo hace la base de datos y no Power BI, y las actualizaciones son más rápidas.',
      ],
      quien: 'Equipo de datos',
      herramienta: 'Cliente SQL con los objetos de cada capa',
      frecuencia: 'Proceso automático diario, en orden de dependencias',
      control: 'Las capas separan responsabilidades: extracción y cálculo son de uso interno del equipo de datos, y los usuarios finales sólo pueden leer las capas de consumo, con credenciales nominales.',
      captura: {
        esperada: 'El árbol de objetos del Data Warehouse (capas y unidades de negocio) en el cliente SQL.',
        archivos: [],
      },
      terminos: ['data-warehouse', 'consulta-de-definicion', 'cubo', 'unidad-de-negocio', 'orden-de-dependencias', 'linaje', 'credenciales-nominales'],
    },
    {
      id: 'capa-extraccion',
      titulo: 'Capa de extracción',
      zona: 'local',
      padre: 'data-warehouse',
      resumen: 'Trae los datos del origen al Data Warehouse y los guarda en una copia local.',
      texto: [
        'Una tabla foránea se consulta como si fuera local, pero no guarda datos: cada consulta viaja hasta la base de origen a través de un foreign data wrapper. Si los tableros la usaran directamente, cada actualización volvería a cargar al servidor de producción.',
        'Por eso, sobre cada tabla foránea se crea una vista materializada, que guarda una copia completa. El script diario la refresca con `REFRESH MATERIALIZED VIEW` y, desde ahí, el resto de las capas lee la copia y no el origen.',
      ],
      quien: 'Equipo de datos',
      herramienta: 'Cliente SQL (tablas foráneas y vistas materializadas)',
      frecuencia: 'Diaria, con el script de replicación, o bajo demanda',
      control: 'Es de uso interno: ningún usuario final ni tablero lee esta capa. La conexión con el origen se usa sólo para la lectura diaria.',
      captura: {
        esperada: 'La definición de una tabla foránea y de su vista materializada en el cliente SQL.',
        archivos: [],
      },
      terminos: ['tabla-foranea', 'foreign-data-wrapper', 'vista-materializada', 'refresh-materialized-view', 'carga-completa', 'carga-incremental'],
    },
    {
      id: 'capa-calculo',
      titulo: 'Capa de cálculo',
      zona: 'local',
      padre: 'data-warehouse',
      resumen: 'Depura, cruza y aplica las reglas de negocio sobre la copia local.',
      texto: [
        'Toma las vistas materializadas de la extracción y las transforma con SQL: depuración de valores, cruces entre tablas, reglas de negocio y agregaciones intermedias.',
        'Estos resultados no se publican: son las piezas con las que después se arman los cubos y el detalle. Como dependen de la extracción, se actualizan después de ella.',
      ],
      quien: 'Equipo de datos',
      herramienta: 'Cliente SQL (consultas de transformación)',
      frecuencia: 'Diaria, después de la extracción',
      control: 'Uso interno del equipo de datos. Cada regla de negocio queda escrita una sola vez, en la base, en lugar de repetirse en cada tablero.',
      captura: {
        esperada: 'La consulta SQL de una tabla de cálculo intermedio.',
        archivos: [],
      },
      terminos: ['capa-de-calculo', 'etl', 'orden-de-dependencias'],
    },
    {
      id: 'consumo-agregado',
      titulo: 'Consumo agregado',
      zona: 'local',
      padre: 'data-warehouse',
      resumen: 'Los cubos: resultados ya resumidos, con pocas filas, listos para un tablero.',
      texto: [
        'Un cubo es una tabla de resultados pre-procesados con una granularidad definida (por ejemplo, mes y región) y las medidas ya calculadas. Tiene muchas menos filas que el detalle, así que Power BI la importa y la actualiza rápido.',
        'En esta capa están las query definitions que alimentan a cada tablero: le entregan justo lo que necesita y nada más.',
      ],
      quien: 'Equipo de datos, que crea los cubos; Power BI, que los lee',
      herramienta: 'Cliente SQL (resultado de un cubo)',
      frecuencia: 'Diaria, después del cálculo',
      control: 'Es una de las dos capas que pueden ver los usuarios, siempre con permisos de sólo lectura.',
      captura: {
        esperada: 'El resultado de un cubo (query definition) en el cliente SQL.',
        archivos: [],
      },
      terminos: ['cubo', 'consulta-de-definicion', 'granularidad', 'capas-de-consumo', 'solo-lectura'],
    },
    {
      id: 'consumo-detalle',
      titulo: 'Consumo de detalle',
      zona: 'local',
      padre: 'data-warehouse',
      resumen: 'Los datos fila por fila, para los análisis que necesitan bajar al máximo detalle.',
      texto: [
        'Conserva la granularidad original, registro por registro, para los tableros que necesitan bajar al detalle: listados, búsquedas puntuales o cortes que ningún cubo tenía previstos.',
        'Tiene mucho volumen, por eso se usa cuando un cubo no alcanza.',
      ],
      quien: 'Equipo de datos y Power BI',
      herramienta: 'Cliente SQL (vista de detalle)',
      frecuencia: 'Diaria, después del cálculo',
      control: 'Igual que el consumo agregado: visible para los usuarios sólo con permisos de lectura.',
      captura: {
        esperada: 'Una vista de detalle consultada desde el cliente SQL.',
        archivos: [],
      },
      terminos: ['capas-de-consumo', 'granularidad', 'solo-lectura'],
    },
    {
      id: 'registro-ejecucion',
      titulo: 'Registro de ejecución',
      zona: 'local',
      resumen: 'Deja constancia de cada paso del proceso diario y avisa si algo falla.',
      texto: [
        'Al terminar el proceso diario se registra el resultado de cada paso (correcto, con error u omitido) y se notifica al equipo de datos.',
        'Así una falla se detecta y se corrige antes de que una gerencia vea datos desactualizados en su tablero.',
      ],
      quien: 'Equipo de datos',
      herramienta: 'Tabla de registro y aviso al equipo',
      frecuencia: 'En cada ejecución del proceso diario',
      control: 'Da trazabilidad: se sabe qué se actualizó, cuándo y con qué resultado.',
      captura: {
        esperada: 'La tabla del registro de ejecución, o el aviso que recibe el equipo.',
        archivos: [],
      },
      terminos: ['registro-de-ejecucion', 'orden-de-dependencias'],
    },
    {
      id: 'datalake',
      titulo: 'Datalake (NAS)',
      zona: 'local',
      resumen: 'La fuente complementaria: archivos que las áreas cargan a mano en un repositorio compartido.',
      texto: [
        'Un almacenamiento en red (NAS) centraliza en un repositorio compartido archivos de distintas fuentes: planillas de Excel, CSV y TXT, cargados manualmente.',
        'Power BI Desktop se conecta directamente a esos archivos, mediante rutas de red (UNC) y opciones de consulta avanzada, y los integra en el modelo semántico junto con los datos del Data Warehouse.',
      ],
      quien: 'Las áreas que cargan los archivos; el equipo de datos, que los integra',
      herramienta: 'Explorador de archivos (carpeta compartida)',
      frecuencia: 'Manual, cuando cada área actualiza sus archivos',
      control: 'Los archivos quedan dentro de la red interna. Para actualizarlos desde la nube se usa el gateway, igual que con el Data Warehouse.',
      captura: {
        esperada: 'La carpeta compartida del NAS con las planillas, vista desde el explorador de archivos.',
        archivos: [],
      },
      terminos: ['datalake', 'nas', 'ruta-unc', 'power-query'],
    },
    {
      id: 'powerbi-desktop',
      titulo: 'Power BI Desktop',
      zona: 'local',
      resumen: 'Donde se construye el tablero: el modelo semántico y las visualizaciones.',
      texto: [
        'Cada tablero nace de un pedido de una gerencia, que entra por el sistema interno de tickets. En Power BI Desktop, el analista se conecta a los cubos y al detalle del Data Warehouse y a los archivos del datalake, arma el modelo semántico (tablas, relaciones y medidas) y diseña las visualizaciones.',
        'Se trabaja en formato de proyecto (PBIP), que guarda el informe y el modelo como carpetas de archivos de texto. Antes de publicar, el tablero se valida con quien lo pidió.',
      ],
      quien: 'Analista de datos',
      herramienta: 'Power BI Desktop',
      frecuencia: 'Por cada requerimiento (ticket)',
      control: 'El desarrollo es local y se valida antes de publicar: las gerencias sólo ven versiones revisadas.',
      captura: {
        esperada: 'Power BI Desktop con el modelo semántico y el lienzo del tablero.',
        archivos: [],
      },
      terminos: ['modelo-semantico', 'pbip', 'power-query', 'medida-dax', 'importacion-y-directquery', 'sistema-de-tickets'],
    },
    {
      id: 'gateway',
      titulo: 'Gateway (middleware)',
      zona: 'local',
      resumen: 'El puente controlado entre la red interna y la nube.',
      texto: [
        'El gateway de datos local es un servicio instalado en un equipo de la red de la organización. Cuando Power BI Service necesita actualizar un modelo, le envía la consulta; el gateway la ejecuta contra el Data Warehouse y el datalake, y devuelve los resultados a la nube.',
        'Power BI Desktop publica el informe directamente en el servicio; desde ese momento, cada actualización de datos pasa por el gateway.',
      ],
      quien: 'Equipo de datos, que configura las conexiones',
      herramienta: 'Aplicación del gateway de datos local',
      frecuencia: 'Siempre activo; trabaja en cada actualización programada',
      control: 'La conexión la inicia el gateway hacia la nube, así que no hace falta abrir puertos de entrada en la red. Las credenciales de los orígenes se guardan cifradas en la nube y sólo se descifran en el gateway, dentro de la red interna.',
      captura: {
        esperada: 'La aplicación del gateway de datos local con su estado.',
        archivos: [],
      },
      terminos: ['gateway-de-datos-local', 'conexion-saliente', 'middleware', 'nube-y-on-premises', 'actualizacion-programada'],
    },
    {
      id: 'powerbi-service',
      titulo: 'Power BI Service',
      zona: 'nube',
      resumen: 'El modelo publicado en la nube, que se actualiza solo todos los días.',
      texto: [
        'Desde Power BI Desktop, el tablero se publica en el área de trabajo (workspace) que corresponde. En la nube queda el modelo semántico con una copia de los datos importados.',
        'Una actualización programada renueva esa copia a través del gateway, después del proceso diario del Data Warehouse. Así, el tablero muestra la información hasta el día anterior.',
      ],
      quien: 'Analista de datos, que publica y programa la actualización',
      herramienta: 'Power BI Service (área de trabajo y configuración del modelo)',
      frecuencia: 'Actualización programada diaria',
      control: 'El acceso se administra por área de trabajo y con roles: quien no tiene permiso no ve el informe.',
      captura: {
        esperada: 'El área de trabajo en Power BI Service con la actualización programada del modelo.',
        archivos: [],
      },
      terminos: ['power-bi-desktop-y-service', 'area-de-trabajo', 'actualizacion-programada', 'modelo-semantico', 'latencia-de-los-datos'],
    },
    {
      id: 'sharepoint',
      titulo: 'Workspaces y SharePoint',
      zona: 'nube',
      resumen: 'Donde llega el dato: cada gerencia consulta su tablero para decidir.',
      texto: [
        'Los informes llegan a los usuarios finales a través de las áreas de trabajo y de sitios de SharePoint, donde cada gerencia consulta su tablero.',
        'Es el final del recorrido: lo que alguien cargó a mano en el registro operativo llega procesado y resumido al tablero con el que se toman decisiones.',
      ],
      quien: 'Gerencias (usuarios finales)',
      herramienta: 'SharePoint con el informe de Power BI',
      frecuencia: 'Cuando la gerencia lo necesita; los datos se renuevan cada día',
      control: 'Permisos de sólo lectura: se puede filtrar y explorar, pero no modificar el informe ni los datos.',
      captura: {
        esperada: 'El tablero publicado en SharePoint, tal como lo ve la gerencia.',
        archivos: [],
      },
      terminos: ['sharepoint', 'tablero', 'solo-lectura', 'area-de-trabajo', 'business-intelligence'],
    },
  ];

  // Orden en que se recorren las etapas con "Recorrer las etapas" y con las flechas del teclado.
  Arq.recorrido = [
    'registro-operativo',
    'base-transaccional',
    'data-warehouse',
    'capa-extraccion',
    'capa-calculo',
    'consumo-agregado',
    'consumo-detalle',
    'registro-ejecucion',
    'datalake',
    'powerbi-desktop',
    'gateway',
    'powerbi-service',
    'sharepoint',
  ];
})(window.Arq = window.Arq || {});
