// Página Arquitectura: dibuja el diagrama, abre el detalle de cada etapa,
// recorre las etapas en orden y anima el recorrido del dato.

(function (Arq) {
  'use strict';

  const { esc, formato, icono, movimientoReducido, esperar } = Arq.util;
  const SVG = 'http://www.w3.org/2000/svg';

  const escenario = document.getElementById('escenario');
  const plano = document.getElementById('plano');
  const svg = document.getElementById('diagrama');
  const capa = document.getElementById('diagrama-capa');
  const panel = document.getElementById('panel');
  const panelCuerpo = document.getElementById('panel-cuerpo');
  const progreso = document.getElementById('progreso');
  const botonCerrar = document.getElementById('panel-cerrar');
  const botonAnterior = document.getElementById('paso-anterior');
  const botonSiguiente = document.getElementById('paso-siguiente');
  const botonRecorrer = document.getElementById('boton-recorrer');
  const botonReproducir = document.getElementById('boton-reproducir');
  const narracion = document.getElementById('narracion');
  const velo = document.getElementById('velo');
  const visor = document.getElementById('visor');
  const visorImagen = document.getElementById('visor-imagen');
  const visorTitulo = document.getElementById('visor-titulo');
  const visorPie = document.getElementById('visor-pie');
  const visorAnterior = document.getElementById('visor-anterior');
  const visorSiguiente = document.getElementById('visor-siguiente');

  // Diagrama horizontal y panel lateral desde 1080 px; debajo, diagrama vertical y hoja inferior.
  const consultaAncha = window.matchMedia('(min-width: 1080px)');

  const etapas = new Map(Arq.etapas.map((e) => [e.id, e]));
  const conexiones = new Map(Arq.conexiones.map((c) => [c.id, c]));
  const terminos = new Map(Arq.terminos.map((t) => [t.id, t]));
  const hijosDe = (id) => Arq.etapas.filter((e) => e.padre === id).map((e) => e.id);
  const posicion = (id) => Arq.recorrido.indexOf(id);

  const estado = {
    disposicion: null,
    seleccion: null,
    generacion: 0, // cambia cada vez que hay que cancelar animaciones en curso
    reproduciendo: false,
    capturaIndice: 0,
    visorIndice: 0,
  };

  // ---------------------------------------------------------------------------
  // Dibujo del diagrama
  // ---------------------------------------------------------------------------

  const ALTO_TITULO = 19.5;
  const ALTO_BAJADA = 16;
  const SEPARACION = 5;
  const PUNTA = 9;

  function ruta(puntos, radio = 9) {
    let d = `M${puntos[0][0]},${puntos[0][1]}`;
    for (let i = 1; i < puntos.length - 1; i++) {
      const [x0, y0] = puntos[i - 1];
      const [x1, y1] = puntos[i];
      const [x2, y2] = puntos[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0);
      const l2 = Math.hypot(x2 - x1, y2 - y1);
      const r = Math.min(radio, l1 / 2, l2 / 2);
      const ax = x1 - ((x1 - x0) / l1) * r;
      const ay = y1 - ((y1 - y0) / l1) * r;
      const bx = x1 + ((x2 - x1) / l2) * r;
      const by = y1 + ((y2 - y1) / l2) * r;
      d += ` L${ax},${ay} Q${x1},${y1} ${bx},${by}`;
    }
    const [xf, yf] = puntos[puntos.length - 1];
    return `${d} L${xf},${yf}`;
  }

  function atributosBoton(etapa) {
    return `tabindex="0" role="button" aria-controls="panel" aria-pressed="false" aria-label="${esc(`${etapa.titulo}. ${etapa.resumen}`)}"`;
  }

  // Cada zona es un rectángulo de color con una trama de puntos encima (la "grilla técnica"
  // del plano). Se extienden mucho más allá del dibujo para cubrir toda la pantalla.
  function dibujarZona(nombre, x, y, w, h) {
    const medidas = `x="${x}" y="${y}" width="${w}" height="${h}"`;
    return `<g class="zona ${nombre}" data-zona="${nombre}">
      <rect class="zona-fondo" ${medidas}/>
      <rect class="zona-trama" ${medidas} fill="url(#trama-${nombre})"/>
    </g>`;
  }

  function dibujarZonas(d) {
    const [W, H] = d.vista;
    const G = 6000;
    const v = d.limite.valor;
    const trama = (nombre) =>
      `<pattern id="trama-${nombre}" width="24" height="24" patternUnits="userSpaceOnUse"><circle class="trama-punto" cx="12" cy="12" r="1.1"/></pattern>`;
    const defs = `<defs>${trama('local')}${trama('nube')}</defs>`;
    const zonas =
      d.limite.eje === 'x'
        ? `${dibujarZona('local', -G, -G, G + v, 2 * G + H)}
           ${dibujarZona('nube', v, -G, G + W - v, 2 * G + H)}
           <line class="limite" x1="${v}" y1="${-G}" x2="${v}" y2="${G + H}"/>`
        : `${dibujarZona('local', -G, -G, 2 * G + W, G + v)}
           ${dibujarZona('nube', -G, v, 2 * G + W, G + H - v)}
           <line class="limite" x1="${-G}" y1="${v}" x2="${G + W}" y2="${v}"/>`;
    const rotulos = Object.entries(d.zonas)
      .map(
        ([zona, r]) =>
          `<text class="zona-rotulo ${zona}" x="${r.x}" y="${r.y}" text-anchor="${r.ancla || 'start'}">${esc(r.texto || Arq.zonas[zona].largo)}</text>`,
      )
      .join('');
    return defs + zonas + rotulos;
  }

  function lineasCentradas(n, cx) {
    const titulo = n.titulo;
    const bajada = n.bajada || [];
    const alto = titulo.length * ALTO_TITULO + (bajada.length ? SEPARACION + bajada.length * ALTO_BAJADA : 0);
    let y = n.y + (n.h - alto) / 2;
    const textos = [];
    for (const linea of titulo) {
      y += ALTO_TITULO;
      textos.push(`<text class="nodo-titulo" x="${cx}" y="${(y - 5).toFixed(1)}" text-anchor="middle" data-ancho="${n.w - 14}">${esc(linea)}</text>`);
    }
    if (bajada.length) y += SEPARACION;
    for (const linea of bajada) {
      y += ALTO_BAJADA;
      textos.push(`<text class="nodo-bajada" x="${cx}" y="${(y - 4).toFixed(1)}" text-anchor="middle" data-ancho="${n.w - 12}">${esc(linea)}</text>`);
    }
    return textos.join('');
  }

  function dibujarNodo(id, n) {
    const etapa = etapas.get(id);
    return `<g class="nodo${etapa.zona === 'nube' ? ' nube' : ''}" data-etapa="${id}" ${atributosBoton(etapa)}>
      <rect class="nodo-foco" x="${n.x - 8}" y="${n.y - 8}" width="${n.w + 16}" height="${n.h + 16}" rx="11"/>
      <rect class="nodo-anillo" x="${n.x - 4.5}" y="${n.y - 4.5}" width="${n.w + 9}" height="${n.h + 9}" rx="9"/>
      <rect class="nodo-placa" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="6"/>
      ${lineasCentradas(n, n.x + n.w / 2)}
    </g>`;
  }

  // El contenedor se dibuja en dos partes: el marco va primero (debajo de las capas)
  // y la etiqueta, que es la parte que recibe el foco, va en el orden del recorrido.
  function dibujarMarco(id, n) {
    return `<g class="contenedor" data-etapa="${id}" aria-hidden="true">
      <rect class="contenedor-marco" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10"/>
    </g>`;
  }

  function dibujarEtiqueta(id, n) {
    const etapa = etapas.get(id);
    const x = n.x + 18;
    const ancho = n.w - 36;
    let y = n.y + 32;
    const textos = [`<text class="contenedor-titulo" x="${x}" y="${y}" data-ancho="${ancho}">${esc(n.titulo[0])}</text>`];
    y += 5;
    for (const linea of n.bajada || []) {
      y += 15;
      textos.push(`<text class="contenedor-bajada" x="${x}" y="${y}" data-ancho="${ancho}">${esc(linea)}</text>`);
    }
    const altoCabecera = y - n.y + 12;
    return `<g class="contenedor-etiqueta" data-etapa="${id}" ${atributosBoton(etapa)}>
      <rect class="nodo-foco" x="${n.x - 8}" y="${n.y - 8}" width="${n.w + 16}" height="${n.h + 16}" rx="14"/>
      <rect class="contenedor-zona" x="${n.x}" y="${n.y}" width="${n.w}" height="${altoCabecera}" rx="10"/>
      ${textos.join('')}
    </g>`;
  }

  function dibujarConexion(id, c) {
    const meta = conexiones.get(id);
    const puntos = c.puntos.map((p) => [...p]);
    const [xa, ya] = puntos[puntos.length - 2];
    const [xb, yb] = puntos[puntos.length - 1];
    const largo = Math.hypot(xb - xa, yb - ya);
    const ux = (xb - xa) / largo;
    const uy = (yb - ya) / largo;
    puntos[puntos.length - 1] = [xb - ux * PUNTA, yb - uy * PUNTA];
    const d = ruta(puntos);
    const bx = xb - ux * PUNTA;
    const by = yb - uy * PUNTA;
    const px = -uy * 4.6;
    const py = ux * 4.6;
    const punta = `M${xb},${yb} L${bx + px},${by + py} L${bx - px},${by - py} Z`;
    let rotulo = '';
    if (c.rotulo) {
      const ancla = c.rotulo.ancla || 'middle';
      rotulo = c.rotulo.lineas
        .map((linea, i) => `<text class="conexion-rotulo" x="${c.rotulo.x}" y="${c.rotulo.y + i * 14}" text-anchor="${ancla}">${esc(linea)}</text>`)
        .join('');
    }
    return `<g class="conexion ${meta.tipo}" data-conexion="${id}" data-de="${meta.de}" data-a="${meta.a}">
      <path class="conexion-linea" d="${d}"/>
      <path class="conexion-flujo" d="${d}"/>
      <path class="conexion-punta" d="${punta}"/>
      ${rotulo}
    </g>`;
  }

  function candado(escala = 1) {
    return `<g transform="scale(${escala})">
      <path class="cerradura-arco" d="M-3.6,-1.6 V-4.4 A3.6,3.6 0 0 1 3.6,-4.4 V-1.6"/>
      <rect class="cerradura-cuerpo" x="-5.6" y="-1.8" width="11.2" height="8.8" rx="1.6"/>
    </g>`;
  }

  function dibujarCerradura(id, [x, y]) {
    return `<g class="cerradura" data-cerradura="${id}" transform="translate(${x} ${y})">
      <circle class="cerradura-onda" r="15"/>
      <circle class="cerradura-fondo" r="15"/>
      ${candado()}
    </g>`;
  }

  function dibujarLeyenda({ x, y }) {
    return `<g class="leyenda" transform="translate(${x} ${y})" aria-hidden="true">
      <line class="leyenda-linea" x1="0" y1="-4.5" x2="28" y2="-4.5"/>
      <text x="40" y="0">Recorrido del dato</text>
      <line class="leyenda-linea control" x1="0" y1="21.5" x2="28" y2="21.5"/>
      <text x="40" y="26">Control del proceso</text>
      <g class="cerradura" transform="translate(14 47.5)">
        <circle class="cerradura-fondo" r="11"/>
        ${candado(0.78)}
      </g>
      <text x="40" y="52">Conexión cifrada hacia la nube</text>
    </g>`;
  }

  function dibujar() {
    const nombre = consultaAncha.matches ? 'ancha' : 'vertical';
    if (nombre === estado.disposicion) return false;
    estado.disposicion = nombre;
    escenario.dataset.disposicion = nombre;
    const d = Arq.disposiciones[nombre];
    svg.setAttribute('viewBox', `0 0 ${d.vista[0]} ${d.vista[1]}`);

    const partes = [dibujarZonas(d)];
    for (const [id, n] of Object.entries(d.nodos)) if (n.contenedor) partes.push(dibujarMarco(id, n));
    for (const [id, c] of Object.entries(d.conexiones)) partes.push(dibujarConexion(id, c));
    for (const id of Arq.recorrido) {
      const n = d.nodos[id];
      if (n) partes.push(n.contenedor ? dibujarEtiqueta(id, n) : dibujarNodo(id, n));
    }
    for (const [id, c] of Object.entries(d.conexiones)) if (c.cerradura) partes.push(dibujarCerradura(id, c.cerradura));
    partes.push(dibujarLeyenda(d.leyenda));
    partes.push('<g class="paquetes" id="paquetes"></g>');
    capa.innerHTML = partes.join('');

    asignarRetardos();
    medirConexiones();
    ajustarTextos();
    marcarSeleccion();
    return true;
  }

  // Retardos del armado inicial: cada elemento aparece en el orden del recorrido.
  function asignarRetardos() {
    const paso = 85;
    const base = 160;
    const orden = (id) => Math.max(0, posicion(id));
    capa.querySelectorAll('[data-etapa]').forEach((el) => {
      el.style.setProperty('--retardo', `${base + orden(el.dataset.etapa) * paso}ms`);
    });
    capa.querySelectorAll('.conexion').forEach((el) => {
      const i = Math.max(orden(el.dataset.de), orden(el.dataset.a));
      el.style.setProperty('--retardo', `${base + i * paso + 60}ms`);
    });
    const final = `${base + Arq.recorrido.length * paso}ms`;
    capa.querySelectorAll('.cerradura, .leyenda, .zona-rotulo').forEach((el) => el.style.setProperty('--retardo', final));
  }

  function medirConexiones() {
    capa.querySelectorAll('.conexion-linea').forEach((camino) => {
      camino.style.setProperty('--largo', camino.getTotalLength().toFixed(1));
    });
  }

  // Si una línea de texto no entra en su caja (por ejemplo, con otra tipografía), se achica un poco.
  function ajustarTextos() {
    capa.querySelectorAll('text[data-ancho]').forEach((t) => {
      t.style.fontSize = '';
      const maximo = Number(t.dataset.ancho);
      const largo = t.getComputedTextLength();
      if (largo > maximo) {
        const tamano = parseFloat(getComputedStyle(t).fontSize);
        t.style.fontSize = `${Math.max(tamano * 0.8, (tamano * maximo) / largo).toFixed(2)}px`;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Selección
  // ---------------------------------------------------------------------------

  function relacionadas(id) {
    const grupo = new Set([id, ...hijosDe(id)]);
    const activas = new Set();
    const vecinos = new Set(hijosDe(id));
    for (const c of Arq.conexiones) {
      if (grupo.has(c.de) || grupo.has(c.a)) {
        activas.add(c.id);
        vecinos.add(c.de);
        vecinos.add(c.a);
      }
    }
    vecinos.delete(id);
    return { activas, vecinos };
  }

  function marcarSeleccion() {
    const id = estado.seleccion;
    const { activas, vecinos } = id ? relacionadas(id) : { activas: new Set(), vecinos: new Set() };
    const padre = id ? etapas.get(id).padre : null;
    capa.querySelectorAll('[data-etapa]').forEach((el) => {
      const e = el.dataset.etapa;
      el.classList.toggle('activo', e === id);
      el.classList.toggle('vecino', vecinos.has(e));
      el.classList.toggle('contexto', e === padre);
      el.classList.remove('encendido');
      if (el.hasAttribute('tabindex')) el.setAttribute('aria-pressed', String(e === id));
    });
    capa.querySelectorAll('.conexion').forEach((el) => el.classList.toggle('activa', activas.has(el.dataset.conexion)));
    escenario.classList.toggle('enfocado', Boolean(id));
  }

  function vecinosDe(id) {
    const grupo = new Set([id, ...hijosDe(id)]);
    const entrada = new Set();
    const salida = new Set();
    for (const c of Arq.conexiones) {
      const desdeAdentro = grupo.has(c.de);
      const haciaAdentro = grupo.has(c.a);
      if (haciaAdentro && !desdeAdentro) entrada.add(c.de);
      if (desdeAdentro && !haciaAdentro) salida.add(c.a);
    }
    return { entrada: [...entrada], salida: [...salida] };
  }

  function elegir(id, { direccion = 0, llegar = false, foco = false } = {}) {
    if (!etapas.has(id)) return;
    if (estado.reproduciendo) terminarReproduccion();
    // Si el foco del teclado estaba en el diagrama, pasa a la etapa nueva: así no queda
    // marcada la etapa anterior al avanzar con las flechas.
    const focoEnDiagrama = capa.contains(document.activeElement);
    const generacion = ++estado.generacion;
    const anterior = estado.seleccion;
    if (anterior !== id) estado.capturaIndice = 0;
    estado.seleccion = id;
    marcarSeleccion();
    abrirPanel();
    pintarPanel(id, anterior ? direccion : 0);
    requestAnimationFrame(() => enfocarCamara(id));
    history.replaceState(null, '', `#${id}`);
    if (llegar) for (const c of Arq.llegadas[id] || []) viajar(c, { generacion });
    if (foco) document.getElementById('panel-titulo')?.focus({ preventScroll: true });
    else if (focoEnDiagrama) capa.querySelector(`[data-etapa="${id}"][tabindex]`)?.focus({ preventScroll: true });
  }

  function irRelativo(delta) {
    const j = posicion(estado.seleccion) + delta;
    if (j < 0 || j >= Arq.recorrido.length) return;
    elegir(Arq.recorrido[j], { direccion: delta, llegar: delta > 0 });
  }

  // ---------------------------------------------------------------------------
  // Panel de detalle
  // ---------------------------------------------------------------------------

  function abrirPanel() {
    escenario.classList.add('con-panel');
    panel.removeAttribute('aria-hidden');
    panel.inert = false;
    velo.hidden = false;
  }

  function cerrarPanel({ devolverFoco = true } = {}) {
    const id = estado.seleccion;
    estado.generacion++;
    estado.seleccion = null;
    escenario.classList.remove('con-panel');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    marcarSeleccion();
    desplazar(0);
    history.replaceState(null, '', location.pathname + location.search);
    if (devolverFoco && id) capa.querySelector(`[data-etapa="${id}"][tabindex]`)?.focus({ preventScroll: true });
  }

  function chipEtapa(id) {
    return `<li><button type="button" class="chip" data-ir="${id}">${icono('etapa')}${esc(etapas.get(id).titulo)}</button></li>`;
  }

  function chipTermino(id) {
    const t = terminos.get(id);
    return t ? `<li><a class="chip" href="glosario.html#${id}">${icono('libro')}${esc(t.termino)}</a></li>` : '';
  }

  // La captura se muestra dentro de un marco de ventana, con la herramienta en la barra.
  // Mientras falte la imagen, la ventana muestra un esqueleto de interfaz y el aviso.
  function barraVentana(e) {
    return `<span class="ventana-barra" aria-hidden="true">
      <span class="ventana-puntos"><i></i><i></i><i></i></span>
      <span class="ventana-nombre">${esc(e.herramienta)}</span>
    </span>`;
  }

  function figuraCaptura(e) {
    const archivos = e.captura.archivos || [];
    if (!archivos.length) {
      return `<figure class="captura">
        <div class="ventana pendiente" data-captura-visual>
          ${barraVentana(e)}
          <div class="ventana-cuerpo">
            <span class="esqueleto" aria-hidden="true">
              <i class="esq-lateral"></i><i class="esq-barra"></i>
              <i class="esq-tarjeta"></i><i class="esq-tarjeta"></i><i class="esq-tarjeta"></i>
              <i class="esq-grafico"></i>
            </span>
            <span class="pendiente-aviso">
              ${icono('imagen')}
              <strong>Captura pendiente</strong>
              <span>${esc(e.captura.esperada)}</span>
            </span>
          </div>
        </div>
      </figure>`;
    }
    const i = Math.min(estado.capturaIndice, archivos.length - 1);
    const a = archivos[i];
    const descripcion = a.pie || e.captura.esperada;
    const navegar =
      archivos.length > 1
        ? `<span class="captura-navegar">
            <button type="button" class="boton-icono" data-captura="-1" aria-label="Captura anterior" ${i === 0 ? 'disabled' : ''}>${icono('anterior')}</button>
            ${i + 1} de ${archivos.length}
            <button type="button" class="boton-icono" data-captura="1" aria-label="Captura siguiente" ${i === archivos.length - 1 ? 'disabled' : ''}>${icono('siguiente')}</button>
          </span>`
        : '';
    return `<figure class="captura">
      <button type="button" class="ventana captura-marco" data-captura-visual data-ampliar="${i}" aria-label="Ampliar la captura: ${esc(descripcion)}">
        ${barraVentana(e)}
        <span class="ventana-cuerpo">
          <img src="${esc(a.archivo)}" alt="${esc(a.alt || descripcion)}" decoding="async">
          <span class="captura-ampliar" aria-hidden="true">${icono('ampliar')}Ampliar</span>
        </span>
      </button>
      <figcaption><span>${esc(descripcion)}</span>${navegar}</figcaption>
    </figure>`;
  }

  function contenidoPanel(e) {
    const { entrada, salida } = vecinosDe(e.id);
    const zona = Arq.zonas[e.zona];
    return `
      <p class="panel-paso">Etapa ${posicion(e.id) + 1} de ${Arq.recorrido.length}<span class="zona-chip ${e.zona}">${esc(zona.nombre)}</span></p>
      <h2 id="panel-titulo" tabindex="-1">${esc(e.titulo)}</h2>
      <p class="panel-resumen">${formato(e.resumen)}</p>
      ${figuraCaptura(e)}
      <div class="panel-texto">${e.texto.map((p) => `<p>${formato(p)}</p>`).join('')}</div>
      <dl class="ficha">
        <div><dt>Quién interviene</dt><dd>${formato(e.quien)}</dd></div>
        <div><dt>Herramienta</dt><dd>${formato(e.herramienta)}</dd></div>
        <div><dt>Frecuencia</dt><dd>${formato(e.frecuencia)}</dd></div>
      </dl>
      <section class="control" aria-labelledby="control-titulo">
        ${icono('candado')}
        <h3 id="control-titulo">Control y seguridad</h3>
        <p>${formato(e.control)}</p>
      </section>
      <div class="relaciones">
        ${entrada.length ? `<div><h3>Viene de</h3><ul class="lista-chips">${entrada.map(chipEtapa).join('')}</ul></div>` : ''}
        ${salida.length ? `<div><h3>Sigue hacia</h3><ul class="lista-chips">${salida.map(chipEtapa).join('')}</ul></div>` : ''}
        ${e.terminos.length ? `<div><h3>En el glosario</h3><ul class="lista-chips">${e.terminos.map(chipTermino).join('')}</ul></div>` : ''}
      </div>
      <p class="atajos">Usá <kbd>←</kbd> y <kbd>→</kbd> para pasar de etapa, y <kbd>Esc</kbd> para cerrar.</p>`;
  }

  function revelarCaptura(contenedor) {
    if (movimientoReducido()) return;
    const visual = contenedor.querySelector('[data-captura-visual]');
    if (!visual) return;
    visual.classList.remove('revelar');
    void visual.getBoundingClientRect();
    visual.classList.add('revelar');
    setTimeout(() => visual.classList.remove('revelar'), 1400);
  }

  function pintarPanel(id, direccion = 0) {
    const e = etapas.get(id);
    const nuevo = document.createElement('div');
    nuevo.className = 'panel-contenido';
    nuevo.innerHTML = contenidoPanel(e);
    const viejo = panelCuerpo.querySelector('.panel-contenido:not(.saliendo)');
    panelCuerpo.querySelectorAll('.panel-contenido.saliendo').forEach((n) => n.remove());
    panelCuerpo.append(nuevo);
    panelCuerpo.scrollTop = 0;
    const animar = !movimientoReducido();
    if (viejo) {
      if (animar && direccion) {
        viejo.classList.add('saliendo');
        viejo.style.position = 'absolute';
        viejo.style.inset = '0 0 auto 0';
        viejo
          .animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-32 * direccion}px)` }], { duration: 200, easing: 'ease-in', fill: 'forwards' })
          .finished.then(() => viejo.remove(), () => viejo.remove());
      } else {
        viejo.remove();
      }
    }
    if (animar) {
      nuevo.animate([{ opacity: 0, transform: `translateX(${32 * (direccion || 1)}px)` }, { opacity: 1, transform: 'none' }], {
        duration: 420,
        delay: viejo && direccion ? 110 : 140,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'backwards',
      });
      setTimeout(() => revelarCaptura(nuevo), viejo && direccion ? 160 : 260);
    }
    actualizarProgreso(id);
    actualizarPasos(id);
  }

  function pintarCaptura() {
    const e = etapas.get(estado.seleccion);
    const figura = panelCuerpo.querySelector('.panel-contenido:not(.saliendo) .captura');
    if (!e || !figura) return;
    figura.outerHTML = figuraCaptura(e);
    revelarCaptura(panelCuerpo.querySelector('.panel-contenido:not(.saliendo)'));
  }

  function construirProgreso() {
    progreso.innerHTML = Arq.recorrido
      .map((id, i) => `<li><button type="button" data-ir="${id}" aria-label="Etapa ${i + 1}: ${esc(etapas.get(id).titulo)}"></button></li>`)
      .join('');
  }

  function actualizarProgreso(id) {
    const actual = posicion(id);
    progreso.querySelectorAll('button').forEach((b, i) => {
      b.classList.toggle('hecho', i < actual);
      if (i === actual) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
  }

  function actualizarPasos(id) {
    const i = posicion(id);
    const anterior = Arq.recorrido[i - 1];
    const siguiente = Arq.recorrido[i + 1];
    botonAnterior.disabled = !anterior;
    botonAnterior.querySelector('b').textContent = anterior ? etapas.get(anterior).titulo : 'Es la primera etapa';
    botonSiguiente.querySelector('small').textContent = siguiente ? 'Siguiente' : 'Recorrido completo';
    botonSiguiente.querySelector('b').textContent = siguiente ? etapas.get(siguiente).titulo : 'Volver a la primera etapa';
  }

  // ---------------------------------------------------------------------------
  // Cámara: el diagrama se desplaza para que la etapa elegida quede a la vista
  // ---------------------------------------------------------------------------

  function desplazar(px) {
    plano.style.transform = px ? `translateX(${px.toFixed(1)}px)` : '';
  }

  function desplazamientoActual() {
    const t = getComputedStyle(plano).transform;
    return t && t !== 'none' ? new DOMMatrixReadOnly(t).m41 : 0;
  }

  function areaContenido() {
    const r = svg.getBoundingClientRect();
    const [W, H] = Arq.disposiciones[estado.disposicion].vista;
    const escala = Math.min(r.width / W, r.height / H);
    const ancho = W * escala;
    return { izquierda: r.left + (r.width - ancho) / 2, ancho };
  }

  function elementoEtapa(id) {
    return capa.querySelector(`.nodo[data-etapa="${id}"], .contenedor[data-etapa="${id}"]`);
  }

  function enfocarCamara(id, { suave = true } = {}) {
    const el = elementoEtapa(id);
    if (!el || !estado.seleccion) return;
    if (!consultaAncha.matches) {
      desplazar(0);
      centrarEnPantalla(el, suave);
      return;
    }
    const actual = desplazamientoActual();
    const re = escenario.getBoundingClientRect();
    const rn = el.getBoundingClientRect();
    const anchoPanel = panel.getBoundingClientRect().width;
    const margen = 32;
    const izquierda = margen;
    const derecha = re.width - anchoPanel - margen;
    const x1 = rn.left - re.left - actual;
    const x2 = rn.right - re.left - actual;
    const objetivoActual = parseFloat((plano.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0;
    if (x1 + objetivoActual >= izquierda && x2 + objetivoActual <= derecha) {
      desplazar(objetivoActual);
      return;
    }
    const c = areaContenido();
    const bordeDerecho = c.izquierda + c.ancho - re.left - actual;
    const minimo = Math.min(0, derecha - bordeDerecho);
    const objetivo = Math.max(minimo, Math.min(0, (izquierda + derecha) / 2 - (x1 + x2) / 2));
    desplazar(objetivo);
  }

  function centrarEnPantalla(el, suave) {
    const r = el.getBoundingClientRect();
    const encabezado = document.querySelector('.encabezado').getBoundingClientRect().height;
    const hoja = estado.seleccion ? panel.getBoundingClientRect().height : 0;
    const alto = Math.max(140, window.innerHeight - hoja - encabezado);
    const centro = encabezado + alto / 2;
    const objetivo = window.scrollY + r.top + r.height / 2 - centro;
    window.scrollTo({ top: Math.max(0, objetivo), behavior: suave && !movimientoReducido() ? 'smooth' : 'auto' });
  }

  // ---------------------------------------------------------------------------
  // Animación del dato
  // ---------------------------------------------------------------------------

  function destellar(id) {
    capa.querySelectorAll(`.nodo[data-etapa="${id}"]`).forEach((el) => {
      el.classList.remove('llegada');
      void el.getBoundingClientRect();
      el.classList.add('llegada');
      setTimeout(() => el.classList.remove('llegada'), 900);
    });
  }

  function pulsoCerradura(idConexion) {
    const c = capa.querySelector(`[data-cerradura="${idConexion}"]`);
    if (!c) return;
    c.classList.remove('pulso');
    void c.getBoundingClientRect();
    c.classList.add('pulso');
    setTimeout(() => c.classList.remove('pulso'), 1100);
  }

  function fraccionDelCruce(idConexion) {
    const c = Arq.disposiciones[estado.disposicion].conexiones[idConexion];
    if (!c || !c.cerradura) return null;
    const [x0, y0] = c.puntos[0];
    const [xf, yf] = c.puntos[c.puntos.length - 1];
    const total = Math.hypot(xf - x0, yf - y0) - PUNTA;
    return Math.min(1, Math.hypot(c.cerradura[0] - x0, c.cerradura[1] - y0) / total);
  }

  function viajar(idConexion, { generacion = estado.generacion, duracion } = {}) {
    const grupo = capa.querySelector(`[data-conexion="${idConexion}"]`);
    const capaPaquetes = document.getElementById('paquetes');
    if (!grupo || !capaPaquetes || movimientoReducido()) return Promise.resolve();
    const camino = grupo.querySelector('.conexion-linea');
    const largo = camino.getTotalLength();
    const tiempo = duracion ?? Math.min(1500, Math.max(700, largo * 2.2));
    const cruce = fraccionDelCruce(idConexion);
    const halo = document.createElementNS(SVG, 'circle');
    halo.setAttribute('class', 'paquete-halo');
    halo.setAttribute('r', '10');
    const punto = document.createElementNS(SVG, 'circle');
    punto.setAttribute('class', 'paquete');
    punto.setAttribute('r', '4.6');
    capaPaquetes.append(halo, punto);
    let cruzo = false;

    return new Promise((resolver) => {
      const inicio = performance.now();
      const cuadro = (ahora) => {
        if (generacion !== estado.generacion || !halo.isConnected) {
          halo.remove();
          punto.remove();
          resolver();
          return;
        }
        const t = Math.min(1, (ahora - inicio) / tiempo);
        const suave = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const p = camino.getPointAtLength(suave * largo);
        halo.setAttribute('cx', p.x);
        halo.setAttribute('cy', p.y);
        punto.setAttribute('cx', p.x);
        punto.setAttribute('cy', p.y);
        if (cruce !== null && !cruzo && suave >= cruce) {
          cruzo = true;
          pulsoCerradura(idConexion);
        }
        if (t < 1) {
          requestAnimationFrame(cuadro);
        } else {
          halo.remove();
          punto.remove();
          destellar(conexiones.get(idConexion).a);
          resolver();
        }
      };
      requestAnimationFrame(cuadro);
    });
  }

  function encender(id) {
    const etapa = etapas.get(id);
    capa.querySelectorAll(`[data-etapa="${id}"]`).forEach((el) => el.classList.add('encendido', 'vecino'));
    if (etapa && etapa.padre) capa.querySelectorAll(`[data-etapa="${etapa.padre}"]`).forEach((el) => el.classList.add('contexto'));
    if (id === 'data-warehouse') capa.querySelectorAll('[data-etapa="data-warehouse"]').forEach((el) => el.classList.add('contexto'));
  }

  function narrar(texto) {
    narracion.classList.remove('visible');
    void narracion.offsetWidth;
    narracion.textContent = texto;
    narracion.classList.add('visible');
  }

  async function reproducir() {
    if (estado.reproduciendo) {
      terminarReproduccion();
      return;
    }
    if (estado.seleccion) cerrarPanel({ devolverFoco: false });
    const generacion = ++estado.generacion;
    const reducido = movimientoReducido();
    estado.reproduciendo = true;
    escenario.classList.add('reproduciendo', 'enfocado');
    botonReproducir.classList.add('activo');
    encender('registro-operativo');

    for (const paso of Arq.reproduccion) {
      if (generacion !== estado.generacion) return;
      narrar(paso.texto);
      for (const id of paso.conexiones) {
        const c = conexiones.get(id);
        capa.querySelector(`[data-conexion="${id}"]`)?.classList.add('activa');
        encender(c.de);
      }
      if (!consultaAncha.matches) {
        const destino = elementoEtapa(conexiones.get(paso.conexiones[0]).a);
        if (destino) centrarEnPantalla(destino, true);
      }
      if (reducido) await esperar(2200);
      else await Promise.all(paso.conexiones.map((id) => viajar(id, { generacion })));
      if (generacion !== estado.generacion) return;
      for (const id of paso.conexiones) encender(conexiones.get(id).a);
      await esperar(reducido ? 200 : 700);
    }
    if (generacion !== estado.generacion) return;
    narrar(Arq.reproduccionFinal);
    await esperar(3400);
    if (generacion === estado.generacion) terminarReproduccion();
  }

  function terminarReproduccion() {
    estado.generacion++;
    estado.reproduciendo = false;
    escenario.classList.remove('reproduciendo');
    botonReproducir.classList.remove('activo');
    narracion.classList.remove('visible');
    narracion.textContent = '';
    marcarSeleccion();
  }

  // ---------------------------------------------------------------------------
  // Visor de capturas
  // ---------------------------------------------------------------------------

  function pintarVisor() {
    const e = etapas.get(estado.seleccion);
    const archivos = e.captura.archivos;
    const a = archivos[estado.visorIndice];
    const descripcion = a.pie || e.captura.esperada;
    visorImagen.src = a.archivo;
    visorImagen.alt = a.alt || descripcion;
    visorTitulo.textContent = e.titulo;
    visorPie.textContent = archivos.length > 1 ? `${descripcion} (${estado.visorIndice + 1} de ${archivos.length})` : descripcion;
    visorAnterior.hidden = visorSiguiente.hidden = archivos.length < 2;
    visorAnterior.disabled = estado.visorIndice === 0;
    visorSiguiente.disabled = estado.visorIndice === archivos.length - 1;
  }

  function abrirVisor(indice) {
    estado.visorIndice = indice;
    pintarVisor();
    visor.showModal();
  }

  function moverVisor(delta) {
    const archivos = etapas.get(estado.seleccion).captura.archivos;
    const j = estado.visorIndice + delta;
    if (j < 0 || j >= archivos.length) return;
    estado.visorIndice = j;
    pintarVisor();
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------

  function idDesdeHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    return etapas.has(id) ? id : null;
  }

  capa.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-etapa]');
    if (el) {
      const id = el.dataset.etapa;
      const delta = estado.seleccion ? Math.sign(posicion(id) - posicion(estado.seleccion)) : 0;
      elegir(id, { direccion: delta });
      return;
    }
    if (estado.seleccion && ev.target.closest('.zona')) cerrarPanel({ devolverFoco: false });
  });

  capa.addEventListener('keydown', (ev) => {
    const el = ev.target.closest('[data-etapa][tabindex]');
    if (el && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      elegir(el.dataset.etapa, { foco: true });
    }
  });

  panel.addEventListener('click', (ev) => {
    const ir = ev.target.closest('[data-ir]');
    if (ir) {
      const id = ir.dataset.ir;
      const delta = Math.sign(posicion(id) - posicion(estado.seleccion));
      elegir(id, { direccion: delta, llegar: delta > 0 && (Arq.llegadas[id] || []).some((c) => conexiones.get(c).de === estado.seleccion) });
      return;
    }
    const ampliar = ev.target.closest('[data-ampliar]');
    if (ampliar) {
      abrirVisor(Number(ampliar.dataset.ampliar));
      return;
    }
    const captura = ev.target.closest('[data-captura]');
    if (captura) {
      estado.capturaIndice += Number(captura.dataset.captura);
      pintarCaptura();
    }
  });

  progreso.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ir]');
    if (b) elegir(b.dataset.ir, { direccion: Math.sign(posicion(b.dataset.ir) - posicion(estado.seleccion)) });
  });

  botonCerrar.addEventListener('click', () => cerrarPanel());
  velo.addEventListener('click', () => cerrarPanel({ devolverFoco: false }));
  botonAnterior.addEventListener('click', () => irRelativo(-1));
  botonSiguiente.addEventListener('click', () => {
    if (posicion(estado.seleccion) === Arq.recorrido.length - 1) elegir(Arq.recorrido[0], { direccion: 1 });
    else irRelativo(1);
  });

  botonRecorrer.addEventListener('click', () => elegir(Arq.recorrido[0], { foco: true }));
  botonReproducir.addEventListener('click', reproducir);

  document.addEventListener('keydown', (ev) => {
    if (visor.open || ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (ev.key === 'Escape') {
      if (estado.reproduciendo) terminarReproduccion();
      else if (estado.seleccion) cerrarPanel();
      return;
    }
    if (!estado.seleccion) return;
    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      irRelativo(1);
    } else if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      irRelativo(-1);
    }
  });

  visor.addEventListener('click', (ev) => {
    if (ev.target === visor || ev.target.classList.contains('visor-figura')) visor.close();
  });
  visor.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight') moverVisor(1);
    else if (ev.key === 'ArrowLeft') moverVisor(-1);
  });
  document.getElementById('visor-cerrar').addEventListener('click', () => visor.close());
  visorAnterior.addEventListener('click', () => moverVisor(-1));
  visorSiguiente.addEventListener('click', () => moverVisor(1));

  window.addEventListener('hashchange', () => {
    const id = idDesdeHash();
    if (id && id !== estado.seleccion) elegir(id);
    else if (!id && estado.seleccion) cerrarPanel({ devolverFoco: false });
  });

  let reloj = 0;
  window.addEventListener('resize', () => {
    clearTimeout(reloj);
    reloj = setTimeout(() => {
      if (dibujar() && document.fonts) document.fonts.ready.then(ajustarTextos);
      if (estado.seleccion) enfocarCamara(estado.seleccion, { suave: false });
    }, 120);
  });

  // ---------------------------------------------------------------------------
  // Inicio
  // ---------------------------------------------------------------------------

  construirProgreso();
  panel.inert = true;
  dibujar();
  if (document.fonts) document.fonts.ready.then(ajustarTextos);

  const armado = movimientoReducido() ? 0 : 2100;
  setTimeout(() => escenario.classList.remove('armando'), armado);

  const inicial = idDesdeHash();
  if (inicial) setTimeout(() => elegir(inicial), movimientoReducido() ? 0 : 700);
})(window.Arq);
