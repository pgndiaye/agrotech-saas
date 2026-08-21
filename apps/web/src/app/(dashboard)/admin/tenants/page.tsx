'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  Building2,
  Trash2,
  AlertCircle,
  Ban,
  RotateCcw,
  Plus,
  Download,
} from 'lucide-react';
import { usePaginatedResource } from '@/hooks/usePaginatedResource';
import { useDebounce } from '@/hooks/useDebounce';
import { DataTable, Pagination, type Colonne } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Bouton, Champ, MessageErreur } from '@/components/ui/primitives';
import {
  AdminPageHeader,
  CelluleIdentite,
  PlanBadge,
  StatutCompteBadge,
} from '@/components/admin';
import { AdminFilters, EnteteTriable } from '@/components/admin/AdminFilters';
import { TenantForm, type ValeursTenant } from '@/components/admin/TenantForm';
import { formatDate } from '@/lib/format';
import { telechargerBlob, nomFichierDate } from '@/lib/telechargement';
import { useToast } from '@/context/ToastContext';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PREMIUM';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  _count: { users: number; stocks: number; transactions: number };
}

const FILTRES = [
  {
    cle: 'plan',
    label: 'Tous les plans',
    options: [
      { valeur: 'FREE', label: 'Gratuit' },
      { valeur: 'PREMIUM', label: 'Premium' },
    ],
  },
  {
    cle: 'status',
    label: 'Tous les statuts',
    options: [
      { valeur: 'ACTIVE', label: 'Actives' },
      { valeur: 'SUSPENDED', label: 'Suspendues' },
      { valeur: 'DELETED', label: 'Supprimées' },
    ],
  },
];

