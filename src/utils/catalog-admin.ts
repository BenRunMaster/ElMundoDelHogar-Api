import type { Core } from '@strapi/strapi';

export type ContentAdminContext = {
  params: Record<string, string>;
  query: Record<string, unknown>;
  request: { body?: unknown };
  body?: unknown;
  created(data: unknown): unknown;
  badRequest(message: string): unknown;
  notFound(message: string): unknown;
  conflict(message: string): unknown;
};

export function getStrapi(): Core.Strapi {
  return (globalThis as typeof globalThis & { strapi: Core.Strapi }).strapi;
}

export function parsePage(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 10);
  if (!Number.isInteger(page) || page < 1) throw new Error('page debe ser un entero positivo.');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error('pageSize debe estar entre 1 y 100.');
  }
  return { page, pageSize, start: (page - 1) * pageSize, limit: pageSize };
}

export function parseStatus(query: Record<string, unknown>): 'draft' | 'published' {
  const status = query.status ?? 'draft';
  if (status !== 'draft' && status !== 'published') {
    throw new Error('status debe ser draft o published.');
  }
  return status;
}

export function makeSearchFilters(q: unknown, fields: string[]): Record<string, unknown>[] {
  if (q === undefined || q === '') return [];
  if (typeof q !== 'string' || q.trim().length > 100) throw new Error('q debe ser texto de hasta 100 caracteres.');
  const term = q.trim();
  return [{ $or: fields.map((field) => ({ [field]: { $containsi: term } })) }];
}

export function combineFilters(filters: Record<string, unknown>[]) {
  if (!filters.length) return undefined;
  return filters.length === 1 ? filters[0] : { $and: filters };
}

export async function listDocuments(
  uid: string,
  filters: Record<string, unknown> | undefined,
  query: Record<string, unknown>,
  populate: string[],
  allowedSortFields = ['nombre', 'codigoInterno', 'precio', 'activo', 'destacado', 'createdAt', 'updatedAt'],
) {
  const { page, pageSize, start, limit } = parsePage(query);
  const status = parseStatus(query);
  const sort = typeof query.sort === 'string' ? query.sort : 'nombre:asc';
  const sortFields = allowedSortFields;
  const [field, direction = 'asc'] = sort.split(':');
  if (!sortFields.includes(field) || !['asc', 'desc'].includes(direction)) {
    throw new Error(`sort debe usar un campo permitido (${sortFields.join(', ')}).`);
  }

  const documents = (getStrapi() as any).documents(uid);
  const [data, total] = await Promise.all([
    documents.findMany({ filters, sort: `${field}:${direction}`, start, limit, status, populate }),
    documents.count({ filters, status }),
  ]);
  return {
    data,
    meta: { pagination: { page, pageSize, pageCount: Math.ceil(total / pageSize), total } },
  };
}

export function normalizeBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${field} debe ser verdadero o falso.`);
  return value;
}

export function parseQueryBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`${field} debe ser true o false.`);
}

export function validateName(data: Record<string, unknown>) {
  if (typeof data.nombre !== 'string' || data.nombre.trim().length < 2 || data.nombre.trim().length > 160) {
    throw new Error('nombre es obligatorio y debe tener entre 2 y 160 caracteres.');
  }
  data.nombre = data.nombre.trim();
}

export async function uploadCatalogImages(ctx: any, maxFiles: number) {
  const rawFiles = ctx.request.files?.files;
  const files = Array.isArray(rawFiles) ? rawFiles : rawFiles ? [rawFiles] : [];

  if (files.length === 0 || files.length > maxFiles) {
    return ctx.badRequest(`Adjuntá entre 1 y ${maxFiles} imagen(es) en el campo multipart "files".`);
  }

  for (const file of files) {
    if (typeof file.mimetype !== 'string' || !file.mimetype.startsWith('image/')) {
      return ctx.badRequest('Solo se permiten archivos de imagen.');
    }
    if (file.size > 10 * 1024 * 1024) {
      return ctx.badRequest('Cada imagen debe pesar como máximo 10 MB.');
    }
  }

  const uploadController = (getStrapi() as any).plugin('upload').controller('content-api');
  return uploadController.upload(ctx);
}

export function hideDisabledPrices(data: any): void {
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
