import { getStrapi, hideDisabledPrices } from '../../../utils/catalog-admin';

function parseLimit(value: unknown, name: string, fallback: number): number {
  if (value === undefined) return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error(`${name} debe ser un entero entre 1 y 20.`);
  }
  return limit;
}

function todayInElSalvador() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date());
}

export default {
  async find(ctx: any) {
    let limits: Record<string, number>;
    try {
      limits = {
        banners: parseLimit(ctx.query.limiteBanners, 'limiteBanners', 5),
        categorias: parseLimit(ctx.query.limiteCategorias, 'limiteCategorias', 6),
        productos: parseLimit(ctx.query.limiteProductos, 'limiteProductos', 8),
        marcas: parseLimit(ctx.query.limiteMarcas, 'limiteMarcas', 6),
        promociones: parseLimit(ctx.query.limitePromociones, 'limitePromociones', 4),
        sucursales: parseLimit(ctx.query.limiteSucursales, 'limiteSucursales', 6),
      };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }

    const strapi = getStrapi() as any;
    const today = todayInElSalvador();
    const [banners, categorias, productos, marcas, promociones, sucursales] = await Promise.all([
      strapi.documents('api::banner.banner').findMany({
        status: 'published', filters: { activo: { $eq: true } }, sort: 'ordenVisualizacion:asc',
        start: 0, limit: limits.banners, populate: ['imagen'],
      }),
      strapi.documents('api::categoria.categoria').findMany({
        status: 'published', filters: { activo: { $eq: true } }, sort: 'nombre:asc',
        start: 0, limit: limits.categorias, populate: ['iconoImagen'],
      }),
      strapi.documents('api::producto.producto').findMany({
        status: 'published', filters: { activo: { $eq: true }, destacado: { $eq: true } },
        sort: 'updatedAt:desc', start: 0, limit: limits.productos,
        populate: ['categoria', 'marca', 'imagenPrincipal'],
      }),
      strapi.documents('api::marca.marca').findMany({
        status: 'published', filters: { activo: { $eq: true } }, sort: 'nombre:asc',
        start: 0, limit: limits.marcas, populate: ['logo'],
      }),
      strapi.documents('api::promocion.promocion').findMany({
        status: 'published',
        filters: {
          activo: { $eq: true },
          fechaInicio: { $lte: today },
          fechaFin: { $gte: today },
        },
        sort: 'fechaInicio:asc', start: 0, limit: limits.promociones, populate: ['imagen'],
      }),
      strapi.documents('api::sucursal.sucursal').findMany({
        status: 'published', filters: { activo: { $eq: true } }, sort: 'nombre:asc',
        start: 0, limit: limits.sucursales,
      }),
    ]);

    hideDisabledPrices(productos);
    ctx.body = { data: { banners, categorias, productos, marcas, promociones, sucursales } };
  },
};
