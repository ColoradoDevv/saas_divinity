import { useOrgStore } from '@/app/store/org';

/**
 * Returns whether the current user can perform `action` on `module`.
 *
 * - Admin / manager: always true (no restrictions).
 * - Staff: true only if module is in allowedModules AND action is in modulePermissions[module].
 */
export function useModulePermission(module: string, action: string): boolean {
  const role = useOrgStore((s) => s.role);
  const allowedModules = useOrgStore((s) => s.allowedModules);
  const modulePermissions = useOrgStore((s) => s.modulePermissions);

  // Admin / manager have unrestricted access
  if (role === 'admin' || role === 'manager') return true;

  // Staff: check module access then action permission
  if (role === 'staff') {
    if (!allowedModules || !allowedModules.includes(module)) return false;
    if (!modulePermissions) return false;
    return (modulePermissions[module] ?? []).includes(action);
  }

  return false;
}

/** Convenience: returns an object with all four CRUD flags for a module. */
export function useModulePermissions(module: string) {
  const canView   = useModulePermission(module, 'view');
  const canCreate = useModulePermission(module, 'create');
  const canEdit   = useModulePermission(module, 'edit');
  const canDelete = useModulePermission(module, 'delete');
  return { canView, canCreate, canEdit, canDelete };
}
