import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as invoiceService from '../services/invoiceService';
import * as clientService from '../services/clientService';
import { InvoiceStatus } from '../models/Invoice';

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.createInvoice({
    actorId: req.user!.id,
    clientId: req.body.clientId,
    currency: req.body.currency || 'usd',
    description: req.body.description,
    items: req.body.items,
    dueDate: req.body.dueDate,
  });
  sendSuccess(res, 201, 'Invoice created successfully', invoice);
});

export const listInvoicesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { status, clientId, search, page, limit } = req.query as Record<string, string | undefined>;
  const result = await invoiceService.listInvoicesForAdmin({
    status: status as InvoiceStatus | undefined,
    clientId,
    search,
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  sendSuccess(res, 200, 'Invoices retrieved', result);
});

export const getInvoiceAdmin = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoiceForAdmin(req.params.id);
  sendSuccess(res, 200, 'Invoice retrieved', invoice);
});

export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.user!.id, req.body);
  sendSuccess(res, 200, 'Invoice updated', invoice);
});

// --- Client-facing, ownership-enforced endpoints ---

export const listMyInvoices = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientByUserId(req.user!.id);
  const status = req.query.status as InvoiceStatus | undefined;
  const invoices = await invoiceService.listInvoicesForClient(client._id.toString(), status);
  sendSuccess(res, 200, 'Invoices retrieved', invoices);
});

export const getMyInvoice = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientByUserId(req.user!.id);
  // getInvoiceForClient uses an ownership-aware query — {_id, clientId} — so
  // requesting another client's invoice ID returns 404, never their data.
  const invoice = await invoiceService.getInvoiceForClient(req.params.id, client._id.toString());
  sendSuccess(res, 200, 'Invoice retrieved', invoice);
});
