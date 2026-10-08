// Role-based routing shared by the login page, the route guards and proxy.ts.
// Keep STAFF_ROLES in sync with ROLES in express/src/config/permissions.js.

export const STAFF_ROLES = ['super_admin', 'admin', 'operations', 'support', 'finance'];

// Display names (mirrors ROLE_META in express/src/config/permissions.js)
export const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    operations: 'Operations Manager',
    support: 'Customer Support',
    finance: 'Finance',
    customer: 'Customer',
};

export const roleLabel = (role?: string | null) => (role ? ROLE_LABELS[role] || role.replace(/_/g, ' ') : '');

export const OPS_HOME = '/ops';
export const CUSTOMER_HOME = '/dashboard';

// Areas that require a signed-in user, and which kind of user each belongs to
export const isOpsPath = (path: string) => path === OPS_HOME || path.startsWith(`${OPS_HOME}/`);
export const isCustomerPath = (path: string) =>
    ['/dashboard', '/shipments'].some(p => path === p || path.startsWith(`${p}/`));
export const isProtectedPath = (path: string) => isOpsPath(path) || isCustomerPath(path);

export const isStaffRole = (role?: string | null) => !!role && STAFF_ROLES.includes(role);

export const homeFor = (role?: string | null) => (isStaffRole(role) ? OPS_HOME : CUSTOMER_HOME);

// Sign-in URL that brings the user back to `returnTo` (path + query) afterwards
export const loginUrl = (returnTo: string, opts: { expired?: boolean } = {}) =>
    `/login?${opts.expired ? 'expired=true&' : ''}next=${encodeURIComponent(returnTo)}`;

// Where to send a user after sign-in: the requested page if their role may open it, otherwise their home
export function destinationFor(role: string | null | undefined, next: string | null | undefined) {
    const safe = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
    if (!safe || safe.startsWith('/login') || safe.startsWith('/register')) return homeFor(role);
    const path = safe.split(/[?#]/)[0];
    if (isOpsPath(path) && !isStaffRole(role)) return homeFor(role);
    if (isCustomerPath(path) && isStaffRole(role)) return homeFor(role);
    return safe;
}
