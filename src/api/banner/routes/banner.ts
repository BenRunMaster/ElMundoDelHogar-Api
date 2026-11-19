const secure = (action: string) => ({
  auth: { scope: [`api::banner.banner.${action}`] },
  policies: [{ name: 'global::permiso-modulo', config: { modulo: 'banners' } }],
});

export default {
  routes: [
    { method: 'GET', path: '/banners', handler: 'banner.find', config: { auth: false } },
    { method: 'GET', path: '/admin/banners', handler: 'banner.adminFind', config: secure('adminFind') },
    { method: 'GET', path: '/admin/banners/:documentId', handler: 'banner.adminFindOne', config: secure('adminFindOne') },
    { method: 'POST', path: '/admin/banners', handler: 'banner.adminCreate', config: secure('adminCreate') },
    { method: 'POST', path: '/admin/banners/media', handler: 'banner.adminUploadMedia', config: secure('adminUploadMedia') },
    { method: 'PUT', path: '/admin/banners/:documentId', handler: 'banner.adminUpdate', config: secure('adminUpdate') },
    { method: 'DELETE', path: '/admin/banners/:documentId', handler: 'banner.adminDelete', config: secure('adminDelete') },
    { method: 'POST', path: '/admin/banners/:documentId/publicar', handler: 'banner.adminPublish', config: secure('adminPublish') },
    { method: 'POST', path: '/admin/banners/:documentId/despublicar', handler: 'banner.adminUnpublish', config: secure('adminUnpublish') },
  ],
};
