type Context = { state: { user?: { role?: { type?: string } } } };

export default async (context: Context) => {
  const role = context.state.user?.role?.type;
  return role === 'panel-admin' || role === 'panel-editor';
};
