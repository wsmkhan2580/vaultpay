import { api } from './api';
import type {
  AdminOverview,
  Client,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Paginated,
  Payment,
  Receipt,
} from '../types';

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (payload: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    contactEmail?: string;
  }) => api.post('/auth/register', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// --- Invoices ---
export const invoiceApi = {
  listMine: (status?: InvoiceStatus) =>
    api.get<{ data: Invoice[] }>('/invoices/me', { params: status ? { status } : {} }),
  getMine: (id: string) => api.get<{ data: Invoice }>(`/invoices/me/${id}`),
  listAdmin: (params: { status?: string; clientId?: string; search?: string; page?: number }) =>
    api.get<{ data: Paginated<Invoice> }>('/invoices', { params }),
  getAdmin: (id: string) => api.get<{ data: Invoice }>(`/invoices/${id}`),
  create: (payload: { clientId: string; items: InvoiceItem[]; currency: string; description?: string; dueDate: string }) =>
    api.post<{ data: Invoice }>('/invoices', payload),
};

// --- Payments ---
export const paymentApi = {
  checkout: (invoiceId: string) => api.post<{ data: { checkoutUrl: string } }>('/payments/checkout', { invoiceId }),
  listAdmin: (params: { clientId?: string; status?: string; page?: number }) =>
    api.get<{ data: Paginated<Payment> }>('/payments', { params }),
};

// --- Receipts ---
export const receiptApi = {
  listForInvoice: (invoiceId: string) => api.get<{ data: Receipt[] }>(`/receipts/invoice/${invoiceId}`),
  getMyDownloadUrl: (id: string) => api.get<{ data: { url: string } }>(`/receipts/me/${id}/download-url`),
  // Authenticated on-demand PDF download (returned as a binary blob).
  downloadMine: (id: string) => api.get<Blob>(`/receipts/me/${id}/download`, { responseType: 'blob' }),
};

// --- Clients ---
export const clientApi = {
  listAdmin: (params: { search?: string; status?: string } = {}) =>
    api.get<{ data: Client[] }>('/clients', { params }),
  create: (payload: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    contactEmail: string;
    billingAddress?: string;
  }) => api.post<{ data: Client }>('/clients', payload),
  updateStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => api.patch(`/clients/${id}/status`, { status }),
  getMyProfile: () => api.get<{ data: Client }>('/clients/me'),
};

// --- Admin analytics ---
export const adminApi = {
  overview: () => api.get<{ data: AdminOverview }>('/admin/overview'),
};
