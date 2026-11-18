const secure = (action: string) => ({
  auth: { scope: [`api::categoria.categoria.${action}`] },
  policies: [{ name: 'global::permiso-modulo', config: { modulo: 'categorias' } }],
});

export default {
  routes: [
    { method: 'GET', path: '/categorias', handler: 'categoria.find', config: { auth: false } },
    { method: 'GET', path: '/categorias/:id', handler: 'categoria.findOne', config: { auth: false } },
    { method: 'GET', path: '/admin/categorias', handler: 'categoria.adminFind', config: secure('adminFind') },
    { method: 'GET', path: '/admin/categorias/:documentId', handler: 'categoria.adminFindOne', config: secure('adminFindOne') },
    { method: 'POST', path: '/admin/categorias', handler: 'categoria.adminCreate', config: secure('adminCreate') },
    { method: 'PUT', path: '/admin/categorias/:documentId', handler: 'categoria.adminUpdate', config: secure('adminUpdate') },
    { method: 'DELETE', path: '/admin/categorias/:documentId', handler: 'categoria.adminDelete', config: secure('adminDelete') },
    { method: 'POST', path: '/admin/categorias/:documentId/publicar', handler: 'categoria.adminPublish', config: secure('adminPublish') },
    { method: 'POST', path: '/admin/categorias/:documentId/despublicar', handler: 'categoria.adminUnpublish', config: secure('adminUnpublish') },
  ],
};
