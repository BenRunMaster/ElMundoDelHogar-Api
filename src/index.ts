import type { Core } from '@strapi/strapi';

const PANEL_ROLES = [
  {
    name: 'Admin',
    type: 'panel-admin',
    description: 'Administrador del panel interno de El Mundo del Hogar.',
  },
  {
    name: 'Editor',
    type: 'panel-editor',
    description: 'Editor del panel interno con permisos asignados por módulo.',
  },
] as const;

async function ensurePanelRoles(strapi: Core.Strapi) {
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  const selfServiceActions = [
    'plugin::users-permissions.user.me',
    'plugin::users-permissions.auth.changePassword',
    'plugin::users-permissions.auth.logout',
    'plugin::users-permissions.auth.getSessions',
    'plugin::users-permissions.auth.revokeSession',
  ];
  const adminActions = [
    'api::usuario.usuario.find',
    'api::usuario.usuario.create',
    'api::usuario.usuario.update',
  ];
  const catalogActions = [
    'api::producto.producto.adminFind',
    'api::producto.producto.adminFindOne',
    'api::producto.producto.adminCreate',
    'api::producto.producto.adminUpdate',
    'api::producto.producto.adminDelete',
    'api::producto.producto.adminPublish',
    'api::producto.producto.adminUnpublish',
    'api::categoria.categoria.adminFind',
    'api::categoria.categoria.adminFindOne',
    'api::categoria.categoria.adminCreate',
    'api::categoria.categoria.adminUpdate',
    'api::categoria.categoria.adminDelete',
    'api::categoria.categoria.adminPublish',
    'api::categoria.categoria.adminUnpublish',
    'api::marca.marca.adminFind',
    'api::marca.marca.adminFindOne',
    'api::marca.marca.adminCreate',
    'api::marca.marca.adminUpdate',
    'api::marca.marca.adminDelete',
    'api::marca.marca.adminPublish',
    'api::marca.marca.adminUnpublish',
  ];

  for (const role of PANEL_ROLES) {
    let existing = await roleQuery.findOne({ where: { type: role.type } });
    if (!existing) {
      existing = await roleQuery.create({ data: role });
    } else if (existing.name !== role.name || existing.description !== role.description) {
      existing = await roleQuery.update({ where: { id: existing.id }, data: role });
    }

    for (const action of [...selfServiceActions, ...catalogActions]) {
      const permission = await permissionQuery.findOne({
        where: { action, role: { id: existing.id } },
      });
      if (!permission) {
        await permissionQuery.create({ data: { action, role: existing.id } });
      }
    }

    if (role.type === 'panel-admin') {
      for (const action of adminActions) {
        const permission = await permissionQuery.findOne({
          where: { action, role: { id: existing.id } },
        });
        if (!permission) {
          await permissionQuery.create({ data: { action, role: existing.id } });
        }
      }
    }
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const advanced = (await pluginStore.get({ key: 'advanced' })) ?? {};

    // Panel users are provisioned by an authorized administrator, never through
    // the public self-registration endpoint.
    await pluginStore.set({
      key: 'advanced',
      value: {
        ...advanced,
        allow_register: false,
        default_role: 'panel-editor',
        ...(process.env.PANEL_RESET_PASSWORD_URL
          ? { email_reset_password: process.env.PANEL_RESET_PASSWORD_URL }
          : {}),
      },
    });

    await ensurePanelRoles(strapi);
  },
};
