'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Tag, AlertCircle, Pencil, Infinity as InfiniteIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  Badge,
  Bouton,
  Carte,
  Champ,
  ChargementCentre,
  MessageErreur,
} from '@/components/ui/primitives';
import { AdminPageHeader } from '@/components/admin';
import { formatXof } from '@/lib/format';
import { useToast } from '@/context/ToastContext';

interface PlanConfig {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  priceXof: number;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  quotas: Record<string, number>;
  features: Record<string, boolean>;
}

const LIBELLES_QUOTA: Record<string, string> = {
  users: 'Utilisateurs',
  stocks: 'Stocks',
  listings: 'Annonces actives',
  smsPerMonth: 'SMS par mois',
};

const LIBELLES_FEATURE: Record<string, string> = {
  exportCsv: 'Export CSV',
  smsAlerts: 'Alertes SMS',
  marketplacePublish: 'Publication marketplace',
  aiRecommendations: 'Conseils IA',
};

const valeurQuota = (v: number) =>
  v < 0 ? <InfiniteIcon size={13} className="inline text-green-400" /> : v;

export default function AdminPlansPage() {
  const toast = useToast();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [edite, setEdite] = useState<PlanConfig | null>(null);
  const [enCours, setEnCours] = useState(false);

  // État du formulaire d'édition
  const [prix, setPrix] = useState('0');
  const [label, setLabel] = useState('');
  const [quotas, setQuotas] = useState<Record<string, string>>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');
    try {
      const res = await adminApi.getPlans();
      setPlans(res.data);
    } catch {
      setErreur('Impossible de charger le catalogue tarifaire');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const ouvrir = (p: PlanConfig) => {
    setEdite(p);
    setPrix(String(p.priceXof));
    setLabel(p.label);
    setQuotas(
      Object.fromEntries(Object.entries(p.quotas ?? {}).map(([k, v]) => [k, String(v)])),
    );
    setFeatures({ ...(p.features ?? {}) });
  };

  const enregistrer = async () => {
    if (!edite) return;
    setEnCours(true);
    try {
      await adminApi.updatePlan(edite.id, {
        label,
        priceXof: Number(prix),
        quotas: Object.fromEntries(
          Object.entries(quotas).map(([k, v]) => [k, Number(v)]),
        ),
        features,
      });
      toast.succes(
        `Plan ${edite.code} mis à jour — le nouveau prix s'applique immédiatement`,
      );
      setEdite(null);
      await charger();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la mise à jour');
    } finally {
      setEnCours(false);
    }
  };

  if (loading) return <ChargementCentre ton="sombre" />;

  return (
    <div className="p-8 text-white">
      <AdminPageHeader
        titre="Plans tarifaires"
        sousTitre="Prix, quotas et fonctionnalités — appliqués sans redéploiement"
      />

      <MessageErreur>
        {erreur && (
          <>
            <AlertCircle size={18} /> {erreur}
          </>
        )}
      </MessageErreur>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {plans.map((p) => (
          <Carte key={p.id} ton="sombre" className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{p.label}</h2>
                  <Badge classe="bg-gray-700 text-gray-300">{p.code}</Badge>
                  {!p.isPublic && (
                    <Badge classe="bg-gray-700 text-gray-400">Non public</Badge>
                  )}
                  {!p.isActive && (
                    <Badge classe="bg-red-500/20 text-red-300">Inactif</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold mt-2">
                  {p.priceXof === 0 ? 'Gratuit' : formatXof(p.priceXof)}
                  {p.priceXof > 0 && (
                    <span className="text-sm font-normal text-gray-500"> /mois</span>
                  )}
                </p>
                {p.description && (
                  <p className="text-xs text-gray-500 mt-1">{p.description}</p>
                )}
              </div>
              <Bouton variante="secondaire" ton="sombre" onClick={() => ouvrir(p)}>
                <Pencil size={14} /> Modifier
              </Bouton>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                  Quotas
                </p>
                <ul className="space-y-1">
                  {Object.entries(p.quotas ?? {}).map(([k, v]) => (
                    <li key={k} className="flex justify-between text-xs">
                      <span className="text-gray-400">{LIBELLES_QUOTA[k] ?? k}</span>
                      <span className="text-gray-200">{valeurQuota(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                  Fonctionnalités
                </p>
                <ul className="space-y-1">
                  {Object.entries(p.features ?? {}).map(([k, v]) => (
                    <li key={k} className="flex justify-between text-xs">
                      <span className="text-gray-400">{LIBELLES_FEATURE[k] ?? k}</span>
                      <span className={v ? 'text-green-400' : 'text-gray-600'}>
                        {v ? 'Oui' : 'Non'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Carte>
        ))}
      </div>

      {edite && (
        <Modal
          ton="sombre"
          largeur="max-w-lg"
          titre={`Modifier le plan ${edite.code}`}
          onClose={() => setEdite(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Libellé</label>
              <Champ ton="sombre" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Prix mensuel en XOF (entier)
              </label>
              <Champ
                ton="sombre"
                type="number"
                min={0}
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
              />
              <p className="text-xs text-gray-600 mt-1">
                S'applique immédiatement aux nouveaux paiements, sans redémarrage.
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Quotas (−1 = illimité)</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(quotas).map((k) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-500 mb-1">
                      {LIBELLES_QUOTA[k] ?? k}
                    </label>
                    <Champ
                      ton="sombre"
                      type="number"
                      value={quotas[k]}
                      onChange={(e) => setQuotas((p) => ({ ...p, [k]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Fonctionnalités</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(features).map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={features[k]}
                      onChange={(e) =>
                        setFeatures((p) => ({ ...p, [k]: e.target.checked }))
                      }
                      className="rounded border-gray-700 bg-gray-900"
                    />
                    {LIBELLES_FEATURE[k] ?? k}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Bouton variante="secondaire" ton="sombre" onClick={() => setEdite(null)}>
                Annuler
              </Bouton>
              <Bouton ton="sombre" onClick={enregistrer} disabled={enCours}>
                {enCours ? 'Enregistrement…' : 'Enregistrer'}
              </Bouton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
