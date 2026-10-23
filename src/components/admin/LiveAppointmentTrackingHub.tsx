import React, { useState, useEffect, useMemo } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  Car,
  Bike,
  Bus,
  Footprints,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Route,
  BellRing,
  Play,
  Pause,
  RotateCcw,
  Home,
  Scissors,
  ShieldCheck,
  ArrowRight,
  Compass,
  CloudRain,
  Construction,
  ParkingCircle,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AdminAppointmentItem,
  AppointmentTransportMode,
  AppointmentTrackingStatus,
  RouteStreetCheckpoint,
  RouteAdversityEvent,
} from '../../types/admin';

interface GoogleMapsRouteOption {
  id: string;
  label: string;
  badge: string;
  summary: string;
  baseDistanceKm: number;
  baseEtaMinutes: number;
  trafficCondition: 'normal' | 'moderate' | 'heavy';
  streets: {
    street: string;
    neighborhood: string;
    distanceFromStartKm: number;
    xPercent: number;
    yPercent: number;
  }[];
}

const GOOGLE_MAPS_ROUTE_OPTIONS: Record<'in_salon' | 'home_delivery', GoogleMapsRouteOption[]> = {
  in_salon: [
    {
      id: 'route-reboucas-fast',
      label: 'Rota 1 • Mais Rápida (Google Maps)',
      badge: 'Recomendada',
      summary: 'Via R. dos Pinheiros ➔ Av. Rebouças ➔ R. Oscar Freire',
      baseDistanceKm: 4.5,
      baseEtaMinutes: 25,
      trafficCondition: 'moderate',
      streets: [
        { street: 'Rua dos Pinheiros, 410 (Partida)', neighborhood: 'Pinheiros', distanceFromStartKm: 0.0, xPercent: 14, yPercent: 78 },
        { street: 'Av. Henrique Schaumann, 280', neighborhood: 'Pinheiros', distanceFromStartKm: 1.1, xPercent: 30, yPercent: 64 },
        { street: 'Av. Rebouças, 1900', neighborhood: 'Jardins', distanceFromStartKm: 2.4, xPercent: 50, yPercent: 48 },
        { street: 'Rua Bela Cintra, 1450', neighborhood: 'Jardins', distanceFromStartKm: 3.6, xPercent: 70, yPercent: 34 },
        { street: 'Rua Oscar Freire, 820 (Destino Salão)', neighborhood: 'Jardins', distanceFromStartKm: 4.5, xPercent: 86, yPercent: 20 },
      ],
    },
    {
      id: 'route-paulista-alt',
      label: 'Rota 2 • Alternativa sem Pedágio/Obras',
      badge: 'Alternativa',
      summary: 'Via Av. Faria Lima ➔ Av. Paulista ➔ R. Augusta',
      baseDistanceKm: 5.4,
      baseEtaMinutes: 31,
      trafficCondition: 'normal',
      streets: [
        { street: 'Rua dos Pinheiros, 410 (Partida)', neighborhood: 'Pinheiros', distanceFromStartKm: 0.0, xPercent: 14, yPercent: 78 },
        { street: 'Av. Brig. Faria Lima, 1800', neighborhood: 'Jardim Paulistano', distanceFromStartKm: 1.5, xPercent: 28, yPercent: 36 },
        { street: 'Av. Paulista, 2100', neighborhood: 'Consolação', distanceFromStartKm: 3.2, xPercent: 54, yPercent: 26 },
        { street: 'Rua Augusta, 2400', neighborhood: 'Jardins', distanceFromStartKm: 4.4, xPercent: 72, yPercent: 24 },
        { street: 'Rua Oscar Freire, 820 (Destino Salão)', neighborhood: 'Jardins', distanceFromStartKm: 5.4, xPercent: 86, yPercent: 20 },
      ],
    },
  ],
  home_delivery: [
    {
      id: 'route-delivery-fast',
      label: 'Rota 1 • Mais Rápida até o Cliente (Google Maps)',
      badge: 'Recomendada',
      summary: 'Via R. Oscar Freire ➔ Av. Brasil ➔ Al. Santos (Residência)',
      baseDistanceKm: 3.8,
      baseEtaMinutes: 20,
      trafficCondition: 'moderate',
      streets: [
        { street: 'Studio Prime • R. Oscar Freire, 820 (Saída Profissional)', neighborhood: 'Jardins', distanceFromStartKm: 0.0, xPercent: 16, yPercent: 22 },
        { street: 'Av. Brasil, 1250', neighborhood: 'Jardim América', distanceFromStartKm: 1.0, xPercent: 35, yPercent: 38 },
        { street: 'Alameda Joaquim Eugênio de Lima, 600', neighborhood: 'Bela Vista', distanceFromStartKm: 2.2, xPercent: 55, yPercent: 54 },
        { street: 'Alameda Jaú, 1100', neighborhood: 'Jardins', distanceFromStartKm: 3.1, xPercent: 72, yPercent: 68 },
        { street: 'Alameda Santos, 1780 • Apto 82 (Casa do Cliente)', neighborhood: 'Cerqueira César', distanceFromStartKm: 3.8, xPercent: 86, yPercent: 80 },
      ],
    },
    {
      id: 'route-delivery-alt',
      label: 'Rota 2 • Via Nove de Julho',
      badge: 'Alternativa',
      summary: 'Via Av. Nove de Julho ➔ R. Pamplona ➔ Al. Santos',
      baseDistanceKm: 4.3,
      baseEtaMinutes: 24,
      trafficCondition: 'normal',
      streets: [
        { street: 'Studio Prime • R. Oscar Freire, 820 (Saída Profissional)', neighborhood: 'Jardins', distanceFromStartKm: 0.0, xPercent: 16, yPercent: 22 },
        { street: 'Av. Nove de Julho, 3400', neighborhood: 'Jardim Paulista', distanceFromStartKm: 1.4, xPercent: 32, yPercent: 60 },
        { street: 'Rua Pamplona, 900', neighborhood: 'Jardim Paulista', distanceFromStartKm: 2.7, xPercent: 56, yPercent: 72 },
        { street: 'Rua Campinas, 420', neighborhood: 'Jardim Paulista', distanceFromStartKm: 3.5, xPercent: 72, yPercent: 76 },
        { street: 'Alameda Santos, 1780 • Apto 82 (Casa do Cliente)', neighborhood: 'Cerqueira César', distanceFromStartKm: 4.3, xPercent: 86, yPercent: 80 },
      ],
    },
  ],
};

