import { getStrapi } from '../../../utils/catalog-admin';
import { unwrapData } from '../../../utils/business-content';

const UID = 'api::contacto.contacto';
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const attempts = new Map<string, number[]>();

function clientKey(ctx: any) {
  return String(ctx.ip || ctx.request.ip || 'unknown').slice(0, 100);
}

function enforceRateLimit(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) {
    for (const [entry, timestamps] of attempts) {
      if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS)) attempts.delete(entry);
    }
  }
  return true;
}

export default {
  async create(ctx: any) {
    const data = unwrapData(ctx);
    // Honeypot: report success to automated submissions without storing them.
    if (typeof data.website === 'string' && data.website.trim()) {
      ctx.status = 202;
      ctx.body = { data: { ok: true } };
      return;
    }
    if (!enforceRateLimit(clientKey(ctx))) {
      ctx.set('Retry-After', '60');
      return ctx.tooManyRequests('Se alcanzó el límite de mensajes. Intentá de nuevo en un minuto.');
    }
    const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : '';
    const correo = typeof data.correo === 'string' ? data.correo.trim().toLowerCase() : '';
    const mensaje = typeof data.mensaje === 'string' ? data.mensaje.trim() : '';
    if (nombre.length < 2 || nombre.length > 120) return ctx.badRequest('nombre debe tener entre 2 y 120 caracteres.');
    if (correo.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return ctx.badRequest('correo debe ser válido.');
    if (mensaje.length < 10 || mensaje.length > 5000) return ctx.badRequest('mensaje debe tener entre 10 y 5000 caracteres.');

    const saved = await (getStrapi() as any).db.query(UID).create({ data: { nombre, correo, mensaje, estado: 'nuevo' } });
    ctx.status = 202;
    ctx.body = { data: { ok: true, recibido: true } };
  },

  async adminFind(ctx: any) {
    const page = Number(ctx.query.page ?? 1);
    const pageSize = Number(ctx.query.pageSize ?? 20);
    const q = typeof ctx.query.q === 'string' ? ctx.query.q.trim() : '';
    const estado = ctx.query.estado;
    if (!Number.isInteger(page) || page < 1) return ctx.badRequest('page debe ser un entero positivo.');
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return ctx.badRequest('pageSize debe estar entre 1 y 100.');
    if (q.length > 100) return ctx.badRequest('q no puede superar 100 caracteres.');
    if (estado !== undefined && !['nuevo', 'en-proceso', 'resuelto'].includes(String(estado))) return ctx.badRequest('estado no válido.');
    const where: Record<string, unknown> = {};
    if (q) where.$or = [{ nombre: { $containsi: q } }, { correo: { $containsi: q } }, { mensaje: { $containsi: q } }];
    if (estado) where.estado = estado;
    const [data, total] = await (getStrapi() as any).db.query(UID).findWithCount({
      where, orderBy: { createdAt: 'desc' }, offset: (page - 1) * pageSize, limit: pageSize,
    });
    ctx.body = { data, meta: { pagination: { page, pageSize, pageCount: Math.ceil(total / pageSize), total } } };
  },

  async adminUpdate(ctx: any) {
    const { estado } = unwrapData(ctx);
    if (!['nuevo', 'en-proceso', 'resuelto'].includes(estado)) return ctx.badRequest('estado debe ser nuevo, en-proceso o resuelto.');
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id < 1) return ctx.badRequest('id debe ser un entero positivo.');
    const current = await (getStrapi() as any).db.query(UID).findOne({ where: { id } });
    if (!current) return ctx.notFound('Mensaje no encontrado.');
    ctx.body = { data: await (getStrapi() as any).db.query(UID).update({ where: { id }, data: { estado } }) };
  },
};
