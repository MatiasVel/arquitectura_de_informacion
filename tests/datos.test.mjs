// Pruebas de los datos del sitio: que cada etapa tenga su contenido, que el diagrama
// ubique todo sin superposiciones, que el glosario enlace bien y que las capturas existan.
// Uso: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const publico = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const contexto = { window: {} };
vm.createContext(contexto);
for (const archivo of ['js/datos/etapas.js', 'js/datos/terminos.js', 'js/datos/disposicion.js']) {
  vm.runInContext(readFileSync(join(publico, archivo), 'utf8'), contexto, { filename: archivo });
}
const Arq = contexto.window.Arq;
const idsEtapas = new Set(Arq.etapas.map((e) => e.id));
const idsTerminos = new Set(Arq.terminos.map((t) => t.id));
const idsConexiones = new Set(Arq.conexiones.map((c) => c.id));

test('cada etapa tiene un id único y todo su contenido', () => {
  assert.equal(idsEtapas.size, Arq.etapas.length, 'hay ids de etapa repetidos');
  for (const e of Arq.etapas) {
    for (const campo of ['titulo', 'resumen', 'quien', 'herramienta', 'frecuencia', 'control']) {
      assert.ok(typeof e[campo] === 'string' && e[campo].trim(), `a "${e.id}" le falta "${campo}"`);
    }
    assert.ok(Array.isArray(e.texto) && e.texto.length > 0, `a "${e.id}" le falta el texto`);
    assert.ok(Arq.zonas[e.zona], `"${e.id}" tiene una zona desconocida: ${e.zona}`);
    assert.ok(e.captura && e.captura.esperada, `a "${e.id}" le falta la descripción de la captura esperada`);
    assert.ok(Array.isArray(e.captura.archivos), `"${e.id}": captura.archivos tiene que ser una lista`);
    if (e.padre) assert.ok(idsEtapas.has(e.padre), `"${e.id}" tiene un padre que no existe`);
  }
});

test('el recorrido pasa por cada etapa una sola vez', () => {
  assert.equal(new Set(Arq.recorrido).size, Arq.recorrido.length, 'el recorrido repite etapas');
  assert.equal(Arq.recorrido.length, Arq.etapas.length, 'el recorrido no incluye todas las etapas');
  for (const id of Arq.recorrido) assert.ok(idsEtapas.has(id), `el recorrido nombra una etapa que no existe: ${id}`);
});

test('las conexiones unen etapas que existen', () => {
  assert.equal(idsConexiones.size, Arq.conexiones.length, 'hay ids de conexión repetidos');
  for (const c of Arq.conexiones) {
    assert.ok(idsEtapas.has(c.de), `la conexión "${c.id}" sale de una etapa que no existe`);
    assert.ok(idsEtapas.has(c.a), `la conexión "${c.id}" llega a una etapa que no existe`);
    assert.ok(['dato', 'control'].includes(c.tipo), `la conexión "${c.id}" tiene un tipo desconocido`);
  }
});

test('cada disposición ubica todas las etapas y dibuja todas las conexiones', () => {
  for (const [nombre, d] of Object.entries(Arq.disposiciones)) {
    const [W, H] = d.vista;
    for (const id of idsEtapas) {
      const n = d.nodos[id];
      assert.ok(n, `la disposición "${nombre}" no ubica "${id}"`);
      assert.ok(n.x >= 0 && n.y >= 0 && n.x + n.w <= W && n.y + n.h <= H, `"${id}" se sale del dibujo en "${nombre}"`);
    }
    for (const id of idsConexiones) {
      const c = d.conexiones[id];
      assert.ok(c && c.puntos.length >= 2, `la disposición "${nombre}" no dibuja la conexión "${id}"`);
      for (let i = 1; i < c.puntos.length; i++) {
        const [x0, y0] = c.puntos[i - 1];
        const [x1, y1] = c.puntos[i];
        assert.ok(x0 === x1 || y0 === y1, `"${id}" en "${nombre}" tiene un tramo diagonal`);
      }
    }
  }
});

test('ninguna caja se superpone con otra y cada capa queda dentro del Data Warehouse', () => {
  for (const [nombre, d] of Object.entries(Arq.disposiciones)) {
    const cajas = Object.entries(d.nodos);
    for (const [id, n] of cajas) {
      const padre = Arq.etapas.find((e) => e.id === id).padre;
      if (padre) {
        const p = d.nodos[padre];
        assert.ok(n.x >= p.x && n.y >= p.y && n.x + n.w <= p.x + p.w && n.y + n.h <= p.y + p.h, `"${id}" queda fuera de "${padre}" en "${nombre}"`);
      }
    }
    const simples = cajas.filter(([, n]) => !n.contenedor);
    for (let i = 0; i < simples.length; i++) {
      for (let j = i + 1; j < simples.length; j++) {
        const [a, na] = simples[i];
        const [b, nb] = simples[j];
        const separadas = na.x + na.w <= nb.x || nb.x + nb.w <= na.x || na.y + na.h <= nb.y || nb.y + nb.h <= na.y;
        assert.ok(separadas, `"${a}" y "${b}" se superponen en "${nombre}"`);
      }
    }
  }
});

test('las animaciones usan conexiones que existen', () => {
  for (const paso of Arq.reproduccion) {
    assert.ok(paso.texto, 'un paso de la reproducción no tiene texto');
    for (const id of paso.conexiones) assert.ok(idsConexiones.has(id), `la reproducción usa una conexión que no existe: ${id}`);
  }
  for (const [etapa, lista] of Object.entries(Arq.llegadas)) {
    assert.ok(idsEtapas.has(etapa), `"llegadas" nombra una etapa que no existe: ${etapa}`);
    for (const id of lista) assert.ok(idsConexiones.has(id), `"llegadas" usa una conexión que no existe: ${id}`);
  }
});

test('el glosario tiene términos únicos que enlazan con etapas que existen', () => {
  assert.equal(idsTerminos.size, Arq.terminos.length, 'hay ids de término repetidos');
  for (const t of Arq.terminos) {
    assert.ok(t.termino && t.definicion, `al término "${t.id}" le falta el nombre o la definición`);
    assert.ok(Arq.grupos[t.grupo], `el término "${t.id}" tiene un tema desconocido: ${t.grupo}`);
    assert.ok(t.etapas.length > 0, `el término "${t.id}" no enlaza con ninguna etapa`);
    for (const id of t.etapas) assert.ok(idsEtapas.has(id), `el término "${t.id}" enlaza con una etapa que no existe: ${id}`);
    assert.equal((t.definicion.match(/`/g) || []).length % 2, 0, `el término "${t.id}" tiene un acento grave sin cerrar`);
  }
});

test('cada etapa enlaza con términos que existen en el glosario', () => {
  for (const e of Arq.etapas) {
    for (const id of e.terminos) assert.ok(idsTerminos.has(id), `"${e.id}" enlaza con un término que no existe: ${id}`);
  }
});

test('las capturas nombradas existen en public/', () => {
  for (const e of Arq.etapas) {
    for (const a of e.captura.archivos) {
      assert.ok(a.archivo, `"${e.id}" tiene una captura sin "archivo"`);
      assert.ok(!/^([a-z]+:)?\/\//i.test(a.archivo), `"${e.id}": la captura tiene que estar dentro del sitio, no en otra dirección`);
      assert.ok(existsSync(join(publico, a.archivo)), `no existe el archivo de captura de "${e.id}": public/${a.archivo}`);
    }
  }
});
