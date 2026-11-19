import { factories } from '@strapi/strapi';
import {
  combineFilters,
  getStrapi,
  listDocuments,
  makeSearchFilters,
  parseQueryBoolean,
  parseStatus,
} from '../../../utils/catalog-admin';
import { unwrapData, validateBranch } from '../../../utils/business-content';

const UID = 'api::sucursal.sucursal';

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
    ctx.query.sort = 'nombre:asc';
    return super.find(ctx);
  },

  async adminFind(ctx: any) {
    try {
      const filters = makeSearchFilters(ctx.query.q, ['nombre', 'ciudad', 'direccion']);
      const activo = parseQueryBoolean(ctx.query.activo, 'activo');
      if (activo !== undefined) filters.push({ activo: { $eq: activo } });
      ctx.body = await listDocuments(
        UID,
        combineFilters(filters),
        ctx.query,
        [],
        ['nombre', 'ciudad', 'activo', 'createdAt', 'updatedAt'],
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
      });
      if (!data) return ctx.notFound('Sucursal no encontrada.');
      ctx.body = { data };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },

  async adminCreate(ctx: any) {
    const data = unwrapData(ctx);
    try {
      validateBranch(data);
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
      if (!current) return ctx.notFound('Sucursal no encontrada.');
      validateBranch({ ...current, ...data });
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
    if (!current) return ctx.notFound('Sucursal no encontrada.');
    ctx.body = { data: await (getStrapi() as any).documents(UID).delete({ documentId: ctx.params.documentId }) };
  },

  async adminPublish(ctx: any) {
    const data = await (getStrapi() as any).documents(UID).publish({ documentId: ctx.params.documentId });
    if (!data) return ctx.notFound('Sucursal no encontrada.');
    ctx.body = { data };
  },

  async adminUnpublish(ctx: any) {
    const data = await (getStrapi() as any).documents(UID).unpublish({ documentId: ctx.params.documentId });
    if (!data) return ctx.notFound('Sucursal no encontrada.');
    ctx.body = { data };
  },
}));
