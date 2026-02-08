'use client';

import { useMemo } from 'react';

import { useAuth } from '@/lib/auth';

export function PermissionGate({
  module,
  action,
  fallback = null,
  children,
}: {
  module: string;
  action: 'create' | 'read' | 'update' | 'delete';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();
  const allowed = useMemo(() => hasPermission(module, action), [hasPermission, module, action]);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
