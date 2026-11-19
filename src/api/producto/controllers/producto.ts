import { factories } from '@strapi/strapi';
import {
  combineFilters,
  getStrapi,
  hideDisabledPrices,
  listDocuments,
  makeSearchFilters,
  parseQueryBoolean,
  parseStatus,
  uploadCatalogImages,
  validateName,
} from '../../../utils/catalog-admin';

const UID = 'api::producto.producto';

function ensureFields(ctx: any, requiredFields: string[]) {
  const requested = ctx.query.fields;
  if (requested === undefined) return undefined;
  const fields = Array.isArray(requested) ? requested : [requested];
  ctx.query.fields = [...new Set([...fields, ...requiredFields])];
  return new Set(fields);
}

function removeInternalFields(data: any, requested: Set<string> | undefined, internalFields: string[]) {
  if (!requested || !data || typeof data !== 'object') return;
  for (const field of internalFields) {
    if (!requested.has(field)) delete data[field];
  }
}

function requestedRelationFields(populate: any): string[] {
  if (populate === '*') return ['categoria', 'marca'];
  if (typeof populate === 'string') return ['categoria', 'marca'].filter((field) => populate === field);
  if (Array.isArray(populate)) return ['categoria', 'marca'].filter((field) => populate.includes(field));
  if (populate && typeof populate === 'object') {
    return ['categoria', 'marca'].filter((field) => Boolean(populate[field]));
  }
  return [];
}

async function hydratePublicRelations(data: any[], populate: any) {
  const fields = requestedRelationFields(populate);
  if (!fields.length) return;
  const documents = (getStrapi() as any).documents(UID);
  await Promise.all(data.map(async (product) => {
    if (!product.documentId) return;
    const full = await documents.findOne({ documentId: product.documentId, status: 'published', populate: fields });
    for (const field of fields) product[field] = full?.[field] ?? null;
  }));
}

export default factories.createCoreController(UID, () => ({
  async find(ctx) {
    ctx.query.status = 'published';
    const requestedFields = ensureFields(ctx, ['mostrarPrecio']);
    const existing = ctx.query.filters as Record<string, any> | undefined;
    const relationFilters: Record<string, string> = {};
    for (const relation of ['categoria', 'marca']) {
      const condition = existing?.[relation]?.documentId?.$eq;
      if (condition !== undefined) {
        if (typeof condition !== 'string' || !condition.trim()) {
          return ctx.badRequest(`${relation} debe ser un documentId válido.`);
        }
        relationFilters[relation] = condition;
        delete existing?.[relation];
      }
    }
    ctx.query.filters = existing
      ? { $and: [existing, { activo: { $eq: true } }] }
      : { activo: { $eq: true } };

    const relations = Object.keys(relationFilters);
    if (!relations.length) {
      const response = await super.find(ctx);
      await hydratePublicRelations(response.data ?? [], ctx.query.populate);
      hideDisabledPrices(response.data);
      for (const item of response.data ?? []) removeInternalFields(item, requestedFields, ['mostrarPrecio']);
      return response;
    }

    // Strapi's REST filter validator rejects deep relation filters on this API
    // schema. Keep the supported scalar filters/pagination in the core query,
    // then apply relation documentIds through the database query engine.
    const requestedPopulate: any = ctx.query.populate;
    const requestedPagination = ctx.query.pagination as Record<string, unknown> | undefined;
    const page = Number(requestedPagination?.page ?? 1);
    const pageSize = Number(requestedPagination?.pageSize ?? 25);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return ctx.badRequest('La paginación debe usar page positivo y pageSize entre 1 y 100.');
    }
    const candidates: any[] = [];
    let pageCount = 1;
    for (let fetchPage = 1; fetchPage <= pageCount; fetchPage += 1) {
      ctx.query.pagination = { page: fetchPage, pageSize: 100 };
      const result = await super.find(ctx);
      pageCount = result.meta?.pagination?.pageCount ?? 1;
      candidates.push(...(result.data ?? []));
    }

    const relatedMatches = await (getStrapi() as any).db.query(UID).findMany({
      where: {
        documentId: { $in: candidates.map((product) => product.documentId) },
        ...Object.fromEntries(relations.map((relation) => [relation, { documentId: relationFilters[relation] }])),
      },
      select: ['documentId'],
    });
    const matchingIds = new Set(relatedMatches.map((item: any) => item.documentId));
    const matches = candidates.filter((product) => matchingIds.has(product.documentId));

    const start = (page - 1) * pageSize;
    const data = matches.slice(start, start + pageSize);
    await hydratePublicRelations(data, requestedPopulate);
    hideDisabledPrices(data);
    for (const item of data) removeInternalFields(item, requestedFields, ['mostrarPrecio']);
    ctx.query.pagination = requestedPagination;
    return {
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(matches.length / pageSize),
          total: matches.length,
        },
      },
    };
  },

  async findOne(ctx) {
    ctx.query.status = 'published';
    const requestedFields = ensureFields(ctx, ['mostrarPrecio', 'activo']);
    const response = await super.findOne(ctx);
    if (!response || response.data?.activo !== true) return ctx.notFound('Producto no encontrado');
    await hydratePublicRelations([response.data], ctx.query.populate);
    hideDisabledPrices(response.data);
    removeInternalFields(response.data, requestedFields, ['mostrarPrecio', 'activo']);
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

  async adminUploadMedia(ctx: any) {
    return uploadCatalogImages(ctx, 5);
  },
}));
