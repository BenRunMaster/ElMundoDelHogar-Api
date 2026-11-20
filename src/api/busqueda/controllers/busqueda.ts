import { getStrapi, hideDisabledPrices } from '../../../utils/catalog-admin';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function parseLimit(value: unknown): number {
  if (value === undefined) return DEFAULT_LIMIT;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`limite debe ser un entero entre 1 y ${MAX_LIMIT}.`);
  }
  return limit;
}

function searchFilter(fields: string[], q: string) {
  return {
    activo: { $eq: true },
    $or: fields.map((field) => ({ [field]: { $containsi: q } })),
  };
}

export default {
  async find(ctx: any) {
    const q = typeof ctx.query.q === 'string' ? ctx.query.q.trim() : '';
    if (q.length < 2) return ctx.badRequest('q debe tener al menos 2 caracteres.');
    if (q.length > 100) return ctx.badRequest('q no puede superar 100 caracteres.');

    let limit: number;
    try {
      limit = parseLimit(ctx.query.limite);
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }

    const strapi = getStrapi() as any;
    const [productos, categorias, marcas] = await Promise.all([
      strapi.documents('api::producto.producto').findMany({
        status: 'published',
        filters: searchFilter(['nombre', 'codigoInterno'], q),
        sort: 'nombre:asc', start: 0, limit,
        populate: ['categoria', 'marca', 'imagenPrincipal'],
      }),
      strapi.documents('api::categoria.categoria').findMany({
        status: 'published', filters: searchFilter(['nombre'], q),
        sort: 'nombre:asc', start: 0, limit,
        populate: ['iconoImagen'],
      }),
      strapi.documents('api::marca.marca').findMany({
        status: 'published', filters: searchFilter(['nombre'], q),
        sort: 'nombre:asc', start: 0, limit,
        populate: ['logo'],
      }),
    ]);

    hideDisabledPrices(productos);
    ctx.body = {
      data: { productos, categorias, marcas },
      meta: { q, limite: limit },
    };
  },
};
