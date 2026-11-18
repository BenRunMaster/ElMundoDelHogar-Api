import { factories } from '@strapi/strapi';
import {
  combineFilters,
  getStrapi,
  listDocuments,
  makeSearchFilters,
  parseQueryBoolean,
  parseStatus,
  validateName,
} from '../../../utils/catalog-admin';

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
    if (!response || response.data?.activo !== true) return ctx.notFound('Producto no encontrado');
    hideDisabledPrices(response.data);
    return response;
  },

  async adminFind(ctx: any) {
    try {
      const filters = makeSearchFilters(ctx.query.q, ['nombre', 'codigoInterno']);
      for (const [key, field] of [['categoria', 'categoria'], ['marca', 'marca']] as const) {
        const value = ctx.query[key];
        if (value !== undefined) {
          if (typeof value !== 'string' || !value.trim()) return ctx.badRequest(`${key} debe ser un documentId válido.`);
          filters.push({ [field]: { documentId: { $eq: value } } });
        }
      }
      for (const field of ['activo', 'destacado'] as const) {
        const value = parseQueryBoolean(ctx.query[field], field);
        if (value !== undefined) filters.push({ [field]: { $eq: value } });
      }
      const response = await listDocuments(
        UID,
        combineFilters(filters),
        ctx.query,
        ['categoria', 'marca', 'imagenPrincipal', 'galeria', 'caracteristicas'],
      );
      ctx.body = response;
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminFindOne(ctx: any) {
    try {
      const document = await (getStrapi() as any).documents(UID).findOne({
        documentId: ctx.params.documentId,
        status: parseStatus(ctx.query),
        populate: ['categoria', 'marca', 'imagenPrincipal', 'galeria', 'caracteristicas'],
      });
      if (!document) return ctx.notFound('Producto no encontrado.');
      ctx.body = { data: document };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminCreate(ctx: any) {
    const input = (ctx.request.body ?? {}) as Record<string, unknown>;
    const data = (input.data && typeof input.data === 'object' ? input.data : input) as Record<string, unknown>;
    try {
      validateName(data);
      if (typeof data.codigoInterno !== 'string' || data.codigoInterno.trim().length < 2) {
        return ctx.badRequest('codigoInterno es obligatorio y debe tener al menos 2 caracteres.');
      }
      data.codigoInterno = data.codigoInterno.trim();
      const duplicate = await getStrapi().db.query(UID).findOne({ where: { codigoInterno: data.codigoInterno }, select: ['id'] });
      if (duplicate) return ctx.conflict('Ya existe un producto con ese código interno.');
      const document = await (getStrapi() as any).documents(UID).create({ data, status: 'draft' });
      ctx.created({ data: document });
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminUpdate(ctx: any) {
    const input = (ctx.request.body ?? {}) as Record<string, unknown>;
    const data = (input.data && typeof input.data === 'object' ? input.data : input) as Record<string, unknown>;
    try {
      if (data.nombre !== undefined) validateName(data);
      if (data.codigoInterno !== undefined) {
        if (typeof data.codigoInterno !== 'string' || data.codigoInterno.trim().length < 2) {
          return ctx.badRequest('codigoInterno debe tener al menos 2 caracteres.');
        }
        data.codigoInterno = data.codigoInterno.trim();
        const duplicate = await getStrapi().db.query(UID).findOne({
          where: { codigoInterno: data.codigoInterno, documentId: { $ne: ctx.params.documentId } },
          select: ['id'],
        });
        if (duplicate) return ctx.conflict('Ya existe un producto con ese código interno.');
      }
      const document = await (getStrapi() as any).documents(UID).update({
        documentId: ctx.params.documentId,
        data,
        status: 'draft',
      });
      if (!document) return ctx.notFound('Producto no encontrado.');
      ctx.body = { data: document };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminDelete(ctx: any) {
    const document = await (getStrapi() as any).documents(UID).findOne({ documentId: ctx.params.documentId, status: 'draft' });
    if (!document) return ctx.notFound('Producto no encontrado.');
    const deleted = await (getStrapi() as any).documents(UID).delete({ documentId: ctx.params.documentId });
    ctx.body = { data: deleted };
  },

  async adminPublish(ctx: any) {
    const document = await (getStrapi() as any).documents(UID).publish({ documentId: ctx.params.documentId });
    if (!document) return ctx.notFound('Producto no encontrado.');
    ctx.body = { data: document };
  },

  async adminUnpublish(ctx: any) {
    const document = await (getStrapi() as any).documents(UID).unpublish({ documentId: ctx.params.documentId });
    if (!document) return ctx.notFound('Producto no encontrado.');
    ctx.body = { data: document };
  },
}));
