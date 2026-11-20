const secure = (action: string) => ({
  auth: { scope: [`api::contacto.contacto.${action}`] },
  policies: [{ name: 'global::permiso-modulo', config: { modulo: 'informacionNegocio' } }],
});

export default { routes: [
  { method: 'POST', path: '/contacto', handler: 'contacto.create', config: { auth: false } },
  { method: 'GET', path: '/admin/contactos', handler: 'contacto.adminFind', config: secure('adminFind') },
  { method: 'PUT', path: '/admin/contactos/:id', handler: 'contacto.adminUpdate', config: secure('adminUpdate') },
] };
