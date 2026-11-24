// Página Glosario: lista los términos agrupados por letra, con búsqueda y filtro por tema.

(function (Arq) {
  'use strict';

  const { esc, icono, movimientoReducido } = Arq.util;

  const lista = document.getElementById('lista');
  const buscar = document.getElementById('buscar');
  const formulario = document.getElementById('form-buscar');
  const filtros = document.getElementById('filtros');
  const cuenta = document.getElementById('cuenta');
  const vacio = document.getElementById('vacio');
  const vacioTexto = document.getElementById('vacio-texto');
  const limpiar = document.getElementById('limpiar');

  const etapas = new Map(Arq.etapas.map((e) => [e.id, e]));
  const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normalizar = (s) => sinAcentos(s).toLowerCase();
  const ordenados = [...Arq.terminos].sort((a, b) => a.termino.localeCompare(b.termino, 'es', { sensitivity: 'base' }));
  let grupo = 'todos';

  // Para resaltar lo buscado aunque se escriba sin tildes: "vista materializada" encuentra "Vista materializada".
  const VARIANTES = { a: 'aáàäâ', e: 'eéèëê', i: 'iíìïî', o: 'oóòöô', u: 'uúùüû', n: 'nñ', c: 'cç' };

  function patron(consulta) {
    const partes = [...consulta].map((caracter) => {
      const base = normalizar(caracter);
      if (VARIANTES[base]) return `[${VARIANTES[base]}${VARIANTES[base].toUpperCase()}]`;
      return caracter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    return new RegExp(partes.join(''), 'gi');
  }

  function resaltar(texto, expresion) {
    if (!expresion) return esc(texto);
    let html = '';
    let ultimo = 0;
    texto.replace(expresion, (coincidencia, desde) => {
      html += `${esc(texto.slice(ultimo, desde))}<mark>${esc(coincidencia)}</mark>`;
      ultimo = desde + coincidencia.length;
      return coincidencia;
    });
    return html + esc(texto.slice(ultimo));
  }

  function formatoResaltado(texto, expresion) {
    return texto
      .split('`')
      .map((parte, i) => (i % 2 ? `<code>${resaltar(parte, expresion)}</code>` : resaltar(parte, expresion)))
      .join('');
  }

  function entrada(t, expresion) {
    const chips = t.etapas
      .map((id) => etapas.get(id))
      .filter(Boolean)
      .map((e) => `<li><a class="chip" href="index.html#${e.id}">${icono('etapa')}${esc(e.titulo)}</a></li>`)
      .join('');
    return `<div class="termino" id="${t.id}">
      <dt>${resaltar(t.termino, expresion)}</dt>
      <dd>
        <p class="termino-definicion">${formatoResaltado(t.definicion, expresion)}</p>
        ${chips ? `<div class="termino-etapas"><span class="oculto-visual">Aparece en el diagrama:</span><ul class="lista-chips">${chips}</ul></div>` : ''}
      </dd>
    </div>`;
  }

  // Al cargar y al cambiar de tema, los grupos de letras entran escalonados.
  // Mientras se escribe en el buscador no se anima, para que la lista no parpadee.
  function animarEntrada() {
    if (movimientoReducido()) return;
    lista.querySelectorAll('.letra-grupo').forEach((g, i) => g.style.setProperty('--i', Math.min(i, 10)));
    lista.classList.remove('entrando');
    void lista.offsetWidth;
    lista.classList.add('entrando');
  }

  function pintar({ animar = false } = {}) {
    const consulta = buscar.value.trim();
    const q = normalizar(consulta);
    const expresion = consulta ? patron(consulta) : null;
    const visibles = ordenados.filter(
      (t) => (grupo === 'todos' || t.grupo === grupo) && (!q || normalizar(`${t.termino} ${t.definicion.replace(/`/g, '')}`).includes(q)),
    );

    const porLetra = new Map();
    for (const t of visibles) {
      const letra = sinAcentos(t.termino.charAt(0)).toUpperCase();
      if (!porLetra.has(letra)) porLetra.set(letra, []);
      porLetra.get(letra).push(t);
    }
    lista.innerHTML = [...porLetra]
      .map(
        ([letra, ts]) => `<section class="letra-grupo" aria-labelledby="letra-${letra}">
          <h2 class="letra" id="letra-${letra}">${letra}</h2>
          <dl class="terminos">${ts.map((t) => entrada(t, expresion)).join('')}</dl>
        </section>`,
      )
      .join('');

    if (animar) animarEntrada();
    else lista.classList.remove('entrando');

    const total = Arq.terminos.length;
    cuenta.textContent = visibles.length === total ? `${total} términos` : `${visibles.length} de ${total} términos`;
    vacio.hidden = visibles.length > 0;
    if (!visibles.length) {
      const tema = grupo !== 'todos' ? ` en ${Arq.grupos[grupo]}` : '';
      vacioTexto.textContent = `No hay términos que coincidan con «${consulta}»${tema}. Probá con otra palabra o mirá todos los términos.`;
    }
  }

  function pintarFiltros() {
    const cantidad = (g) => Arq.terminos.filter((t) => g === 'todos' || t.grupo === g).length;
    const opciones = [['todos', 'Todos'], ...Object.entries(Arq.grupos)];
    filtros.innerHTML = opciones
      .map(([id, nombre]) => `<button type="button" class="filtro" data-grupo="${id}" aria-pressed="${id === grupo}">${esc(nombre)}<span>${cantidad(id)}</span></button>`)
      .join('');
  }

  function senalarTermino() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id || !Arq.terminos.some((t) => t.id === id)) return;
    if (!document.getElementById(id)) {
      buscar.value = '';
      grupo = 'todos';
      pintarFiltros();
      pintar();
    }
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    el.classList.remove('resaltado');
    void el.offsetWidth;
    el.classList.add('resaltado');
  }

  filtros.addEventListener('click', (ev) => {
    const boton = ev.target.closest('[data-grupo]');
    if (!boton) return;
    grupo = boton.dataset.grupo;
    filtros.querySelectorAll('[data-grupo]').forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
    pintar({ animar: true });
  });

  buscar.addEventListener('input', () => pintar());
  formulario.addEventListener('submit', (ev) => ev.preventDefault());
  limpiar.addEventListener('click', () => {
    buscar.value = '';
    grupo = 'todos';
    pintarFiltros();
    pintar({ animar: true });
    buscar.focus();
  });
  window.addEventListener('hashchange', senalarTermino);

  document.getElementById('referencias').innerHTML = Arq.referencias.map((r) => `<li>${esc(r)}</li>`).join('');
  pintarFiltros();
  // Si se llega con un término en la dirección (#termino), se va directo a él sin animar la lista.
  pintar({ animar: !location.hash });
  requestAnimationFrame(senalarTermino);
})(window.Arq);
