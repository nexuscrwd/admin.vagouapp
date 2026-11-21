import React, { useEffect, useMemo, useState } from 'react';
import {
  TriadeUserLoginForm,
  type UserLoginPhase,
  type TriadeUserLoginPayload,
} from './TriadeUserLoginForm';
import { TriadeUserRegisterForm } from './TriadeUserRegisterForm';
import { supabaseAdmin } from '../../../services/supabase';

import slideSalonInterior from '../../../assets/images/mnv_slide_salon_interior_1794764499578.jpg';
import slideBarbershopCraft from '../../../assets/images/mnv_slide_barbershop_craft_1794764500496.jpg';
import slideAestheticSpa from '../../../assets/images/mnv_slide_aesthetic_spa_1794764501452.jpg';

const DEFAULT_MNV_EDITORIAL_SLIDES: string[] = [
  slideSalonInterior,
  slideBarbershopCraft,
  slideAestheticSpa,
];

interface TriadeMnvClientLoginFormProps {
  salonId?: string;
  salonSlug?: string;
  salonName?: string;
  salonLogoUrl?: string;
  salonSlogan?: string;
  salonColor?: string;
  salonSlides?: string[];
  stageMode?: 'slideshow' | 'inline';
  onSuccess?: (payload: TriadeUserLoginPayload) => void;
  onSwitchToRegister?: () => void;
  onSwitchToRecovery?: () => void;
  onClose?: () => void;
  activePhase?: UserLoginPhase;
  onPhaseChange?: (phase: UserLoginPhase) => void;
  variant?: 'card' | 'flat' | 'glass';
  showHeader?: boolean;
}

