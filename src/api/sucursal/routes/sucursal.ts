const secure = (action: string) => ({
  auth: { scope: [`api::sucursal.sucursal.${action}`] },
  policies: [{ name: 'global::permiso-modulo', config: { modulo: 'sucursales' } }],
});

export default {
  routes: [
    { method: 'GET', path: '/sucursales', handler: 'sucursal.find', config: { auth: false } },
    { method: 'GET', path: '/admin/sucursales', handler: 'sucursal.adminFind', config: secure('adminFind') },
    { method: 'GET', path: '/admin/sucursales/:documentId', handler: 'sucursal.adminFindOne', config: secure('adminFindOne') },
    { method: 'POST', path: '/admin/sucursales', handler: 'sucursal.adminCreate', config: secure('adminCreate') },
    { method: 'PUT', path: '/admin/sucursales/:documentId', handler: 'sucursal.adminUpdate', config: secure('adminUpdate') },
    { method: 'DELETE', path: '/admin/sucursales/:documentId', handler: 'sucursal.adminDelete', config: secure('adminDelete') },
    { method: 'POST', path: '/admin/sucursales/:documentId/publicar', handler: 'sucursal.adminPublish', config: secure('adminPublish') },
    { method: 'POST', path: '/admin/sucursales/:documentId/despublicar', handler: 'sucursal.adminUnpublish', config: secure('adminUnpublish') },
  ],
};
