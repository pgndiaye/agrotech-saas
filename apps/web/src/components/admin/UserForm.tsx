'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Bouton, Champ, Selecteur } from '@/components/ui/primitives';

export interface ValeursUser {
  email: string;
  name: string;
  password: string;
  role: string;
  tenantId: string;
  phone: string;
}

const VIDE: ValeursUser = {
  email: '',
  name: '',
  password: '',
  role: 'FARMER',
  tenantId: '',
  phone: '',
};

const ROLES = [
  { valeur: 'FARMER', label: 'Agriculteur' },
  { valeur: 'MANAGER', label: 'Gestionnaire' },
  { valeur: 'ADMIN', label: 'Administrateur de coopérative' },
  { valeur: 'SUPER_ADMIN', label: 'Super administrateur (plateforme)' },
];

interface OptionTenant {
  id: string;
  name: string;
  slug: string;
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function UserForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (v: ValeursUser) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<ValeursUser>(VIDE);
  const [tenants, setTenants] = useState<OptionTenant[]>([]);
  const [enCours, setEnCours] = useState(false);

  // Liste des coopératives de rattachement. Limite haute : la console reste
  // utilisable tant que la plateforme n'a pas des milliers de tenants ; au-delà
  // il faudra un champ de recherche côté serveur.
  useEffect(() => {
    adminApi
      .getTenants({ limit: 100, sortBy: 'name', sortOrder: 'asc' })
      .then((res) => {
        setTenants(res.data.data);
        setV((p) => (p.tenantId ? p : { ...p, tenantId: res.data.data[0]?.id ?? '' }));
      })
      .catch(() => setTenants([]));
  }, []);

  const maj = (champ: keyof ValeursUser, valeur: string) =>
    setV((p) => ({ ...p, [champ]: valeur }));

  const valide =
    v.name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(v.email) &&
    v.password.length >= 8 &&
    !!v.tenantId;

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valide) return;
    setEnCours(true);
    try {
      await onSubmit(v);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modal ton="sombre" largeur="max-w-lg" titre="Nouvel utilisateur" onClose={onCancel}>
      <form onSubmit={soumettre} className="space-y-4">
        <Ligne label="Nom complet">
          <Champ
            ton="sombre"
            value={v.name}
            autoFocus
            onChange={(e) => maj('name', e.target.value)}
            placeholder="Fatou Sarr"
          />
        </Ligne>

        <Ligne label="Adresse e-mail">
          <Champ
            ton="sombre"
            type="email"
            value={v.email}
            onChange={(e) => maj('email', e.target.value)}
            placeholder="fatou@coop.sn"
          />
        </Ligne>

        <Ligne label="Mot de passe provisoire (8 caractères minimum)">
          <Champ
            ton="sombre"
            type="password"
            value={v.password}
            onChange={(e) => maj('password', e.target.value)}
            placeholder="À communiquer à l'utilisateur"
          />
        </Ligne>

        <div className="grid grid-cols-2 gap-4">
          <Ligne label="Rôle">
            <Selecteur
              ton="sombre"
              value={v.role}
              onChange={(e) => maj('role', e.target.value)}
              className="w-full"
            >
              {ROLES.map((r) => (
                <option key={r.valeur} value={r.valeur}>
                  {r.label}
                </option>
              ))}
            </Selecteur>
          </Ligne>
          <Ligne label="Téléphone">
            <Champ
              ton="sombre"
              value={v.phone}
              onChange={(e) => maj('phone', e.target.value)}
              placeholder="+221 77 123 45 67"
            />
          </Ligne>
        </div>

        <Ligne label="Coopérative de rattachement">
          <Selecteur
            ton="sombre"
            value={v.tenantId}
            onChange={(e) => maj('tenantId', e.target.value)}
            className="w-full"
          >
            {tenants.length === 0 && <option value="">Aucune coopérative</option>}
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </Selecteur>
        </Ligne>

        <div className="flex justify-end gap-3 pt-2">
          <Bouton type="button" variante="secondaire" ton="sombre" onClick={onCancel}>
            Annuler
          </Bouton>
          <Bouton type="submit" ton="sombre" disabled={!valide || enCours}>
            {enCours ? 'Création…' : 'Créer'}
          </Bouton>
        </div>
      </form>
    </Modal>
  );
}
