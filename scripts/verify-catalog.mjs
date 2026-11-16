import { readFile } from 'node:fs/promises';

const base = (process.env.CATALOG_API_URL || 'http://localhost:1337/api').replace(/\/$/, '');
const seeded = JSON.parse(await readFile('.tmp/catalog-seed.json', 'utf8'));
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  passed += 1;
  console.log(`OK ${passed}. ${message}`);
}

async function get(path) {
  const response = await fetch(`${base}${path}`);
  const body = await response.json();
  return { response, body };
}

const listResult = await get('/productos?pagination[page]=1&pagination[pageSize]=100');
assert(listResult.response.ok, 'listado público responde 200');
const products = listResult.body.data;
assert(products.some(({ codigoInterno }) => codigoInterno === 'DEMO-MICRO-001'), 'producto publicado y activo aparece en listado');
assert(!products.some(({ codigoInterno }) => ['DEMO-BORRADOR-003', 'DEMO-INACTIVO-004'].includes(codigoInterno)), 'borrador e inactivo quedan fuera del listado');

const hidden = products.find(({ codigoInterno }) => codigoInterno === 'DEMO-LIC-002');
assert(hidden && !Object.hasOwn(hidden, 'precio'), 'precio oculto se omite del listado');
const visible = products.find(({ codigoInterno }) => codigoInterno === 'DEMO-MICRO-001');
const visibleDetail = await get(`/productos/${visible.documentId}`);
assert(visibleDetail.response.ok && visibleDetail.body.data.codigoInterno === 'DEMO-MICRO-001', 'producto publicado y activo aparece en detalle');
const hiddenDetail = await get(`/productos/${hidden.documentId}?fields[0]=precio`);
assert(hiddenDetail.response.ok && !Object.hasOwn(hiddenDetail.body.data, 'precio'), 'precio oculto se omite de ficha directa aunque se pidan campos');

const draftDetail = await get(`/productos/${seeded.productos.borrador}?status=draft`);
assert(draftDetail.response.status === 404, 'ficha de borrador no es pública aunque se solicite status=draft');
const inactiveDetail = await get(`/productos/${seeded.productos.inactivo}`);
assert(inactiveDetail.response.status === 404, 'ficha de producto inactivo responde 404');

const query = new URLSearchParams({
  'filters[$or][0][nombre][$containsi]': 'demo',
  'filters[$or][1][codigoInterno][$containsi]': 'demo',
  'filters[categoria][documentId][$eq]': seeded.categoria,
  'filters[marca][documentId][$eq]': seeded.marca,
  'sort': 'nombre:asc',
  'pagination[page]': '1',
  'pagination[pageSize]': '12',
});
const combined = await get(`/productos?${query}`);
assert(combined.response.ok && combined.body.data.some(({ codigoInterno }) => codigoInterno === 'DEMO-MICRO-001'), 'búsqueda, categoría y marca combinadas encuentran el producto');
assert(combined.body.data.every((product) => product.activo === true), 'consulta combinada respeta activo=true');
const combinedHidden = combined.body.data.find(({ codigoInterno }) => codigoInterno === 'DEMO-LIC-002');
assert(combinedHidden && !Object.hasOwn(combinedHidden, 'precio'), 'resultado combinado también omite el precio oculto');

const emptyQuery = new URLSearchParams({ 'filters[codigoInterno][$eq]': 'NO-EXISTE-000' });
const empty = await get(`/productos?${emptyQuery}`);
assert(empty.response.ok && empty.body.data.length === 0, 'filtro sin coincidencias devuelve lista vacía');

const featuredQuery = new URLSearchParams({
  'filters[destacado][$eq]': 'true',
  'sort': 'nombre:asc',
  'pagination[page]': '1',
  'pagination[pageSize]': '12',
});
const featured = await get(`/productos?${featuredQuery}`);
assert(featured.response.ok && featured.body.data.some(({ codigoInterno }) => codigoInterno === 'DEMO-MICRO-001'), 'consulta de destacados encuentra el producto de portada');
assert(featured.body.data.every((product) => product.activo === true && product.destacado === true), 'destacados respeta activo y destacado');
const featuredHidden = featured.body.data.find(({ codigoInterno }) => codigoInterno === 'DEMO-LIC-002');
assert(featuredHidden && !Object.hasOwn(featuredHidden, 'precio'), 'destacados también omite el precio oculto');

const ordered = await get('/productos?sort=nombre:asc&pagination[page]=1&pagination[pageSize]=1');
assert(ordered.response.ok && ordered.body.data.length <= 1 && ordered.body.meta.pagination.pageSize === 1, 'orden y paginación se aplican');

console.log(`\n${passed} comprobaciones aprobadas.`);
