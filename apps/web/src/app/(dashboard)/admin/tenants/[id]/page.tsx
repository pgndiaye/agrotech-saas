'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import {
  Building2,
  ChevronLeft,
  Users,
  CreditCard,
  ScrollText,
  Package,
  TrendingUp,
  ShoppingBag,
  MessageSquare,
  Ban,
  RotateCcw,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  Bouton,
  Carte,
  Champ,
  ChargementCentre,
  EtatVide,
  Badge,
} from '@/components/ui/primitives';
import {
  PlanBadge,
  RoleBadge,
  StatutCompteBadge,
  StatutPaiementBadge,
  FournisseurBadge,
  CelluleIdentite,
} from '@/components/admin';
import { TenantForm, type ValeursTenant } from '@/components/admin/TenantForm';
import { formatDate, formatDateHeure, formatXof, formatId } from '@/lib/format';
import { useToast } from '@/context/ToastContext';

type Onglet = 'apercu' | 'membres' | 'paiements' | 'journal';

const ONGLETS: { cle: Onglet; label: string; icone: React.ReactNode }[] = [
  { cle: 'apercu', label: "Vue d'ensemble", icone: <Building2 size={15} /> },
  { cle: 'membres', label: 'Utilisateurs', icone: <Users size={15} /> },
  { cle: 'paiements', label: 'Paiements', icone: <CreditCard size={15} /> },
  { cle: 'journal', label: 'Journal', icone: <ScrollText size={15} /> },
];

