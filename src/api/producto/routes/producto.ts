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
      path: '/productos/:documentId',
      handler: 'producto.findOne',
      config: { auth: false },
    },
  ],
};
