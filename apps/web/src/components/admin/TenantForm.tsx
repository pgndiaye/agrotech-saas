'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Bouton, Champ, Selecteur } from '@/components/ui/primitives';

export interface ValeursTenant {
  name: string;
  slug: string;
  plan: 'FREE' | 'PREMIUM';
  contactEmail: string;
  contactPhone: string;
  region: string;
  notes: string;
}

const VIDE: ValeursTenant = {
  name: '',
  slug: '',
  plan: 'FREE',
  contactEmail: '',
  contactPhone: '',
  region: '',
  notes: '',
};

/** Reprend la règle du DTO serveur : minuscules, chiffres et tirets. */
const slugifier = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function TenantForm({
  initial,
  modeEdition = false,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ValeursTenant>;
  modeEdition?: boolean;
  onSubmit: (v: ValeursTenant) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<ValeursTenant>({ ...VIDE, ...initial });
  const [enCours, setEnCours] = useState(false);
  // Le slug suit le nom tant que l'utilisateur ne l'a pas édité lui-même.
  const [slugManuel, setSlugManuel] = useState(modeEdition);

  const maj = (champ: keyof ValeursTenant, valeur: string) =>
    setV((p) => ({ ...p, [champ]: valeur }));

  const valide = v.name.trim().length >= 2 && v.slug.length >= 2;

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
    <Modal
      ton="sombre"
      largeur="max-w-lg"
      titre={modeEdition ? 'Modifier la coopérative' : 'Nouvelle coopérative'}
      onClose={onCancel}
    >
      <form onSubmit={soumettre} className="space-y-4">
        <Ligne label="Nom">
          <Champ
            ton="sombre"
            value={v.name}
            autoFocus
            onChange={(e) => {
              maj('name', e.target.value);
              if (!slugManuel) maj('slug', slugifier(e.target.value));
            }}
            placeholder="Coopérative du Cayor"
          />
        </Ligne>

        <Ligne label="Slug (identifiant URL, non modifiable ensuite)">
          <Champ
            ton="sombre"
            value={v.slug}
            disabled={modeEdition}
            onChange={(e) => {
              setSlugManuel(true);
              maj('slug', slugifier(e.target.value));
            }}
            placeholder="coop-cayor"
          />
        </Ligne>

        <div className="grid grid-cols-2 gap-4">
          <Ligne label="Plan">
            <Selecteur
              ton="sombre"
              value={v.plan}
              onChange={(e) => maj('plan', e.target.value)}
              className="w-full"
            >
              <option value="FREE">Gratuit</option>
              <option value="PREMIUM">Premium</option>
            </Selecteur>
          </Ligne>
          <Ligne label="Région">
            <Champ
              ton="sombre"
              value={v.region}
              onChange={(e) => maj('region', e.target.value)}
              placeholder="Thiès"
            />
          </Ligne>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Ligne label="E-mail de contact">
            <Champ
              ton="sombre"
              type="email"
              value={v.contactEmail}
              onChange={(e) => maj('contactEmail', e.target.value)}
              placeholder="contact@coop.sn"
            />
          </Ligne>
          <Ligne label="Téléphone">
            <Champ
              ton="sombre"
              value={v.contactPhone}
              onChange={(e) => maj('contactPhone', e.target.value)}
              placeholder="+221 77 123 45 67"
            />
          </Ligne>
        </div>

        <Ligne label="Notes internes">
          <textarea
            value={v.notes}
            onChange={(e) => maj('notes', e.target.value)}
            rows={2}
            className="w-full rounded-xl px-3.5 py-2 text-sm bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-600"
            placeholder="Visible uniquement des administrateurs"
          />
        </Ligne>

        <div className="flex justify-end gap-3 pt-2">
          <Bouton type="button" variante="secondaire" ton="sombre" onClick={onCancel}>
            Annuler
          </Bouton>
          <Bouton type="submit" ton="sombre" disabled={!valide || enCours}>
            {enCours ? 'Enregistrement…' : modeEdition ? 'Enregistrer' : 'Créer'}
          </Bouton>
        </div>
      </form>
    </Modal>
  );
}
