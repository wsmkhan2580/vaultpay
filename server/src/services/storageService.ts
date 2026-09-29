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

<<<<<<< HEAD
// --- Admin analytics ---
export const adminApi = {
  overview: () => api.get<{ data: AdminOverview }>('/admin/overview'),
};
=======
/**
 * Generates a short-lived, scoped download URL/token for a stored receipt.
 * For S3, this is a native pre-signed URL. For local storage, it's a
 * signed, expiring token that the receipt controller verifies before
 * streaming the file — never a stable public path.
 */
export function getSignedDownloadUrl(
  storageKey: string,
  provider: 'S3' | 'LOCAL',
  expiresInSeconds = 300,
  baseUrl: string = env.serverUrl
): string {
  if (provider === 'S3' && s3) {
    return s3.getSignedUrl('getObject', {
      Bucket: env.awsS3Bucket,
      Key: storageKey,
      Expires: expiresInSeconds,
    });
  }

  // Local: build a signed token (HMAC over key + expiry) that the download
  // route verifies. This avoids ever exposing an unrestricted static file path.
  const expires = Date.now() + expiresInSeconds * 1000;
  const signature = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(`${storageKey}:${expires}`)
    .digest('hex');
  return `${baseUrl}/api/receipts/download-local?key=${encodeURIComponent(
    storageKey
  )}&expires=${expires}&sig=${signature}`;
}

export function verifyLocalDownloadToken(storageKey: string, expires: number, signature: string): boolean {
  if (Date.now() > expires) return false;
  const expected = crypto.createHmac('sha256', env.jwtSecret).update(`${storageKey}:${expires}`).digest('hex');
  const provided = Buffer.from(signature || '');
  const expectedBuf = Buffer.from(expected);
  // timingSafeEqual throws if lengths differ, so check first.
  if (provided.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, provided);
}

export function readLocalFile(storageKey: string): Buffer {
  const filePath = path.join(LOCAL_STORAGE_DIR, storageKey);
  const resolved = path.resolve(filePath);
  // Defense against path traversal: ensure the resolved path stays inside
  // the storage directory before ever touching the filesystem.
  if (!resolved.startsWith(path.resolve(LOCAL_STORAGE_DIR))) {
    throw new Error('Invalid storage key');
  }
  return fs.readFileSync(resolved);
}
>>>>>>> ca2c6d8 (Fix cookies, receipts, add register page, lazy loading, loading messages)
