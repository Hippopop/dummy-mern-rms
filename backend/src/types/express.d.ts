import type { Role } from '../config/roles.js';

export interface AuthenticatedActor {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedActor;
    }
  }
}
