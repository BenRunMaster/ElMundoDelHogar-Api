import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

// Load Strapi through its CommonJS entry point. Its ESM dependency graph imports
// lodash/fp as a directory, which Node 24 rejects when running this standalone script.
const require = createRequire(import.meta.url);
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const appContext = await compileStrapi();
const strapi = await createStrapi(appContext).load();

const upsert = async (uid, key, value, status = 'published') => {
  const [existing] = await strapi.documents(uid).findMany({
    filters: { [key]: value[key] },
    status: 'draft',
    limit: 1,
  });
  const data = { ...value };
  return existing
    ? strapi.documents(uid).update({ documentId: existing.documentId, data, status })
    : strapi.documents(uid).create({ data, status });
};

try {
  const categoria = await upsert('api::categoria.categoria', 'nombre', {
    nombre: 'Electrodomésticos', descripcion: 'Ejemplos para pruebas locales', activo: true,
  });
  const marca = await upsert('api::marca.marca', 'nombre', {
    nombre: 'Marca de ejemplo', descripcion: 'Marca ficticia para pruebas locales', activo: true,
  });

  const base = {
    categoria: { connect: [categoria.documentId] },
    marca: { connect: [marca.documentId] },
    disponibilidad: 'Disponible',
    caracteristicas: [{ nombre: 'Capacidad', valor: '20 litros' }, { nombre: 'Color', valor: 'Blanco' }],
  };

  const visibles = await upsert('api::producto.producto', 'codigoInterno', {
    ...base,
    nombre: 'Microondas de ejemplo', codigoInterno: 'DEMO-MICRO-001',
    descripcion: [{ type: 'paragraph', children: [{ type: 'text', text: 'Producto publicado y activo para probar el catálogo.' }] }],
    precio: 89.99, mostrarPrecio: true, activo: true, destacado: true,
  });
  const precioOculto = await upsert('api::producto.producto', 'codigoInterno', {
    ...base,
    nombre: 'Licuadora de ejemplo', codigoInterno: 'DEMO-LIC-002',
    precio: 42.5, mostrarPrecio: false, activo: true, destacado: true,
    disponibilidad: 'Consultar en tienda',
  });
  const borrador = await upsert('api::producto.producto', 'codigoInterno', {
    ...base, nombre: 'Borrador de prueba', codigoInterno: 'DEMO-BORRADOR-003',
    precio: 1, mostrarPrecio: true, activo: true,
  }, 'draft');
  const inactivo = await upsert('api::producto.producto', 'codigoInterno', {
    ...base, nombre: 'Inactivo de prueba', codigoInterno: 'DEMO-INACTIVO-004',
    precio: 1, mostrarPrecio: true, activo: false,
  });

  const ids = {
    categoria: categoria.documentId,
    marca: marca.documentId,
    productos: {
      publicadoActivo: visibles.documentId,
      precioOculto: precioOculto.documentId,
      borrador: borrador.documentId,
      inactivo: inactivo.documentId,
    },
  };
  await mkdir('.tmp', { recursive: true });
  await writeFile('.tmp/catalog-seed.json', `${JSON.stringify(ids, null, 2)}\n`);
  console.log(JSON.stringify(ids, null, 2));
} finally {
  await strapi.destroy();
}
