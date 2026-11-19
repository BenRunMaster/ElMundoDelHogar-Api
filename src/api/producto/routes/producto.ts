const secure = (action: string) => ({
  auth: { scope: [`api::producto.producto.${action}`] },
  policies: [{ name: 'global::permiso-modulo', config: { modulo: 'productos' } }],
});

export default {
  routes: [
    {
      method: 'GET',
      path: '/productos',
      handler: 'producto.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/productos/:id',
      handler: 'producto.findOne',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/admin/productos',
      handler: 'producto.adminFind',
      config: secure('adminFind'),
    },
    {
      method: 'GET',
      path: '/admin/productos/:documentId',
      handler: 'producto.adminFindOne',
      config: secure('adminFindOne'),
    },
    {
      method: 'POST',
      path: '/admin/productos',
      handler: 'producto.adminCreate',
      config: secure('adminCreate'),
    },
    {
      method: 'POST',
      path: '/admin/productos/media',
      handler: 'producto.adminUploadMedia',
      config: secure('adminUploadMedia'),
    },
    {
      method: 'PUT',
      path: '/admin/productos/:documentId',
      handler: 'producto.adminUpdate',
      config: secure('adminUpdate'),
    },
    {
      method: 'DELETE',
      path: '/admin/productos/:documentId',
      handler: 'producto.adminDelete',
      config: secure('adminDelete'),
    },
    {
      method: 'POST',
      path: '/admin/productos/:documentId/publicar',
      handler: 'producto.adminPublish',
      config: secure('adminPublish'),
    },
    {
      method: 'POST',
      path: '/admin/productos/:documentId/despublicar',
      handler: 'producto.adminUnpublish',
      config: secure('adminUnpublish'),
    },
  ],
};