export default function AdminTenantsPage() {
  const toast = useToast();
  const router = useRouter();

  const [saisie, setSaisie] = useState('');
  const recherche = useDebounce(saisie, 400);
  const [valeursFiltres, setValeursFiltres] = useState<Record<string, string>>({
    plan: '',
    status: '',
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [enCours, setEnCours] = useState(false);
  const [creation, setCreation] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Tenant | null>(null);
  const [confirmSlug, setConfirmSlug] = useState('');
  const [aSuspendre, setASuspendre] = useState<Tenant | null>(null);
  const [motif, setMotif] = useState('');

  const filtresApi = {
    search: recherche || undefined,
    plan: valeursFiltres.plan || undefined,
    status: valeursFiltres.status || undefined,
    sortBy,
    sortOrder,
  };

  const charger = useCallback(
    (page: number, limit: number) =>
      adminApi.getTenants({
        page,
        limit,
        search: recherche || undefined,
        plan: valeursFiltres.plan || undefined,
        status: valeursFiltres.status || undefined,
        sortBy,
        sortOrder,
      }),
    [recherche, valeursFiltres.plan, valeursFiltres.status, sortBy, sortOrder],
  );

  const { items, total, page, setPage, totalPages, loading, erreur, rafraichir } =
    usePaginatedResource<Tenant>(charger, {
      messageErreur: 'Impossible de charger les coopératives',
    });

  // Tout changement de filtre ramène à la première page, sinon on peut
  // atterrir sur une page vide.
  useEffect(() => {
    setPage(1);
  }, [recherche, valeursFiltres.plan, valeursFiltres.status, sortBy, sortOrder, setPage]);

  const trier = (cle: string) => {
    if (sortBy === cle) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(cle);
      setSortOrder('asc');
    }
  };

  const majFiltre = (cle: string, valeur: string) =>
    setValeursFiltres((p) => ({ ...p, [cle]: valeur }));

  const creer = async (v: ValeursTenant) => {
    try {
      await adminApi.createTenant({
        name: v.name,
        slug: v.slug,
        plan: v.plan,
        contactEmail: v.contactEmail || undefined,
        contactPhone: v.contactPhone || undefined,
        region: v.region || undefined,
        notes: v.notes || undefined,
      });
      toast.succes(`« ${v.name} » créée`);
      setCreation(false);
      await rafraichir();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la création');
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setEnCours(true);
    try {
      await adminApi.deleteTenant(aSupprimer.id, confirmSlug);
      toast.succes(`« ${aSupprimer.name} » supprimée — données conservées en base`);
      setASupprimer(null);
      setConfirmSlug('');
      await rafraichir();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la suppression');
    } finally {
      setEnCours(false);
    }
  };

  const suspendre = async () => {
    if (!aSuspendre) return;
    setEnCours(true);
    try {
      await adminApi.suspendTenant(aSuspendre.id, motif);
      toast.succes(`« ${aSuspendre.name} » suspendue — accès coupé immédiatement`);
      setASuspendre(null);
      setMotif('');
      await rafraichir();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la suspension');
    } finally {
      setEnCours(false);
    }
  };

  const reactiver = async (t: Tenant) => {
    try {
      await adminApi.reactivateTenant(t.id);
      toast.succes(`« ${t.name} » réactivée`);
      await rafraichir();
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? 'Erreur lors de la réactivation');
    }
  };

  const exporter = async () => {
    try {
      const res = await adminApi.exportTenantsCsv(filtresApi);
      telechargerBlob(res.data, nomFichierDate('cooperatives'));
      toast.succes('Export généré');
    } catch {
      toast.erreur("Impossible de générer l'export");
    }
  };

  const entete = (label: string, cle: string) => (
    <EnteteTriable
      label={label}
      cle={cle}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onTri={trier}
    />
  );

  const colonnes: Colonne<Tenant>[] = [
    {
      cle: 'name',
      entete: entete('Coopérative', 'name'),
      rendu: (t) => (
        <CelluleIdentite
          titre={t.name}
          sousTitre={t.slug}
          couleurIcone="bg-blue-600/20"
          icone={<Building2 size={14} className="text-blue-400" />}
        />
      ),
    },
    { cle: 'plan', entete: entete('Plan', 'plan'), rendu: (t) => <PlanBadge plan={t.plan} /> },
    {
      cle: 'status',
      entete: entete('Statut', 'status'),
      alignement: 'centre',
      rendu: (t) => <StatutCompteBadge statut={t.status} />,
    },
    {
      cle: 'users',
      entete: 'Membres',
      alignement: 'centre',
      className: 'text-gray-300',
      rendu: (t) => t._count.users,
    },
    {
      cle: 'stocks',
      entete: 'Stocks',
      alignement: 'centre',
      className: 'text-gray-300',
      rendu: (t) => t._count.stocks,
    },
    {
      cle: 'transactions',
      entete: 'Transactions',
      alignement: 'centre',
      className: 'text-gray-300',
      rendu: (t) => t._count.transactions,
    },
    {
      cle: 'createdAt',
      entete: entete('Créée le', 'createdAt'),
      className: 'text-gray-400 text-xs',
      rendu: (t) => formatDate(t.createdAt),
    },
    {
      cle: 'actions',
      entete: 'Actions',
      alignement: 'droite',
      rendu: (t) => (
        // stopPropagation : la ligne entière navigue vers la fiche détail.
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {t.status === 'ACTIVE' ? (
            <button
              onClick={() => {
                setASuspendre(t);
                setMotif('');
              }}
              title="Suspendre"
              className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-gray-700 rounded-lg transition"
            >
              <Ban size={14} />
            </button>
          ) : (
            <button
              onClick={() => reactiver(t)}
              title="Réactiver"
              className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={() => {
              setASupprimer(t);
              setConfirmSlug('');
            }}
            title="Supprimer"
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 text-white">
      <AdminPageHeader
        titre="Coopératives"
        sousTitre={`${total} coopérative${total > 1 ? 's' : ''}`}
      />

      <AdminFilters
        recherche={saisie}
        onRecherche={setSaisie}
        placeholderRecherche="Rechercher par nom, slug ou contact…"
        filtres={FILTRES}
        valeurs={valeursFiltres}
        onFiltre={majFiltre}
      >
        <Bouton variante="secondaire" ton="sombre" onClick={exporter}>
          <Download size={15} /> Exporter
        </Bouton>
        <Bouton ton="sombre" onClick={() => setCreation(true)}>
          <Plus size={15} /> Nouvelle coopérative
        </Bouton>
      </AdminFilters>

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
        messageVide="Aucune coopérative ne correspond aux filtres"
        iconeVide={<Building2 size={40} />}
        onLigneClick={(t) => router.push(`/admin/tenants/${t.id}`)}
      />

      <Pagination
        ton="sombre"
        page={page}
        totalPages={totalPages}
        total={total}
        libelle="coopératives"
        onChange={setPage}
      />

      {creation && <TenantForm onSubmit={creer} onCancel={() => setCreation(false)} />}

      {aSupprimer && (
        <Modal ton="sombre" titre="Supprimer la coopérative" onClose={() => setASupprimer(null)}>
          <p className="text-sm text-gray-300 mb-3">
            « <strong>{aSupprimer.name}</strong> » sera retirée de la plateforme et ses{' '}
            {aSupprimer._count.users} membre(s) ne pourront plus se connecter.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Les données restent en base : la destruction définitive est une opération
            distincte.
          </p>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="confirm-slug">
            Saisissez <code className="text-red-400">{aSupprimer.slug}</code> pour confirmer
          </label>
          <Champ
            id="confirm-slug"
            ton="sombre"
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            placeholder={aSupprimer.slug}
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <Bouton variante="secondaire" ton="sombre" onClick={() => setASupprimer(null)}>
              Annuler
            </Bouton>
            <Bouton
              variante="danger"
              ton="sombre"
              onClick={supprimer}
              disabled={enCours || confirmSlug !== aSupprimer.slug}
            >
              {enCours ? 'Suppression…' : 'Supprimer'}
            </Bouton>
          </div>
        </Modal>
      )}

      {aSuspendre && (
        <Modal ton="sombre" titre="Suspendre la coopérative" onClose={() => setASuspendre(null)}>
          <p className="text-sm text-gray-300 mb-4">
            Les membres de « <strong>{aSuspendre.name}</strong> » perdront l'accès dès leur
            prochaine requête, sans attendre l'expiration de leur session.
          </p>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="motif-suspension">
            Motif (conservé dans le journal d'audit)
          </label>
          <Champ
            id="motif-suspension"
            ton="sombre"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. : impayé depuis 3 mois"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <Bouton variante="secondaire" ton="sombre" onClick={() => setASuspendre(null)}>
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
