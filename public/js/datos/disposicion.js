// Dibujo del diagrama: qué conexiones hay entre las etapas y dónde va cada elemento.
// Hay dos disposiciones con las mismas etapas:
//   - "ancha": horizontal, como la figura del plan de trabajo (pantallas anchas y proyector).
//   - "vertical": de arriba hacia abajo, para celulares y tabletas.
// Las coordenadas están en las unidades del viewBox de cada disposición.

(function (Arq) {
  'use strict';

  // Conexiones entre etapas. "dato" = el recorrido del dato; "control" = registro del proceso.
  Arq.conexiones = [
    { id: 'registro-base', de: 'registro-operativo', a: 'base-transaccional', tipo: 'dato', nombre: 'carga manual' },
    { id: 'base-extraccion', de: 'base-transaccional', a: 'capa-extraccion', tipo: 'dato', nombre: 'replicación diaria' },
    { id: 'extraccion-calculo', de: 'capa-extraccion', a: 'capa-calculo', tipo: 'dato' },
    { id: 'calculo-agregado', de: 'capa-calculo', a: 'consumo-agregado', tipo: 'dato' },
    { id: 'calculo-detalle', de: 'capa-calculo', a: 'consumo-detalle', tipo: 'dato' },
    { id: 'agregado-desktop', de: 'consumo-agregado', a: 'powerbi-desktop', tipo: 'dato', nombre: 'sólo lectura' },
    { id: 'detalle-desktop', de: 'consumo-detalle', a: 'powerbi-desktop', tipo: 'dato', nombre: 'sólo lectura' },
    { id: 'datalake-desktop', de: 'datalake', a: 'powerbi-desktop', tipo: 'dato', nombre: 'conexión directa (rutas UNC)' },
    { id: 'dwh-registro', de: 'data-warehouse', a: 'registro-ejecucion', tipo: 'control', nombre: 'resultado de cada paso' },
    { id: 'desktop-gateway', de: 'powerbi-desktop', a: 'gateway', tipo: 'dato', nombre: 'conexión local' },
    { id: 'gateway-service', de: 'gateway', a: 'powerbi-service', tipo: 'dato', nombre: 'sincronización', cruzaLimite: true },
    { id: 'service-sharepoint', de: 'powerbi-service', a: 'sharepoint', tipo: 'dato', nombre: 'publicación' },
  ];

  Arq.disposiciones = {
    ancha: {
      vista: [1440, 596],
      limite: { eje: 'x', valor: 1211 },
      zonas: {
        local: { x: 24, y: 36 },
        nube: { x: 1256, y: 36 },
      },
      nodos: {
        'datalake': { x: 24, y: 60, w: 184, h: 84, titulo: ['Datalake (NAS)'], bajada: ['repositorio compartido', 'Excel, CSV, TXT'] },
        'registro-operativo': { x: 24, y: 214, w: 184, h: 66, titulo: ['Registro operativo'], bajada: ['carga manual diaria'] },
        'base-transaccional': { x: 24, y: 311, w: 184, h: 92, titulo: ['Base de datos', 'transaccional'], bajada: ['servidor de producción'] },
        'data-warehouse': { x: 280, y: 196, w: 542, h: 270, contenedor: true, titulo: ['Data Warehouse en PostgreSQL'], bajada: ['base estructurada, organizada en capas por unidad de negocio', 'query definitions y cubos'] },
        'capa-extraccion': { x: 298, y: 310, w: 146, h: 94, titulo: ['Capa de', 'extracción'], bajada: ['tablas foráneas →', 'vistas materializadas'] },
        'capa-calculo': { x: 474, y: 310, w: 136, h: 94, titulo: ['Capa de', 'cálculo'], bajada: ['cálculos', 'intermedios'] },
        'consumo-agregado': { x: 644, y: 266, w: 160, h: 84, titulo: ['Consumo agregado'], bajada: ['datos agrupados', '(cubos)'] },
        'consumo-detalle': { x: 644, y: 364, w: 160, h: 84, titulo: ['Consumo', 'de detalle'], bajada: ['datos en detalle'] },
        'registro-ejecucion': { x: 451, y: 506, w: 200, h: 62, titulo: ['Registro de ejecución'], bajada: ['control diario del proceso'] },
        'powerbi-desktop': { x: 878, y: 266, w: 140, h: 182, titulo: ['Power BI', 'Desktop'], bajada: ['tablero físico,', 'desarrollo local'] },
        'gateway': { x: 1070, y: 319, w: 96, h: 76, titulo: ['Gateway'], bajada: ['middleware'] },
        'powerbi-service': { x: 1256, y: 315, w: 160, h: 84, titulo: ['Power BI Service'], bajada: ['modelo semántico', 'en la nube'] },
        'sharepoint': { x: 1256, y: 452, w: 160, h: 100, titulo: ['Workspaces y', 'SharePoint'], bajada: ['usuarios finales', '(gerencias)'] },
      },
      conexiones: {
        'registro-base': { puntos: [[116, 280], [116, 311]] },
        'base-extraccion': { puntos: [[208, 357], [298, 357]], rotulo: { x: 244, y: 333, lineas: ['replicación', 'diaria'] } },
        'extraccion-calculo': { puntos: [[444, 357], [474, 357]] },
        'calculo-agregado': { puntos: [[610, 357], [627, 357], [627, 308], [644, 308]] },
        'calculo-detalle': { puntos: [[610, 357], [627, 357], [627, 406], [644, 406]] },
        'agregado-desktop': { puntos: [[804, 308], [878, 308]] },
        'detalle-desktop': { puntos: [[804, 406], [878, 406]], rotulo: { x: 850, y: 352, lineas: ['sólo', 'lectura'] } },
        'datalake-desktop': { puntos: [[208, 102], [948, 102], [948, 266]], rotulo: { x: 578, y: 92, lineas: ['conexión directa (rutas UNC)'] } },
        'dwh-registro': { puntos: [[551, 466], [551, 506]] },
        'desktop-gateway': { puntos: [[1018, 357], [1070, 357]], rotulo: { x: 1044, y: 333, lineas: ['conexión', 'local'] } },
        'gateway-service': { puntos: [[1166, 357], [1256, 357]], cerradura: [1211, 357], rotulo: { x: 1211, y: 394, lineas: ['sincronización'] } },
        'service-sharepoint': { puntos: [[1336, 399], [1336, 452]], rotulo: { x: 1346, y: 430, lineas: ['publicación'], ancla: 'start' } },
      },
      leyenda: { x: 24, y: 456 },
    },

    vertical: {
      vista: [420, 1286],
      limite: { eje: 'y', valor: 946 },
      zonas: {
        local: { x: 16, y: 28, texto: 'Red interna (on-premises)' },
        nube: { x: 404, y: 978, ancla: 'end' },
      },
      nodos: {
        'registro-operativo': { x: 16, y: 44, w: 250, h: 62, titulo: ['Registro operativo'], bajada: ['carga manual diaria'] },
        'base-transaccional': { x: 16, y: 140, w: 250, h: 90, titulo: ['Base de datos', 'transaccional'], bajada: ['servidor de producción'] },
        'data-warehouse': { x: 12, y: 270, w: 258, h: 414, contenedor: true, titulo: ['Data Warehouse'], bajada: ['PostgreSQL, organizado en capas', 'por unidad de negocio', 'query definitions y cubos'] },
        'capa-extraccion': { x: 28, y: 368, w: 226, h: 84, titulo: ['Capa de extracción'], bajada: ['tablas foráneas →', 'vistas materializadas'] },
        'capa-calculo': { x: 28, y: 484, w: 226, h: 66, titulo: ['Capa de cálculo'], bajada: ['cálculos intermedios'] },
        'consumo-agregado': { x: 28, y: 582, w: 107, h: 84, titulo: ['Consumo', 'agregado'], bajada: ['cubos'] },
        'consumo-detalle': { x: 147, y: 582, w: 107, h: 84, titulo: ['Consumo', 'de detalle'], bajada: ['fila por fila'] },
        'registro-ejecucion': { x: 290, y: 480, w: 118, h: 74, titulo: ['Registro de', 'ejecución'], bajada: ['control diario'] },
        'powerbi-desktop': { x: 16, y: 728, w: 250, h: 84, titulo: ['Power BI Desktop'], bajada: ['tablero físico,', 'desarrollo local'] },
        'datalake': { x: 290, y: 728, w: 118, h: 84, titulo: ['Datalake', '(NAS)'], bajada: ['Excel, CSV, TXT'] },
        'gateway': { x: 16, y: 850, w: 250, h: 62, titulo: ['Gateway'], bajada: ['middleware en la red interna'] },
        'powerbi-service': { x: 16, y: 994, w: 250, h: 84, titulo: ['Power BI Service'], bajada: ['modelo semántico', 'publicado en la nube'] },
        'sharepoint': { x: 16, y: 1120, w: 250, h: 70, titulo: ['Workspaces y SharePoint'], bajada: ['usuarios finales (gerencias)'] },
      },
      conexiones: {
        'registro-base': { puntos: [[141, 106], [141, 140]] },
        'base-extraccion': { puntos: [[141, 230], [141, 368]], rotulo: { x: 151, y: 254, lineas: ['replicación diaria'], ancla: 'start' } },
        'extraccion-calculo': { puntos: [[141, 452], [141, 484]] },
        'calculo-agregado': { puntos: [[81.5, 550], [81.5, 582]] },
        'calculo-detalle': { puntos: [[200.5, 550], [200.5, 582]] },
        'agregado-desktop': { puntos: [[81.5, 666], [81.5, 728]] },
        'detalle-desktop': { puntos: [[200.5, 666], [200.5, 728]], rotulo: { x: 141, y: 710, lineas: ['sólo lectura'] } },
        'datalake-desktop': { puntos: [[290, 770], [266, 770]] },
        'dwh-registro': { puntos: [[270, 517], [290, 517]] },
        'desktop-gateway': { puntos: [[141, 812], [141, 850]], rotulo: { x: 151, y: 835, lineas: ['conexión local'], ancla: 'start' } },
        'gateway-service': { puntos: [[141, 912], [141, 994]], cerradura: [141, 946], rotulo: { x: 164, y: 951, lineas: ['sincronización'], ancla: 'start' } },
        'service-sharepoint': { puntos: [[141, 1078], [141, 1120]], rotulo: { x: 151, y: 1103, lineas: ['publicación'], ancla: 'start' } },
      },
      leyenda: { x: 16, y: 1222 },
    },
  };

  // "Reproducir el flujo": el dato recorre el diagrama en estos pasos, con una frase por paso.
  Arq.reproduccion = [
    { conexiones: ['registro-base'], texto: 'El personal carga los datos del día en los sistemas de gestión.' },
    { conexiones: ['base-extraccion'], texto: 'Un script replica la base de producción en el Data Warehouse.' },
    { conexiones: ['extraccion-calculo'], texto: 'La capa de cálculo depura y cruza los datos.' },
    { conexiones: ['calculo-agregado', 'calculo-detalle', 'dwh-registro'], texto: 'Se arman los cubos y el detalle, y el proceso queda registrado.' },
    { conexiones: ['agregado-desktop', 'detalle-desktop', 'datalake-desktop'], texto: 'Power BI Desktop toma los cubos, el detalle y las planillas del datalake.' },
    { conexiones: ['desktop-gateway'], texto: 'El gateway conecta esos orígenes locales con la nube.' },
    { conexiones: ['gateway-service'], texto: 'Los datos salen hacia la nube por una conexión cifrada.' },
    { conexiones: ['service-sharepoint'], texto: 'La gerencia consulta el tablero actualizado, con permisos de sólo lectura.' },
  ];
  Arq.reproduccionFinal = 'Así llega un dato del registro operativo al tablero de decisión.';

  // Al avanzar con "Siguiente", el dato viaja por estas conexiones hasta la etapa nueva.
  Arq.llegadas = {
    'base-transaccional': ['registro-base'],
    'data-warehouse': ['base-extraccion'],
    'capa-calculo': ['extraccion-calculo'],
    'consumo-agregado': ['calculo-agregado'],
    'consumo-detalle': ['calculo-detalle'],
    'registro-ejecucion': ['dwh-registro'],
    'powerbi-desktop': ['agregado-desktop', 'detalle-desktop', 'datalake-desktop'],
    'gateway': ['desktop-gateway'],
    'powerbi-service': ['gateway-service'],
    'sharepoint': ['service-sharepoint'],
  };
})(window.Arq = window.Arq || {});
