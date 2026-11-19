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

const UID = 'api::marca.marca';
const PRODUCT_UID = 'api::producto.producto';

export default factories.createCoreController(UID, () => ({
  async find(ctx) {
    ctx.query.status = 'published';
    const existing = ctx.query.filters;
    ctx.query.filters = existing
      ? { $and: [existing, { activo: { $eq: true } }] }
      : { activo: { $eq: true } };
    return super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query.status = 'published';
    const fields = Array.isArray(ctx.query.fields)
      ? [...ctx.query.fields]
      : typeof ctx.query.fields === 'string' ? [ctx.query.fields] : [];
    if (!fields.includes('activo')) fields.push('activo');
    ctx.query.fields = fields;
    const response = await super.findOne(ctx);
    if (!response || response.data?.activo !== true) return ctx.notFound('Marca no encontrada.');
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
        ['logo'],
        ['nombre', 'activo', 'createdAt', 'updatedAt'],
      );
      const data = await Promise.all(response.data.map(async (brand: any) => ({
        ...brand,
        cantidadProductos: await (getStrapi() as any).documents(PRODUCT_UID).count({
          filters: { marca: { documentId: { $eq: brand.documentId } } },
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
        populate: ['logo'],
      });
      if (!data) return ctx.notFound('Marca no encontrada.');
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
      if (!document) return ctx.notFound('Marca no encontrada.');
      ctx.body = { data: document };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminDelete(ctx: any) {
    const strapi = getStrapi() as any;
    const brand = await strapi.documents(UID).findOne({ documentId: ctx.params.documentId, status: 'draft' });
    if (!brand) return ctx.notFound('Marca no encontrada.');
    const productCount = await strapi.documents(PRODUCT_UID).count({
      filters: { marca: { documentId: { $eq: ctx.params.documentId } } },
    });
    if (productCount > 0) return ctx.conflict('No se puede eliminar una marca que tiene productos; desactívala en su lugar.');
    ctx.body = { data: await strapi.documents(UID).delete({ documentId: ctx.params.documentId }) };
  },

  async adminPublish(ctx: any) {
    const data = await (getStrapi() as any).documents(UID).publish({ documentId: ctx.params.documentId });
    if (!data) return ctx.notFound('Marca no encontrada.');
    ctx.body = { data };
  },

  async adminUnpublish(ctx: any) {
    const data = await (getStrapi() as any).documents(UID).unpublish({ documentId: ctx.params.documentId });
    if (!data) return ctx.notFound('Marca no encontrada.');
    ctx.body = { data };
  },

  async adminUploadMedia(ctx: any) {
    return uploadCatalogImages(ctx, 1);
  },
}));
