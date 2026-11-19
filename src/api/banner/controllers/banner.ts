import { factories } from '@strapi/strapi';
import {
  combineFilters,
  getStrapi,
  listDocuments,
  makeSearchFilters,
  parseQueryBoolean,
  parseStatus,
  uploadCatalogImages,
} from '../../../utils/catalog-admin';
import { unwrapData, validateBanner } from '../../../utils/business-content';

const UID = 'api::banner.banner';

function populateImage(ctx: any) {
  const requested = ctx.query.populate;
  if (requested === '*') return;
  if (typeof requested === 'string') {
    ctx.query.populate = [requested, 'imagen'];
  } else {
    ctx.query.populate = {
      ...(requested && typeof requested === 'object' && !Array.isArray(requested) ? requested : {}),
      imagen: true,
    };
  }
}

async function findExisting(documentId: string) {
  const documents = (getStrapi() as any).documents(UID);
  return await documents.findOne({ documentId, status: 'draft' })
    ?? await documents.findOne({ documentId, status: 'published' });
}

export default factories.createCoreController(UID, () => ({
  async find(ctx) {
    const filters: Record<string, unknown>[] = ctx.query.filters
      ? [ctx.query.filters as Record<string, unknown>]
      : [];
    filters.push({ activo: { $eq: true } });
    ctx.query.status = 'published';
    ctx.query.filters = combineFilters(filters);
    populateImage(ctx);
    ctx.query.sort = 'ordenVisualizacion:asc';
    return super.find(ctx);
  },

  async adminFind(ctx: any) {
    try {
      const filters = makeSearchFilters(ctx.query.q, ['titulo']);
      const activo = parseQueryBoolean(ctx.query.activo, 'activo');
      if (activo !== undefined) filters.push({ activo: { $eq: activo } });
      ctx.body = await listDocuments(
        UID,
        combineFilters(filters),
        ctx.query,
        ['imagen'],
        ['ordenVisualizacion', 'titulo', 'activo', 'createdAt', 'updatedAt'],
      );
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminFindOne(ctx: any) {
    try {
      const data = await (getStrapi() as any).documents(UID).findOne({
        documentId: ctx.params.documentId,
        status: parseStatus(ctx.query),
        populate: ['imagen'],
      });
      if (!data) return ctx.notFound('Banner no encontrado.');
      ctx.body = { data };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminCreate(ctx: any) {
    const data = unwrapData(ctx);
    try {
      validateBanner(data);
      const document = await (getStrapi() as any).documents(UID).create({ data, status: 'draft' });
      ctx.created({ data: document });
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminUpdate(ctx: any) {
    const data = unwrapData(ctx);
    try {
      const current = await findExisting(ctx.params.documentId);
      if (!current) return ctx.notFound('Banner no encontrado.');
      validateBanner({ ...current, ...data });
      const document = await (getStrapi() as any).documents(UID).update({
        documentId: ctx.params.documentId,
        data,
        status: 'draft',
      });
      ctx.body = { data: document };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminDelete(ctx: any) {
    const current = await findExisting(ctx.params.documentId);
    if (!current) return ctx.notFound('Banner no encontrado.');
    ctx.body = { data: await (getStrapi() as any).documents(UID).delete({ documentId: ctx.params.documentId }) };
  },

  async adminPublish(ctx: any) {
    const data = await (getStrapi() as any).documents(UID).publish({ documentId: ctx.params.documentId });
    if (!data) return ctx.notFound('Banner no encontrado.');
    ctx.body = { data };
  },

  async adminUnpublish(ctx: any) {
    const data = await (getStrapi() as any).documents(UID).unpublish({ documentId: ctx.params.documentId });
    if (!data) return ctx.notFound('Banner no encontrado.');
    ctx.body = { data };
  },

  async adminUploadMedia(ctx: any) {
    return uploadCatalogImages(ctx, 1);
  },
}));
