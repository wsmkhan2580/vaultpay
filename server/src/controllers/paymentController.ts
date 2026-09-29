import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as paymentService from '../services/paymentService';

export const createCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.createCheckoutSessionForInvoice({
    clientUserId: req.user!.id,
    invoiceId: req.body.invoiceId,
  });
  sendSuccess(res, 201, 'Checkout session created', result);
});

export const listPaymentsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { clientId, status, page, limit } = req.query as Record<string, string | undefined>;
  const result = await paymentService.listPaymentsForAdmin({
    clientId,
    status,
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  sendSuccess(res, 200, 'Payments retrieved', result);
});

export const getMyPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.getPaymentForClient(req.params.id, req.user!.id);
  sendSuccess(res, 200, 'Payment retrieved', payment);
});
