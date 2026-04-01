'use client';
import { useEffect, useState } from 'react';
import { paymentsApi } from '@/lib/api';
import { CreditCard, CheckCircle, XCircle, Clock, Zap, Shield, Star, Phone, ExternalLink, RefreshCw } from 'lucide-react';

const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SUCCEEDED: { label: 'Réussi', color: 'text-green-600 bg-green-50', icon: <CheckCircle size={14} /> },
  PENDING:   { label: 'En attente', color: 'text-yellow-600 bg-yellow-50', icon: <Clock size={14} /> },
  FAILED:    { label: 'Échoué', color: 'text-red-600 bg-red-50', icon: <XCircle size={14} /> },
  CANCELLED: { label: 'Annulé', color: 'text-gray-500 bg-gray-100', icon: <XCircle size={14} /> },
};

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  WAVE:         { label: 'Wave', color: 'text-blue-600 bg-blue-50' },
  ORANGE_MONEY: { label: 'Orange Money', color: 'text-orange-600 bg-orange-50' },
};

function PaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [provider, setProvider] = useState<'WAVE' | 'ORANGE_MONEY'>('WAVE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableProviders, setAvailableProviders] = useState<{ WAVE: boolean; ORANGE_MONEY: boolean; simulation: boolean }>({ WAVE: true, ORANGE_MONEY: true, simulation: false });

  useEffect(() => {
    paymentsApi.getProviders().then((res) => {
      setAvailableProviders(res.data);
      // Sélectionner automatiquement le premier provider disponible
      if (!res.data.WAVE && res.data.ORANGE_MONEY) setProvider('ORANGE_MONEY');
    }).catch(() => {});
  }, []);

  const amount = 2000; // 2 000 XOF/mois

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await paymentsApi.initiate({
        provider,
        amount,
        phoneNumber: provider === 'ORANGE_MONEY' ? phoneNumber : undefined,
        successUrl: `${window.location.origin}/dashboard/payments?success=true`,
        errorUrl: `${window.location.origin}/dashboard/payments?error=true`,
      });
      const data = res.data;
      // Redirection vers la page de paiement externe
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'initiation du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Passer au plan Premium</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">Plan Premium — 1 mois</span>
            <span className="text-lg font-bold text-green-700">{formatFCFA(amount)}</span>
          </div>
          <p className="text-xs text-green-600 mt-1">Renouvellement mensuel, annulable à tout moment</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {availableProviders.simulation && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800 flex items-center gap-2">
            <span>🧪</span>
            <span><strong>Mode simulation</strong> — Aucun vrai paiement ne sera débité.</span>
          </div>
        )}

        {!availableProviders.WAVE && !availableProviders.ORANGE_MONEY && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
            Aucun moyen de paiement n&apos;est configuré. Contactez l&apos;administrateur.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Moyen de paiement</label>
            <div className="grid grid-cols-2 gap-3">
              {(['WAVE', 'ORANGE_MONEY'] as const).map((p) => {
                const available = availableProviders[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => available && setProvider(p)}
                    disabled={!available}
                    title={!available ? `${p === 'WAVE' ? 'Wave' : 'Orange Money'} non configuré` : undefined}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition flex flex-col items-center gap-1.5 ${
                      !available
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                        : provider === p
                        ? p === 'WAVE'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {p === 'WAVE' ? (
                      <>
                        <span className="text-xl">🌊</span>
                        <span>Wave</span>
                        {!available && <span className="text-[10px] text-gray-400">Non configuré</span>}
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🟠</span>
                        <span>Orange Money</span>
                        {!available && <span className="text-[10px] text-gray-400">Non configuré</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {provider === 'ORANGE_MONEY' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                <Phone size={14} className="inline mr-1" />
                Numéro Orange Money
              </label>
              <input
                type="tel"
                required
                placeholder="+221 77 123 45 67"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          )}

          {provider === 'WAVE' && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <ExternalLink size={12} className="inline mr-1" />
              Vous serez redirigé vers la page de paiement sécurisée Wave.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !availableProviders[provider]}
            className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition ${
              provider === 'WAVE'
                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
                : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" /> Traitement...
              </span>
            ) : (
              `Payer ${formatFCFA(amount)} via ${provider === 'WAVE' ? 'Wave' : 'Orange Money'}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [subRes, histRes] = await Promise.all([
        paymentsApi.getSubscription(),
        paymentsApi.getHistory(),
      ]);
      setSubscription(subRes.data);
      setHistory(histRes.data);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Détecter retour depuis page de paiement
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      load();
    }
  }, []);

  const isPremium = subscription?.plan === 'PREMIUM' && subscription?.status === 'ACTIVE';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonnements & Paiements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez votre plan et vos transactions</p>
        </div>
        <CreditCard size={28} className="text-green-600" />
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan FREE */}
        <div className={`rounded-2xl border-2 p-5 transition ${!isPremium ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Plan Gratuit</h3>
              <p className="text-2xl font-bold text-gray-800 mt-1">0 FCFA <span className="text-sm font-normal text-gray-400">/mois</span></p>
            </div>
            <Shield size={28} className="text-gray-400" />
          </div>
          <ul className="space-y-2 mb-5">
            {['Météo en temps réel', 'Gestion des stocks', 'Finance de base', 'Marketplace limité'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle size={14} className="text-green-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {!isPremium && (
            <div className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg text-center">
              Plan actuel
            </div>
          )}
        </div>

        {/* Plan PREMIUM */}
        <div className={`rounded-2xl border-2 p-5 transition ${isPremium ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-lg">Plan Premium</h3>
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {formatFCFA(2000)} <span className="text-sm font-normal text-gray-400">/mois</span>
              </p>
            </div>
            <Zap size={28} className="text-yellow-500" />
          </div>
          <ul className="space-y-2 mb-5">
            {[
              'Tout du plan Gratuit',
              'Marketplace illimité',
              'Finance avancée + exports',
              'Multi-utilisateurs',
              'Support prioritaire',
              'Intégration Wave & Orange Money',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle size={14} className="text-yellow-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {isPremium ? (
            <div className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1.5 rounded-lg text-center">
              Plan actuel —{' '}
              {subscription?.endDate
                ? `expire le ${new Date(subscription.endDate).toLocaleDateString('fr-SN')}`
                : 'actif'}
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-2.5 rounded-xl text-sm transition"
            >
              Passer au Premium
            </button>
          )}
        </div>
      </div>

      {/* Historique des paiements */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historique des paiements</h2>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((p: any) => {
              const status = STATUS_LABELS[p.status] ?? STATUS_LABELS['PENDING'];
              const provider = PROVIDER_LABELS[p.provider] ?? { label: p.provider, color: 'text-gray-600 bg-gray-100' };
              return (
                <div key={p.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-base">
                      {p.provider === 'WAVE' ? '🌊' : '🟠'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Abonnement Premium
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(p.createdAt).toLocaleDateString('fr-SN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${provider.color}`}>
                      {provider.label}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatFCFA(p.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <PaymentModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
