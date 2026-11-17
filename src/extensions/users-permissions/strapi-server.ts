type PluginContentType = {
  schema: {
    attributes: Record<string, unknown>;
  };
};

type UsersPermissionsPlugin = {
  contentTypes: { user: PluginContentType };
};

export default (plugin: UsersPermissionsPlugin) => {
  plugin.contentTypes.user.schema.attributes.nombreCompleto = { type: 'string' };
  plugin.contentTypes.user.schema.attributes.permisos = {
    type: 'json',
    default: {
      productos: false,
      categorias: false,
      marcas: false,
      promociones: false,
      banners: false,
      sucursales: false,
      informacionNegocio: false,
      usuarios: false,
    },
  };

  return plugin;
};
