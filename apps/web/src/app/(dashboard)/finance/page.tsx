'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { financeApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Plus, TrendingUp, TrendingDown, Wallet, X, Trash2, Download, Lock } from 'lucide-react';

const FinanceBarChart = dynamic(() => import('./FinanceBarChart'), { ssr: false });

const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);

const INCOME_CATEGORIES = ['Vente Récoltes', 'Vente Semences', 'Subvention ONG', 'Autre revenu'];
const EXPENSE_CATEGORIES = ['Intrants agricoles', 'Main d\'œuvre', 'Transport', 'Équipement', 'Autre dépense'];

function TransactionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ type: 'INCOME', amount: '', category: '', description: '', date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = form.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await financeApi.create({ ...form, amount: parseFloat(form.amount) });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Nouvelle transaction</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            {(['INCOME', 'EXPENSE'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t, category: '' })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                  form.type === t
                    ? t === 'INCOME' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {t === 'INCOME' ? <><TrendingUp size={14} /> Revenu</> : <><TrendingDown size={14} /> Dépense</>}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Montant (FCFA)</label>
            <input type="number" min="1" step="1" required value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="250 000" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Catégorie</label>
            <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 outline-none">
              <option value="">Choisir...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description (optionnel)</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Détails de la transaction" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-60">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const toast = useToast();
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const { user } = useAuth();
  const isPremium = user?.tenant?.plan === 'PREMIUM';
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    if (!isPremium) return;
    setExporting(true);
    try {
      const res = await financeApi.exportCsv();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `finances-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silencieux
    } finally {
      setExporting(false);
    }
  };

  const fetchData = async () => {
    const [txRes, sumRes, monthRes] = await Promise.allSettled([
      financeApi.getAll(),
      financeApi.getSummary(),
      financeApi.getMonthly(),
    ]);
    if (txRes.status === 'fulfilled') setTransactions(txRes.value.data);
    if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
    if (monthRes.status === 'fulfilled') setMonthly(monthRes.value.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Ouvre la modale de confirmation ; la suppression est faite par confirmerSuppression.
  const handleDelete = (id: string) => setASupprimer(id);

  const confirmerSuppression = async () => {
    if (!aSupprimer) return;
    setSuppressionEnCours(true);
    try {
      await financeApi.delete(aSupprimer);
      toast.succes('Transaction supprimée');
      setASupprimer(null);
      fetchData();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la suppression');
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const filtered = filter === 'ALL' ? transactions : transactions.filter(t => t.type === filter);

  return (
    <div className="space-y-5">
      {aSupprimer && (
        <ConfirmDialog
          titre="Supprimer la transaction"
          message="Cette transaction sera définitivement supprimée."
          libelleConfirmation="Supprimer"
          enCours={suppressionEnCours}
          onCancel={() => setASupprimer(null)}
          onConfirm={confirmerSuppression}
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <div className="flex items-center gap-2">
          {isPremium ? (
            <button onClick={handleExportCsv} disabled={exporting}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 bg-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60">
              <Download size={16} /> {exporting ? 'Export...' : 'Exporter CSV'}
            </button>
          ) : (
            <div title="Disponible en plan Premium" className="flex items-center gap-2 border border-gray-200 text-gray-400 bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium cursor-not-allowed">
              <Lock size={14} /> Exporter CSV
            </div>
          )}
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition">
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Revenus', value: summary?.income, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Dépenses', value: summary?.expense, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Solde', value: summary?.balance, icon: Wallet, color: summary?.balance >= 0 ? 'text-primary-600' : 'text-red-600', bg: 'bg-primary-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value !== undefined ? formatFCFA(value) : '—'}</p>
          </div>
        ))}
      </div>

      {/* Graphique */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Évolution mensuelle</h2>
          <FinanceBarChart data={monthly} />
        </div>
      )}

      {/* Liste transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-2">
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {f === 'ALL' ? 'Tout' : f === 'INCOME' ? 'Revenus' : 'Dépenses'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucune transaction</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {tx.type === 'INCOME'
                    ? <TrendingUp size={16} className="text-green-600" />
                    : <TrendingDown size={16} className="text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{tx.category}</p>
                  <p className="text-xs text-gray-400">
                    {tx.description || '—'} · {new Date(tx.date).toLocaleDateString('fr-SN')}
                  </p>
                </div>
                <p className={`font-bold text-sm ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatFCFA(tx.amount)}
                </p>
                <button onClick={() => handleDelete(tx.id)} className="text-gray-300 hover:text-red-500 transition ml-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analyse par catégorie — Premium uniquement */}
      {isPremium && summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-gray-900">Analyse par catégorie</h2>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Premium</span>
          </div>
          <div className="space-y-3">
            {Object.entries(summary.byCategory as Record<string, { income: number; expense: number }>)
              .sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
              .map(([cat, vals]) => {
                const total = vals.income + vals.expense;
                const maxTotal = Math.max(...Object.values(summary.byCategory as Record<string, { income: number; expense: number }>).map(v => v.income + v.expense));
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{cat}</span>
                      <div className="flex gap-3 text-xs">
                        {vals.income > 0 && <span className="text-green-600">+{formatFCFA(vals.income)}</span>}
                        {vals.expense > 0 && <span className="text-red-500">-{formatFCFA(vals.expense)}</span>}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-primary-500 rounded-full"
                        style={{ width: `${(total / maxTotal) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {!isPremium && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-yellow-600" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Analyse par catégorie & Export CSV</p>
              <p className="text-xs text-gray-500 mt-0.5">Disponibles avec le plan Premium</p>
            </div>
          </div>
          <a href="/payments" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition">
            Passer Premium
          </a>
        </div>
      )}

      {showModal && <TransactionModal onClose={() => setShowModal(false)} onSaved={fetchData} />}
    </div>
  );
}
