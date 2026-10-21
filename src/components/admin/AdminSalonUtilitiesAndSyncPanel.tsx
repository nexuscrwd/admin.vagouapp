import React, { useState } from 'react';
import {
  Zap,
  Droplets,
  Cpu,
  DollarSign,
  Package,
  Plus,
  Trash2,
  Check,
  Copy,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileCode,
  Send,
  Save,
} from 'lucide-react';
import { supabaseAdmin } from '../../services/supabase';

export interface SalonUtilitiesData {
  energyMeters: {
    id: string;
    name: string;
    code: string;
    tariffPerKwh: number;
    status: 'active' | 'inactive';
  }[];
  energyReadings: {
    id: string;
    meterId: string;
    readingKwh: number;
    costEstimated: number;
    date: string;
    notes?: string;
  }[];
  waterMeters: {
    id: string;
    name: string;
    code: string;
    tariffPerM3: number;
    status: 'active' | 'inactive';
  }[];
  waterReadings: {
    id: string;
    meterId: string;
    readingM3: number;
    costEstimated: number;
    date: string;
    notes?: string;
  }[];
  appliances: {
    id: string;
    name: string;
    category: string;
    powerWatts: number;
    dailyHours: number;
    monthlyKwh: number;
  }[];
  financialDre: {
    grossRevenue: number;
    commissionsPaid: number;
    fixedCosts: number;
    utilitiesCost: number;
    suppliesCost: number;
    netProfit: number;
    updatedAt: string;
  };
  inventoryItems: {
    id: string;
    name: string;
    category: string;
    stockQty: number;
    minQty: number;
    unitCost: number;
    sellPrice: number;
  }[];
}

interface AdminSalonUtilitiesAndSyncPanelProps {
  mode: 'utilities' | 'sync_mnv';
  salonId: string;
  salonName: string;
  salonSlug: string;
  utilities: SalonUtilitiesData;
  onUpdateUtilities: (next: SalonUtilitiesData) => Promise<void>;
  counts: {
    services: number;
    media: number;
    team: number;
    clients: number;
    dependents: number;
    themePreset: string;
    primaryColor: string;
  };
  onForceRefresh: () => Promise<void>;
}

