export default async (policyContext: { state: { user?: { role?: { type?: string } } } }) => {
  return policyContext.state.user?.role?.type === 'panel-admin';
};
