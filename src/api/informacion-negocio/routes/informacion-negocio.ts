const secure = (action: string) => ({
  auth: { scope: [`api::informacion-negocio.informacion-negocio.${action}`] },
  policies: [{ name: 'global::permiso-modulo', config: { modulo: 'informacionNegocio' } }],
});

export default { routes: [
  { method: 'GET', path: '/negocio', handler: 'informacion-negocio.find', config: { auth: false } },
  { method: 'GET', path: '/admin/negocio', handler: 'informacion-negocio.adminFind', config: secure('adminFind') },
  { method: 'PUT', path: '/admin/negocio', handler: 'informacion-negocio.adminUpdate', config: secure('adminUpdate') },
  { method: 'POST', path: '/admin/negocio/publicar', handler: 'informacion-negocio.adminPublish', config: secure('adminPublish') },
  { method: 'POST', path: '/admin/negocio/media', handler: 'informacion-negocio.adminUploadMedia', config: secure('adminUploadMedia') },
] };
