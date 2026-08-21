'use client';
import { useCallback, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Timer, AlertCircle } from 'lucide-react';
import { usePaginatedResource } from '@/hooks/usePaginatedResource';
import { DataTable, Pagination, type Colonne } from '@/components/ui/DataTable';
import { MessageErreur } from '@/components/ui/primitives';
import { AdminPageHeader, StatutTacheBadge } from '@/components/admin';
import { formatDateHeure } from '@/lib/format';

interface TaskRun {
  id: string;
  taskName: string;
  runKey: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  endedAt?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

const LIBELLES: Record<string, string> = {
  'sms-alertes-quotidiennes': 'Alertes SMS quotidiennes',
  'sms-digest-hebdomadaire': 'Digest SMS hebdomadaire',
};

function duree(t: TaskRun): string {
  if (!t.endedAt) return '—';
  const ms = new Date(t.endedAt).getTime() - new Date(t.startedAt).getTime();
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export default function AdminTasksPage() {
  const [ouvert, setOuvert] = useState<string | null>(null);

  const charger = useCallback(
    (page: number, limit: number) => adminApi.getTaskRuns(page, limit),
    [],
  );

  const { items, total, page, setPage, totalPages, loading, erreur } =
    usePaginatedResource<TaskRun>(charger, {
      messageErreur: 'Impossible de charger les exécutions',
    });

  const colonnes: Colonne<TaskRun>[] = [
    {
      cle: 'taskName',
      entete: 'Tâche',
      rendu: (t) => (
        <div>
          <p className="text-white text-sm">{LIBELLES[t.taskName] ?? t.taskName}</p>
          <p className="text-[11px] text-gray-500 font-mono">{t.taskName}</p>
        </div>
      ),
    },
    {
      cle: 'runKey',
      entete: 'Occurrence',
      className: 'text-gray-300 text-xs font-mono',
      rendu: (t) => t.runKey,
    },
    {
      cle: 'status',
      entete: 'Statut',
      alignement: 'centre',
      rendu: (t) => <StatutTacheBadge statut={t.status} />,
    },
    {
      cle: 'startedAt',
      entete: 'Démarrée',
      className: 'text-gray-400 text-xs',
      rendu: (t) => formatDateHeure(t.startedAt),
    },
    {
      cle: 'duree',
      entete: 'Durée',
      alignement: 'droite',
      className: 'text-gray-400 text-xs',
      rendu: duree,
    },
  ];

  const detail = (t: TaskRun) => (
    <>
      {t.error && <p className="text-red-400 text-xs mb-3">{t.error}</p>}
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Résultat</p>
      <pre className="text-[11px] text-gray-400 bg-gray-900 border border-gray-800 rounded-lg p-3 overflow-x-auto">
        {t.result ? JSON.stringify(t.result, null, 2) : '—'}
      </pre>
    </>
  );

  return (
    <div className="p-8 text-white">
      <AdminPageHeader
        titre="Tâches planifiées"
        sousTitre="Une occurrence n'est jouée qu'une fois, même avec plusieurs instances de l'API en parallèle"
      />

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
        messageVide="Aucune exécution enregistrée pour le moment"
        iconeVide={<Timer size={40} />}
        onLigneClick={(t) => setOuvert(ouvert === t.id ? null : t.id)}
        ligneOuverte={ouvert}
        renduDetail={detail}
      />

      <Pagination
        ton="sombre"
        page={page}
        totalPages={totalPages}
        total={total}
        libelle="exécutions"
        onChange={setPage}
      />
    </div>
  );
}
