'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiMessage, del, get, patch, post } from '@/lib/api';
import type {
  Bill, Category, Dashboard, Ingredient, KitchenTicket, MenuItem, Order, RestaurantTable, StaffUser,
} from '@/lib/types';

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 15_000 });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => get<Category[]>('/categories') });

export const useMenu = (params: { search?: string; category?: string; sort?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return useQuery({ queryKey: ['menu', qs], queryFn: () => get<MenuItem[]>(`/menu${qs ? `?${qs}` : ''}`) });
};

export const useIngredients = (search = '') =>
  useQuery({
    queryKey: ['ingredients', search],
    queryFn: () => get<Ingredient[]>(`/ingredients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

export const useTables = () =>
  useQuery({ queryKey: ['tables'], queryFn: () => get<RestaurantTable[]>('/tables'), refetchInterval: 15_000 });

export const useOrders = (status?: string) =>
  useQuery({
    queryKey: ['orders', status ?? 'active'],
    queryFn: () => get<Order[]>(`/orders${status ? `?status=${status}` : ''}`),
    refetchInterval: 15_000,
  });

export const useOrder = (id: string) =>
  useQuery({ queryKey: ['order', id], queryFn: () => get<Order>(`/orders/${id}`), enabled: Boolean(id) });

export const useKitchenQueue = () =>
  useQuery({
    queryKey: ['kitchen'],
    queryFn: () => get<{ tickets: KitchenTicket[]; pendingItems: number }>('/kitchen/queue'),
    refetchInterval: 10_000,
  });

export const useBills = (status?: string) =>
  useQuery({
    queryKey: ['bills', status ?? 'all'],
    queryFn: () => get<Bill[]>(`/bills${status ? `?status=${status}` : ''}`),
  });

export const useBill = (id: string) =>
  useQuery({ queryKey: ['bill', id], queryFn: () => get<Bill>(`/bills/${id}`), enabled: Boolean(id) });

export const useStaff = () =>
  useQuery({ queryKey: ['users'], queryFn: () => get<StaffUser[]>('/users') });

type Method = 'post' | 'patch' | 'delete';

export function useAction<TBody = unknown, TResult = unknown>(
  method: Method,
  url: string | ((body: TBody) => string),
  options: { invalidate?: string[]; success?: string | ((r: TResult) => string) } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TBody) => {
      const path = typeof url === 'function' ? url(body) : url;
      if (method === 'post') return post<TResult>(path, body);
      if (method === 'patch') return patch<TResult>(path, body);
      return del<TResult>(path);
    },
    onSuccess: (result) => {
      for (const key of options.invalidate ?? []) void qc.invalidateQueries({ queryKey: [key] });
      if (options.success) {
        toast.success(typeof options.success === 'function' ? options.success(result) : options.success);
      }
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
}
