'use client';
import { useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { CreditCard, AlertCircle } from 'lucide-react';
import { usePaginatedResource } from '@/hooks/usePaginatedResource';
import { DataTable, Pagination, type Colonne } from '@/components/ui/DataTable';
import { MessageErreur } from '@/components/ui/primitives';
import {
  AdminPageHeader,
  CelluleIdentite,
  FournisseurBadge,
  StatutPaiementBadge,
} from '@/components/admin';
import { formatDate, formatId, formatNombre } from '@/lib/format';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  phoneNumber?: string;
  externalId?: string;
  createdAt: string;
  tenant: { name: string; slug: string };
}

export default function AdminPaymentsPage() {
  const charger = useCallback(
    (page: number, limit: number) => adminApi.getPayments(page, limit),
    [],
  );

  const { items, total, page, setPage, totalPages, loading, erreur } =
    usePaginatedResource<Payment>(charger, {
      messageErreur: 'Impossible de charger les paiements',
    });

  const colonnes: Colonne<Payment>[] = [
    {
      cle: 'tenant',
      entete: 'Coopérative',
      rendu: (p) => (
        <CelluleIdentite
          titre={p.tenant.name}
          sousTitre={p.tenant.slug}
          icone={<CreditCard size={13} className="text-indigo-400" />}
        />
      ),
    },
    {
      cle: 'provider',
      entete: 'Fournisseur',
      rendu: (p) => <FournisseurBadge fournisseur={p.provider} />,
    },
    {
      cle: 'amount',
      entete: 'Montant',
      alignement: 'droite',
      rendu: (p) => (
        <span className="font-medium">
          <span className={p.status === 'SUCCEEDED' ? 'text-green-300' : 'text-gray-300'}>
            {formatNombre(p.amount)}
          </span>{' '}
          <span className="text-gray-500 text-xs">{p.currency}</span>
        </span>
      ),
    },
    {
      cle: 'status',
      entete: 'Statut',
      alignement: 'centre',
      rendu: (p) => <StatutPaiementBadge statut={p.status} />,
    },
    {
      cle: 'phoneNumber',
      entete: 'Téléphone',
      className: 'text-gray-400 text-xs',
      rendu: (p) => p.phoneNumber ?? '—',
    },
    {
      cle: 'externalId',
      entete: 'ID externe',
      className: 'text-gray-500 text-xs font-mono',
      rendu: (p) => formatId(p.externalId, 16),
    },
    {
      cle: 'createdAt',
      entete: 'Date',
      className: 'text-gray-400 text-xs',
      rendu: (p) => formatDate(p.createdAt),
    },
  ];

  return (
    <div className="p-8 text-white">
      <AdminPageHeader
        titre="Paiements"
        sousTitre={`${total} paiement${total > 1 ? 's' : ''} au total`}
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
        messageVide="Aucun paiement enregistré"
        iconeVide={<CreditCard size={40} />}
      />

      <Pagination
        ton="sombre"
        page={page}
        totalPages={totalPages}
        total={total}
        libelle="paiements"
        onChange={setPage}
      />
    </div>
  );
}