function CarteUsage({
  label,
  valeur,
  icone,
  couleur,
}: {
  label: string;
  valeur: number;
  icone: React.ReactNode;
  couleur: string;
}) {
  return (
    <Carte ton="sombre" className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${couleur}`}>
          {icone}
        </div>
        <div>
          <p className="text-xl font-bold text-white">{valeur}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Carte>
  );
}

function LigneInfo({ label, valeur }: { label: string; valeur?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-200 text-right">{valeur || '—'}</span>
    </div>
  );
}

export default function AdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [tenant, setTenant] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [onglet, setOnglet] = useState<Onglet>('apercu');

  const [edition, setEdition] = useState(false);
  const [aSuspendre, setASuspendre] = useState(false);
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');
    try {
      const [detail, volumetrie] = await Promise.all([
        adminApi.getTenant(id),
        adminApi.getTenantUsage(id),
      ]);
      setTenant(detail.data);
      setUsage(volumetrie.data);
    } catch (err: any) {
      setErreur(
        err.response?.status === 404
          ? 'Coopérative introuvable'
          : 'Impossible de charger la coopérative',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const enregistrer = async (v: ValeursTenant) => {
    try {
      await adminApi.updateTenant(id, {
        name: v.name,
        plan: v.plan,
        contactEmail: v.contactEmail || undefined,
        contactPhone: v.contactPhone || undefined,
        region: v.region || undefined,
        notes: v.notes || undefined,
      });
      toast.succes('Coopérative mise à jour');
      setEdition(false);
      await charger();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la mise à jour');
    }
  };

  const suspendre = async () => {
    setEnCours(true);
    try {
      await adminApi.suspendTenant(id, motif);
      toast.succes('Coopérative suspendue — accès coupé immédiatement');
      setASuspendre(false);
      setMotif('');
      await charger();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la suspension');
    } finally {
      setEnCours(false);
    }
  };

  const reactiver = async () => {
    try {
      await adminApi.reactivateTenant(id);
      toast.succes('Coopérative réactivée');
      await charger();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la réactivation');
    }
  };

  if (loading) return <ChargementCentre ton="sombre" />;

  if (erreur) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <AlertCircle size={20} /> {erreur}
        </div>
        <Bouton variante="secondaire" ton="sombre" onClick={() => router.push('/admin/tenants')}>
          <ChevronLeft size={15} /> Retour à la liste
        </Bouton>
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-5 transition"
      >
        <ChevronLeft size={15} /> Coopératives
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tenant.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm text-gray-500 font-mono">{tenant.slug}</span>
              <PlanBadge plan={tenant.plan} />
              <StatutCompteBadge statut={tenant.status} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Bouton variante="secondaire" ton="sombre" onClick={() => setEdition(true)}>
            <Pencil size={15} /> Modifier
          </Bouton>
          {tenant.status === 'ACTIVE' ? (
            <Bouton variante="danger" ton="sombre" onClick={() => setASuspendre(true)}>
              <Ban size={15} /> Suspendre
            </Bouton>
          ) : tenant.status === 'SUSPENDED' ? (
            <Bouton ton="sombre" onClick={reactiver}>
              <RotateCcw size={15} /> Réactiver
            </Bouton>
          ) : null}
        </div>
      </div>

      {tenant.status === 'SUSPENDED' && tenant.suspendedReason && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 mb-6 text-sm text-orange-300">
          <strong>Suspendue</strong> le {formatDate(tenant.suspendedAt)} — {tenant.suspendedReason}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <CarteUsage
          label="Membres"
          valeur={usage?.users ?? 0}
          icone={<Users size={16} className="text-indigo-300" />}
          couleur="bg-indigo-600/20"
        />
        <CarteUsage
          label="Stocks"
          valeur={usage?.stocks ?? 0}
          icone={<Package size={16} className="text-blue-300" />}
          couleur="bg-blue-600/20"
        />
        <CarteUsage
          label="Transactions"
          valeur={usage?.transactions ?? 0}
          icone={<TrendingUp size={16} className="text-green-300" />}
          couleur="bg-green-600/20"
        />
        <CarteUsage
          label="Annonces"
          valeur={usage?.listings ?? 0}
          icone={<ShoppingBag size={16} className="text-yellow-300" />}
          couleur="bg-yellow-600/20"
        />
        <CarteUsage
          label="SMS envoyés"
          valeur={usage?.smsLogs ?? 0}
          icone={<MessageSquare size={16} className="text-purple-300" />}
          couleur="bg-purple-600/20"
        />
      </div>

      <div className="flex gap-1 border-b border-gray-800 mb-5">
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            onClick={() => setOnglet(o.cle)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              onglet === o.cle
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {o.icone}
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'apercu' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Carte ton="sombre" className="p-5">
            <h2 className="font-semibold mb-3">Fiche</h2>
            <LigneInfo label="Nom" valeur={tenant.name} />
            <LigneInfo label="Slug" valeur={<code className="font-mono">{tenant.slug}</code>} />
            <LigneInfo label="Région" valeur={tenant.region} />
            <LigneInfo label="E-mail de contact" valeur={tenant.contactEmail} />
            <LigneInfo label="Téléphone" valeur={tenant.contactPhone} />
            <LigneInfo label="Créée le" valeur={formatDate(tenant.createdAt)} />
            {tenant.notes && (
              <div className="mt-3 pt-3 border-t border-gray-800/60">
                <p className="text-xs text-gray-500 mb-1">Notes internes</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{tenant.notes}</p>
              </div>
            )}
          </Carte>

          <Carte ton="sombre" className="p-5">
            <h2 className="font-semibold mb-3">Abonnement</h2>
            {tenant.subscription ? (
              <>
                <LigneInfo label="Plan" valeur={<PlanBadge plan={tenant.subscription.plan} />} />
                <LigneInfo label="Statut" valeur={tenant.subscription.status} />
                <LigneInfo label="Début" valeur={formatDate(tenant.subscription.startDate)} />
                <LigneInfo
                  label="Échéance"
                  valeur={
                    tenant.subscription.endDate
                      ? formatDate(tenant.subscription.endDate)
                      : 'Sans échéance'
                  }
                />
              </>
            ) : (
              <EtatVide message="Aucun abonnement — plan gratuit" ton="sombre" />
            )}
          </Carte>
        </div>
      )}

      {onglet === 'membres' && (
        <Carte ton="sombre">
          {tenant.users?.length ? (
            <div className="divide-y divide-gray-800/60">
              {tenant.users.map((u: any) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-gray-800/30 transition"
                >
                  <CelluleIdentite
                    titre={u.name}
                    sousTitre={u.email}
                    couleurIcone="bg-indigo-600/20"
                    icone={
                      <span className="text-xs font-bold text-indigo-300">
                        {u.name?.charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleBadge role={u.role} />
                    <StatutCompteBadge statut={u.status} />
                    <span className="text-xs text-gray-500 w-24 text-right">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Jamais connecté'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EtatVide message="Aucun membre" icone={<Users size={40} />} ton="sombre" />
          )}
        </Carte>
      )}

      {onglet === 'paiements' && (
        <Carte ton="sombre">
          {tenant.payments?.length ? (
            <div className="divide-y divide-gray-800/60">
              {tenant.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{formatXof(p.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDateHeure(p.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FournisseurBadge fournisseur={p.provider} />
                    <StatutPaiementBadge statut={p.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EtatVide message="Aucun paiement" icone={<CreditCard size={40} />} ton="sombre" />
          )}
        </Carte>
      )}

      {onglet === 'journal' && (
        <Carte ton="sombre">
          {tenant.auditLogs?.length ? (
            <div className="divide-y divide-gray-800/60">
              {tenant.auditLogs.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <Badge
                      classe={
                        l.status === 'FAILURE'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }
                    >
                      {l.action}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {l.actorEmail ?? 'Système'} · {formatId(l.ip, 20)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatDateHeure(l.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EtatVide
              message="Aucune action d'administration enregistrée"
              icone={<ScrollText size={40} />}
              ton="sombre"
            />
          )}
        </Carte>
      )}

      {edition && (
        <TenantForm
          modeEdition
          initial={{
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
            contactEmail: tenant.contactEmail ?? '',
            contactPhone: tenant.contactPhone ?? '',
            region: tenant.region ?? '',
            notes: tenant.notes ?? '',
          }}
          onSubmit={enregistrer}
          onCancel={() => setEdition(false)}
        />
      )}

      {aSuspendre && (
        <Modal ton="sombre" titre="Suspendre la coopérative" onClose={() => setASuspendre(false)}>
          <p className="text-sm text-gray-300 mb-4">
            Les {usage?.users ?? 0} membre(s) perdront l'accès dès leur prochaine requête.
          </p>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="motif-detail">
            Motif (conservé dans le journal d'audit)
          </label>
          <Champ
            id="motif-detail"
            ton="sombre"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. : impayé depuis 3 mois"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <Bouton variante="secondaire" ton="sombre" onClick={() => setASuspendre(false)}>
              Annuler
            </Bouton>
            <Bouton
              variante="danger"
              ton="sombre"
              onClick={suspendre}
              disabled={enCours || motif.trim().length < 3}
            >
              {enCours ? 'En cours…' : 'Suspendre'}
            </Bouton>
          </div>
        </Modal>
      )}
    </div>
  );
}
