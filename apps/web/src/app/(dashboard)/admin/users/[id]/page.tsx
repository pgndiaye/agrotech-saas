'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import {
  ChevronLeft,
  Building2,
  ScrollText,
  Ban,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  Badge,
  Bouton,
  Carte,
  Champ,
  ChargementCentre,
  EtatVide,
} from '@/components/ui/primitives';
import { PlanBadge, RoleBadge, StatutCompteBadge } from '@/components/admin';
import { formatDate, formatDateHeure } from '@/lib/format';
import { useToast } from '@/context/ToastContext';

function LigneInfo({ label, valeur }: { label: string; valeur?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-200 text-right">{valeur || '—'}</span>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [aSuspendre, setASuspendre] = useState(false);
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');
    try {
      const res = await adminApi.getUser(id);
      setUser(res.data);
    } catch (err: any) {
      setErreur(
        err.response?.status === 404
          ? 'Utilisateur introuvable'
          : "Impossible de charger l'utilisateur",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const suspendre = async () => {
    setEnCours(true);
    try {
      await adminApi.suspendUser(id, motif);
      toast.succes('Utilisateur suspendu — session coupée immédiatement');
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
      await adminApi.reactivateUser(id);
      toast.succes('Utilisateur réactivé');
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
        <Bouton variante="secondaire" ton="sombre" onClick={() => router.push('/admin/users')}>
          <ChevronLeft size={15} /> Retour à la liste
        </Bouton>
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-5 transition"
      >
        <ChevronLeft size={15} /> Utilisateurs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-indigo-300">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm text-gray-500">{user.email}</span>
              <RoleBadge role={user.role} />
              <StatutCompteBadge statut={user.status} />
            </div>
          </div>
        </div>

        {user.status === 'ACTIVE' ? (
          <Bouton variante="danger" ton="sombre" onClick={() => setASuspendre(true)}>
            <Ban size={15} /> Suspendre
          </Bouton>
        ) : (
          <Bouton ton="sombre" onClick={reactiver}>
            <RotateCcw size={15} /> Réactiver
          </Bouton>
        )}
      </div>

      {user.status === 'SUSPENDED' && user.suspendedReason && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 mb-6 text-sm text-orange-300">
          <strong>Suspendu</strong> le {formatDate(user.suspendedAt)} — {user.suspendedReason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Carte ton="sombre" className="p-5">
          <h2 className="font-semibold mb-3">Compte</h2>
          <LigneInfo label="Nom" valeur={user.name} />
          <LigneInfo label="E-mail" valeur={user.email} />
          <LigneInfo label="Téléphone" valeur={user.phone} />
          <LigneInfo label="Langue" valeur={user.language === 'WO' ? 'Wolof' : 'Français'} />
          <LigneInfo
            label="Dernière connexion"
            valeur={user.lastLoginAt ? formatDateHeure(user.lastLoginAt) : 'Jamais connecté'}
          />
          <LigneInfo label="Inscrit le" valeur={formatDate(user.createdAt)} />
        </Carte>

        <Carte ton="sombre" className="p-5">
          <h2 className="font-semibold mb-3">Coopérative</h2>
          {user.tenant ? (
            <>
              <LigneInfo
                label="Nom"
                valeur={
                  <Link
                    href={`/admin/tenants/${user.tenant.id}`}
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300"
                  >
                    <Building2 size={13} /> {user.tenant.name}
                  </Link>
                }
              />
              <LigneInfo
                label="Slug"
                valeur={<code className="font-mono">{user.tenant.slug}</code>}
              />
              <LigneInfo label="Plan" valeur={<PlanBadge plan={user.tenant.plan} />} />
              <LigneInfo
                label="Statut"
                valeur={<StatutCompteBadge statut={user.tenant.status} />}
              />
            </>
          ) : (
            <EtatVide message="Aucune coopérative" ton="sombre" />
          )}
        </Carte>
      </div>

      <h2 className="font-semibold mt-8 mb-3 flex items-center gap-2">
        <ScrollText size={16} className="text-indigo-400" />
        Actions d'administration sur ce compte
      </h2>
      <Carte ton="sombre">
        {user.auditLogs?.length ? (
          <div className="divide-y divide-gray-800/60">
            {user.auditLogs.map((l: any) => (
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
                    {l.actorEmail ?? 'Système'}
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
            message="Aucune action enregistrée"
            icone={<ScrollText size={40} />}
            ton="sombre"
          />
        )}
      </Carte>

      {aSuspendre && (
        <Modal ton="sombre" titre="Suspendre l'utilisateur" onClose={() => setASuspendre(false)}>
          <p className="text-sm text-gray-300 mb-4">
            <strong>{user.name}</strong> sera déconnecté dès sa prochaine requête.
          </p>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="motif-fiche">
            Motif (conservé dans le journal d'audit)
          </label>
          <Champ
            id="motif-fiche"
            ton="sombre"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. : départ de la coopérative"
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
