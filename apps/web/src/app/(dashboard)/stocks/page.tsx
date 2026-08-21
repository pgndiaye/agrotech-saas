'use client';
import { useEffect, useState } from 'react';
import { stocksApi } from '@/lib/api';
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, Trash2, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from '@/components/ui/Modal';

const CATEGORY_LABELS: Record<string, string> = {
  SEEDS: '🌱 Semences',
  FERTILIZER: '🧪 Engrais',
  HARVEST: '🌾 Récoltes',
  EQUIPMENT: '🔧 Équipement',
  OTHER: '📦 Autre',
};

const CATEGORY_COLORS: Record<string, string> = {
  SEEDS: 'bg-green-100 text-green-800',
  FERTILIZER: 'bg-blue-100 text-blue-800',
  HARVEST: 'bg-amber-100 text-amber-800',
  EQUIPMENT: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-purple-100 text-purple-800',
};

function StockModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', category: 'SEEDS', quantity: '', unit: 'kg', minQuantity: '0', description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await stocksApi.create({
        ...form,
        quantity: parseFloat(form.quantity),
        minQuantity: parseFloat(form.minQuantity),
      });
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
          <h2 className="text-lg font-bold">Nouveau stock</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Nom du produit</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Catégorie</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 outline-none">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Unité</label>
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Quantité initiale</label>
              <input type="number" min="0" step="0.01" required value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Seuil min. alerte</label>
              <input type="number" min="0" step="0.01" value={form.minQuantity}
                onChange={e => setForm({ ...form, minQuantity: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-60">
            {loading ? 'Ajout...' : 'Ajouter le stock'}
          </button>
        </form>
      </div>
    </div>
  );
}

function MovementModal({ stock, onClose, onSaved }: { stock: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ type: 'IN', quantity: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await stocksApi.addMovement(stock.id, { ...form, quantity: parseFloat(form.quantity) });
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Mouvement — {stock.name}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            {['IN', 'OUT'].map(t => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${form.type === t
                  ? t === 'IN' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                {t === 'IN' ? '📥 Entrée' : '📤 Sortie'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Quantité ({stock.unit})</label>
            <input type="number" min="0.01" step="0.01" required value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Note (optionnel)</label>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Ex: Livraison fournisseur" />
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

export default function StocksPage() {
  const toast = useToast();
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [movementStock, setMovementStock] = useState<any>(null);
  const [filter, setFilter] = useState('ALL');

  const fetchStocks = async () => {
    try {
      const res = await stocksApi.getAll();
      setStocks(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStocks(); }, []);

  // Ouvre la modale de confirmation ; la suppression est faite par confirmerSuppression.
  const handleDelete = (id: string) => setASupprimer(id);

  const confirmerSuppression = async () => {
    if (!aSupprimer) return;
    setSuppressionEnCours(true);
    try {
      await stocksApi.delete(aSupprimer);
      toast.succes('Stock supprimé');
      setASupprimer(null);
      fetchStocks();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la suppression');
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const filtered = filter === 'ALL' ? stocks : stocks.filter(s => s.category === filter);

  return (
    <div className="space-y-5">
      {aSupprimer && (
        <ConfirmDialog
          titre="Supprimer le stock"
          message="Ce stock et son historique de mouvements seront définitivement supprimés."
          libelleConfirmation="Supprimer"
          enCours={suppressionEnCours}
          onCancel={() => setASupprimer(null)}
          onConfirm={confirmerSuppression}
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Stocks</h1>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition">
          <Plus size={16} /> Nouveau stock
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', ...Object.keys(CATEGORY_LABELS)].map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${filter === cat
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-500'}`}>
            {cat === 'ALL' ? 'Tous' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Chargement des stocks...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucun stock trouvé</p>
          <button onClick={() => setShowAddModal(true)} className="text-primary-600 text-sm mt-2 hover:underline">
            Ajouter le premier stock
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((stock) => {
            const isLow = stock.quantity <= stock.minQuantity;
            return (
              <div key={stock.id} className={`bg-white rounded-2xl border p-4 shadow-sm ${isLow ? 'border-amber-300' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[stock.category]}`}>
                      {CATEGORY_LABELS[stock.category]}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-1.5">{stock.name}</h3>
                  </div>
                  {isLow && <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />}
                </div>
                <p className={`text-2xl font-bold ${isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                  {stock.quantity} <span className="text-sm font-normal text-gray-500">{stock.unit}</span>
                </p>
                {stock.minQuantity > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">Seuil min : {stock.minQuantity} {stock.unit}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setMovementStock(stock)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs border border-gray-200 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition">
                    <ArrowUp size={12} className="text-green-600" />
                    <ArrowDown size={12} className="text-red-500" />
                    Mouvement
                  </button>
                  <button onClick={() => handleDelete(stock.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && <StockModal onClose={() => setShowAddModal(false)} onSaved={fetchStocks} />}
      {movementStock && <MovementModal stock={movementStock} onClose={() => setMovementStock(null)} onSaved={fetchStocks} />}
    </div>
  );
}
