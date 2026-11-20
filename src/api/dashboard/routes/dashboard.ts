export default { routes: [
  {
    method: 'GET', path: '/admin/dashboard/resumen', handler: 'dashboard.resumen',
    config: { auth: { scope: ['api::dashboard.dashboard.resumen'] }, policies: ['global::panel-interno'] },
  },
  {
    method: 'GET', path: '/admin/dashboard/actividad', handler: 'dashboard.actividad',
    config: { auth: { scope: ['api::dashboard.dashboard.actividad'] }, policies: ['global::panel-interno'] },
  },
] };