const TRANSPORT_MODES: {
  id: AppointmentTransportMode;
  label: string;
  speedMultiplier: number;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'driving', label: 'Carro', speedMultiplier: 1.0, icon: Car },
  { id: 'motorcycle', label: 'Moto', speedMultiplier: 0.72, icon: Bike },
  { id: 'rideshare', label: 'App (Uber/99)', speedMultiplier: 1.08, icon: Smartphone },
  { id: 'transit', label: 'Urbano', speedMultiplier: 1.45, icon: Bus },
  { id: 'walking', label: 'A pé', speedMultiplier: 2.4, icon: Footprints },
];

const ADVERSITY_PRESETS: {
  type: RouteAdversityEvent['type'];
  label: string;
  addedMinutes: number;
  icon: React.FC<{ className?: string }>;
}[] = [
  { type: 'traffic', label: 'Trânsito inesperado na via', addedMinutes: 7, icon: AlertTriangle },
  { type: 'roadwork', label: 'Obra / faixa interditada', addedMinutes: 5, icon: Construction },
  { type: 'weather', label: 'Chuva forte / via lenta', addedMinutes: 8, icon: CloudRain },
  { type: 'parking', label: 'Buscando vaga p/ estacionar', addedMinutes: 4, icon: ParkingCircle },
];

interface LiveAppointmentTrackingHubProps {
  appointments: AdminAppointmentItem[];
  selectedSalonName?: string;
}

