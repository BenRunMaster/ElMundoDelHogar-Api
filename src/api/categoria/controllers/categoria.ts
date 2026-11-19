import { factories } from '@strapi/strapi';
import {
  combineFilters,
  getStrapi,
  listDocuments,
  makeSearchFilters,
  parseQueryBoolean,
  parseStatus,
  uploadCatalogImages,
  validateName,
} from '../../../utils/catalog-admin';

const UID = 'api::categoria.categoria';
const PRODUCT_UID = 'api::producto.producto';

function populateCategoryImage(ctx: any) {
  const requested = ctx.query.populate;
  if (requested === '*') return;
  if (typeof requested === 'string') {
    ctx.query.populate = [requested, 'iconoImagen'];
    return;
  }
  ctx.query.populate = {
    ...(requested && typeof requested === 'object' && !Array.isArray(requested) ? requested : {}),
    iconoImagen: true,
  };
}

export default factories.createCoreController(UID, () => ({
  async find(ctx) {
    ctx.query.status = 'published';
    populateCategoryImage(ctx);
    const existing = ctx.query.filters;
    ctx.query.filters = existing
      ? { $and: [existing, { activo: { $eq: true } }] }
      : { activo: { $eq: true } };
    return super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query.status = 'published';
    populateCategoryImage(ctx);
    const fields = Array.isArray(ctx.query.fields)
      ? [...ctx.query.fields]
      : typeof ctx.query.fields === 'string' ? [ctx.query.fields] : [];
    if (!fields.includes('activo')) fields.push('activo');
    ctx.query.fields = fields;
    const response = await super.findOne(ctx);
    if (!response || response.data?.activo !== true) return ctx.notFound('Categoría no encontrada.');
    return response;
  },

  async adminFind(ctx: any) {
    try {
      const filters = makeSearchFilters(ctx.query.q, ['nombre']);
      const activo = parseQueryBoolean(ctx.query.activo, 'activo');
      if (activo !== undefined) filters.push({ activo: { $eq: activo } });
      const response = await listDocuments(
        UID,
        combineFilters(filters),
        ctx.query,
        ['iconoImagen'],
        ['nombre', 'activo', 'createdAt', 'updatedAt'],
      );
      const data = await Promise.all(response.data.map(async (category: any) => ({
        ...category,
        cantidadProductos: await (getStrapi() as any).documents(PRODUCT_UID).count({
          filters: { categoria: { documentId: { $eq: category.documentId } } },
        }),
      })));
      ctx.body = { ...response, data };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminFindOne(ctx: any) {
    try {
      const data = await (getStrapi() as any).documents(UID).findOne({
        documentId: ctx.params.documentId,
        status: parseStatus(ctx.query),
        populate: ['iconoImagen'],
      });
      if (!data) return ctx.notFound('Categoría no encontrada.');
      ctx.body = { data };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminCreate(ctx: any) {
    const input = (ctx.request.body ?? {}) as Record<string, unknown>;
    const data = (input.data && typeof input.data === 'object' ? input.data : input) as Record<string, unknown>;
    try {
      validateName(data);
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
      const document = await (getStrapi() as any).documents(UID).update({
        documentId: ctx.params.documentId,
        data,
        status: 'draft',
      });
      if (!document) return ctx.notFound('Categoría no encontrada.');
      ctx.body = { data: document };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminDelete(ctx: any) {
    const strapi = getStrapi() as any;
    const category = await strapi.documents(UID).findOne({ documentId: ctx.params.documentId, status: 'draft' });
    if (!category) return ctx.notFound('Categoría no encontrada.');
    const productCount = await strapi.documents(PRODUCT_UID).count({
      filters: { categoria: { documentId: { $eq: ctx.params.documentId } } },
    });
    if (productCount > 0) return ctx.conflict('No se puede eliminar una categoría que tiene productos; desactívala en su lugar.');
    ctx.body = { data: await strapi.documents(UID).delete({ documentId: ctx.params.documentId }) };
  },

  async adminPublish(ctx: any) {
    const data = await (getStrapi() as any).documents(UID).publish({ documentId: ctx.params.documentId });
    if (!data) return ctx.notFound('Categoría no encontrada.');
    ctx.body = { data };
  },

  async adminUnpublish(ctx: any) {
    const data = await (getStrapi() as any).documents(UID).unpublish({ documentId: ctx.params.documentId });
    if (!data) return ctx.notFound('Categoría no encontrada.');
    ctx.body = { data };
  },

  async adminUploadMedia(ctx: any) {
    return uploadCatalogImages(ctx, 1);
  },
}));
