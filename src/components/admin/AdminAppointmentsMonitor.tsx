import React, { useState } from 'react';
import {
  CalendarCheck,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Building2,
  User,
  ArrowUpRight,
} from 'lucide-react';

interface MockAppointment {
  id: string;
  protocol: string;
  salonName: string;
  salonSlug: string;
  clientName: string;
  clientPhone: string;
  serviceTitle: string;
  price: number;
  time: string;
  status: 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado';
  isRadarOffer: boolean;
}

const INITIAL_APPOINTMENTS: MockAppointment[] = [
  {
    id: 'apt-001',
    protocol: 'VG-9842',
    salonName: 'Flavi Hair • Studio & Visagismo',
    salonSlug: 'flavihair',
    clientName: 'Mariana Silva',
    clientPhone: '(11) 98123-4567',
    serviceTitle: 'Escova Modelada + Hidratação Ozonizada',
    price: 110,
    time: '14:30 Hoje',
    status: 'confirmado',
    isRadarOffer: true,
  },
  {
    id: 'apt-002',
    protocol: 'VG-9843',
    salonName: 'Barbearia Dom Corleone Tradicional',
    salonSlug: 'domcorleone',
    clientName: 'Lucas Ferreira',
    clientPhone: '(11) 99876-5432',
    serviceTitle: 'Corte Degradê Navalhado + Barba Terapia',
    price: 85,
    time: '15:15 Hoje',
    status: 'em_atendimento',
    isRadarOffer: true,
  },
  {
    id: 'apt-003',
    protocol: 'VG-9844',
    salonName: 'Studio VIP • Cabelo & Make',
    salonSlug: 'studiovip',
    clientName: 'Fernanda Paiva',
    clientPhone: '(11) 97654-3210',
    serviceTitle: 'Unhas em Gel Fibra de Vidro',
    price: 140,
    time: '16:00 Hoje',
    status: 'confirmado',
    isRadarOffer: false,
  },
  {
    id: 'apt-004',
    protocol: 'VG-9845',
    salonName: 'Bella Donna Spa & Estética Avançada',
    salonSlug: 'belladonna',
    clientName: 'Beatriz Almeida',
    clientPhone: '(11) 98222-1133',
    serviceTitle: 'Limpeza de Pele Profunda com Peeling de Diamante',
    price: 160,
    time: '17:30 Hoje',
    status: 'confirmado',
    isRadarOffer: true,
  },
  {
    id: 'apt-005',
    protocol: 'VG-9846',
    salonName: 'Barbearia Retrô 90 Vintage',
    salonSlug: 'retro90',
    clientName: 'Rodrigo Santos',
    clientPhone: '(11) 99345-6789',
    serviceTitle: 'Corte Tradicional na Tesoura',
    price: 55,
    time: '18:15 Hoje',
    status: 'confirmado',
    isRadarOffer: true,
  },
];

export const AdminAppointmentsMonitor: React.FC = () => {
  const [appointments, setAppointments] = useState<MockAppointment[]>(INITIAL_APPOINTMENTS);
  const [filterType, setFilterType] = useState<'all' | 'radar' | 'standard'>('all');
  const [search, setSearch] = useState('');

  const filtered = appointments.filter((apt) => {
    if (filterType === 'radar' && !apt.isRadarOffer) return false;
    if (filterType === 'standard' && apt.isRadarOffer) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        apt.salonName.toLowerCase().includes(q) ||
        apt.clientName.toLowerCase().includes(q) ||
        apt.protocol.toLowerCase().includes(q) ||
        apt.serviceTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: MockAppointment['status']) => {
    switch (status) {
      case 'confirmado':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'em_atendimento':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'concluido':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'cancelado':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Monitor de Agendamentos & Vagas do Radar
            </h2>
            <p className="text-xs text-slate-400">
              Fluxo ao vivo de horários agendados e convertidos nos salões via VagouApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {appointments.length} agendamentos registrados hoje
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por cliente, salão ou protocolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-stretch sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('radar')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
              filterType === 'radar'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Via Radar</span>
          </button>
          <button
            onClick={() => setFilterType('standard')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              filterType === 'standard'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Agenda Padrão
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold">Protocolo</th>
                <th className="py-3 px-3 font-semibold">Salão</th>
                <th className="py-3 px-3 font-semibold">Cliente</th>
                <th className="py-3 px-3 font-semibold">Serviço</th>
                <th className="py-3 px-3 font-semibold">Horário</th>
                <th className="py-3 px-3 font-semibold">Valor</th>
                <th className="py-3 px-4 font-semibold text-right">Origem & Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                      {apt.protocol}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-bold text-white block">{apt.salonName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{apt.salonSlug}.vagouapp.com</span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-200 block">{apt.clientName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{apt.clientPhone}</span>
                  </td>

                  <td className="py-3 px-3 text-slate-300 font-medium max-w-[200px] truncate">
                    {apt.serviceTitle}
                  </td>

                  <td className="py-3 px-3">
                    <span className="text-slate-200 font-mono text-[11px] font-medium">{apt.time}</span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-white text-xs">
                      R$ {apt.price.toFixed(2).replace('.', ',')}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {apt.isRadarOffer && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          Radar
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusBadge(apt.status)}`}>
                        {apt.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
