'use client';
import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import {
  Users, Search, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X, AlertCircle,
} from 'lucide-react';

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: string;
  language: string;
  createdAt: string;
  tenant: { id: string; name: string; slug: string; plan: string };
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FARMER'];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-600/20 text-red-300',
  ADMIN: 'bg-blue-600/20 text-blue-300',
  MANAGER: 'bg-purple-600/20 text-purple-300',
  FARMER: 'bg-green-600/20 text-green-300',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const limit = 20;

  const fetchUsers = useCallback(
    (p: number, q: string) => {
      setLoading(true);
      adminApi
        .getUsers(p, limit, q || undefined)
        .then((res) => {
          setUsers(res.data.data);
          setTotal(res.data.total);
        })
        .catch(() => setError('Impossible de charger les utilisateurs'))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleUpdateRole = async (id: string) => {
    setSaving(true);
    try {
      await adminApi.updateUser(id, { role: editRole });
      setEditingId(null);
      fetchUsers(page, search);
    } catch {
      alert('Erreur lors de la mise à jour du rôle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteUser(id);
      setDeleteConfirmId(null);
      fetchUsers(page, search);
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 text-white">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-gray-400 text-sm mt-1">{total} utilisateurs au total</p>
        </div>

        {/* Recherche */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 w-72"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition"
          >
            Chercher
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 mb-6">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        </div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Utilisateur</th>
                  <th className="px-5 py-3 text-left font-medium">Rôle</th>
                  <th className="px-5 py-3 text-left font-medium">Coopérative</th>
                  <th className="px-5 py-3 text-center font-medium">Plan</th>
                  <th className="px-5 py-3 text-left font-medium">Inscrit le</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800/60 hover:bg-gray-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {editingId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateRole(u.id)}
                            disabled={saving}
                            className="text-green-400 hover:text-green-300"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-500 hover:text-white"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-700 text-gray-400'}`}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-white text-sm">{u.tenant.name}</p>
                      <p className="text-xs text-gray-500">{u.tenant.slug}</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.tenant.plan === 'PREMIUM'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {u.tenant.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {deleteConfirmId === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-400">Confirmer ?</span>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded"
                          >
                            Oui
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(u.id);
                              setEditRole(u.role);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                            title="Modifier le rôle"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(u.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-400">
                Page {page} / {totalPages} — {total} résultats
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
