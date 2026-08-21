'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/** Motifs de déconnexion forcée renvoyés par l'API dans `?raison=`. */
const MESSAGES_RAISON: Record<string, string> = {
  COMPTE_SUSPENDU:
    'Votre compte a été suspendu. Contactez l’administrateur de la plateforme.',
  ORGANISATION_SUSPENDUE:
    'Votre coopérative a été suspendue. Contactez l’administrateur de la plateforme.',
  COMPTE_SUPPRIME: 'Votre coopérative n’existe plus.',
  SESSION_REVOQUEE:
    'Votre session a été révoquée. Veuillez vous reconnecter.',
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // Lu depuis window plutôt que via useSearchParams : cela évite d'imposer une
  // frontière Suspense au prérendu, et suit le pattern déjà utilisé ailleurs.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raison = params.get('raison');
    if (raison && MESSAGES_RAISON[raison]) {
      setInfo(MESSAGES_RAISON[raison]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      // Le middleware ajoute ?redirect=… quand il intercepte une page protégée.
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      router.push(redirect && redirect.startsWith('/') ? redirect : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-earth-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌱</div>
          <h1 className="text-2xl font-bold text-gray-900">AgroTech SN</h1>
          <p className="text-gray-500 mt-1">Connexion à votre espace</p>
        </div>

        {info && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-3 mb-4 text-sm">
            {info}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="vous@coopérative.sn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <p className="font-medium mb-1">Compte de démo :</p>
          <p>Email : <span className="font-mono">admin@demo-coop.sn</span></p>
          <p>Mot de passe : <span className="font-mono">Admin1234!</span></p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas de compte ?{' '}
          <Link href="/register" className="text-primary-600 font-medium hover:underline">
            Créer un espace
          </Link>
        </p>
      </div>
    </div>
  );
}
