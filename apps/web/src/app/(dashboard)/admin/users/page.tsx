'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  Users,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  Ban,
  RotateCcw,
  Plus,
  Download,
  ArrowRightLeft,
} from 'lucide-react';
import { usePaginatedResource } from '@/hooks/usePaginatedResource';
import { useDebounce } from '@/hooks/useDebounce';
import { DataTable, Pagination, type Colonne } from '@/components/ui/DataTable';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Bouton, Champ, MessageErreur, Selecteur } from '@/components/ui/primitives';
import {
  AdminPageHeader,
  CelluleIdentite,
  PlanBadge,
  RoleBadge,
  StatutCompteBadge,
} from '@/components/admin';
import { AdminFilters, EnteteTriable } from '@/components/admin/AdminFilters';
import { UserForm, type ValeursUser } from '@/components/admin/UserForm';
import { formatDate } from '@/lib/format';
import { telechargerBlob, nomFichierDate } from '@/lib/telechargement';
import { useToast } from '@/context/ToastContext';

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt?: string | null;
  tenant: { id: string; name: string; slug: string; plan: string };
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FARMER'];

const FILTRES = [
  {
    cle: 'role',
    label: 'Tous les rôles',
    options: [
      { valeur: 'SUPER_ADMIN', label: 'Super admin' },
      { valeur: 'ADMIN', label: 'Admin' },
      { valeur: 'MANAGER', label: 'Gestionnaire' },
      { valeur: 'FARMER', label: 'Agriculteur' },
    ],
  },
  {
    cle: 'status',
    label: 'Tous les statuts',
    options: [
      { valeur: 'ACTIVE', label: 'Actifs' },
      { valeur: 'SUSPENDED', label: 'Suspendus' },
    ],
  },
];

