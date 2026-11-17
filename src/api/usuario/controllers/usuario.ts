import type { Core } from '@strapi/strapi';

const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const ROLE_TYPES = ['panel-admin', 'panel-editor'] as const;
const MODULES = [
  'productos',
  'categorias',
  'marcas',
  'promociones',
  'banners',
  'sucursales',
  'informacionNegocio',
  'usuarios',
] as const;

type RoleType = (typeof ROLE_TYPES)[number];
type ModulePermission = (typeof MODULES)[number];
type PermissionMap = Record<ModulePermission, boolean>;
type UserRecord = {
  id: number;
  username: string;
  nombreCompleto?: string | null;
  email: string;
  blocked: boolean;
  confirmed: boolean;
  permisos?: Partial<PermissionMap> | null;
  role?: { id?: number; name: string; type: RoleType } | null;
};
type AdminUsersContext = {
  params: Record<string, string>;
  query: Record<string, unknown>;
  state: { user?: { id: number; role?: { type?: string } } };
  request: { body?: unknown };
  body?: unknown;
  created(data: unknown): unknown;
  badRequest(message: string): unknown;
  forbidden(message: string): unknown;
  notFound(message: string): unknown;
};

const emptyPermissions = (): PermissionMap => Object.fromEntries(
  MODULES.map((module) => [module, false]),
) as PermissionMap;

function parsePermissions(value: unknown, role: RoleType): PermissionMap {
  const result = emptyPermissions();
  if (value === undefined || value === null) return result;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('permisos debe ser un objeto de permisos por módulo.');
  }

  for (const [key, allowed] of Object.entries(value)) {
    if (!(MODULES as readonly string[]).includes(key)) {
      throw new Error(`El módulo ${key} no es válido.`);
    }
    if (typeof allowed !== 'boolean') {
      throw new Error(`El permiso ${key} debe ser verdadero o falso.`);
    }
    result[key as ModulePermission] = allowed;
  }

  if (role === 'panel-editor' && result.usuarios) {
    throw new Error('El rol Editor no puede recibir permiso para administrar usuarios.');
  }
  return result;
}

function presentUser(user: UserRecord) {
  const permisos = { ...emptyPermissions(), ...(user.permisos ?? {}) };
  return {
    id: user.id,
    nombre: user.nombreCompleto || user.username,
    correo: user.email,
    rol: user.role?.type ?? null,
    rolNombre: user.role?.name ?? null,
    activo: !user.blocked,
    confirmado: user.confirmed,
    permisos,
    ultimoAcceso: null,
  };
}

async function getRole(strapi: Core.Strapi, type: string) {
  if (!ROLE_TYPES.includes(type as RoleType)) return null;
  return strapi.db.query(ROLE_UID).findOne({ where: { type } });
}

async function isLastActiveAdmin(strapi: Core.Strapi, user: UserRecord) {
  if (user.role?.type !== 'panel-admin' || user.blocked) return false;
  const activeAdmins = await strapi.db.query(USER_UID).count({
    where: { blocked: false, role: { type: 'panel-admin' } },
  });
  return activeAdmins <= 1;
}

function getUserService(strapi: Core.Strapi) {
  return strapi.plugin('users-permissions').service('user') as {
    add(data: Record<string, unknown>): Promise<UserRecord>;
    edit(id: number, data: Record<string, unknown>): Promise<UserRecord>;
  };
}

