// Utilidades compartidas por las dos páginas: escape de texto, formato e íconos.

(function (Arq) {
  'use strict';

  const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
  }

  // Convierte `texto` en <code>texto</code>; el resto se escapa.
  function formato(texto) {
    return String(texto ?? '')
      .split('`')
      .map((parte, i) => (i % 2 ? `<code>${esc(parte)}</code>` : esc(parte)))
      .join('');
  }

  const consultaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

  function movimientoReducido() {
    return consultaMovimiento.matches;
  }

  function esperar(ms) {
    return new Promise((resolver) => setTimeout(resolver, ms));
  }

  // Íconos de trazo, 24 × 24. Heredan el color del texto.
  const TRAZOS = {
    anterior: '<path d="M15 5l-7 7 7 7"/>',
    siguiente: '<path d="M9 5l7 7-7 7"/>',
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
    lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    candado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/><path d="M12 14.5v2.5"/>',
    ampliar: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    imagen: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
    etapa: '<rect x="3.5" y="8" width="7" height="8" rx="1.2"/><rect x="13.5" y="8" width="7" height="8" rx="1.2"/><path d="M10.5 12h3"/>',
    libro: '<path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10.5"/>',
  };

  function icono(nombre) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TRAZOS[nombre] || ''}</svg>`;
  }

  Arq.util = { esc, formato, movimientoReducido, esperar, icono };
})(window.Arq = window.Arq || {});
