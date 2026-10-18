import React, { useState, useEffect } from 'react';
import { AdminMasterApp } from './components/admin/AdminMasterApp';
import { UniversalFormEmbedView, EmbedFormType } from './components/embed/UniversalFormEmbedView';
import { VagouGatewayHub } from './components/gateway/VagouGatewayHub';

export const App: React.FC = () => {
  const [isRegistrationMode, setIsRegistrationMode] = useState(false);
  const [isEmbedMode, setIsEmbedMode] = useState(false);
  const [currentView, setCurrentView] = useState<'admin' | 'gateway'>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hostname = window.location.hostname.toLowerCase();
      if (
        pathname === '/hub' ||
        pathname === '/gateway' ||
        search.includes('view=gateway') ||
        search.includes('view=hub') ||
        hostname === 'vagouapp.com' ||
        hostname === 'www.vagouapp.com'
      ) {
        return 'gateway';
      }
    }
    return 'admin';
  });

  useEffect(() => {
    const pathname = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (
      pathname.includes('/embed') ||
      search.includes('embed=true') ||
      search.includes('form=mnv') ||
      search.includes('form=estabelecimento') ||
      search.includes('form=usuario') ||
      search.includes('form=user')
    ) {
      setIsEmbedMode(true);
      return;
    }

    if (
      pathname.includes('/cadastro') ||
      pathname.includes('/onboarding') ||
      pathname.includes('/registrar') ||
      pathname.includes('/login') ||
      pathname.includes('/usuario') ||
      search.includes('mode=cadastro') ||
      search.includes('mode=onboarding') ||
      search.includes('mode=login') ||
      search.includes('type=client') ||
      search.includes('type=professional') ||
      search.includes('type=user') ||
      search.includes('type=usuario')
    ) {
      setIsRegistrationMode(true);
    }
  }, []);

  if (isEmbedMode || isRegistrationMode) {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const modeParam = searchParams?.get('mode');
    const typeParam = searchParams?.get('type');
    const formParam = searchParams?.get('form');
    const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';

    let targetForm: EmbedFormType = 'mnv_cadastro';
    if (
      formParam === 'usuario' ||
      formParam === 'user' ||
      typeParam === 'user' ||
      typeParam === 'usuario' ||
      pathname.includes('/usuario')
    ) {
      targetForm = 'usuario';
    } else if (typeParam === 'professional' || pathname.includes('/onboarding') || pathname.includes('/estabelecimento')) {
      targetForm = 'estabelecimento';
    } else if (modeParam === 'login' || pathname.includes('/login')) {
      targetForm = 'mnv_login';
    }

    return (
      <UniversalFormEmbedView
        initialForm={targetForm}
        onExit={() => {
          setIsEmbedMode(false);
          setIsRegistrationMode(false);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  if (currentView === 'gateway') {
    return (
      <div className="w-screen min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 font-sans selection:bg-[#20C933] selection:text-white">
        <VagouGatewayHub onOpenAdmin={() => setCurrentView('admin')} />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sovereign Admin Master Application */}
      <AdminMasterApp onOpenGateway={() => setCurrentView('gateway')} />
    </div>
  );
};

export default App;