export const TriadeMnvClientLoginForm: React.FC<TriadeMnvClientLoginFormProps> = ({
  salonId,
  salonSlug,
  salonName = 'VagouApp',
  salonLogoUrl,
  salonSlogan,
  salonColor = '#20C933',
  salonSlides,
  stageMode = 'slideshow',
  onSuccess,
  onSwitchToRegister,
  onSwitchToRecovery,
  onClose,
  activePhase,
  onPhaseChange,
  variant = 'glass',
  showHeader = true,
}) => {
  const [resolvedSalon, setResolvedSalon] = useState<{
    id?: string;
    name?: string;
    slug?: string;
    logoUrl?: string;
    slogan?: string;
    slides: string[];
  }>({
    id: salonId,
    name: salonName,
    slug: salonSlug,
    logoUrl: salonLogoUrl,
    slogan: salonSlogan,
    slides: salonSlides || [],
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [failedSlides, setFailedSlides] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    setResolvedSalon((prev) => ({
      ...prev,
      id: salonId ?? prev.id,
      name: salonName || prev.name,
      slug: salonSlug ?? prev.slug,
      logoUrl: salonLogoUrl ?? prev.logoUrl,
      slogan: salonSlogan ?? prev.slogan,
      slides: salonSlides && salonSlides.length > 0 ? salonSlides : prev.slides,
    }));
  }, [salonId, salonSlug, salonName, salonLogoUrl, salonSlogan, salonSlides]);

  useEffect(() => {
    if (!salonSlug && !salonId) return;
    let cancelled = false;

    const loadSalonBranding = async () => {
      try {
        let query = supabaseAdmin
          .from('salons')
          .select('id, trade_name, slug, logo_url, slogan, cover_url, branding');

        if (salonId) {
          query = query.eq('id', salonId);
        } else if (salonSlug) {
          query = query.eq('slug', salonSlug.trim().toLowerCase());
        }

        const { data: salonRow } = await query.maybeSingle();
        if (cancelled || !salonRow) return;

        const gatheredSlides: string[] = [];
        if (salonRow.cover_url) {
          gatheredSlides.push(salonRow.cover_url);
        }

        if (salonRow.id) {
          const { data: mediaRows } = await supabaseAdmin
            .from('media_assets')
            .select('public_url, mime_type, purpose')
            .eq('owner_type', 'salon')
            .eq('owner_id', salonRow.id)
            .ilike('mime_type', 'image/%')
            .limit(5);

          if (Array.isArray(mediaRows)) {
            mediaRows.forEach((m: any) => {
              if (m?.public_url && !gatheredSlides.includes(m.public_url)) {
                gatheredSlides.push(m.public_url);
              }
            });
          }
        }

        if (!cancelled) {
          setResolvedSalon({
            id: salonRow.id,
            name: salonRow.trade_name || salonName,
            slug: salonRow.slug || salonSlug,
            logoUrl: salonRow.logo_url || salonLogoUrl,
            slogan: salonRow.slogan || salonRow.branding?.slogan || salonSlogan,
            slides: gatheredSlides,
          });
        }
      } catch {}
    };

    loadSalonBranding();
    return () => {
      cancelled = true;
    };
  }, [salonId, salonSlug, salonName, salonLogoUrl, salonSlogan]);

  const activeSlides = useMemo(() => {
    const customValid = (resolvedSalon.slides || []).filter((url) => url && !failedSlides[url]);
    if (customValid.length > 0) return customValid;
    return DEFAULT_MNV_EDITORIAL_SLIDES.filter((url) => !failedSlides[url]);
  }, [resolvedSalon.slides, failedSlides]);

  useEffect(() => {
    if (stageMode !== 'slideshow' || activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [stageMode, activeSlides.length]);

  const displayName = resolvedSalon.name || salonName || 'VagouApp';
  const isGenericBrand =
    !displayName || displayName.toLowerCase() === 'vagouapp' || displayName.toLowerCase() === 'vagou';

  const handleRegisterTrigger = () => {
    if (onSwitchToRegister) {
      onSwitchToRegister();
    } else {
      setViewMode('register');
    }
  };

  if (stageMode === 'inline') {
    return (
      <TriadeUserLoginForm
        showHeader={showHeader}
        variant={variant === 'glass' ? 'flat' : variant}
        title={isGenericBrand ? 'Seja bem-vindo!' : displayName}
        subtitle={resolvedSalon.slogan || (isGenericBrand ? 'Acesse o seu espaço' : 'Acesse ou agende seu horário')}
        salonLogoUrl={resolvedSalon.logoUrl}
        submitButtonText="Entrar"
        enableGoogleLogin={true}
        activePhase={activePhase}
        onPhaseChange={onPhaseChange}
        onClose={onClose}
        onSwitchToRegister={handleRegisterTrigger}
        showSwitchToRegister={true}
        onSwitchToRecovery={onSwitchToRecovery}
        onSuccess={(payload: TriadeUserLoginPayload) => {
          onSuccess?.(payload);
        }}
      />
    );
  }

  return (
    <div className="relative w-full min-h-[620px] h-full flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden bg-slate-950 rounded-2xl select-none">

      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        {activeSlides.map((slideUrl, idx) => {
          const isCurrent = idx === currentSlideIndex % Math.max(activeSlides.length, 1);
          return (
            <img
              key={slideUrl}
              src={slideUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() =>
                setFailedSlides((prev) => ({
                  ...prev,
                  [slideUrl]: true,
                }))
              }
              className={`absolute inset-0 w-full h-full object-cover grayscale contrast-110 transition-opacity duration-1000 ease-out ${
                isCurrent ? 'opacity-45' : 'opacity-0'
              }`}
            />
          );
        })}

        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/55 to-slate-950/85" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto my-auto">
        {viewMode === 'login' ? (
          <TriadeUserLoginForm
            showHeader={showHeader}
            variant="glass"
            title={isGenericBrand ? 'Seja bem-vindo!' : displayName}
            subtitle={
              resolvedSalon.slogan ||
              (resolvedSalon.slug ? `${resolvedSalon.slug}.vagouapp.com` : 'Acesse seu espaço')
            }
            salonLogoUrl={resolvedSalon.logoUrl}
            submitButtonText="Entrar"
            enableGoogleLogin={true}
            activePhase={activePhase}
            onPhaseChange={onPhaseChange}
            onClose={onClose}
            onSwitchToRegister={handleRegisterTrigger}
            showSwitchToRegister={true}
            onSwitchToRecovery={onSwitchToRecovery}
            onSuccess={(payload: TriadeUserLoginPayload) => {
              onSuccess?.(payload);
            }}
          />
        ) : (
          <div className="w-full max-w-md mx-auto bg-slate-950/75 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden">
            <TriadeUserRegisterForm
              origin="establishment"
              salonId={resolvedSalon.id}
              salonName={displayName}
              salonLogoUrl={resolvedSalon.logoUrl}
              salonAccentColor={salonColor}
              variant="flat"
              showHeader={true}
              onSwitchToLogin={() => setViewMode('login')}
              onSuccess={(regPayload) => {
                onSuccess?.({
                  identifier: regPayload.email || regPayload.username,
                  name: regPayload.fullName,
                  username: regPayload.username,
                  email: regPayload.email,
                  phone: regPayload.phone,
                  accountType: 'client',
                  role: 'client',
                });
              }}
            />
          </div>
        )}

        {activeSlides.length > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {activeSlides.map((slideUrl, idx) => {
              const isCurrent = idx === currentSlideIndex % activeSlides.length;
              return (
                <button
                  key={slideUrl}
                  type="button"
                  onClick={() => setCurrentSlideIndex(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    isCurrent ? 'w-6 bg-[#20C933]' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
