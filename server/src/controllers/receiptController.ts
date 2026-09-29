import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as receiptService from '../services/receiptService';
import * as clientService from '../services/clientService';
import { ApiError } from '../utils/ApiError';
import { verifyLocalDownloadToken, readLocalFile } from '../services/storageService';

/**
 * Public address of this backend as seen by the browser. `trust proxy` is
 * enabled in app.ts, so req.protocol correctly reads https behind Render's
 * load balancer.
 */
function requestBaseUrl(req: Request): string {
  return `${req.protocol}://${req.get('host')}`;
}

export const getMyReceiptsForInvoice = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientByUserId(req.user!.id);
  const receipts = await receiptService.listReceiptsForInvoiceClient(req.params.invoiceId, client._id.toString());
  sendSuccess(res, 200, 'Receipts retrieved', receipts);
});

export const getMyReceiptDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientByUserId(req.user!.id);
  const receipt = await receiptService.getReceiptForClient(req.params.id, client._id.toString());
  const url = receiptService.signedUrlForReceipt(receipt, requestBaseUrl(req));
  sendSuccess(res, 200, 'Signed download URL generated', { url, expiresInSeconds: 300 });
});

export const getReceiptDownloadUrlAdmin = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await receiptService.getReceiptForAdmin(req.params.id);
  const url = receiptService.signedUrlForReceipt(receipt, requestBaseUrl(req));
  sendSuccess(res, 200, 'Signed download URL generated', { url, expiresInSeconds: 300 });
});

/**
 * Serves a locally-stored receipt PDF, gated by a short-lived HMAC-signed
 * token (see storageService.getSignedDownloadUrl). Used only in the local
 * development fallback path when S3 isn't configured — in production with
 * S3 configured, clients download directly from a native S3 pre-signed URL
 * and never hit this route.
 */
export const downloadLocalReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { key, expires, sig } = req.query as Record<string, string | undefined>;
  if (!key || !expires || !sig) throw ApiError.badRequest('Missing download parameters');

  const valid = verifyLocalDownloadToken(key, parseInt(expires, 10), sig);
  if (!valid) throw ApiError.forbidden('Download link expired or invalid');

  const buffer = readLocalFile(key);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
  res.send(buffer);
});

/**
 * Authenticated, on-demand receipt download. The PDF is rebuilt from the
 * database on every request, so it never depends on a stored file.
 * Ownership is enforced by getReceiptForClient (IDOR-safe).
 */
export const downloadMyReceipt = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientByUserId(req.user!.id);
  const receipt = await receiptService.getReceiptForClient(req.params.id, client._id.toString());
  const buffer = await receiptService.renderReceiptPdf(receipt);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
  res.send(buffer);
});
