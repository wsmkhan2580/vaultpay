export type UserRole = 'ADMIN' | 'CLIENT';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ClientRef {
  _id: string;
  companyName: string;
  contactEmail: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientId: string | ClientRef;
  amount: number;
  currency: string;
  description?: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string | null;
  createdAt: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface Payment {
  _id: string;
  invoiceId: string | { _id: string; invoiceNumber: string };
  clientId: string | { _id: string; companyName: string };
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface Client {
  _id: string;
  userId: string | { _id: string; name: string; email: string; status: string };
  companyName: string;
  contactEmail: string;
  billingAddress?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Receipt {
  _id: string;
  invoiceId: string;
  paymentId: string;
  receiptNumber: string;
  generatedAt: string;
}

export interface AdminOverview {
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  monthlyTrend: Array<{ _id: { year: number; month: number }; total: number; count: number }>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
