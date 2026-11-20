import { getStrapi } from '../../../utils/catalog-admin';

const ACTIVITY_UID = 'api::actividad.actividad';
const MODULE_UIDS: Record<string, string> = {
  productos: 'api::producto.producto',
  categorias: 'api::categoria.categoria',
  marcas: 'api::marca.marca',
  promociones: 'api::promocion.promocion',
  banners: 'api::banner.banner',
  sucursales: 'api::sucursal.sucursal',
};

function todayInElSalvador() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date());
}

function actorRole(ctx: any) {
  const role = ctx.state.user?.role?.type;
  return role === 'panel-admin' || role === 'panel-editor';
}

export default {
  async resumen(ctx: any) {
    if (!actorRole(ctx)) return ctx.unauthorized('Iniciá sesión con una cuenta del panel.');
    const strapi = getStrapi() as any;
    const today = todayInElSalvador();
    const counts = await Promise.all(Object.entries(MODULE_UIDS).map(async ([key, uid]) => {
      const filters: Record<string, unknown> = { activo: { $eq: true } };
      if (key === 'promociones') {
        filters.fechaInicio = { $lte: today };
        filters.fechaFin = { $gte: today };
      }
      const total = await strapi.documents(uid).count({ status: 'published', filters });
      return [key, total] as const;
    }));
    const usuariosActivos = await strapi.db.query('plugin::users-permissions.user').count({
      where: { blocked: false, role: { type: { $in: ['panel-admin', 'panel-editor'] } } },
    });
    ctx.body = { data: { ...Object.fromEntries(counts), usuariosActivos } };
  },

  async actividad(ctx: any) {
    if (!actorRole(ctx)) return ctx.unauthorized('Iniciá sesión con una cuenta del panel.');
    const page = Number(ctx.query.page ?? 1);
    const pageSize = Number(ctx.query.pageSize ?? 10);
    if (!Number.isInteger(page) || page < 1) return ctx.badRequest('page debe ser un entero positivo.');
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return ctx.badRequest('pageSize debe estar entre 1 y 100.');
    const where: Record<string, unknown> = {};
    if (typeof ctx.query.modulo === 'string') {
      const allowed = ['productos', 'categorias', 'marcas', 'promociones', 'banners', 'sucursales', 'informacionNegocio', 'contactos', 'usuarios'];
      if (!allowed.includes(ctx.query.modulo)) return ctx.badRequest('modulo no válido.');
      where.modulo = ctx.query.modulo;
    }
    if (typeof ctx.query.accion === 'string') {
      const allowed = ['crear', 'actualizar', 'eliminar', 'publicar', 'despublicar', 'cargar-imagen'];
      if (!allowed.includes(ctx.query.accion)) return ctx.badRequest('accion no válida.');
      where.accion = ctx.query.accion;
    }
    if (typeof ctx.query.q === 'string' && ctx.query.q.trim()) {
      const q = ctx.query.q.trim();
      if (q.length > 100) return ctx.badRequest('q no puede superar 100 caracteres.');
      where.$or = [{ nombreUsuario: { $containsi: q } }, { resumen: { $containsi: q } }, { modulo: { $containsi: q } }];
    }
    const [data, total] = await (getStrapi() as any).db.query(ACTIVITY_UID).findWithCount({
      where, orderBy: { createdAt: 'desc' }, offset: (page - 1) * pageSize, limit: pageSize,
      select: ['id', 'usuarioId', 'nombreUsuario', 'accion', 'modulo', 'recursoId', 'resumen', 'createdAt'],
    });
    ctx.body = { data, meta: { pagination: { page, pageSize, pageCount: Math.ceil(total / pageSize), total } } };
  },
};
