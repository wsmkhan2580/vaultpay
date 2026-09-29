import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as clientService from '../services/clientService';
import { ClientStatus } from '../models/Client';

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.createClientAccount(req.user!.id, req.body);
  sendSuccess(res, 201, 'Client created successfully', client);
});

export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const { search, status } = req.query as Record<string, string | undefined>;
  const clients = await clientService.listClients({ search, status: status as ClientStatus | undefined });
  sendSuccess(res, 200, 'Clients retrieved', clients);
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientById(req.params.id);
  sendSuccess(res, 200, 'Client retrieved', client);
});

export const updateClientStatus = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.updateClientStatus(req.user!.id, req.params.id, req.body.status);
  sendSuccess(res, 200, 'Client status updated', client);
});

// --- Client's own profile ---
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.getClientByUserId(req.user!.id);
  sendSuccess(res, 200, 'Profile retrieved', client);
});
