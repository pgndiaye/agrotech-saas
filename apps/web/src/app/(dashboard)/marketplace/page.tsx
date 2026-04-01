'use client';
import { useEffect, useState } from 'react';
import { marketplaceApi } from '@/lib/api';
import { Plus, ShoppingBag, X, CheckCircle, Trash2, Store } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  SEEDS: '🌱 Semences',
  FERTILIZER: '🧪 Engrais',
  HARVEST: '🌾 Récoltes',
  EQUIPMENT: '🔧 Équipement',
  OTHER: '📦 Autre',
};

const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);

function CreateListingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', price: '', unit: 'kg', quantity: '', category: 'HARVEST',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await marketplaceApi.create({ ...form, price: parseFloat(form.price), quantity: parseFloat(form.quantity) });
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
          <h2 className="text-lg font-bold">Publier une annonce</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Titre de l'annonce</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Tomates fraîches — Qualité premium" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Catégorie</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 outline-none">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Prix (FCFA)</label>
              <input type="number" min="1" required value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">/ Unité</label>
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Quantité disponible</label>
            <input type="number" min="0.01" step="0.01" required value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description (optionnel)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-60">
            {loading ? 'Publication...' : 'Publier l\'annonce'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'market' | 'my'>('market');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchData = async () => {
    const [allRes, myRes] = await Promise.allSettled([
      marketplaceApi.getAll(),
      marketplaceApi.getMy(),
    ]);
    if (allRes.status === 'fulfilled') setListings(allRes.value.data);
    if (myRes.status === 'fulfilled') setMyListings(myRes.value.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSold = async (id: string) => {
    await marketplaceApi.markSold(id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await marketplaceApi.delete(id);
    fetchData();
  };

  const displayed = tab === 'market'
    ? (categoryFilter === 'ALL' ? listings : listings.filter(l => l.category === categoryFilter))
    : myListings;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 transition">
          <Plus size={16} /> Publier une annonce
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['market', 'my'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'market' ? '🏪 Marché' : '📋 Mes annonces'}
          </button>
        ))}
      </div>

      {/* Filtres catégorie */}
      {tab === 'market' && (
        <div className="flex gap-2 flex-wrap">
          {['ALL', ...Object.keys(CATEGORY_LABELS)].map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                categoryFilter === cat ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-500'}`}>
              {cat === 'ALL' ? 'Toutes catégories' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Annonces */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">Chargement...</p>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Store size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {tab === 'market' ? 'Aucune annonce disponible' : 'Vous n\'avez pas encore d\'annonces'}
          </p>
          <button onClick={() => setShowModal(true)} className="text-primary-600 text-sm mt-2 hover:underline">
            Publier une annonce
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((listing) => (
            <div key={listing.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${
              listing.status === 'SOLD' ? 'opacity-60 border-gray-100' : 'border-gray-100 hover:shadow-md transition-shadow'}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium">
                  {CATEGORY_LABELS[listing.category]}
                </span>
                {listing.status === 'SOLD' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Vendu</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mt-2">{listing.title}</h3>
              {listing.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{listing.description}</p>
              )}
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary-700">{formatFCFA(listing.price)}</span>
                <span className="text-xs text-gray-400">/ {listing.unit}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Disponible : {listing.quantity} {listing.unit}</p>
              {listing.tenant && (
                <p className="text-xs text-gray-400 mt-0.5">Par : {listing.tenant.name}</p>
              )}

              {tab === 'my' && listing.status === 'ACTIVE' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleSold(listing.id)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs border border-green-300 text-green-700 py-1.5 rounded-lg hover:bg-green-50 transition">
                    <CheckCircle size={12} /> Marquer vendu
                  </button>
                  <button onClick={() => handleDelete(listing.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && <CreateListingModal onClose={() => setShowModal(false)} onSaved={fetchData} />}
    </div>
  );
}
