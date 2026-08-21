'use client';
import { useCallback, useState } from 'react';
import { adminApi } from '@/lib/api';
import { ScrollText, AlertCircle, Server, UserCog } from 'lucide-react';
import { usePaginatedResource } from '@/hooks/usePaginatedResource';
import { DataTable, Pagination, type Colonne } from '@/components/ui/DataTable';
import { MessageErreur, Selecteur, Badge } from '@/components/ui/primitives';
import { AdminPageHeader, CelluleIdentite } from '@/components/admin';
import { formatDateHeure, formatId } from '@/lib/format';

interface AuditLog {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string;
  targetTenant?: { name: string; slug: string } | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  createdAt: string;
}

/** Couleur par famille d'action, déduite du libellé métier. */
function styleAction(action: string): string {
  if (action.includes('SUPPRIME') || action.includes('PURGE') || action.includes('INVALIDE')) {
    return 'bg-red-500/20 text-red-300';
  }
  if (action.includes('SUSPENDU')) return 'bg-orange-500/20 text-orange-300';
  if (action.includes('REACTIVE') || action.includes('ACTIVE')) {
    return 'bg-green-500/20 text-green-300';
  }
  return 'bg-indigo-500/20 text-indigo-300';
}

const ENTITES = [
  { valeur: '', label: 'Toutes les entités' },
  { valeur: 'tenant', label: 'Coopératives' },
  { valeur: 'user', label: 'Utilisateurs' },
  { valeur: 'payment', label: 'Paiements' },
];

export default function AdminAuditPage() {
  const [entity, setEntity] = useState('');
  const [ouvert, setOuvert] = useState<string | null>(null);

  const charger = useCallback(
    (page: number, limit: number) =>
      adminApi.getAuditLogs({ page, limit, entity: entity || undefined }),
    [entity],
  );

  const { items, total, page, setPage, totalPages, loading, erreur } =
    usePaginatedResource<AuditLog>(charger, {
      messageErreur: "Impossible de charger le journal d'audit",
    });

  const colonnes: Colonne<AuditLog>[] = [
    {
      cle: 'action',
      entete: 'Action',
      rendu: (l) => <Badge classe={styleAction(l.action)}>{l.action}</Badge>,
    },
    {
      cle: 'acteur',
      entete: 'Acteur',
      rendu: (l) => (
        <CelluleIdentite
          titre={l.actorEmail ?? 'Système'}
          sousTitre={l.actorRole}
          couleurIcone={l.actorRole === 'SYSTEM' ? 'bg-gray-700/40' : 'bg-indigo-600/20'}
          icone={
            l.actorRole === 'SYSTEM' ? (
              <Server size={13} className="text-gray-400" />
            ) : (
              <UserCog size={13} className="text-indigo-400" />
            )
          }
        />
      ),
    },
    {
      cle: 'cible',
      entete: 'Cible',
      rendu: (l) => (
        <div>
          <p className="text-gray-300 text-xs">{l.targetTenant?.name ?? l.entity}</p>
          <p className="text-[11px] text-gray-600 font-mono">{formatId(l.entityId)}</p>
        </div>
      ),
    },
    {
      cle: 'status',
      entete: 'Statut',
      alignement: 'centre',
      rendu: (l) => (
        <Badge
          classe={
            l.status === 'SUCCESS'
              ? 'bg-green-500/20 text-green-300'
              : 'bg-red-500/20 text-red-300'
          }
        >
          {l.status === 'SUCCESS' ? 'Réussi' : 'Échoué'}
        </Badge>
      ),
    },
    {
      cle: 'ip',
      entete: 'IP',
      className: 'text-gray-400 text-xs font-mono',
      rendu: (l) => l.ip ?? '—',
    },
    {
      cle: 'createdAt',
      entete: 'Date',
      className: 'text-gray-400 text-xs',
      rendu: (l) => formatDateHeure(l.createdAt),
    },
  ];

  const detail = (l: AuditLog) => (
    <>
      {l.errorMessage && <p className="text-red-400 text-xs mb-3">{l.errorMessage}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Avant</p>
          <pre className="text-[11px] text-gray-400 bg-gray-900 border border-gray-800 rounded-lg p-3 overflow-x-auto">
            {l.before ? JSON.stringify(l.before, null, 2) : '—'}
          </pre>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
            Après (champs modifiés)
          </p>
          <pre className="text-[11px] text-gray-400 bg-gray-900 border border-gray-800 rounded-lg p-3 overflow-x-auto">
            {l.after ? JSON.stringify(l.after, null, 2) : '—'}
          </pre>
        </div>
      </div>
      {l.userAgent && <p className="text-[11px] text-gray-600 mt-3 truncate">{l.userAgent}</p>}
    </>
  );

  return (
    <div className="p-8 text-white">
      <AdminPageHeader
        titre="Journal d'audit"
        sousTitre={`${total} action${total > 1 ? 's' : ''} enregistrée${total > 1 ? 's' : ''} — seules les modifications sont tracées, jamais les consultations`}
      >
        <Selecteur
          ton="sombre"
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrer par entité"
        >
          {ENTITES.map((e) => (
            <option key={e.valeur} value={e.valeur}>
              {e.label}
            </option>
          ))}
        </Selecteur>
      </AdminPageHeader>

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
        messageVide="Aucune action enregistrée"
        iconeVide={<ScrollText size={40} />}
        onLigneClick={(l) => setOuvert(ouvert === l.id ? null : l.id)}
        ligneOuverte={ouvert}
        renduDetail={detail}
      />

      <Pagination
        ton="sombre"
        page={page}
        totalPages={totalPages}
        total={total}
        libelle="actions"
        onChange={setPage}
      />
    </div>
  );
}
