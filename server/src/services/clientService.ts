import bcrypt from 'bcrypt';
import { User, SALT_ROUNDS } from '../models/User';
import { Client, ClientStatus } from '../models/Client';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './auditService';

export async function createClientAccount(actorId: string, input: {
  name: string;
  email: string;
  password: string;
  companyName: string;
  contactEmail: string;
  billingAddress?: string;
}) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: normalizedEmail,
    passwordHash,
    role: 'CLIENT',
    status: 'ACTIVE',
  });

  const client = await Client.create({
    userId: user._id,
    companyName: input.companyName,
    contactEmail: input.contactEmail.toLowerCase().trim(),
    billingAddress: input.billingAddress,
    status: 'ACTIVE',
  });

  await recordAudit({
    actor: actorId,
    action: 'CLIENT_CREATED',
    resource: 'Client',
    resourceId: client._id.toString(),
    metadata: { email: normalizedEmail, companyName: client.companyName },
  });

  return client;
}

export async function listClients(filters: { search?: string; status?: ClientStatus }) {
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.companyName = { $regex: escaped, $options: 'i' };
  }
  return Client.find(query).populate('userId', 'name email status').sort({ createdAt: -1 });
}

export async function getClientById(clientId: string) {
  const client = await Client.findById(clientId).populate('userId', 'name email status');
  if (!client) throw ApiError.notFound('Client not found');
  return client;
}

export async function updateClientStatus(actorId: string, clientId: string, status: ClientStatus) {
  const client = await Client.findById(clientId);
  if (!client) throw ApiError.notFound('Client not found');
  client.status = status;
  await client.save();

  // Keep the underlying user account in lockstep: an inactive client company
  // should not be able to authenticate.
  await User.findByIdAndUpdate(client.userId, { status: status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED' });

  await recordAudit({
    actor: actorId,
    action: 'CLIENT_STATUS_CHANGED',
    resource: 'Client',
    resourceId: client._id.toString(),
    metadata: { status },
  });

  return client;
}

/** Used by ownership-aware queries elsewhere to resolve a User -> Client. */
export async function getClientByUserId(userId: string) {
  const client = await Client.findOne({ userId });
  if (!client) throw ApiError.notFound('Client profile not found');
  return client;
}
