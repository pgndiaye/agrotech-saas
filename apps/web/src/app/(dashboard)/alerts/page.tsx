'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { smsApi } from '@/lib/api';
import {
  Bell,
  BellOff,
  Send,
  Zap,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  SmartphoneNfc,
} from 'lucide-react';

interface SmsConfig {
  id: string;
  enabled: boolean;
  phoneNumber: string;
  city: string;
  stockAlerts: boolean;
  weatherAlerts: boolean;
  financeAlerts: boolean;
  weeklyDigest: boolean;
}

interface SmsLog {
  id: string;
  phoneNumber: string;
  message: string;
  type: string;
  status: string;
  provider: string | null;
  error: string | null;
  createdAt: string;
}

const STATUS_ICONS: Record<string, JSX.Element> = {
  SENT: <CheckCircle className="w-4 h-4 text-green-500" />,
  SIMULATED: <CheckCircle className="w-4 h-4 text-blue-500" />,
  FAILED: <XCircle className="w-4 h-4 text-red-500" />,
  PENDING: <Clock className="w-4 h-4 text-yellow-500" />,
};

const TYPE_LABELS: Record<string, string> = {
  STOCK_CRITICAL: '🚨 Stock critique',
  STOCK_LOW: '⚠️ Stock bas',
  WEATHER_ALERT: '🌡️ Météo',
  FINANCE_ALERT: '💰 Finance',
  WEEKLY_DIGEST: '📊 Digest hebdo',
  TEST: '✅ Test',
};

const SENEGALESE_CITIES = [
  'Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack',
  'Diourbel', 'Louga', 'Tambacounda', 'Kolda', 'Fatick',
  'Kaffrine', 'Kédougou', 'Matam', 'Sédhiou',
];

export default function AlertsPage() {
  const { user } = useAuth();
  const isPremium = user?.tenant?.plan === 'PREMIUM';

  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    phoneNumber: '',
    city: 'Dakar',
    enabled: true,
    stockAlerts: true,
    weatherAlerts: true,
    financeAlerts: true,
    weeklyDigest: false,
  });

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    if (!isPremium) { setLoading(false); return; }
    try {
      const [cfgRes, logsRes] = await Promise.all([smsApi.getConfig(), smsApi.getLogs()]);
      if (cfgRes.data) {
        setConfig(cfgRes.data);
        setForm({
          phoneNumber: cfgRes.data.phoneNumber,
          city: cfgRes.data.city,
          enabled: cfgRes.data.enabled,
          stockAlerts: cfgRes.data.stockAlerts,
          weatherAlerts: cfgRes.data.weatherAlerts,
          financeAlerts: cfgRes.data.financeAlerts,
          weeklyDigest: cfgRes.data.weeklyDigest,
        });
      }
      setLogs(logsRes.data ?? []);
    } catch {
      /* pas de config encore */
    } finally {
      setLoading(false);
    }
  }, [isPremium]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.phoneNumber) { showToast('Numéro de téléphone requis', false); return; }
    setSaving(true);
    try {
      await smsApi.upsertConfig(form);
      await load();
      showToast('Configuration enregistrée', true);
    } catch {
      showToast('Erreur lors de la sauvegarde', false);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config) { showToast('Sauvegardez d\'abord la configuration', false); return; }
    setTesting(true);
    try {
      await smsApi.sendTestSms();
      await load();
      showToast('SMS test envoyé !', true);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Erreur envoi test', false);
    } finally {
      setTesting(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await smsApi.triggerAlerts();
      await load();
      const sent = res.data?.sent ?? 0;
      showToast(
        sent === 0 ? 'Aucune alerte à envoyer — tout va bien 👍' : `${sent} alerte(s) envoyée(s)`,
        true,
      );
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Erreur déclenchement', false);
    } finally {
      setTriggering(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
        <div className="bg-yellow-100 rounded-full p-6">
          <Lock className="w-14 h-14 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Alertes SMS Premium</h1>
        <p className="text-gray-500 max-w-md">
          Recevez des alertes SMS automatiques pour les stocks critiques, la météo agricole et
          votre situation financière — même sans connexion internet.
        </p>
        <a
          href="/payments"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          Passer au Premium
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
            ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Titre */}
      <div className="flex items-center gap-3">
        <Bell className="w-7 h-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Alertes SMS</h1>
          <p className="text-gray-500 text-sm">
            Restez informé même sans connexion internet
          </p>
        </div>
      </div>

      {/* Formulaire configuration */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-5">
        <h2 className="font-semibold text-gray-700 text-lg">Configuration</h2>

        {/* Numéro + Ville */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Numéro de téléphone *
            </label>
            <input
              type="tel"
              placeholder="+221771234567"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <p className="text-xs text-gray-400 mt-1">Format international (+221…)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Ville</label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {SENEGALESE_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-600">Types d'alertes</p>
          {[
            { key: 'stockAlerts', label: '🌾 Alertes stocks (critique / bas)' },
            { key: 'weatherAlerts', label: '🌦️ Alertes météo (canicule / sécheresse)' },
            { key: 'financeAlerts', label: '💰 Alertes finances (solde négatif)' },
            { key: 'weeklyDigest', label: '📊 Résumé hebdomadaire (lundi 7h)' },
            { key: 'enabled', label: '🔔 Alertes activées' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key as keyof typeof form] as boolean}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        {/* Boutons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !config}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
          >
            <SmartphoneNfc className="w-4 h-4" />
            {testing ? 'Envoi…' : 'SMS test'}
          </button>
          <button
            onClick={handleTrigger}
            disabled={triggering || !config}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            {triggering ? 'Analyse…' : 'Déclencher maintenant'}
          </button>
        </div>
      </div>

      {/* Journal SMS */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-700 text-lg">Journal des SMS</h2>
          <span className="ml-auto text-xs text-gray-400">{logs.length} entrée(s)</span>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400 gap-2">
            <BellOff className="w-8 h-8" />
            <p className="text-sm">Aucun SMS envoyé pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition"
              >
                <div className="mt-0.5 shrink-0">
                  {STATUS_ICONS[log.status] ?? <Clock className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500">
                      {TYPE_LABELS[log.type] ?? log.type}
                    </span>
                    <span className="text-xs text-gray-400">→ {log.phoneNumber}</span>
                    {log.provider && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {log.provider}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{log.message}</p>
                  {log.error && (
                    <p className="text-xs text-red-500 mt-1">Erreur: {log.error}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(log.createdAt).toLocaleString('fr-SN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
