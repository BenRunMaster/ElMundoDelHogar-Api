import { factories } from '@strapi/strapi';

const UID = 'api::producto.producto';

function hideDisabledPrices(data: any): void {
  if (!data) return;
  if (Array.isArray(data)) {
    data.forEach(hideDisabledPrices);
    return;
  }
  if (typeof data !== 'object') return;

  if (data.mostrarPrecio === false) delete data.precio;
  Object.values(data).forEach((value) => {
    if (value && typeof value === 'object') hideDisabledPrices(value);
  });
}

export default factories.createCoreController(UID, () => ({
  async find(ctx) {
    ctx.query.status = 'published';
    if (Array.isArray(ctx.query.fields) && !ctx.query.fields.includes('mostrarPrecio')) {
      ctx.query.fields = [...ctx.query.fields, 'mostrarPrecio'];
    } else if (typeof ctx.query.fields === 'string') {
      ctx.query.fields = [ctx.query.fields, 'mostrarPrecio'];
    }
    const existing = ctx.query.filters;
    ctx.query.filters = existing
      ? { $and: [existing, { activo: { $eq: true } }] }
      : { activo: { $eq: true } };

    const response = await super.find(ctx);
    hideDisabledPrices(response.data);
    return response;
  },

  async findOne(ctx) {
    ctx.query.status = 'published';
    if (Array.isArray(ctx.query.fields) && !ctx.query.fields.includes('mostrarPrecio')) {
      ctx.query.fields = [...ctx.query.fields, 'mostrarPrecio'];
    } else if (typeof ctx.query.fields === 'string') {
      ctx.query.fields = [ctx.query.fields, 'mostrarPrecio'];
    }
    const response = await super.findOne(ctx);
    if (response.data?.activo !== true) return ctx.notFound('Producto no encontrado');
    hideDisabledPrices(response.data);
    return response;
  },
}));
