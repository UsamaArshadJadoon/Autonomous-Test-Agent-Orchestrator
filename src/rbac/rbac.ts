import { RBACConfig } from '../types/config.js';
import { loadRBACConfig } from '../config/loader.js';

export class RBAC {
  private config: RBACConfig;

  constructor(projectKey: string) {
    this.config = loadRBACConfig(projectKey);
  }

  getRoleForUser(email: string): string | null {
    return this.config.team_members[email] || null;
  }

  hasPermission(email: string, action: string): boolean {
    const role = this.getRoleForUser(email);
    if (!role) return false;

    const roleConfig = this.config.roles[role];
    if (!roleConfig) return false;

    const permissionKey = `can_${action}` as keyof typeof roleConfig;
    return roleConfig[permissionKey] ?? false;
  }

  checkPermissionOrThrow(email: string, action: string): void {
    if (!this.hasPermission(email, action)) {
      const role = this.getRoleForUser(email);
      throw new Error(
        `User ${email} (role: ${role}) does not have permission to ${action}`
      );
    }
  }
}
