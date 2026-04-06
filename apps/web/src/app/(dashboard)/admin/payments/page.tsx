'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { CreditCard, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  phoneNumber?: string;
  externalId?: string;
  createdAt: string;
  tenant: { name: string; slug: string };
}

const STATUS_STYLES: Record<string, string> = {
  SUCCEEDED: 'bg-green-500/20 text-green-300',
  PENDING: 'bg-yellow-500/20 text-yellow-300',
  FAILED: 'bg-red-500/20 text-red-300',
  CANCELLED: 'bg-gray-600/30 text-gray-400',
};

const PROVIDER_STYLES: Record<string, string> = {
  WAVE: 'bg-blue-500/20 text-blue-300',
  ORANGE_MONEY: 'bg-orange-500/20 text-orange-300',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const limit = 20;

  useEffect(() => {
    setLoading(true);
    adminApi
      .getPayments(page, limit)
      .then((res) => {
        setPayments(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => setError('Impossible de charger les paiements'))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  // Calcul du revenu affiché sur la page courante
  const pageRevenue = payments
    .filter((p) => p.status === 'SUCCEEDED')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-8 text-white">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Paiements</h1>
          <p className="text-gray-400 text-sm mt-1">{total} paiements au total</p>
        </div>
        {pageRevenue > 0 && (
          <div className="bg-green-600/10 border border-green-600/20 rounded-xl px-4 py-2 text-right">
            <p className="text-xs text-gray-400">Revenus (page)</p>
            <p className="text-lg font-bold text-green-300">
              {pageRevenue.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 mb-6">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        </div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Coopérative</th>
                  <th className="px-5 py-3 text-left font-medium">Fournisseur</th>
                  <th className="px-5 py-3 text-right font-medium">Montant</th>
                  <th className="px-5 py-3 text-center font-medium">Statut</th>
                  <th className="px-5 py-3 text-left font-medium">Téléphone</th>
                  <th className="px-5 py-3 text-left font-medium">ID Externe</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800/60 hover:bg-gray-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                          <CreditCard size={13} className="text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{p.tenant.name}</p>
                          <p className="text-xs text-gray-500">{p.tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PROVIDER_STYLES[p.provider] ?? 'bg-gray-700 text-gray-400'}`}>
                        {p.provider}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      <span className={p.status === 'SUCCEEDED' ? 'text-green-300' : 'text-gray-300'}>
                        {p.amount.toLocaleString('fr-FR')}
                      </span>{' '}
                      <span className="text-gray-500 text-xs">{p.currency}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status] ?? 'bg-gray-700 text-gray-400'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {p.phoneNumber ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs font-mono">
                      {p.externalId ? p.externalId.slice(0, 16) + '…' : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-400">
                Page {page} / {totalPages} — {total} paiements
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
