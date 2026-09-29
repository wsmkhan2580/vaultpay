import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientApi, invoiceApi } from '../../services/resources';
import type { Client, InvoiceItem } from '../../types';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/format';

const emptyItem = (): InvoiceItem => ({ description: '', quantity: 1, unitPrice: 0 });

export default function AdminInvoiceCreate() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clientApi.listAdmin({ status: 'ACTIVE' }).then((res) => setClients(res.data.data));
  }, []);

  const total = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  function updateItem(index: number, patch: Partial<InvoiceItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientId) return setError('Please select a client.');
    if (!dueDate) return setError('Please set a due date.');
    if (items.some((i) => !i.description.trim() || i.quantity <= 0 || i.unitPrice < 0)) {
      return setError('Every line item needs a description, a positive quantity, and a non-negative price.');
    }

    setSubmitting(true);
    try {
      const res = await invoiceApi.create({
        clientId,
        currency,
        description: description || undefined,
        items,
        dueDate: new Date(dueDate).toISOString(),
      });
      navigate(`/admin/invoices/${res.data.data._id}`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create the invoice.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">New invoice</h1>
        <p className="text-sm text-ink-700/60 mt-1">The total is computed automatically from line items.</p>
      </header>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6" noValidate>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="client">Client</label>
            <select id="client" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="dueDate">Due date</label>
            <input id="dueDate" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="currency">Currency</label>
          <select id="currency" className="input sm:max-w-[160px]" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="gbp">GBP</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            className="input min-h-[70px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Consulting engagement, Q1 2026"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">Line items</span>
            <button type="button" onClick={addItem} className="text-xs font-medium text-vault-teal hover:text-vault-tealDark">
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_60px_90px_auto] gap-2 items-center">
                <input
                  className="input"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                />
                <input
                  className="input text-right"
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                />
                <input
                  className="input text-right"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="w-8 h-8 flex items-center justify-center text-ink-700/40 hover:text-vault-rust"
                  aria-label="Remove item"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <span className="text-sm text-ink-700/60">Total</span>
          <span className="font-display text-xl font-semibold text-ink">{formatCurrency(total, currency)}</span>
        </div>

        {error && (
          <div role="alert" className="text-sm text-vault-rust bg-vault-rust/5 border border-vault-rust/20 rounded-md px-3 py-2.5">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating…' : 'Create invoice'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
