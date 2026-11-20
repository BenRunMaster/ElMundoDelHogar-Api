export default {
  routes: [
    {
      method: 'GET',
      path: '/public/busqueda',
      handler: 'busqueda.find',
      config: { auth: false },
    },
  ],
};
