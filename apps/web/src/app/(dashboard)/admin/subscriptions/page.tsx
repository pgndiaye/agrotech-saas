'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  CreditCard,
  AlertCircle,
  Gift,
  XCircle,
  PlayCircle,
  Building2,
} from 'lucide-react';
import { usePaginatedResource } from '@/hooks/usePaginatedResource';
import { DataTable, Pagination, type Colonne } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import {
  Badge,
  Bouton,
  Champ,
  MessageErreur,
  Selecteur,
} from '@/components/ui/primitives';
import { AdminPageHeader, CelluleIdentite, PlanBadge } from '@/components/admin';
import { formatDate } from '@/lib/format';
import { useToast } from '@/context/ToastContext';

interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  tenant: { id: string; name: string; slug: string; plan: string; status: string };
}

const STYLES_STATUT: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-300',
  EXPIRED: 'bg-orange-500/20 text-orange-300',
  CANCELLED: 'bg-gray-600/30 text-gray-400',
  PENDING: 'bg-yellow-500/20 text-yellow-300',
};

const LIBELLES_STATUT: Record<string, string> = {
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  CANCELLED: 'Annulé',
  PENDING: 'En attente',
};

/** Jours restants avant échéance ; négatif si déjà dépassée. */
function joursRestants(endDate?: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

export default function AdminSubscriptionsPage() {
  const toast = useToast();
  const router = useRouter();

  const [statut, setStatut] = useState('');
  const [expirant, setExpirant] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [aOffrir, setAOffrir] = useState<Subscription | null>(null);
  const [aAnnuler, setAAnnuler] = useState<Subscription | null>(null);
  const [planOffert, setPlanOffert] = useState('PREMIUM');
  const [mois, setMois] = useState('1');
  const [motif, setMotif] = useState('');

  const charger = useCallback(
    (page: number, limit: number) =>
      adminApi.getSubscriptions({
        page,
        limit,
        status: statut || undefined,
        expiringInDays: expirant ? Number(expirant) : undefined,
      }),
    [statut, expirant],
  );

  const { items, total, page, setPage, totalPages, loading, erreur, rafraichir } =
    usePaginatedResource<Subscription>(charger, {
      messageErreur: 'Impossible de charger les abonnements',
    });

  useEffect(() => {
    setPage(1);
  }, [statut, expirant, setPage]);

  const lancerExpiration = async () => {
    setEnCours(true);
    try {
      const res = await adminApi.runExpiration();
      const n = res.data.expires;
      toast.succes(
        n > 0
          ? `${n} abonnement(s) expiré(s) — coopératives repassées en Gratuit`
          : 'Aucun abonnement échu à traiter',
      );
      await rafraichir();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? "Erreur lors de l'expiration");
    } finally {
      setEnCours(false);
    }
  };

  const offrir = async () => {
    if (!aOffrir) return;
    setEnCours(true);
    try {
      await adminApi.grantSubscription(aOffrir.tenantId, {
        plan: planOffert,
        months: Number(mois),
        reason: motif,
      });
      toast.succes(`${mois} mois de ${planOffert} accordés à « ${aOffrir.tenant.name} »`);
      setAOffrir(null);
      setMotif('');
      await rafraichir();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? "Erreur lors de l'attribution");
    } finally {
      setEnCours(false);
    }
  };

  const annuler = async () => {
    if (!aAnnuler) return;
    setEnCours(true);
    try {
      await adminApi.cancelSubscription(aAnnuler.tenantId, motif);
      toast.succes(`Abonnement de « ${aAnnuler.tenant.name} » annulé`);
      setAAnnuler(null);
      setMotif('');
      await rafraichir();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? "Erreur lors de l'annulation");
    } finally {
      setEnCours(false);
    }
  };

  const colonnes: Colonne<Subscription>[] = [
    {
      cle: 'tenant',
      entete: 'Coopérative',
      rendu: (s) => (
        <CelluleIdentite
          titre={s.tenant?.name ?? '—'}
          sousTitre={s.tenant?.slug}
          couleurIcone="bg-blue-600/20"
          icone={<Building2 size={14} className="text-blue-400" />}
        />
      ),
    },
    { cle: 'plan', entete: 'Plan', rendu: (s) => <PlanBadge plan={s.plan} /> },
    {
      cle: 'status',
      entete: 'Statut',
      alignement: 'centre',
      rendu: (s) => (
        <Badge classe={STYLES_STATUT[s.status] ?? 'bg-gray-700 text-gray-400'}>
          {LIBELLES_STATUT[s.status] ?? s.status}
        </Badge>
      ),
    },
    {
      cle: 'startDate',
      entete: 'Début',
      className: 'text-gray-400 text-xs',
      rendu: (s) => formatDate(s.startDate),
    },
    {
      cle: 'endDate',
      entete: 'Échéance',
      rendu: (s) => {
        const j = joursRestants(s.endDate);
        if (j === null) return <span className="text-gray-500 text-xs">Sans échéance</span>;
        return (
          <div className="text-xs">
            <p className="text-gray-300">{formatDate(s.endDate!)}</p>
            <p
              className={
                j < 0 ? 'text-red-400' : j <= 7 ? 'text-orange-400' : 'text-gray-500'
              }
            >
              {j < 0 ? `échue depuis ${-j} j` : `dans ${j} j`}
            </p>
          </div>
        );
      },
    },
    {
      cle: 'actions',
      entete: 'Actions',
      alignement: 'droite',
      rendu: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setAOffrir(s);
              setMotif('');
              setMois('1');
              setPlanOffert('PREMIUM');
            }}
            title="Offrir un abonnement"
            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition"
          >
            <Gift size={14} />
          </button>
          {s.status === 'ACTIVE' && (
            <button
              onClick={() => {
                setAAnnuler(s);
                setMotif('');
              }}
              title="Annuler l'abonnement"
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 text-white">
      <AdminPageHeader
        titre="Abonnements"
        sousTitre={`${total} abonnement${total > 1 ? 's' : ''}`}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Selecteur
          ton="sombre"
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="EXPIRED">Expirés</option>
          <option value="CANCELLED">Annulés</option>
        </Selecteur>
        <Selecteur
          ton="sombre"
          value={expirant}
          onChange={(e) => setExpirant(e.target.value)}
          aria-label="Filtrer par échéance"
        >
          <option value="">Toutes les échéances</option>
          <option value="7">Expire sous 7 jours</option>
          <option value="30">Expire sous 30 jours</option>
          <option value="90">Expire sous 90 jours</option>
        </Selecteur>

        <div className="ml-auto">
          <Bouton
            variante="secondaire"
            ton="sombre"
            onClick={lancerExpiration}
            disabled={enCours}
            title="Traite les abonnements échus sans attendre le cron de 2 h"
          >
            <PlayCircle size={15} /> Lancer l'expiration
          </Bouton>
        </div>
      </div>

      <MessageErreur>
        {erreur && (
          <>
            <AlertCircle size={18} /> {erreur}
          </>
        )}
      </MessageErreur>

      <DataTable
        ton="sombre"
        colonnes={colonnes}
        lignes={items}
        loading={loading}
        messageVide="Aucun abonnement"
        iconeVide={<CreditCard size={40} />}
        onLigneClick={(s) => router.push(`/admin/tenants/${s.tenantId}`)}
      />

      <Pagination
        ton="sombre"
        page={page}
        totalPages={totalPages}
        total={total}
        libelle="abonnements"
        onChange={setPage}
      />

      {aOffrir && (
        <Modal ton="sombre" titre="Offrir un abonnement" onClose={() => setAOffrir(null)}>
          <p className="text-sm text-gray-300 mb-4">
            Accorde un plan à « <strong>{aOffrir.tenant.name}</strong> » sans paiement. Le
            temps restant est conservé et prolongé.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Plan</label>
              <Selecteur
                ton="sombre"
                value={planOffert}
                onChange={(e) => setPlanOffert(e.target.value)}
                className="w-full"
              >
                <option value="PREMIUM">Premium</option>
                <option value="FREE">Gratuit</option>
              </Selecteur>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Durée (mois)</label>
              <Champ
                ton="sombre"
                type="number"
                min={1}
                max={36}
                value={mois}
                onChange={(e) => setMois(e.target.value)}
              />
            </div>
          </div>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="motif-offre">
            Motif (conservé dans le journal d'audit)
          </label>
          <Champ
            id="motif-offre"
            ton="sombre"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. : geste commercial suite à incident"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Bouton variante="secondaire" ton="sombre" onClick={() => setAOffrir(null)}>
              Annuler
            </Bouton>
            <Bouton
              ton="sombre"
              onClick={offrir}
              disabled={enCours || motif.trim().length < 3 || Number(mois) < 1}
            >
              {enCours ? 'En cours…' : 'Accorder'}
            </Bouton>
          </div>
        </Modal>
      )}

      {aAnnuler && (
        <Modal ton="sombre" titre="Annuler l'abonnement" onClose={() => setAAnnuler(null)}>
          <p className="text-sm text-gray-300 mb-4">
            « <strong>{aAnnuler.tenant.name}</strong> » repassera immédiatement en plan
            Gratuit et perdra les fonctionnalités Premium.
          </p>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="motif-annulation">
            Motif (conservé dans le journal d'audit)
          </label>
          <Champ
            id="motif-annulation"
            ton="sombre"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. : résiliation demandée"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <Bouton variante="secondaire" ton="sombre" onClick={() => setAAnnuler(null)}>
              Retour
            </Bouton>
            <Bouton
              variante="danger"
              ton="sombre"
              onClick={annuler}
              disabled={enCours || motif.trim().length < 3}
            >
              {enCours ? 'En cours…' : 'Annuler l’abonnement'}
            </Bouton>
          </div>
        </Modal>
      )}
    </div>
  );
}
