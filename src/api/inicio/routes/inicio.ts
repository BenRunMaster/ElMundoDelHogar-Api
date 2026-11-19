export default {
  routes: [
    { method: 'GET', path: '/public/inicio', handler: 'inicio.find', config: { auth: false } },
  ],
};
