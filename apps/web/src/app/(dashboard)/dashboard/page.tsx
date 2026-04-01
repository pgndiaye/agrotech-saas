'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { weatherApi, financeApi, stocksApi } from '@/lib/api';
import {
  CloudSun, Droplets, Wind, TrendingUp, TrendingDown, Package, AlertTriangle,
} from 'lucide-react';

const DashboardAreaChart = dynamic(() => import('./DashboardAreaChart'), { ssr: false });

function StatCard({
  title, value, subtitle, icon: Icon, color,
}: {
  title: string; value: string; subtitle?: string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function WeatherCard({ weather }: { weather: any }) {
  if (!weather) return null;
  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-blue-100 text-sm font-medium">Météo — {weather.city}</p>
          <p className="text-4xl font-bold mt-1">{weather.temperature}°C</p>
          <p className="text-blue-100 capitalize mt-1">{weather.description}</p>
        </div>
        <img src={iconUrl} alt="météo" className="w-16 h-16" />
      </div>
      <div className="flex gap-4 text-sm text-blue-100">
        <span className="flex items-center gap-1"><Droplets size={14} /> {weather.humidity}%</span>
        <span className="flex items-center gap-1"><Wind size={14} /> {weather.windSpeed} m/s</span>
        <span className="flex items-center gap-1"><CloudSun size={14} /> {weather.feelsLike}°C ressenti</span>
      </div>
      {weather.alerts && weather.alerts.length > 0 && (
        <div className="mt-3 space-y-1">
          {weather.alerts.map((alert: string, i: number) => (
            <p key={i} className="text-xs bg-blue-400/30 rounded-lg px-3 py-1">{alert}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [stockStats, setStockStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [weatherRes, forecastRes, summaryRes, monthlyRes, stockRes] = await Promise.allSettled([
          weatherApi.getCurrent('Dakar'),
          weatherApi.getForecast('Dakar'),
          financeApi.getSummary(),
          financeApi.getMonthly(),
          stocksApi.getStats(),
        ]);
        if (weatherRes.status === 'fulfilled') setWeather(weatherRes.value.data);
        if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value.data);
        if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
        if (monthlyRes.status === 'fulfilled') setMonthly(monthlyRes.value.data);
        if (stockRes.status === 'fulfilled') setStockStats(stockRes.value.data);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const formatFCFA = (n: number) =>
    new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('fr-SN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenus"
          value={summary ? formatFCFA(summary.income) : '—'}
          subtitle="Total cumulé"
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Dépenses"
          value={summary ? formatFCFA(summary.expense) : '—'}
          subtitle="Total cumulé"
          icon={TrendingDown}
          color="bg-red-500"
        />
        <StatCard
          title="Solde"
          value={summary ? formatFCFA(summary.balance) : '—'}
          subtitle="Bénéfice net"
          icon={TrendingUp}
          color="bg-primary-600"
        />
        <StatCard
          title="Stocks"
          value={stockStats ? `${stockStats.total} articles` : '—'}
          subtitle={stockStats ? `${stockStats.lowStock} en alerte` : ''}
          icon={Package}
          color="bg-earth-500"
        />
      </div>

      {/* Météo + Prévisions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <WeatherCard weather={weather} />
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Prévisions 5 jours</h2>
          <div className="grid grid-cols-5 gap-2">
            {forecast.map((day: any, i: number) => (
              <div key={i} className="text-center">
                <p className="text-xs text-gray-500 mb-1">{day.date}</p>
                <img
                  src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                  alt={day.description}
                  className="w-10 h-10 mx-auto"
                />
                <p className="font-bold text-gray-900 text-sm">{day.temperature}°</p>
                <p className="text-xs text-blue-500">{day.humidity}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graphique Finance Mensuel */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Évolution financière (6 mois)</h2>
          <DashboardAreaChart data={monthly} />
        </div>
      )}

      {/* Alerte stocks bas */}
      {stockStats?.lowStock > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-amber-800">Alerte stocks</p>
            <p className="text-sm text-amber-600">
              {stockStats.lowStock} article(s) en dessous du seuil minimum. Vérifiez vos stocks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
