import type { Core } from '@strapi/strapi';

const MODULES: Record<string, string> = {
  productos: 'productos', categorias: 'categorias', marcas: 'marcas',
  promociones: 'promociones', banners: 'banners', sucursales: 'sucursales',
  negocio: 'informacionNegocio', contactos: 'contactos', usuarios: 'usuarios',
};

function describe(ctx: any) {
  const parts = String(ctx.path).split('/').filter(Boolean);
  const moduleName = MODULES[parts[2]];
  if (!moduleName || parts[0] !== 'api' || parts[1] !== 'admin') return null;
  const suffix = parts[parts.length - 1];
  let accion: string;
  if (suffix === 'publicar') accion = 'publicar';
  else if (suffix === 'despublicar') accion = 'despublicar';
  else if (suffix === 'media') accion = 'cargar-imagen';
  else if (ctx.method === 'POST') accion = 'crear';
  else if (ctx.method === 'PUT' || ctx.method === 'PATCH') accion = 'actualizar';
  else if (ctx.method === 'DELETE') accion = 'eliminar';
  else return null;
  const resourcePart = parts.slice(3).find((part: string) => !['publicar', 'despublicar', 'media'].includes(part));
  return { modulo: moduleName, accion, recursoId: resourcePart ?? null };
}

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => async (ctx: any, next: () => Promise<void>) => {
  await next();
  if (ctx.method === 'POST' && ctx.path === '/api/auth/local' && ctx.status >= 200 && ctx.status < 300) {
    const userId = Number(ctx.body?.user?.id);
    if (Number.isInteger(userId) && userId > 0) {
      try {
        await (strapi as any).db.query('plugin::users-permissions.user').update({
          where: { id: userId }, data: { ultimoAcceso: new Date() },
        });
      } catch (error) {
        strapi.log.error('No se pudo actualizar ultimoAcceso después del inicio de sesión.', error);
      }
    }
    return;
  }
  const event = describe(ctx);
  const actor = ctx.state.user;
  if (!event || !actor?.id || ctx.status < 200 || ctx.status >= 400) return;
  try {
    const verb: Record<string, string> = {
      crear: 'Se creó', actualizar: 'Se actualizó', eliminar: 'Se eliminó',
      publicar: 'Se publicó', despublicar: 'Se despublicó', 'cargar-imagen': 'Se cargó imagen para',
    };
    const moduleLabel: Record<string, string> = {
      productos: 'producto', categorias: 'categoría', marcas: 'marca', promociones: 'promoción',
      banners: 'banner', sucursales: 'sucursal', informacionNegocio: 'información del negocio',
      contactos: 'mensaje de contacto', usuarios: 'usuario',
    };
    const nombreUsuario = String(actor.nombreCompleto || actor.username || 'Usuario del panel').slice(0, 120);
    await (strapi as any).db.query('api::actividad.actividad').create({ data: {
      usuarioId: actor.id,
      nombreUsuario,
      accion: event.accion,
      modulo: event.modulo,
      ...(event.recursoId ? { recursoId: String(event.recursoId).slice(0, 255) } : {}),
      resumen: `${verb[event.accion]} ${moduleLabel[event.modulo]}.`,
      metodo: ctx.method,
      ruta: String(ctx.path).slice(0, 300),
    } });
  } catch (error) {
    strapi.log.error('No se pudo guardar la actividad administrativa.', error);
  }
};
