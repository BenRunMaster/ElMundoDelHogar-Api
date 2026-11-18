const secure = (action: string) => ({
  auth: { scope: [`api::marca.marca.${action}`] },
  policies: [{ name: 'global::permiso-modulo', config: { modulo: 'marcas' } }],
});

export default {
  routes: [
    { method: 'GET', path: '/marcas', handler: 'marca.find', config: { auth: false } },
    { method: 'GET', path: '/marcas/:id', handler: 'marca.findOne', config: { auth: false } },
    { method: 'GET', path: '/admin/marcas', handler: 'marca.adminFind', config: secure('adminFind') },
    { method: 'GET', path: '/admin/marcas/:documentId', handler: 'marca.adminFindOne', config: secure('adminFindOne') },
    { method: 'POST', path: '/admin/marcas', handler: 'marca.adminCreate', config: secure('adminCreate') },
    { method: 'PUT', path: '/admin/marcas/:documentId', handler: 'marca.adminUpdate', config: secure('adminUpdate') },
    { method: 'DELETE', path: '/admin/marcas/:documentId', handler: 'marca.adminDelete', config: secure('adminDelete') },
    { method: 'POST', path: '/admin/marcas/:documentId/publicar', handler: 'marca.adminPublish', config: secure('adminPublish') },
    { method: 'POST', path: '/admin/marcas/:documentId/despublicar', handler: 'marca.adminUnpublish', config: secure('adminUnpublish') },
  ],
};
