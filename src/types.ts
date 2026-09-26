export * from './types/admin';

export type AppMode = 'admin';

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'moderator';
  name: string;
}
