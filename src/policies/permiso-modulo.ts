const MODULES = [
  'productos',
  'categorias',
  'marcas',
  'promociones',
  'banners',
  'sucursales',
  'informacionNegocio',
  'usuarios',
] as const;

type PolicyContext = {
  state: {
    user?: {
      role?: { type?: string };
      permisos?: Record<string, unknown>;
    };
  };
};

export default async (policyContext: PolicyContext, config: { modulo?: string }) => {
  const user = policyContext.state.user;
  if (user?.role?.type === 'panel-admin') return true;
  if (user?.role?.type !== 'panel-editor' || !config.modulo) return false;
  if (!(MODULES as readonly string[]).includes(config.modulo)) return false;

  return user.permisos?.[config.modulo] === true;
};
