export type Role = "viewer" | "agent" | "admin"; // defining a custom type for the roles.

// implements role-based access control.
export function hasRole(current: Role, allowed: Role[]): boolean {
  return allowed.includes(current);
}

// throws forbidden if not allowed.
export function assertRole(current: Role, allowed: Role[]): void {
  if (!hasRole(current, allowed)) {
    throw new Error("forbidden");
  }
}