export default function AdminUsersPage() {
  const toast = useToast();
  const router = useRouter();

  const [saisie, setSaisie] = useState('');
  const recherche = useDebounce(saisie, 400);
  const [valeursFiltres, setValeursFiltres] = useState<Record<string, string>>({
    role: '',
    status: '',
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [editionId, setEditionId] = useState<string | null>(null);
  const [roleEdite, setRoleEdite] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [creation, setCreation] = useState(false);
  const [aSupprimer, setASupprimer] = useState<PlatformUser | null>(null);
  const [aSuspendre, setASuspendre] = useState<PlatformUser | null>(null);
  const [aDeplacer, setADeplacer] = useState<PlatformUser | null>(null);
  const [tenantCible, setTenantCible] = useState('');
  const [tenants, setTenants] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [motif, setMotif] = useState('');

  const charger = useCallback(
    (page: number, limit: number) =>
      adminApi.getUsers({
        page,
        limit,
        search: recherche || undefined,
        role: valeursFiltres.role || undefined,
        status: valeursFiltres.status || undefined,
        sortBy,
        sortOrder,
      }),
    [recherche, valeursFiltres.role, valeursFiltres.status, sortBy, sortOrder],
  );

  const { items, total, page, setPage, totalPages, loading, erreur, rafraichir } =
    usePaginatedResource<PlatformUser>(charger, {
      messageErreur: 'Impossible de charger les utilisateurs',
    });

  useEffect(() => {
    setPage(1);
  }, [recherche, valeursFiltres.role, valeursFiltres.status, sortBy, sortOrder, setPage]);

  // Chargé à l'ouverture de la modale de déplacement seulement.
  const ouvrirDeplacement = async (u: PlatformUser) => {
    setADeplacer(u);
    setTenantCible('');
    try {
      const res = await adminApi.getTenants({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
      setTenants(res.data.data.filter((t: any) => t.id !== u.tenant?.id));
    } catch {
      setTenants([]);
    }
  };

  const trier = (cle: string) => {
    if (sortBy === cle) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(cle);
      setSortOrder('asc');
    }
  };

  const majFiltre = (cle: string, valeur: string) =>
    setValeursFiltres((p) => ({ ...p, [cle]: valeur }));

  const agir = async (action: () => Promise<unknown>, succes: string) => {
    setEnCours(true);
    try {
      await action();
      toast.succes(succes);
      await rafraichir();
      return true;
    } catch (err: any) {
      toast.erreur(err.response?.data?.message ?? "Erreur lors de l'opération");
      return false;
    } finally {
      setEnCours(false);
    }
  };

  const creer = async (v: ValeursUser) => {
    const ok = await agir(
      () =>
        adminApi.createUser({
          email: v.email,
          name: v.name,
          password: v.password,
          role: v.role,
          tenantId: v.tenantId,
          phone: v.phone || undefined,
        }),
      `${v.name} créé`,
    );
    if (ok) setCreation(false);
  };

  const exporter = async () => {
    try {
      const res = await adminApi.exportUsersCsv({
        search: recherche || undefined,
        role: valeursFiltres.role || undefined,
        status: valeursFiltres.status || undefined,
        sortBy,
        sortOrder,
      });
      telechargerBlob(res.data, nomFichierDate('utilisateurs'));
      toast.succes('Export généré');
    } catch {
      toast.erreur("Impossible de générer l'export");
    }
  };

  const entete = (label: string, cle: string) => (
    <EnteteTriable label={label} cle={cle} sortBy={sortBy} sortOrder={sortOrder} onTri={trier} />
  );

  const colonnes: Colonne<PlatformUser>[] = [
    {
      cle: 'name',
      entete: entete('Utilisateur', 'name'),
      rendu: (u) => (
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
      ),
    },
    {
      cle: 'role',
      entete: entete('Rôle', 'role'),
      rendu: (u) =>
        editionId === u.id ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Selecteur
              ton="sombre"
              value={roleEdite}
              onChange={(e) => setRoleEdite(e.target.value)}
              className="!py-1 text-xs"
              aria-label="Rôle"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Selecteur>
            <button
              onClick={async () => {
                const ok = await agir(
                  () => adminApi.updateUser(u.id, { role: roleEdite }),
                  `Rôle de ${u.name} modifié — sessions révoquées`,
                );
                if (ok) setEditionId(null);
              }}
              disabled={enCours}
              aria-label="Enregistrer"
              className="text-green-400 hover:text-green-300 disabled:opacity-50"
            >
              <Check size={15} />
            </button>
            <button
              onClick={() => setEditionId(null)}
              aria-label="Annuler"
              className="text-gray-500 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <RoleBadge role={u.role} />
        ),
    },
    {
      cle: 'status',
      entete: entete('Statut', 'status'),
      alignement: 'centre',
      rendu: (u) => <StatutCompteBadge statut={u.status} />,
    },
    {
      cle: 'tenant',
      entete: 'Coopérative',
      rendu: (u) => (
        <div>
          <p className="text-gray-200 text-xs">{u.tenant?.name ?? '—'}</p>
          <p className="text-[11px] text-gray-500">{u.tenant?.slug}</p>
        </div>
      ),
    },
    {
      cle: 'plan',
      entete: 'Plan',
      alignement: 'centre',
      rendu: (u) => <PlanBadge plan={u.tenant?.plan} />,
    },
    {
      cle: 'lastLoginAt',
      entete: entete('Dernière connexion', 'lastLoginAt'),
      className: 'text-gray-400 text-xs',
      rendu: (u) => (u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Jamais'),
    },
    {
      cle: 'actions',
      entete: 'Actions',
      alignement: 'droite',
      rendu: (u) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setEditionId(u.id);
              setRoleEdite(u.role);
            }}
            title="Modifier le rôle"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => ouvrirDeplacement(u)}
            title="Changer de coopérative"
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowRightLeft size={14} />
          </button>
          {u.status === 'ACTIVE' ? (
            <button
              onClick={() => {
                setASuspendre(u);
                setMotif('');
              }}
              title="Suspendre"
              className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-gray-700 rounded-lg transition"
            >
              <Ban size={14} />
            </button>
          ) : (
            <button
              onClick={() => agir(() => adminApi.reactivateUser(u.id), `${u.name} réactivé`)}
              title="Réactiver"
              className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={() => setASupprimer(u)}
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
        titre="Utilisateurs"
        sousTitre={`${total} utilisateur${total > 1 ? 's' : ''} sur la plateforme`}
      />

      <AdminFilters
        recherche={saisie}
        onRecherche={setSaisie}
        placeholderRecherche="Rechercher par nom ou e-mail…"
        filtres={FILTRES}
        valeurs={valeursFiltres}
        onFiltre={majFiltre}
      >
        <Bouton variante="secondaire" ton="sombre" onClick={exporter}>
          <Download size={15} /> Exporter
        </Bouton>
        <Bouton ton="sombre" onClick={() => setCreation(true)}>
          <Plus size={15} /> Nouvel utilisateur
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
        messageVide={recherche ? `Aucun résultat pour « ${recherche} »` : 'Aucun utilisateur'}
        iconeVide={<Users size={40} />}
        onLigneClick={(u) => router.push(`/admin/users/${u.id}`)}
      />

      <Pagination
        ton="sombre"
        page={page}
        totalPages={totalPages}
        total={total}
        libelle="utilisateurs"
        onChange={setPage}
      />

      {creation && <UserForm onSubmit={creer} onCancel={() => setCreation(false)} />}

      {aSupprimer && (
        <ConfirmDialog
          ton="sombre"
          titre="Supprimer l'utilisateur"
          libelleConfirmation="Supprimer"
          enCours={enCours}
          onCancel={() => setASupprimer(null)}
          onConfirm={async () => {
            const ok = await agir(
              () => adminApi.deleteUser(aSupprimer.id),
              `${aSupprimer.name} supprimé`,
            );
            if (ok) setASupprimer(null);
          }}
          message={
            <>
              Le compte de <strong>{aSupprimer.name}</strong> ({aSupprimer.email}) sera supprimé
              définitivement.
            </>
          }
        />
      )}

      {aSuspendre && (
        <Modal ton="sombre" titre="Suspendre l'utilisateur" onClose={() => setASuspendre(null)}>
          <p className="text-sm text-gray-300 mb-4">
            <strong>{aSuspendre.name}</strong> sera déconnecté dès sa prochaine requête, sans
            attendre l'expiration de sa session.
          </p>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="motif-user">
            Motif (conservé dans le journal d'audit)
          </label>
          <Champ
            id="motif-user"
            ton="sombre"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. : départ de la coopérative"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <Bouton variante="secondaire" ton="sombre" onClick={() => setASuspendre(null)}>
              Annuler
            </Bouton>
            <Bouton
              variante="danger"
              ton="sombre"
              onClick={async () => {
                const ok = await agir(
                  () => adminApi.suspendUser(aSuspendre.id, motif),
                  `${aSuspendre.name} suspendu — session coupée immédiatement`,
                );
                if (ok) {
                  setASuspendre(null);
                  setMotif('');
                }
              }}
              disabled={enCours || motif.trim().length < 3}
            >
              {enCours ? 'En cours…' : 'Suspendre'}
            </Bouton>
          </div>
        </Modal>
      )}

      {aDeplacer && (
        <Modal ton="sombre" titre="Changer de coopérative" onClose={() => setADeplacer(null)}>
          <p className="text-sm text-gray-300 mb-4">
            <strong>{aDeplacer.name}</strong> quittera « {aDeplacer.tenant?.name} ». Ses sessions
            seront révoquées, car son jeton porte encore l'ancienne coopérative.
          </p>
          <label className="block text-sm text-gray-400 mb-1.5" htmlFor="tenant-cible">
            Coopérative de destination
          </label>
          <Selecteur
            id="tenant-cible"
            ton="sombre"
            value={tenantCible}
            onChange={(e) => setTenantCible(e.target.value)}
            className="w-full"
          >
            <option value="">Sélectionner…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </Selecteur>
          <div className="flex justify-end gap-3 mt-6">
            <Bouton variante="secondaire" ton="sombre" onClick={() => setADeplacer(null)}>
              Annuler
            </Bouton>
            <Bouton
              ton="sombre"
              onClick={async () => {
                const ok = await agir(
                  () => adminApi.moveUser(aDeplacer.id, tenantCible),
                  `${aDeplacer.name} déplacé`,
                );
                if (ok) setADeplacer(null);
              }}
              disabled={enCours || !tenantCible}
            >
              {enCours ? 'En cours…' : 'Déplacer'}
            </Bouton>
          </div>
        </Modal>
      )}
    </div>
  );
}