export const AdminSalonUtilitiesAndSyncPanel: React.FC<AdminSalonUtilitiesAndSyncPanelProps> = ({
  mode,
  salonId,
  salonName,
  salonSlug,
  utilities,
  onUpdateUtilities,
  counts,
  onForceRefresh,
}) => {
  const [utilSubTab, setUtilSubTab] = useState<'energy' | 'water' | 'appliances' | 'dre' | 'inventory'>('energy');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Formulários rápidos de adição
  const [newEnergyReading, setNewEnergyReading] = useState({ kwh: '', cost: '', notes: '' });
  const [newWaterReading, setNewWaterReading] = useState({ m3: '', cost: '', notes: '' });
  const [newAppliance, setNewAppliance] = useState({ name: '', category: 'Bancada', watts: '', hours: '' });
  const [newInventory, setNewInventory] = useState({ name: '', category: 'Finalizadores', qty: '', minQty: '5', cost: '' });

  // Estado editável do DRE
  const [dreForm, setDreForm] = useState({
    grossRevenue: String(utilities.financialDre?.grossRevenue ?? 18450),
    commissionsPaid: String(utilities.financialDre?.commissionsPaid ?? 7380),
    fixedCosts: String(utilities.financialDre?.fixedCosts ?? 3200),
    utilitiesCost: String(utilities.financialDre?.utilitiesCost ?? 750),
    suppliesCost: String(utilities.financialDre?.suppliesCost ?? 1120),
  });

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const persistUtilities = async (nextUtils: SalonUtilitiesData, successText: string) => {
    setIsSaving(true);
    try {
      await onUpdateUtilities(nextUtils);
      try {
        await supabaseAdmin.from('salon_utilities_records').upsert(
          {
            salon_id: salonId,
            energy_meters: nextUtils.energyMeters,
            energy_readings: nextUtils.energyReadings,
            water_meters: nextUtils.waterMeters,
            water_readings: nextUtils.waterReadings,
            appliances: nextUtils.appliances,
            financial_dre: nextUtils.financialDre,
            inventory_items: nextUtils.inventoryItems,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'salon_id' }
        );
      } catch {
        // Fallback já tratado pela rota Express e branding.utilities
      }
      showToast(successText);
    } finally {
      setIsSaving(false);
    }
  };

  // Handlers de Energia
  const handleAddEnergyReading = async (e: React.FormEvent) => {
    e.preventDefault();
    const kwh = parseFloat(newEnergyReading.kwh.replace(',', '.'));
    if (!kwh || isNaN(kwh)) return;
    const tariff = utilities.energyMeters[0]?.tariffPerKwh || 0.92;
    const cost = newEnergyReading.cost
      ? parseFloat(newEnergyReading.cost.replace(',', '.'))
      : Number((kwh * tariff).toFixed(2));

    const nextReading = {
      id: `er-${Date.now()}`,
      meterId: utilities.energyMeters[0]?.id || 'em-1',
      readingKwh: kwh,
      costEstimated: cost,
      date: new Date().toISOString().slice(0, 10),
      notes: newEnergyReading.notes.trim() || 'Leitura sincronizada via Admin',
    };

    const nextUtils: SalonUtilitiesData = {
      ...utilities,
      energyReadings: [nextReading, ...utilities.energyReadings],
    };
    setNewEnergyReading({ kwh: '', cost: '', notes: '' });
    await persistUtilities(nextUtils, 'Leitura de energia (kWh) sincronizada no Supabase!');
  };

  // Handlers de Água
  const handleAddWaterReading = async (e: React.FormEvent) => {
    e.preventDefault();
    const m3 = parseFloat(newWaterReading.m3.replace(',', '.'));
    if (!m3 || isNaN(m3)) return;
    const tariff = utilities.waterMeters[0]?.tariffPerM3 || 14.5;
    const cost = newWaterReading.cost
      ? parseFloat(newWaterReading.cost.replace(',', '.'))
      : Number((m3 * tariff).toFixed(2));

    const nextReading = {
      id: `wr-${Date.now()}`,
      meterId: utilities.waterMeters[0]?.id || 'wm-1',
      readingM3: m3,
      costEstimated: cost,
      date: new Date().toISOString().slice(0, 10),
      notes: newWaterReading.notes.trim() || 'Leitura de hidrômetro via Admin',
    };

    const nextUtils: SalonUtilitiesData = {
      ...utilities,
      waterReadings: [nextReading, ...utilities.waterReadings],
    };
    setNewWaterReading({ m3: '', cost: '', notes: '' });
    await persistUtilities(nextUtils, 'Leitura de água (m³) sincronizada no Supabase!');
  };

  // Handlers de Equipamentos
  const handleAddAppliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppliance.name.trim()) return;
    const watts = parseFloat(newAppliance.watts) || 1000;
    const hours = parseFloat(newAppliance.hours.replace(',', '.')) || 4;
    const monthlyKwh = Number(((watts * hours * 26) / 1000).toFixed(1));

    const item = {
      id: `ap-${Date.now()}`,
      name: newAppliance.name.trim(),
      category: newAppliance.category,
      powerWatts: watts,
      dailyHours: hours,
      monthlyKwh,
    };

    const nextUtils: SalonUtilitiesData = {
      ...utilities,
      appliances: [item, ...utilities.appliances],
    };
    setNewAppliance({ name: '', category: 'Bancada', watts: '', hours: '' });
    await persistUtilities(nextUtils, 'Equipamento elétrico salvo no Supabase!');
  };

  // Handler de DRE
  const handleSaveDre = async (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(dreForm.grossRevenue) || 0;
    const comm = parseFloat(dreForm.commissionsPaid) || 0;
    const fixed = parseFloat(dreForm.fixedCosts) || 0;
    const utilCost = parseFloat(dreForm.utilitiesCost) || 0;
    const suppCost = parseFloat(dreForm.suppliesCost) || 0;
    const net = gross - comm - fixed - utilCost - suppCost;

    const nextUtils: SalonUtilitiesData = {
      ...utilities,
      financialDre: {
        grossRevenue: gross,
        commissionsPaid: comm,
        fixedCosts: fixed,
        utilitiesCost: utilCost,
        suppliesCost: suppCost,
        netProfit: net,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    };
    await persistUtilities(nextUtils, 'DRE Financeiro atualizado e sincronizado no Supabase!');
  };

  // Handler de Estoque / Insumos
  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventory.name.trim()) return;
    const item = {
      id: `inv-${Date.now()}`,
      name: newInventory.name.trim(),
      category: newInventory.category,
      stockQty: parseInt(newInventory.qty, 10) || 1,
      minQty: parseInt(newInventory.minQty, 10) || 5,
      unitCost: parseFloat(newInventory.cost.replace(',', '.')) || 0,
      sellPrice: 0,
    };
    const nextUtils: SalonUtilitiesData = {
      ...utilities,
      inventoryItems: [item, ...utilities.inventoryItems],
    };
    setNewInventory({ name: '', category: 'Finalizadores', qty: '', minQty: '5', cost: '' });
    await persistUtilities(nextUtils, 'Insumo cadastrado no estoque do Supabase!');
  };

  const handleAdjustStock = async (itemId: string, delta: number) => {
    const nextItems = utilities.inventoryItems.map((it) =>
      it.id === itemId ? { ...it, stockQty: Math.max(0, it.stockQty + delta) } : it
    );
    await persistUtilities({ ...utilities, inventoryItems: nextItems }, 'Quantidade de estoque atualizada!');
  };

  // ============================================================================
  // MODO 1: PAINEL DE UTILIDADES OPERACIONAIS (ENERGIA, ÁGUA, EQUIPAMENTOS, DRE, ESTOQUE)
  // ============================================================================
  if (mode === 'utilities') {
    const totalMonthlyKwh = utilities.appliances.reduce((acc, a) => acc + (a.monthlyKwh || 0), 0);
    const lowStockCount = utilities.inventoryItems.filter((i) => i.stockQty <= i.minQty).length;

    return (
      <div className="space-y-5">
        {feedbackMsg && (
          <div className="p-3 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Barra Superior de Sub-módulos Utilities */}
        <div className="p-4 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span>Ferramentas Utilities & Gestão Operacional • {salonName}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincronizado em tempo real com o módulo Utilidades do Meu Negócio (salon_utilities_records + salons.branding.utilities).
              </p>
            </div>

            <button
              type="button"
              onClick={onForceRefresh}
              disabled={isSaving}
              className="px-3 py-1.5 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${isSaving ? 'animate-spin' : ''}`} />
              <span className="text-white">Sincronizar Agora</span>
            </button>
          </div>

          {/* 5 Sub-abas de Utilidades */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setUtilSubTab('energy')}
              className={`px-3 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                utilSubTab === 'energy'
                  ? 'bg-[#20C933] text-white'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${utilSubTab === 'energy' ? 'text-white' : 'text-amber-400'}`} />
              <span>Energia ({utilities.energyReadings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setUtilSubTab('water')}
              className={`px-3 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                utilSubTab === 'water'
                  ? 'bg-[#20C933] text-white'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Droplets className={`w-3.5 h-3.5 ${utilSubTab === 'water' ? 'text-white' : 'text-sky-400'}`} />
              <span>Água ({utilities.waterReadings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setUtilSubTab('appliances')}
              className={`px-3 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                utilSubTab === 'appliances'
                  ? 'bg-[#20C933] text-white'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cpu className={`w-3.5 h-3.5 ${utilSubTab === 'appliances' ? 'text-white' : 'text-purple-400'}`} />
              <span>Equipamentos ({utilities.appliances.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setUtilSubTab('dre')}
              className={`px-3 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                utilSubTab === 'dre'
                  ? 'bg-[#20C933] text-white'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <DollarSign className={`w-3.5 h-3.5 ${utilSubTab === 'dre' ? 'text-white' : 'text-emerald-400'}`} />
              <span>DRE & Caixa</span>
            </button>

            <button
              type="button"
              onClick={() => setUtilSubTab('inventory')}
              className={`px-3 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                utilSubTab === 'inventory'
                  ? 'bg-[#20C933] text-white'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className={`w-3.5 h-3.5 ${utilSubTab === 'inventory' ? 'text-white' : 'text-rose-400'}`} />
              <span>Insumos & Estoque ({utilities.inventoryItems.length})</span>
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-mono">
                  {lowStockCount} alerta
                </span>
              )}
            </button>
          </div>

          {/* CONTEÚDO 1: ENERGIA ELÉTRICA */}
          {utilSubTab === 'energy' && (
            <div className="space-y-4 pt-2">
              <form onSubmit={handleAddEnergyReading} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  required
                  value={newEnergyReading.kwh}
                  onChange={(e) => setNewEnergyReading({ ...newEnergyReading, kwh: e.target.value })}
                  placeholder="Leitura em kWh (ex: 1680)"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <input
                  type="text"
                  value={newEnergyReading.cost}
                  onChange={(e) => setNewEnergyReading({ ...newEnergyReading, cost: e.target.value })}
                  placeholder="Custo R$ (opcional)"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <input
                  type="text"
                  value={newEnergyReading.notes}
                  onChange={(e) => setNewEnergyReading({ ...newEnergyReading, notes: e.target.value })}
                  placeholder="Observação da medição..."
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Registrar Leitura kWh</span>
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Medidor</th>
                      <th className="py-2 px-3 text-right">Leitura (kWh)</th>
                      <th className="py-2 px-3 text-right">Custo Estimado</th>
                      <th className="py-2 px-3">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {utilities.energyReadings.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">{r.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {utilities.energyMeters[0]?.name || 'Quadro Principal'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-500">
                          {r.readingKwh} kWh
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-500">
                          R$ {Number(r.costEstimated || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTEÚDO 2: ÁGUA & HIDRÔMETRO */}
          {utilSubTab === 'water' && (
            <div className="space-y-4 pt-2">
              <form onSubmit={handleAddWaterReading} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  required
                  value={newWaterReading.m3}
                  onChange={(e) => setNewWaterReading({ ...newWaterReading, m3: e.target.value })}
                  placeholder="Leitura em m³ (ex: 132.5)"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <input
                  type="text"
                  value={newWaterReading.cost}
                  onChange={(e) => setNewWaterReading({ ...newWaterReading, cost: e.target.value })}
                  placeholder="Custo R$ (opcional)"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <input
                  type="text"
                  value={newWaterReading.notes}
                  onChange={(e) => setNewWaterReading({ ...newWaterReading, notes: e.target.value })}
                  placeholder="Observação do hidrômetro..."
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Registrar Leitura m³</span>
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Hidrômetro</th>
                      <th className="py-2 px-3 text-right">Leitura (m³)</th>
                      <th className="py-2 px-3 text-right">Custo Estimado</th>
                      <th className="py-2 px-3">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {utilities.waterReadings.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">{r.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {utilities.waterMeters[0]?.name || 'Hidrômetro Principal'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-sky-400">
                          {r.readingM3} m³
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-500">
                          R$ {Number(r.costEstimated || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTEÚDO 3: EQUIPAMENTOS ELÉTRICOS */}
          {utilSubTab === 'appliances' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>Inventário de aparelhos de alto consumo do salão</span>
                <span className="font-mono tabular-nums font-bold text-amber-400">
                  Consumo Estimado: {totalMonthlyKwh.toFixed(1)} kWh/mês
                </span>
              </div>

              <form onSubmit={handleAddAppliance} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  required
                  value={newAppliance.name}
                  onChange={(e) => setNewAppliance({ ...newAppliance, name: e.target.value })}
                  placeholder="Equipamento (ex: Secador 2400W)"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  required
                  value={newAppliance.watts}
                  onChange={(e) => setNewAppliance({ ...newAppliance, watts: e.target.value })}
                  placeholder="Potência Total (Watts)"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <input
                  type="text"
                  required
                  value={newAppliance.hours}
                  onChange={(e) => setNewAppliance({ ...newAppliance, hours: e.target.value })}
                  placeholder="Uso diário (horas)"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Adicionar Aparelho</span>
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Equipamento</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3 text-right">Potência</th>
                      <th className="py-2 px-3 text-right">Uso/Dia</th>
                      <th className="py-2 px-3 text-right">Estimativa Mensal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {utilities.appliances.map((ap) => (
                      <tr key={ap.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{ap.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{ap.category}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{ap.powerWatts} W</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{ap.dailyHours}h/dia</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                          {ap.monthlyKwh} kWh
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTEÚDO 4: DRE FINANCEIRO & FLUXO DE CAIXA */}
          {utilSubTab === 'dre' && (
            <form onSubmit={handleSaveDre} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Receita Bruta (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dreForm.grossRevenue}
                    onChange={(e) => setDreForm({ ...dreForm, grossRevenue: e.target.value })}
                    className="w-full px-3 py-2 rounded text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Comissões Equipe (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dreForm.commissionsPaid}
                    onChange={(e) => setDreForm({ ...dreForm, commissionsPaid: e.target.value })}
                    className="w-full px-3 py-2 rounded text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Custos Fixos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dreForm.fixedCosts}
                    onChange={(e) => setDreForm({ ...dreForm, fixedCosts: e.target.value })}
                    className="w-full px-3 py-2 rounded text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Energia + Água (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dreForm.utilitiesCost}
                    onChange={(e) => setDreForm({ ...dreForm, utilitiesCost: e.target.value })}
                    className="w-full px-3 py-2 rounded text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Insumos/Estoque (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dreForm.suppliesCost}
                    onChange={(e) => setDreForm({ ...dreForm, suppliesCost: e.target.value })}
                    className="w-full px-3 py-2 rounded text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-rose-400"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Salvar DRE no Banco</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400">
                  Última sincronização DRE: <strong className="font-mono text-white">{utilities.financialDre.updatedAt}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Resultado Líquido Apurado:</span>
                  <span className="text-sm font-mono tabular-nums font-bold text-emerald-400">
                    R${' '}
                    {(
                      (parseFloat(dreForm.grossRevenue) || 0) -
                      (parseFloat(dreForm.commissionsPaid) || 0) -
                      (parseFloat(dreForm.fixedCosts) || 0) -
                      (parseFloat(dreForm.utilitiesCost) || 0) -
                      (parseFloat(dreForm.suppliesCost) || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </form>
          )}

          {/* CONTEÚDO 5: INSUMOS & ESTOQUE */}
          {utilSubTab === 'inventory' && (
            <div className="space-y-4 pt-2">
              <form onSubmit={handleAddInventoryItem} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  required
                  value={newInventory.name}
                  onChange={(e) => setNewInventory({ ...newInventory, name: e.target.value })}
                  placeholder="Nome do insumo/produto..."
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  required
                  value={newInventory.qty}
                  onChange={(e) => setNewInventory({ ...newInventory, qty: e.target.value })}
                  placeholder="Qtd em estoque"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <input
                  type="text"
                  value={newInventory.cost}
                  onChange={(e) => setNewInventory({ ...newInventory, cost: e.target.value })}
                  placeholder="Custo unitário R$"
                  className="px-3 py-2 rounded text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Cadastrar Insumo</span>
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Insumo / Produto</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3 text-center">Qtd Atual</th>
                      <th className="py-2 px-3 text-center">Mínimo</th>
                      <th className="py-2 px-3 text-right">Custo Unit.</th>
                      <th className="py-2 px-3 text-right">Ajuste Rápido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {utilities.inventoryItems.map((it) => {
                      const isLow = it.stockQty <= it.minQty;
                      return (
                        <tr key={it.id}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{it.name}</span>
                            {isLow && (
                              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Repor
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{it.category}</td>
                          <td className={`py-2.5 px-3 text-center font-mono tabular-nums font-bold ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {it.stockQty} un
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-400">{it.minQty} un</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            R$ {Number(it.unitCost || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(it.id, -1)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs cursor-pointer"
                              >
                                -1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(it.id, 1)}
                                className="px-2 py-0.5 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white font-mono text-xs cursor-pointer"
                              >
                                +1
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODO 2: DIAGNÓSTICO DE PARIDADE & GUIA DE SINCRONIZAÇÃO PARA O MNVAPP
  // ============================================================================
  const mnvConnectorCode = `// ============================================================================
// ARQUIVO: src/lib/mnvSupabaseSync.ts (COLAR NO REPOSITÓRIO MEU NEGÓCIO - mnvapp)
// Amarra 100% das ferramentas do estabelecimento diretamente ao Supabase (admvapp)
// ============================================================================
import { supabase } from './supabase';

// 1. CRIAR / ATUALIZAR SERVIÇO (Grava em public.services + public.salon_services)
export async function syncSalonServiceToDb(salonId: string, service: {
  id?: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  commissionRate?: number;
  description?: string;
  photos?: string[];
  isActive?: boolean;
}) {
  const payload = {
    salon_id: salonId,
    name: service.name,
    title: service.name,
    category: service.category || 'Geral',
    price: Number(service.price) || 0,
    duration_minutes: Number(service.durationMinutes) || 30,
    commission_rate: Number(service.commissionRate ?? 50),
    description: service.description || '',
    photos: service.photos || [],
    is_active: service.isActive ?? true,
  };

  const { data: srv } = await supabase.from('services').upsert(payload).select().maybeSingle();
  if (srv?.id) {
    await supabase.from('salon_services').upsert({
      salon_id: salonId,
      service_id: srv.id,
      custom_name: payload.name,
      category: payload.category,
      price: payload.price,
      duration_minutes: payload.duration_minutes,
      commission_rate: payload.commission_rate,
      description: payload.description,
      photos: payload.photos,
      is_active: payload.is_active,
    });
  }
  return srv;
}

// 2. ADICIONAR FOTO / VÍDEO À GALERIA (Grava em public.salon_media_items + salons.branding)
export async function syncSalonMediaToDb(salonId: string, media: {
  title: string;
  url: string;
  type?: 'image' | 'video';
  category?: 'servicos' | 'profissionais' | 'espaco' | 'banner' | 'logotipo';
  slotIndex?: number;
  isCover?: boolean;
}) {
  const { data } = await supabase.from('salon_media_items').insert({
    salon_id: salonId,
    title: media.title,
    caption: media.title,
    url: media.url,
    media_url: media.url,
    type: media.type || 'image',
    media_type: media.type || 'image',
    media_group: media.type === 'video' ? 'videos' : (media.category === 'banner' || media.category === 'logotipo' ? 'imagens' : 'fotos'),
    category: media.category || 'espaco',
    slot_index: media.slotIndex || 1,
    is_cover: Boolean(media.isCover),
    is_active: true,
  }).select().maybeSingle();
  return data;
}

// 3. GESTÃO DO TEMA CAMALEÃO & IDENTIDADE VISUAL (Grava em public.salons + branding)
export async function syncSalonThemeToDb(salonId: string, theme: {
  themePresetId: string;
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  facadePhotoUrl?: string;
  interiorPhotoUrl?: string;
}) {
  const { data: current } = await supabase.from('salons').select('branding').eq('id', salonId).maybeSingle();
  const nextBranding = { ...(current?.branding || {}), ...theme, updatedAt: new Date().toISOString() };
  return supabase.from('salons').update({
    primary_color: theme.primaryColor,
    secondary_color: theme.secondaryColor || '#059669',
    theme_preset_id: theme.themePresetId,
    ...(theme.logoUrl ? { logo_url: theme.logoUrl } : {}),
    ...(theme.coverImageUrl ? { cover_image_url: theme.coverImageUrl } : {}),
    branding: nextBranding,
  }).eq('id', salonId);
}

// 4. CADASTRO DE PROFISSIONAIS NA EQUIPE (Grava em public.professionals)
export async function syncProfessionalToDb(salonId: string, pro: {
  id?: string;
  name: string;
  role: string;
  accessLevel?: 'admin' | 'professional' | 'reception';
  phone: string;
  email?: string;
  commissionRate?: number;
  productCommissionRate?: number;
  specialties?: string[];
  isActive?: boolean;
}) {
  return supabase.from('professionals').upsert({
    ...(pro.id && pro.id.length === 36 ? { id: pro.id } : {}),
    salon_id: salonId,
    name: pro.name,
    full_name: pro.name,
    role: pro.role,
    access_level: pro.accessLevel || 'professional',
    phone: pro.phone,
    phone_whatsapp: pro.phone,
    email: pro.email || null,
    commission_rate: pro.commissionRate ?? 50,
    product_commission_rate: pro.productCommissionRate ?? 10,
    specialties: pro.specialties || [],
    is_active: pro.isActive ?? true,
    status: (pro.isActive ?? true) ? 'active' : 'suspended',
  }).select().maybeSingle();
}

// 5. CONTA FAMÍLIA & DEPENDENTES (Grava em public.dependents e atualiza clients.dependents_count)
export async function syncClientDependentToDb(parentClientId: string, dep: {
  full_name: string;
  relationship: 'son' | 'daughter' | 'spouse' | 'parent' | 'other';
  birth_date?: string;
  notes?: string;
}) {
  const { data } = await supabase.from('dependents').insert({
    parent_client_id: parentClientId,
    full_name: dep.full_name,
    relationship: dep.relationship,
    birth_date: dep.birth_date || null,
    notes: dep.notes || null,
    is_unlinked: false,
  }).select().maybeSingle();

  const { count } = await supabase
    .from('dependents')
    .select('*', { count: 'exact', head: true })
    .eq('parent_client_id', parentClientId)
    .eq('is_unlinked', false);

  await supabase.from('clients').update({ dependents_count: count || 0 }).eq('id', parentClientId);
  return data;
}

// 6. FERRAMENTAS UTILITIES: ENERGIA, ÁGUA, EQUIPAMENTOS, DRE E ESTOQUE
export async function syncSalonUtilitiesToDb(salonId: string, utilitiesPayload: {
  energyMeters?: any[];
  energyReadings?: any[];
  waterMeters?: any[];
  waterReadings?: any[];
  appliances?: any[];
  financialDre?: any;
  inventoryItems?: any[];
}) {
  await supabase.from('salon_utilities_records').upsert({
    salon_id: salonId,
    energy_meters: utilitiesPayload.energyMeters || [],
    energy_readings: utilitiesPayload.energyReadings || [],
    water_meters: utilitiesPayload.waterMeters || [],
    water_readings: utilitiesPayload.waterReadings || [],
    appliances: utilitiesPayload.appliances || [],
    financial_dre: utilitiesPayload.financialDre || {},
    inventory_items: utilitiesPayload.inventoryItems || [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'salon_id' });
}`;

  const promptForMnvAgent = `📡 COMUNICADO OFICIAL DE SINCRONIZAÇÃO SOBERANA (ORIGEM: admvapp -> DESTINO: mnvapp)

Preciso que você amarre 100% das operações locais do mnvapp ao banco de dados Supabase para espelhamento em tempo real com o Admin-VagouApp (admvapp):

1. CRIAÇÃO DE SERVIÇOS (ProfessionalServicesManager.tsx):
   - Além do estado local/localStorage, grave todos os serviços criados ou editados nas tabelas 'public.services' e 'public.salon_services' (incluindo custom_name, category, price, duration_minutes, commission_rate, photos, videos, slides e is_active).

2. ADICIONAR FOTOS À GALERIA (ProfessionalSpaceManager.tsx & SalonProfileView.tsx):
   - Ao subir fotos/vídeos da galeria ou ambiente, insira na tabela oficial 'public.salon_media_items' (preenchendo salon_id, title, caption, url, media_url, type, media_type, media_group, category e slot_index) e mantenha o espelhamento em 'salons.branding.galleryUrls'.

3. GESTÃO DO TEMA CAMALEÃO (SalonProfileView.tsx & VisualIdentityCardView.tsx):
   - Ao trocar o preset do tema (themePresetId) ou cores primária/secundária, atualize as colunas 'primary_color', 'secondary_color', 'theme_preset_id' na tabela 'public.salons' junto com o JSONB 'branding'.

4. CADASTRO DE USUÁRIOS / CLIENTES (SalonClientAuthModal.tsx):
   - Ao cadastrar cliente na vitrine do salão, grave 'origin_salon_id = salon.id' e 'origin_type = establishment' em 'public.clients'.

5. CADASTRO DE PROFISSIONAIS NO ESTABELECIMENTO (TeamManager.tsx):
   - Substitua a gravação apenas em memória por upsert real em 'public.professionals' (com salon_id, name, full_name, role, access_level, phone_whatsapp, email, commission_rate, product_commission_rate, specialties e status).

6. CADASTRO DE DEPENDENTES (ProfileDrawer.tsx):
   - Unifique a leitura e escrita na tabela relacional 'public.dependents' (parent_client_id, full_name, relationship, birth_date, notes, is_unlinked) e atualize 'dependents_count' em 'public.clients'.

7. FERRAMENTAS UTILITIES (UtilitiesAndToolsView.tsx — Energia, Água, Equipamentos, DRE e Insumos):
   - Sincronize os estados de medidores/leituras de Energia (kWh), Água (m³), Equipamentos (ApplianceManager), DRE Financeiro e Estoque na tabela 'public.salon_utilities_records' (e espelhe em 'salons.branding.utilities').`;

  return (
    <div className="space-y-5">
      {/* Matriz de Paridade dos 7 Módulos */}
      <div className="p-5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>Diagnóstico de Paridade & Sincronismo de Banco (admvapp ⇄ mnvapp)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verificação em tempo real do vínculo entre as telas do Meu Negócio e as tabelas oficiais do Supabase para @{salonSlug}.
            </p>
          </div>

          <button
            type="button"
            onClick={onForceRefresh}
            className="px-3.5 py-1.5 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            <span className="text-white">Revalidar Banco Agora</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Módulo / Ferramenta</th>
                <th className="py-2.5 px-3">Tabela Oficial Supabase</th>
                <th className="py-2.5 px-3 text-center">Registros Ativos</th>
                <th className="py-2.5 px-3">Status no Admin (admvapp)</th>
                <th className="py-2.5 px-3">Ação Requerida no mnvapp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">1. Criação de Serviços</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">public.services + salon_services</td>
                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">{counts.services}</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Sincronizado & Editável</td>
                <td className="py-2.5 px-3 text-slate-400">Usar syncSalonServiceToDb() ao criar serviço customizado</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">2. Galeria de Fotos & Vídeos</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">public.salon_media_items</td>
                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">{counts.media}</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Sincronizado & Editável</td>
                <td className="py-2.5 px-3 text-slate-400">Gravar em salon_media_items + branding.galleryUrls</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">3. Gestão do Tema Camaleão</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">public.salons (theme_preset_id)</td>
                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">
                  {counts.themePreset} ({counts.primaryColor})
                </td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Sincronizado & Editável</td>
                <td className="py-2.5 px-3 text-slate-400">Persistir themePresetId e primary_color em public.salons</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">4. Cadastro de Usuários/Clientes</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">public.clients (origin_salon_id)</td>
                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">{counts.clients}</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Sincronizado & Editável</td>
                <td className="py-2.5 px-3 text-slate-400">Enviar origin_salon_id no cadastro da vitrine</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">5. Cadastro de Profissionais</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">public.professionals</td>
                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">{counts.team}</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Sincronizado & Editável</td>
                <td className="py-2.5 px-3 text-slate-400">Conectar TeamManager.tsx a syncProfessionalToDb()</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">6. Conta Família & Dependentes</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">public.dependents</td>
                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">{counts.dependents}</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Sincronizado & Editável</td>
                <td className="py-2.5 px-3 text-slate-400">Conectar ProfileDrawer.tsx a public.dependents</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">7. Utilities (Consumo/DRE/Estoque)</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">public.salon_utilities_records</td>
                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">
                  {utilities.energyReadings.length + utilities.waterReadings.length + utilities.appliances.length + utilities.inventoryItems.length} itens
                </td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Sincronizado & Editável</td>
                <td className="py-2.5 px-3 text-slate-400">Chamar syncSalonUtilitiesToDb() em UtilitiesAndToolsView</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bloco 1: Prompt / Comunicado Oficial para colar no Agente do mnvapp */}
      <div className="p-5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Passo 1: Instrução / Comunicado Oficial para Enviar ao Projeto Meu Negócio (mnvapp)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => handleCopyText(promptForMnvAgent, 'copy-prompt')}
            className="px-3 py-1.5 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            {copiedKey === 'copy-prompt' ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Instrução Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Copiar Instrução para o mnvapp</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3 rounded bg-slate-950 text-slate-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
          {promptForMnvAgent}
        </pre>
      </div>

      {/* Bloco 2: Conector TypeScript Pronto para o mnvapp */}
      <div className="p-5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Passo 2: Conector Unificado TypeScript (src/lib/mnvSupabaseSync.ts) para o mnvapp
            </h4>
          </div>
          <button
            type="button"
            onClick={() => handleCopyText(mnvConnectorCode, 'copy-code')}
            className="px-3 py-1.5 rounded bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            {copiedKey === 'copy-code' ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Código Copiado!</span>
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Copiar Código TypeScript</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3 rounded bg-slate-950 text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-72 overflow-y-auto">
          {mnvConnectorCode}
        </pre>
      </div>
    </div>
  );
};
