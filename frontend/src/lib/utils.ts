import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AppRole = 'super_admin' | 'admin' | 'gestor' | 'colaborador' | 'correspondente' | 'franqueado';
export const ALL_ROLES: AppRole[] = ['super_admin', 'admin', 'gestor', 'colaborador', 'correspondente', 'franqueado'];
