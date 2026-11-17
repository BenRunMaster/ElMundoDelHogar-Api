export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/usuarios',
      handler: 'usuario.find',
      config: {
        auth: { scope: ['api::usuario.usuario.find'] },
        policies: ['global::panel-admin'],
      },
    },
    {
      method: 'POST',
      path: '/admin/usuarios',
      handler: 'usuario.create',
      config: {
        auth: { scope: ['api::usuario.usuario.create'] },
        policies: ['global::panel-admin'],
      },
    },
    {
      method: 'PUT',
      path: '/admin/usuarios/:id',
      handler: 'usuario.update',
      config: {
        auth: { scope: ['api::usuario.usuario.update'] },
        policies: ['global::panel-admin'],
      },
    },
  ],
};