export const LiveAppointmentTrackingHub: React.FC<LiveAppointmentTrackingHubProps> = ({
  appointments,
  selectedSalonName,
}) => {
  // Contexto: No Salão (Cliente -> Salão) vs Delivery (Profissional -> Casa do Cliente)
  const [serviceLocationType, setServiceLocationType] = useState<'in_salon' | 'home_delivery'>('in_salon');

  // Meio de transporte selecionado
  const [transportMode, setTransportMode] = useState<AppointmentTransportMode>('driving');

  // Rota traçada no Google Maps In-App
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-reboucas-fast');

  // Modo de visualização do receptor (Linha de Ruas estilo Shopee/Correios vs Mapa 10s)
  const [trackingViewMode, setTrackingViewMode] = useState<'street_timeline' | 'live_map'>('street_timeline');

  // Sub-modo do Mapa (Opção 1 Completo com Rota vs Opção 2 Simplificado apenas Pinos)
  const [mapDetailLevel, setMapDetailLevel] = useState<'full' | 'simplified'>('full');

  // Estado da árvore de decisão do Modal Pré-Partida (ETA + 10 min)
  const [decisionStep, setDecisionStep] = useState<
    | 'initial_question' // "Restam X min. Você já está de partida?" (Sim / Não)
    | 'no_branch_attend_or_reschedule' // "Irá comparecer ou remanejar?"
    | 'no_branch_hurry_alert' // "Percurso leva X min! Apresse-se!"
    | 'no_branch_not_attending_choice' // "Cancelar ou Remanejar?"
    | 'cancel_reason_box' // Box obrigatório de motivo do cancelamento
    | 'reschedule_calendar' // Agenda do estabelecimento para escolher nova data/hora
    | 'yes_branch_route_and_share' // Traçar Rota Google Maps + "Compartilhar trajeto ao vivo?"
  >('initial_question');

  // Status atual do rastreamento
  const [trackingStatus, setTrackingStatus] = useState<AppointmentTrackingStatus>('live_sharing');

  // Índice da rua atual na rota traçada (0 a 4)
  const [currentStreetIndex, setCurrentStreetIndex] = useState<number>(2);

  // Ciclo automático de 10 segundos
  const [secondsToNextRefresh, setSecondsToNextRefresh] = useState<number>(10);
  const [isAutoSimulating10s, setIsAutoSimulating10s] = useState<boolean>(true);

  // Adversidade ativa na rua atual (ex: +7 min de trânsito)
  const [activeAdversity, setActiveAdversity] = useState<RouteAdversityEvent | null>({
    type: 'traffic',
    label: 'Trânsito inesperado na via',
    street: 'Av. Rebouças, 1900',
    addedMinutes: 7,
    reportedAt: '14:29',
  });

  // Dados de Cancelamento e Remanejamento
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [cancellationError, setCancellationError] = useState<string>('');
  const [rescheduleDate, setRescheduleDate] = useState<string>('2026-09-25');
  const [rescheduleTime, setRescheduleTime] = useState<string>('16:30');

  // Modal de Simulação da Partida aberto/fechado
  const [isDepartureModalOpen, setIsDepartureModalOpen] = useState<boolean>(false);

  // Atualiza rota padrão ao trocar entre No Salão e Delivery
  useEffect(() => {
    const routes = GOOGLE_MAPS_ROUTE_OPTIONS[serviceLocationType];
    setSelectedRouteId(routes[0].id);
    setCurrentStreetIndex(2);
    setActiveAdversity({
      type: 'traffic',
      label: 'Trânsito inesperado na via',
      street: routes[0].streets[2].street,
      addedMinutes: 6,
      reportedAt: '14:29',
    });
  }, [serviceLocationType]);

  const currentRoute = useMemo(() => {
    const list = GOOGLE_MAPS_ROUTE_OPTIONS[serviceLocationType];
    return list.find((r) => r.id === selectedRouteId) || list[0];
  }, [serviceLocationType, selectedRouteId]);

  const activeTransport = useMemo(() => {
    return TRANSPORT_MODES.find((t) => t.id === transportMode) || TRANSPORT_MODES[0];
  }, [transportMode]);

  // Cálculo oficial: Tempo estimado da rota conforme transporte + 10 min de preparo
  const calculatedRouteMinutes = useMemo(() => {
    return Math.max(5, Math.round(currentRoute.baseEtaMinutes * activeTransport.speedMultiplier));
  }, [currentRoute, activeTransport]);

  const prepBufferMinutes = 10;
  const preAlertMinutesBeforeAppointment = calculatedRouteMinutes + prepBufferMinutes;

  // Distância e ETA restantes baseados na rua atual + adversidade ativa
  const totalStreets = currentRoute.streets.length;
  const remainingFraction = Math.max(0, (totalStreets - 1 - currentStreetIndex) / (totalStreets - 1));
  const remainingDistanceKm = Number((currentRoute.baseDistanceKm * remainingFraction).toFixed(1));
  const addedDelayMinutes = activeAdversity ? activeAdversity.addedMinutes : 0;

  const currentEtaMinutes = useMemo(() => {
    if (trackingStatus === 'arrived' || currentStreetIndex >= totalStreets - 1) return 0;
    if (trackingStatus === 'arriving_5min' || currentStreetIndex === totalStreets - 2) {
      return 5;
    }
    const baseRemaining = Math.max(6, Math.round(calculatedRouteMinutes * remainingFraction));
    return baseRemaining + addedDelayMinutes;
  }, [trackingStatus, currentStreetIndex, totalStreets, calculatedRouteMinutes, remainingFraction, addedDelayMinutes]);

  // Alerta automático quando ETA <= 5 min
  const isFiveMinAlertActive =
    (trackingStatus === 'live_sharing' || trackingStatus === 'arriving_5min') &&
    currentEtaMinutes > 0 &&
    currentEtaMinutes <= 5;

  // Ciclo de 10 segundos (atualiza contador e avança marcador quando ativo)
  useEffect(() => {
    if (!isAutoSimulating10s) return;
    if (trackingStatus !== 'live_sharing' && trackingStatus !== 'arriving_5min') return;

    const timer = setInterval(() => {
      setSecondsToNextRefresh((prev) => {
        if (prev <= 1) {
          setCurrentStreetIndex((idx) => {
            const nextIdx = idx < totalStreets - 1 ? idx + 1 : 0;
            if (nextIdx === totalStreets - 2) {
              setTrackingStatus('arriving_5min');
            } else if (nextIdx === totalStreets - 1) {
              setTrackingStatus('arrived');
            } else {
              setTrackingStatus('live_sharing');
            }
            return nextIdx;
          });
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoSimulating10s, trackingStatus, totalStreets]);

  // Constrói a lista de checkpoints de ruas (Estilo Correios / Shopee)
  const streetCheckpoints: RouteStreetCheckpoint[] = useMemo(() => {
    const baseTimes = ['14:15', '14:22', '14:29', '14:35', '14:41'];
    return currentRoute.streets.map((s, idx) => {
      let status: 'passed' | 'current' | 'upcoming' = 'upcoming';
      if (idx < currentStreetIndex) status = 'passed';
      else if (idx === currentStreetIndex) status = 'current';

      const hasAdversityHere =
        activeAdversity &&
        (activeAdversity.street === s.street || idx === currentStreetIndex);

      return {
        id: `chk-${idx}`,
        street: s.street,
        neighborhood: s.neighborhood,
        distanceFromStartKm: s.distanceFromStartKm,
        status,
        passedAt: idx <= currentStreetIndex ? baseTimes[idx] : undefined,
        adversityLabel: hasAdversityHere ? activeAdversity?.label : undefined,
        addedDelayMinutes: hasAdversityHere ? activeAdversity?.addedMinutes : undefined,
      };
    });
  }, [currentRoute, currentStreetIndex, activeAdversity]);

  const activeSampleAppointment = appointments[0] || {
    client_name: 'Carlos Eduardo Mendes',
    service_title: 'Corte Degradê & Barba Terapia',
    salon_name: selectedSalonName || 'Studio Prime Barbearia',
    professional_name: 'Mestre Rafael',
    time_slot: '15:00',
  };

  const actorLabel =
    serviceLocationType === 'in_salon'
      ? `Cliente: ${activeSampleAppointment.client_name}`
      : `Profissional Delivery: ${activeSampleAppointment.professional_name || 'Especialista Vagou'}`;

  const receiverLabel =
    serviceLocationType === 'in_salon'
      ? `Visão do Salão (${selectedSalonName || activeSampleAppointment.salon_name})`
      : `Visão do Cliente em Casa (${activeSampleAppointment.client_name})`;

  const currentPointCoords = currentRoute.streets[currentStreetIndex] || currentRoute.streets[0];

  const handleConfirmCancellation = () => {
    if (!cancellationReason.trim() || cancellationReason.trim().length < 5) {
      setCancellationError('Informe o motivo do cancelamento para liberar o horário na agenda.');
      return;
    }
    setCancellationError('');
    setTrackingStatus('cancelled');
    setIsDepartureModalOpen(false);
  };

  const handleConfirmReschedule = () => {
    setTrackingStatus('rescheduled');
    setIsDepartureModalOpen(false);
  };

  const handleTriggerAdversity = (preset: typeof ADVERSITY_PRESETS[0]) => {
    const currentStreet = currentRoute.streets[currentStreetIndex]?.street || 'Via atual';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setActiveAdversity({
      type: preset.type,
      label: preset.label,
      street: currentStreet,
      addedMinutes: preset.addedMinutes,
      reportedAt: timeStr,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-white">
      {/* Cabeçalho Principal: Contexto Bidirecional (Salão vs Delivery) + Disparo do Modal Pré-Partida */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950/60">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#20C933] text-white flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Radar de Deslocamento Ao Vivo (10s) & Linha de Ruas (Shopee/Correios)
              </h3>
              <span className="px-2 py-0.5 rounded bg-[#20C933] text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                Google Maps Routes API
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhamento rua por rua sem ligações: cálculo <span className="font-mono text-white">ETA + 10 min</span>, traçador de rota na partida e alerta de chegada em <span className="font-mono text-white">5 min</span>.
            </p>
          </div>
        </div>

        {/* Alternador Bidirecional: No Salão vs Delivery + Botão Abrir Modal Pré-Partida */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setServiceLocationType('in_salon')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                serviceLocationType === 'in_salon'
                  ? 'bg-[#20C933] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-white" />
              <span>No Salão (Cliente ➔ Salão)</span>
            </button>
            <button
              type="button"
              onClick={() => setServiceLocationType('home_delivery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                serviceLocationType === 'home_delivery'
                  ? 'bg-[#20C933] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-white" />
              <span>Delivery (Profissional ➔ Cliente)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setDecisionStep('initial_question');
              setIsDepartureModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Simular Modal de Partida ({preAlertMinutesBeforeAppointment} min antes)</span>
          </button>
        </div>
      </div>

      {/* BANNER AUTOMÁTICO DE GEOFENCING / ALERTA DE 5 MINUTOS */}
      {isFiveMinAlertActive && (
        <div className="px-4 py-3 bg-[#20C933] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-400/30">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-white shrink-0" />
            <div className="text-xs sm:text-sm font-bold text-white">
              {serviceLocationType === 'in_salon'
                ? `ALERTA DE PROXIMIDADE (ETA 5 MIN): ${activeSampleAppointment.client_name} está a 5 minutos do salão! Prepare a cadeira para ${activeSampleAppointment.service_title}.`
                : `ALERTA DELIVERY (ETA 5 MIN): O profissional ${activeSampleAppointment.professional_name || 'Especialista'} chega em 5 minutos na sua residência!`}
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold bg-slate-950/30 text-white px-2.5 py-1 rounded whitespace-nowrap self-start sm:self-auto">
            Desligamento GPS automático no check-in
          </span>
        </div>
      )}

      {/* BARRA DE TELEMETRIA RÁPIDA: Transporte, Rota Traçada, Ciclo 10s e ETA */}
      <div className="p-4 border-b border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-900">
        {/* Coluna 1: Seletor de Modalidade de Transporte */}
        <div className="lg:col-span-5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
            <span>1. Modalidade de Deslocamento</span>
            <span className="font-mono text-emerald-400">
              Rota: {calculatedRouteMinutes}m + {prepBufferMinutes}m preparo = Alerta {preAlertMinutesBeforeAppointment}m antes
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {TRANSPORT_MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = transportMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTransportMode(m.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#20C933] text-white'
                      : 'bg-slate-950 text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Seletor de Rota Traçada no Google Maps In-App */}
        <div className="lg:col-span-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
            <span>2. Rota Traçada no App (Google Maps)</span>
            <span className="font-mono text-slate-300">{currentRoute.streets.length} ruas mapeadas</span>
          </div>
          <div className="flex items-center gap-1.5">
            {GOOGLE_MAPS_ROUTE_OPTIONS[serviceLocationType].map((routeOpt) => {
              const isSelected = currentRoute.id === routeOpt.id;
              return (
                <button
                  key={routeOpt.id}
                  type="button"
                  onClick={() => {
                    setSelectedRouteId(routeOpt.id);
                    setCurrentStreetIndex(1);
                  }}
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer truncate ${
                    isSelected
                      ? 'bg-[#20C933] text-white font-bold'
                      : 'bg-slate-950 text-slate-300 hover:text-white'
                  }`}
                  title={routeOpt.summary}
                >
                  <div className="text-[11px] truncate">{routeOpt.badge}: {routeOpt.baseDistanceKm} km</div>
                  <div className="text-[10px] opacity-90 truncate font-mono">{routeOpt.summary}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna 3: Controles do Ciclo de 10 Segundos & Gatilho 5 Min */}
        <div className="lg:col-span-3 flex flex-wrap items-center justify-between lg:justify-end gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-slate-400">Sync GPS:</span>
            <span className="font-mono font-bold text-xs text-emerald-400 tabular-nums">
              {secondsToNextRefresh}s
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAutoSimulating10s((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              isAutoSimulating10s
                ? 'bg-[#20C933] text-white'
                : 'bg-slate-800 text-slate-200 hover:text-white'
            }`}
          >
            {isAutoSimulating10s ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" />}
            <span>{isAutoSimulating10s ? '10s Ativo' : 'Pausado'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentStreetIndex(totalStreets - 2);
              setTrackingStatus('arriving_5min');
              setSecondsToNextRefresh(10);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
            title="Simular chegada a 5 minutos de ETA"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-300" />
            <span>Testar ETA 5m</span>
          </button>
        </div>
      </div>

      {/* CORPO PRINCIPAL: Alternador dos 2 Modos (Linha Shopee/Correios vs Mapa 10s) + Painel de Adversidades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* LADO ESQUERDO (8 COLUNAS): Visualizador Principal (Modo Linha de Ruas Shopee/Correios OU Mapa 10s) */}
        <div className="lg:col-span-8 p-4 sm:p-5 space-y-4">
          {/* Topo do Visualizador: Quem está acompanhando + Botões dos 2 Modos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                {receiverLabel}
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-white">{actorLabel}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono text-emerald-400 font-bold tabular-nums">
                  Faltam {remainingDistanceKm} km
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono text-white font-bold tabular-nums">
                  ETA: {currentEtaMinutes} min
                </span>
                {addedDelayMinutes > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold whitespace-nowrap">
                    +{addedDelayMinutes} min (Trânsito na rota)
                  </span>
                )}
              </div>
            </div>

            {/* Alternador dos 2 Modos exigidos pelo usuário */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTrackingViewMode('street_timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  trackingViewMode === 'street_timeline'
                    ? 'bg-[#20C933] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Route className="w-3.5 h-3.5 text-white" />
                <span>Linha de Ruas (Shopee/Correios)</span>
              </button>
              <button
                type="button"
                onClick={() => setTrackingViewMode('live_map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  trackingViewMode === 'live_map'
                    ? 'bg-[#20C933] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-white" />
                <span>Mapa Ao Vivo (10s)</span>
              </button>
            </div>
          </div>

          {/* Avisos de Status Especial (Sem Mapa, Cancelado, Remanejado, Apresse-se) */}
          {trackingStatus === 'on_way_no_map' && (
            <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs">
                  <strong>Notificação Simples Recebida:</strong> {actorLabel} informou que já está a caminho (optou por não compartilhar o mapa ao vivo).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrackingStatus('live_sharing')}
                className="px-2.5 py-1 rounded bg-[#20C933] text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
              >
                Ativar Mapa 10s
              </button>
            </div>
          )}

          {trackingStatus === 'hurry_confirmed' && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs">
                  <strong>Confirmou Comparecimento (Ainda não saiu):</strong> O app alertou que o percurso leva <strong>{calculatedRouteMinutes} min</strong> e pediu para se apressar.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrackingStatus('live_sharing')}
                className="px-2.5 py-1 rounded bg-[#20C933] text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
              >
                Simular Saída Agora
              </button>
            </div>
          )}

          {trackingStatus === 'cancelled' && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs">
                  <strong>Agendamento Cancelado com Justificativa:</strong> Motivo informado: <em>"{cancellationReason || 'Imprevisto de última hora no trânsito'}"</em>. Vaga liberada no Radar!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrackingStatus('live_sharing')}
                className="px-2.5 py-1 rounded bg-slate-800 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
              >
                Restaurar Simulação
              </button>
            </div>
          )}

          {trackingStatus === 'rescheduled' && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs">
                  <strong>Agendamento Remanejado pelo App:</strong> Novo horário escolhido diretamente na agenda do estabelecimento: <span className="font-mono font-bold text-white">{rescheduleDate} às {rescheduleTime}</span>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrackingStatus('live_sharing')}
                className="px-2.5 py-1 rounded bg-[#20C933] text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
              >
                Voltar ao Rastreamento
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODO 1: LINHA DE RASTREAMENTO POR RUAS (ESTILO SHOPEE/CORREIOS)*/}
          {/* ============================================================== */}
          {trackingViewMode === 'street_timeline' ? (
            <div className="bg-slate-950 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#20C933]" />
                  <span className="text-xs font-bold text-white">
                    Linha do Tempo de Ruas ({currentRoute.label})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Clique em qualquer rua para avançar/testar o marcador
                </span>
              </div>

              {/* Stepper Vertical das Ruas da Rota Traçada */}
              <div className="space-y-0">
                {streetCheckpoints.map((chk, idx) => {
                  const isPassed = chk.status === 'passed';
                  const isCurrent = chk.status === 'current';
                  const isLast = idx === streetCheckpoints.length - 1;

                  return (
                    <div
                      key={chk.id}
                      onClick={() => {
                        setCurrentStreetIndex(idx);
                        if (idx === streetCheckpoints.length - 2) {
                          setTrackingStatus('arriving_5min');
                        } else if (idx === streetCheckpoints.length - 1) {
                          setTrackingStatus('arrived');
                        } else {
                          setTrackingStatus('live_sharing');
                        }
                      }}
                      className="flex items-start gap-3.5 cursor-pointer group py-2"
                    >
                      {/* Coluna do Indicador e Linha Vertical */}
                      <div className="flex flex-col items-center shrink-0 mt-0.5">
                        {isPassed ? (
                          <div className="w-6 h-6 rounded-full bg-[#20C933] text-white flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-6 h-6 rounded-full bg-[#20C933] text-white flex items-center justify-center ring-4 ring-emerald-500/20">
                            <MapPin className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-[10px]">
                            {idx + 1}
                          </div>
                        )}
                        {!isLast && (
                          <div
                            className={`w-0.5 h-8 mt-1 ${
                              isPassed ? 'bg-[#20C933]' : 'bg-slate-800'
                            }`}
                          />
                        )}
                      </div>

                      {/* Dados da Rua / Checkpoint */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-xs sm:text-sm truncate ${
                                isCurrent
                                  ? 'font-extrabold text-emerald-400'
                                  : isPassed
                                  ? 'font-semibold text-slate-200'
                                  : 'font-medium text-slate-400'
                              }`}
                            >
                              {chk.street}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded bg-[#20C933] text-white text-[10px] font-bold uppercase whitespace-nowrap">
                                Marcador Atual (Agora)
                              </span>
                            )}
                            {isPassed && (
                              <span className="text-[10px] text-emerald-400 font-semibold whitespace-nowrap">
                                Já passou
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-400">
                            <span>{chk.distanceFromStartKm.toFixed(1)} km</span>
                            {chk.passedAt && (
                              <span className="text-slate-300 font-bold">• {chk.passedAt}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Bairro: {chk.neighborhood}
                          {isCurrent && currentEtaMinutes > 0 && (
                            <span className="ml-2 text-white font-mono font-semibold">
                              • Tempo restante até chegada: {currentEtaMinutes} min
                            </span>
                          )}
                        </div>

                        {/* Marcador de Adversidade na Linha do Tempo (sem precisar ligar) */}
                        {isCurrent && activeAdversity && (
                          <div className="mt-2 p-2.5 rounded-lg bg-amber-500/15 text-amber-200 flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div className="text-xs">
                                <span className="font-bold text-amber-300">
                                  Adversidade no Trajeto (+{activeAdversity.addedMinutes} min):
                                </span>{' '}
                                {activeAdversity.label} em <strong>{chk.street}</strong>. O tempo restante foi ajustado automaticamente sem necessidade de ligação.
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAdversity(null);
                              }}
                              className="text-[10px] font-bold text-amber-300 hover:text-white underline shrink-0 cursor-pointer"
                            >
                              Limpar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* MODO 2: MAPA DE RASTREAMENTO AO VIVO (10s - COMPLETO E SIMPLES)*/
            /* ============================================================== */
            <div className="bg-slate-950 rounded-xl p-4 space-y-3">
              {/* Sub-barra do Mapa: Alternar Opção 1 (Completo c/ Rota) vs Opção 2 (Simplificado apenas Pinos) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    Mapa Google Dark (Atualização a cada 10s)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMapDetailLevel('full')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                      mapDetailLevel === 'full'
                        ? 'bg-[#20C933] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Opção 1: Completo (Rota + Trânsito)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapDetailLevel('simplified')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                      mapDetailLevel === 'simplified'
                        ? 'bg-[#20C933] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Opção 2: Simplificado (Apenas Pinos)
                  </button>
                </div>
              </div>

              {/* Canvas Interativo do Mapa (Estilo Uber / 99 / Waze) */}
              <div className="relative h-72 sm:h-80 w-full rounded-xl bg-[#0B1220] overflow-hidden select-none">
                {/* Grade Cartográfica Estilizada das Vias */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                    backgroundSize: '36px 36px',
                  }}
                />

                {/* Polilinha da Rota Traçada no Google Maps (Exibida no Modo Completo) */}
                {mapDetailLevel === 'full' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Rota Completa Base */}
                    <polyline
                      fill="none"
                      stroke="#334155"
                      strokeWidth="1.6"
                      strokeDasharray="2,2"
                      points={currentRoute.streets.map((s) => `${s.xPercent},${s.yPercent}`).join(' ')}
                    />
                    {/* Rota Ativa Verde Vagou (#20C933) */}
                    <polyline
                      fill="none"
                      stroke="#20C933"
                      strokeWidth="2.2"
                      points={currentRoute.streets
                        .slice(currentStreetIndex)
                        .map((s) => `${s.xPercent},${s.yPercent}`)
                        .join(' ')}
                    />
                  </svg>
                )}

                {/* Pontos das Ruas da Rota (No Modo Completo mostra todas as ruas; no Simplificado apenas Origem/Atual e Destino) */}
                {currentRoute.streets.map((pt, idx) => {
                  const isCurrent = idx === currentStreetIndex;
                  const isDestination = idx === currentRoute.streets.length - 1;
                  if (mapDetailLevel === 'simplified' && !isCurrent && !isDestination) {
                    return null;
                  }

                  return (
                    <div
                      key={pt.street}
                      onClick={() => setCurrentStreetIndex(idx)}
                      style={{ left: `${pt.xPercent}%`, top: `${pt.yPercent}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      {isCurrent ? (
                        <div className="flex flex-col items-center">
                          <div className="px-2.5 py-1 rounded-lg bg-[#20C933] text-white text-[10px] font-bold whitespace-nowrap mb-1 shadow-lg flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-white" />
                            <span>{pt.street.split(',')[0]} • {currentEtaMinutes} min</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#20C933] text-white flex items-center justify-center ring-4 ring-emerald-500/30">
                            <Car className="w-4 h-4 text-white" />
                          </div>
                          {activeAdversity && (
                            <div className="mt-1 px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold whitespace-nowrap">
                              +{activeAdversity.addedMinutes}m ({activeAdversity.label})
                            </div>
                          )}
                        </div>
                      ) : isDestination ? (
                        <div className="flex flex-col items-center">
                          <div className="px-2 py-0.5 rounded bg-slate-900/90 text-white text-[10px] font-bold whitespace-nowrap mb-1">
                            {serviceLocationType === 'in_salon' ? 'Destino: Salão' : 'Destino: Casa do Cliente'}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-white text-slate-950 flex items-center justify-center">
                            {serviceLocationType === 'in_salon' ? (
                              <Scissors className="w-3.5 h-3.5 text-slate-950" />
                            ) : (
                              <Home className="w-3.5 h-3.5 text-slate-950" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              idx < currentStreetIndex ? 'bg-[#20C933]' : 'bg-slate-600'
                            }`}
                          />
                          <span className="text-[9px] text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">
                            {pt.street.split(',')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* HUD Inferior do Mapa */}
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Rua Atual: <strong className="text-white">{currentPointCoords.street}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-emerald-400 font-bold">Dist: {remainingDistanceKm} km</span>
                    <span className="text-white font-bold">ETA: {currentEtaMinutes} min</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LADO DIREITO (4 COLUNAS): Radar de Adversidades Sem Ligações & Controles Rápidos */}
        <div className="lg:col-span-4 p-4 sm:p-5 space-y-4 bg-slate-950/40">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Zero Ligações para Dar Satisfação
            </span>
            <h4 className="text-sm font-bold text-white mt-0.5">
              Radar de Adversidades no Trajeto (+X min)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Simule ou reporte com 1 toque imprevistos na via atual (<strong className="text-slate-200">{currentPointCoords.street.split(',')[0]}</strong>). O acréscimo aparece na Linha do Tempo e no Mapa automaticamente:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {ADVERSITY_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = activeAdversity?.type === preset.type;
              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleTriggerAdversity(preset)}
                  className={`p-3 rounded-xl text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#20C933] text-white font-bold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 text-white shrink-0" />
                    <span className="text-xs truncate">{preset.label}</span>
                  </div>
                  <span className="font-mono text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded bg-slate-950/30 text-white">
                    +{preset.addedMinutes} min
                  </span>
                </button>
              );
            })}
          </div>

          {/* Controle de Avanço Manual de Ruas para Teste */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Posição na Rota ({currentStreetIndex + 1}/{totalStreets}):</span>
              <button
                type="button"
                onClick={() => {
                  setCurrentStreetIndex(0);
                  setTrackingStatus('live_sharing');
                }}
                className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reiniciar Rota</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(totalStreets - 1, currentStreetIndex + 1);
                  setCurrentStreetIndex(next);
                  if (next === totalStreets - 2) setTrackingStatus('arriving_5min');
                  else if (next === totalStreets - 1) setTrackingStatus('arrived');
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Avançar para Próxima Rua da Rota</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Nota de Conformidade e Implantação no mnvapp */}
          <div className="p-3 rounded-xl bg-slate-900 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Implantação Principal no mnvapp</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              No <strong>mnvapp</strong>, o Cliente usa a aba <em>Meus Agendamentos</em> e o Salão usa a aba <em>Agenda do Dia</em>. Em atendimentos Delivery, o Profissional traça a rota e o Cliente acompanha em casa.
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL INTERATIVO: ÁRVORE DE DECISÃO DE PARTIDA (ETA + 10 MIN BUFFER)  */}
      {/* ===================================================================== */}
      {isDepartureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 text-white overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header do Modal */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#20C933] text-white flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Alerta Inteligente de Partida ({serviceLocationType === 'in_salon' ? 'Visão Cliente' : 'Visão Profissional Delivery'})
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Faltam {preAlertMinutesBeforeAppointment} min ({calculatedRouteMinutes}m percurso + {prepBufferMinutes}m preparo)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDepartureModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo Rolável do Modal */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* PASSO 1: Pergunta Inicial ("Restam X min. Você já está de partida?") */}
              {decisionStep === 'initial_question' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-950 space-y-1">
                    <span className="text-xs text-slate-400 block">
                      Horário agendado: <strong className="text-white font-mono">{activeSampleAppointment.time_slot}</strong> • {activeSampleAppointment.service_title}
                    </span>
                    <p className="text-sm font-bold text-white">
                      Restam apenas <span className="text-emerald-400 font-mono">{preAlertMinutesBeforeAppointment} minutos</span> ({calculatedRouteMinutes} min de trajeto de {activeTransport.label.toLowerCase()} + 10 min de saída). Você já está de partida?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecisionStep('yes_branch_route_and_share')}
                      className="p-3.5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs cursor-pointer flex flex-col items-center gap-1"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>SIM, JÁ VOU SAIR</span>
                      <span className="text-[10px] font-normal text-white opacity-90">Traçar rota e avisar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionStep('no_branch_attend_or_reschedule')}
                      className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer flex flex-col items-center gap-1"
                    >
                      <XCircle className="w-5 h-5 text-rose-400" />
                      <span>NÃO</span>
                      <span className="text-[10px] font-normal text-slate-300">Ainda não estou de saída</span>
                    </button>
                  </div>
                </div>
              )}

              {/* RAMO NÃO -> Pergunta se irá comparecer ou remanejar */}
              {decisionStep === 'no_branch_attend_or_reschedule' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-white">
                    Você irá comparecer ao agendamento ou deseja remanejar?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecisionStep('no_branch_hurry_alert')}
                      className="p-3.5 rounded-xl bg-[#20C933] text-white font-bold text-xs cursor-pointer flex flex-col items-center gap-1"
                    >
                      <Clock className="w-5 h-5 text-white" />
                      <span>VOU COMPARECER</span>
                      <span className="text-[10px] font-normal text-white">Ver alerta de tempo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionStep('no_branch_not_attending_choice')}
                      className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer flex flex-col items-center gap-1"
                    >
                      <Calendar className="w-5 h-5 text-amber-400" />
                      <span>NÃO VOU COMPARECER</span>
                      <span className="text-[10px] font-normal text-slate-300">Cancelar ou Remanejar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* RAMO NÃO -> VOU COMPARECER (Alerta de Pressa com tempo estimado) */}
              {decisionStep === 'no_branch_hurry_alert' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-500/15 text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>Atenção ao Tempo de Percurso ({calculatedRouteMinutes} minutos)!</span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      O tempo estimado de deslocamento até o destino é de <strong>{calculatedRouteMinutes} minutos</strong>. Apresse-se para sair nos próximos minutos e garantir seu atendimento sem atrasos!
                    </p>
                  </div>
                </div>
              )}

              {/* RAMO NÃO -> NÃO VOU COMPARECER (Escolher Cancelar ou Remanejar) */}
              {decisionStep === 'no_branch_not_attending_choice' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-white">
                    Como você prefere prosseguir com o seu horário?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecisionStep('reschedule_calendar')}
                      className="p-3.5 rounded-xl bg-[#20C933] text-white font-bold text-xs cursor-pointer flex flex-col items-center gap-1"
                    >
                      <Calendar className="w-5 h-5 text-white" />
                      <span>REMANEJAR HORÁRIO</span>
                      <span className="text-[10px] font-normal text-white">Escolher nova data na agenda</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionStep('cancel_reason_box')}
                      className="p-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer flex flex-col items-center gap-1"
                    >
                      <XCircle className="w-5 h-5 text-white" />
                      <span>CANCELAR AGENDAMENTO</span>
                      <span className="text-[10px] font-normal text-white">Informar motivo ao salão</span>
                    </button>
                  </div>
                </div>
              )}

              {/* RAMO CANCELAR: Input Box Obrigatório do Porquê do Cancelamento */}
              {decisionStep === 'cancel_reason_box' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-white">
                    Por que você está cancelando o agendamento? (Obrigatório)
                  </label>
                  <textarea
                    rows={3}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Ex: Imprevisto no trabalho / trânsito bloqueado na minha região..."
                    className="w-full rounded-xl bg-slate-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {cancellationError && (
                    <p className="text-xs text-rose-400 font-semibold">{cancellationError}</p>
                  )}
                </div>
              )}

              {/* RAMO REMANEJAR: Abre a Agenda do Estabelecimento */}
              {decisionStep === 'reschedule_calendar' && (
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-emerald-400 uppercase">
                    Agenda do Estabelecimento • Escolha Nova Data e Horário
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nova Data</label>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full rounded-lg bg-slate-950 p-2.5 text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Horário Disponível</label>
                      <select
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="w-full rounded-lg bg-slate-950 p-2.5 text-xs text-white font-mono outline-none"
                      >
                        <option value="10:00">10:00 (Livre)</option>
                        <option value="14:00">14:00 (Livre)</option>
                        <option value="16:30">16:30 (Livre)</option>
                        <option value="18:00">18:00 (Livre)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* RAMO SIM: Traçador de Rota Google Maps In-App + Opção de Compartilhar Trajeto */}
              {decisionStep === 'yes_branch_route_and_share' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase block">
                      1. Traçar Rota no App (Google Maps API)
                    </span>
                    <div className="space-y-2">
                      {GOOGLE_MAPS_ROUTE_OPTIONS[serviceLocationType].map((rOpt) => {
                        const isSelected = currentRoute.id === rOpt.id;
                        return (
                          <div
                            key={rOpt.id}
                            onClick={() => setSelectedRouteId(rOpt.id)}
                            className={`p-3 rounded-xl cursor-pointer transition ${
                              isSelected
                                ? 'bg-[#20C933] text-white'
                                : 'bg-slate-950 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{rOpt.label}</span>
                              <span className="font-mono">{rOpt.baseDistanceKm} km • {rOpt.baseEtaMinutes} min</span>
                            </div>
                            <div className="text-[11px] opacity-90 mt-0.5 font-mono">{rOpt.summary}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <p className="text-xs font-bold text-white">
                      2. Você já está a caminho e deseja compartilhar o trajeto ao vivo (atualização a cada 10s) com {serviceLocationType === 'in_salon' ? 'o salão' : 'o cliente'}?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTrackingStatus('live_sharing');
                          setCurrentStreetIndex(1);
                          setIsDepartureModalOpen(false);
                        }}
                        className="p-3 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-4 h-4 text-white" />
                        <span>Sim, Compartilhar Trajeto (10s)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTrackingStatus('on_way_no_map');
                          setIsDepartureModalOpen(false);
                        }}
                        className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <BellRing className="w-4 h-4 text-emerald-400" />
                        <span>Não (Apenas Notificar Saída)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé Fixo de Ação (sticky bottom-0 z-20 conforme diretriz Vagou) */}
            <div className="sticky bottom-0 z-20 p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
              {decisionStep !== 'initial_question' ? (
                <button
                  type="button"
                  onClick={() => setDecisionStep('initial_question')}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Voltar ao Início
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Simulador Oficial mnvapp</span>
              )}

              {decisionStep === 'no_branch_hurry_alert' && (
                <button
                  type="button"
                  onClick={() => {
                    setTrackingStatus('hurry_confirmed');
                    setIsDepartureModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#20C933] text-white text-xs font-bold cursor-pointer"
                >
                  Entendi, Estou me Apressando!
                </button>
              )}

              {decisionStep === 'cancel_reason_box' && (
                <button
                  type="button"
                  onClick={handleConfirmCancellation}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  Confirmar Cancelamento
                </button>
              )}

              {decisionStep === 'reschedule_calendar' && (
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  className="px-4 py-2 rounded-lg bg-[#20C933] text-white text-xs font-bold cursor-pointer"
                >
                  Confirmar Novo Horário
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
