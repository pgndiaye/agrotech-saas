'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { paymentsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function SimulatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const paymentId = searchParams.get('paymentId');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!paymentId) {
      router.replace('/payments');
    }
  }, [paymentId, router]);

  async function handleConfirm() {
    if (!paymentId) return;
    setStatus('loading');
    try {
      const res = await paymentsApi.simulateConfirm(paymentId);
      setMessage(res.data.message);
      setStatus('success');
      // Mettre à jour le user dans le contexte (tenant.plan → PREMIUM)
      await refreshUser();
      setTimeout(() => { window.location.href = '/payments'; }, 12000);
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Erreur lors de la confirmation');
      setStatus('error');
    }
  }

  function handleCancel() {
    window.location.href = '/payments';
  }

  if (!paymentId) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* En-tête simulation */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Mode simulation</p>
            <h1 className="text-lg font-bold text-gray-900">Confirmation de paiement</h1>
          </div>
        </div>

        {/* Infos paiement */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Plan</span>
            <span className="font-semibold text-gray-900">Premium</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Montant</span>
            <span className="font-bold text-lg text-gray-900">12 000 FCFA</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Durée</span>
            <span className="font-semibold text-gray-900">1 mois</span>
          </div>
        </div>

        {/* Avertissement simulation */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-xs text-amber-800">
          Ceci est un <strong>environnement de test</strong>. Aucun vrai paiement ne sera effectué.
          Cliquez sur "Confirmer" pour simuler un paiement réussi.
        </div>

        {/* État succès */}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-green-700 font-semibold text-center">{message}</p>
            <p className="text-sm text-gray-500">Redirection en cours...</p>
          </div>
        )}

        {/* État erreur */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <XCircle className="w-16 h-16 text-red-500" />
            <p className="text-red-700 font-semibold text-center">{message}</p>
          </div>
        )}

        {/* Boutons */}
        {status !== 'success' && (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={status === 'loading'}
              className="flex-1 py-3 px-4 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmation...
                </>
              ) : (
                'Confirmer le paiement'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
