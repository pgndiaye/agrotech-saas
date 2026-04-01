'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <div className="text-center">
        <div className="text-5xl mb-4">🌱</div>
        <h1 className="text-2xl font-bold text-primary-800">AgroTech SN</h1>
        <p className="text-gray-500 mt-2">Chargement...</p>
      </div>
    </div>
  );
}
