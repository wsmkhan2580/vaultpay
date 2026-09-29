import { FormEvent, useEffect, useState } from 'react';
import { clientApi } from '../../services/resources';
import type { Client } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { extractErrorMessage } from '../../services/api';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  companyName: '',
  contactEmail: '',
};

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    clientApi
      .listAdmin()
      .then((res) => setClients(res.data.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await clientApi.create({ ...form, contactEmail: form.contactEmail || form.email });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create the client.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(client: Client) {
    const next = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await clientApi.updateStatus(client._id, next);
    load();
  }

  return (
    <div>
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Clients</h1>
          <p className="text-sm text-ink-700/60 mt-1">{clients.length} total</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary shrink-0">
          {showForm ? 'Cancel' : 'New client'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Contact name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Login email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required />
            <Field label="Company name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} required />
            <Field
              label="Contact email (billing)"
              value={form.contactEmail}
              onChange={(v) => setForm({ ...form, contactEmail: v })}
              type="email"
              placeholder="Defaults to login email"
            />
          </div>
          <Field
            label="Temporary password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            type="password"
            required
            hint="At least 10 characters, mixing upper/lowercase, a number, and a symbol."
          />
          {error && (
            <div role="alert" className="text-sm text-vault-rust bg-vault-rust/5 border border-vault-rust/20 rounded-md px-3 py-2.5">
              {error}
            </div>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating…' : 'Create client'}
          </button>
        </form>
      )}

      {loading ? (
        <LoadingSpinner label="Loading clients…" />
      ) : clients.length === 0 ? (
        <div className="card">
          <EmptyState title="No clients yet" description="Add your first client to start invoicing." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-700/50">
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Contact email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c._id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{c.companyName}</td>
                  <td className="px-5 py-3.5 text-ink-700/60 hidden sm:table-cell">{c.contactEmail}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => toggleStatus(c)} className="text-xs font-medium text-ink-700/60 hover:text-ink">
                      {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-[11px] text-ink-700/40 mt-1">{hint}</p>}
    </div>
  );
}