export default {
  async find(ctx: AdminUsersContext) {
    const strapi = (globalThis as typeof globalThis & { strapi: Core.Strapi }).strapi;
    const query = ctx.query;
    const page = Number((query.page as string) ?? 1);
    const pageSize = Number((query.pageSize as string) ?? DEFAULT_PAGE_SIZE);
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    const role = typeof query.role === 'string' ? query.role : '';
    const estado = typeof query.estado === 'string' ? query.estado : '';

    if (!Number.isInteger(page) || page < 1) return ctx.badRequest('page debe ser un entero positivo.');
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      return ctx.badRequest(`pageSize debe estar entre 1 y ${MAX_PAGE_SIZE}.`);
    }
    if (q.length > 100) return ctx.badRequest('q no puede superar 100 caracteres.');

    const where: Record<string, unknown> = {};
    if (q) {
      where.$or = [
        { username: { $containsi: q } },
        { nombreCompleto: { $containsi: q } },
        { email: { $containsi: q } },
      ];
    }
    if (role) {
      if (!ROLE_TYPES.includes(role as RoleType)) return ctx.badRequest('role debe ser panel-admin o panel-editor.');
      where.role = { type: role };
    }
    if (estado) {
      if (!['activo', 'inactivo'].includes(estado)) return ctx.badRequest('estado debe ser activo o inactivo.');
      where.blocked = estado === 'inactivo';
    }

    const [users, total] = await strapi.db.query(USER_UID).findWithCount({
      where,
      select: ['id', 'username', 'nombreCompleto', 'email', 'blocked', 'confirmed', 'permisos'],
      populate: { role: { select: ['name', 'type'] } },
      orderBy: { nombreCompleto: 'asc', username: 'asc' },
      offset: (page - 1) * pageSize,
      limit: pageSize,
    }) as [UserRecord[], number];

    const roles = await strapi.db.query(ROLE_UID).findMany({
      where: { type: { $in: ROLE_TYPES } },
      select: ['id', 'type'],
    }) as Array<{ id: number; type: RoleType }>;
    const roleCounts = await Promise.all(roles.map(async (item) => ({
      type: item.type,
      total: await strapi.db.query(USER_UID).count({ where: { role: { id: item.id } } }),
    })));

    ctx.body = {
      data: users.map(presentUser),
      meta: {
        pagination: { page, pageSize, pageCount: Math.ceil(total / pageSize), total },
        resumen: {
          total: await strapi.db.query(USER_UID).count(),
          activos: await strapi.db.query(USER_UID).count({ where: { blocked: false } }),
          inactivos: await strapi.db.query(USER_UID).count({ where: { blocked: true } }),
          porRol: Object.fromEntries(roleCounts.map((item) => [item.type, item.total])),
        },
      },
    };
  },

  async create(ctx: AdminUsersContext) {
    const strapi = (globalThis as typeof globalThis & { strapi: Core.Strapi }).strapi;
    const input = ctx.request.body as Record<string, unknown> | undefined;
    const nombre = typeof input?.nombre === 'string' ? input.nombre.trim() : '';
    const correo = typeof input?.correo === 'string' ? input.correo.trim().toLowerCase() : '';
    const contrasena = typeof input?.contrasena === 'string' ? input.contrasena : '';
    const roleType = typeof input?.rol === 'string' ? input.rol : '';
    const activo = input?.activo === undefined ? true : input.activo;

    if (!nombre || nombre.length > 120) return ctx.badRequest('nombre es obligatorio y debe tener hasta 120 caracteres.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return ctx.badRequest('correo debe ser una dirección válida.');
    if (contrasena.length < 12) return ctx.badRequest('contrasena debe tener al menos 12 caracteres.');
    if (!ROLE_TYPES.includes(roleType as RoleType)) return ctx.badRequest('rol debe ser panel-admin o panel-editor.');
    if (typeof activo !== 'boolean') return ctx.badRequest('activo debe ser verdadero o falso.');

    let permisos: PermissionMap;
    try {
      permisos = parsePermissions(input?.permisos, roleType as RoleType);
    } catch (error) {
      return ctx.badRequest((error as Error).message);
    }
    if (await strapi.db.query(USER_UID).findOne({
      where: { $or: [{ email: { $eqi: correo } }, { username: correo }] },
      select: ['id'],
    })) {
      return ctx.badRequest('Ya existe una cuenta con ese correo.');
    }
    const role = await getRole(strapi, roleType);
    if (!role) return ctx.badRequest('El rol solicitado no está configurado.');

    const created = await getUserService(strapi).add({
      username: correo,
      nombreCompleto: nombre,
      email: correo,
      password: contrasena,
      provider: 'local',
      confirmed: true,
      blocked: !activo,
      role: role.id,
      permisos,
    });
    ctx.created(presentUser(created));
  },

  async update(ctx: AdminUsersContext) {
    const strapi = (globalThis as typeof globalThis & { strapi: Core.Strapi }).strapi;
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id < 1) return ctx.badRequest('id debe ser un entero positivo.');
    const input = ctx.request.body as Record<string, unknown> | undefined;
    const current = await strapi.db.query(USER_UID).findOne({
      where: { id },
      populate: { role: { select: ['id', 'name', 'type'] } },
    }) as UserRecord | null;
    if (!current) return ctx.notFound('Usuario no encontrado.');

    const changesSensitiveFields = ['rol', 'permisos', 'activo'].some((field) => input && field in input);
    if (changesSensitiveFields && ctx.state.user?.id === id) {
      return ctx.forbidden('No podés cambiar tu propio rol, permisos o estado.');
    }

    const update: Record<string, unknown> = {};
    if (input?.nombre !== undefined) {
      if (typeof input.nombre !== 'string' || !input.nombre.trim() || input.nombre.trim().length > 120) {
        return ctx.badRequest('nombre debe tener entre 1 y 120 caracteres.');
      }
      update.nombreCompleto = input.nombre.trim();
    }
    if (input?.correo !== undefined) {
      if (typeof input.correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.correo.trim())) {
        return ctx.badRequest('correo debe ser una dirección válida.');
      }
      const correo = input.correo.trim().toLowerCase();
      const duplicate = await strapi.db.query(USER_UID).findOne({
        where: {
          $and: [
            { id: { $ne: id } },
            { $or: [{ email: { $eqi: correo } }, { username: correo }] },
          ],
        },
        select: ['id'],
      });
      if (duplicate && duplicate.id !== id) return ctx.badRequest('Ya existe una cuenta con ese correo.');
      update.email = correo;
      update.username = correo;
    }
    if (input?.contrasena !== undefined) {
      if (typeof input.contrasena !== 'string' || input.contrasena.length < 12) {
        return ctx.badRequest('contrasena debe tener al menos 12 caracteres.');
      }
      update.password = input.contrasena;
    }
    if (input?.activo !== undefined) {
      if (typeof input.activo !== 'boolean') return ctx.badRequest('activo debe ser verdadero o falso.');
      update.blocked = !input.activo;
    }
    const nextRoleType = input?.rol === undefined ? current.role?.type : input.rol;
    if (typeof nextRoleType !== 'string' || !ROLE_TYPES.includes(nextRoleType as RoleType)) {
      return ctx.badRequest('rol debe ser panel-admin o panel-editor.');
    }
    if (input?.rol !== undefined) {
      const role = await getRole(strapi, nextRoleType);
      if (!role) return ctx.badRequest('El rol solicitado no está configurado.');
      update.role = role.id;
    }
    if (input?.permisos !== undefined) {
      try {
        update.permisos = parsePermissions(input.permisos, nextRoleType as RoleType);
      } catch (error) {
        return ctx.badRequest((error as Error).message);
      }
    } else if (input?.rol === 'panel-editor' && current.role?.type !== 'panel-editor') {
      update.permisos = emptyPermissions();
    }

    const remainsActiveAdmin = nextRoleType === 'panel-admin'
      && (update.blocked === undefined ? !current.blocked : update.blocked === false);
    const wasActiveAdmin = current.role?.type === 'panel-admin' && !current.blocked;
    if (wasActiveAdmin && !remainsActiveAdmin && await isLastActiveAdmin(strapi, current)) {
      return ctx.badRequest('No se puede desactivar o cambiar el rol del último Admin activo.');
    }

    const updated = await getUserService(strapi).edit(id, update);
    ctx.body = presentUser(updated);
  },
};
