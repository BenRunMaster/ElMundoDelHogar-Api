import { getStrapi, uploadCatalogImages } from '../../../utils/catalog-admin';
import { unwrapData } from '../../../utils/business-content';

const UID = 'api::informacion-negocio.informacion-negocio';

async function findVersion(status: 'draft' | 'published') {
  const records = await (getStrapi() as any).documents(UID).findMany({ status, limit: 1, populate: ['logo', 'imagenInstitucional', 'redesSociales'] });
  return records[0] ?? null;
}

function validateBusiness(data: Record<string, any>) {
  for (const [field, label, max] of [
    ['nombre', 'nombre', 160], ['descripcion', 'descripcion', 3000],
    ['telefono', 'telefono', 40], ['correoContacto', 'correoContacto', 160],
    ['direccion', 'direccion', 1000], ['horarioAtencion', 'horarioAtencion', 200],
    ['textoPrincipal', 'textoPrincipal', 300], ['textoSecundario', 'textoSecundario', 3000],
  ] as const) {
    if (typeof data[field] !== 'string' || !data[field].trim() || data[field].trim().length > max) {
      throw new Error(`${label} es obligatorio y no puede superar ${max} caracteres.`);
    }
    data[field] = data[field].trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correoContacto)) throw new Error('correoContacto debe ser válido.');
  for (const field of ['eslogan', 'whatsapp']) {
    if (data[field] !== undefined && data[field] !== null && (typeof data[field] !== 'string' || data[field].length > 200)) {
      throw new Error(`${field} debe ser texto de hasta 200 caracteres.`);
    }
  }
  if (data.redesSociales !== undefined) {
    if (!Array.isArray(data.redesSociales) || data.redesSociales.length > 10) throw new Error('redesSociales debe ser una lista de hasta 10 elementos.');
    for (const social of data.redesSociales) {
      if (!['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin'].includes(social?.nombre)) throw new Error('nombre de red social no válido.');
      try {
        const url = new URL(social.url);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch { throw new Error('Cada URL de red social debe ser HTTP o HTTPS.'); }
    }
  }
}

export default {
  async find(ctx: any) {
    const data = await findVersion('published');
    if (!data) return ctx.notFound('La información del negocio aún no está publicada.');
    ctx.body = { data };
  },
  async adminFind(ctx: any) {
    const data = await findVersion(ctx.query.status === 'published' ? 'published' : 'draft');
    ctx.body = { data };
  },
  async adminUpdate(ctx: any) {
    const data = unwrapData(ctx);
    try {
      const docs = (getStrapi() as any).documents(UID);
      const current = await findVersion('draft') ?? await findVersion('published');
      validateBusiness({ ...(current ?? {}), ...data });
      const result = current
        ? await docs.update({ documentId: current.documentId, data, status: 'draft' })
        : await docs.create({ data, status: 'draft' });
      ctx.body = { data: result };
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
  },
  async adminPublish(ctx: any) {
    const docs = (getStrapi() as any).documents(UID);
    const current = await findVersion('draft') ?? await findVersion('published');
    if (!current) return ctx.notFound('La información del negocio no existe.');
    ctx.body = { data: await docs.publish({ documentId: current.documentId }) };
  },
  async adminUploadMedia(ctx: any) {
    return uploadCatalogImages(ctx, 2);
  },
};
