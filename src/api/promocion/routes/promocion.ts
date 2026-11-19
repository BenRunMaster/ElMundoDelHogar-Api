const secure = (action: string) => ({
  auth: { scope: [`api::promocion.promocion.${action}`] },
  policies: [{ name: 'global::permiso-modulo', config: { modulo: 'promociones' } }],
});

export default {
  routes: [
    { method: 'GET', path: '/promociones', handler: 'promocion.find', config: { auth: false } },
    { method: 'GET', path: '/admin/promociones', handler: 'promocion.adminFind', config: secure('adminFind') },
    { method: 'GET', path: '/admin/promociones/:documentId', handler: 'promocion.adminFindOne', config: secure('adminFindOne') },
    { method: 'POST', path: '/admin/promociones', handler: 'promocion.adminCreate', config: secure('adminCreate') },
    { method: 'POST', path: '/admin/promociones/media', handler: 'promocion.adminUploadMedia', config: secure('adminUploadMedia') },
    { method: 'PUT', path: '/admin/promociones/:documentId', handler: 'promocion.adminUpdate', config: secure('adminUpdate') },
    { method: 'DELETE', path: '/admin/promociones/:documentId', handler: 'promocion.adminDelete', config: secure('adminDelete') },
    { method: 'POST', path: '/admin/promociones/:documentId/publicar', handler: 'promocion.adminPublish', config: secure('adminPublish') },
    { method: 'POST', path: '/admin/promociones/:documentId/despublicar', handler: 'promocion.adminUnpublish', config: secure('adminUnpublish') },
  ],
};
