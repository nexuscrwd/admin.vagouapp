import React, { useState, useEffect } from 'react';
import { AdminMasterApp } from './components/admin/AdminMasterApp';
import { UniversalFormEmbedView, EmbedFormType } from './components/embed/UniversalFormEmbedView';
import { VagouGatewayHub } from './components/gateway/VagouGatewayHub';

export const App: React.FC = () => {
  const [isEmbedMode, setIsEmbedMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return (
      search.includes("embed=true") ||
      search.includes("form=") ||
      path.includes("/embed")
    );
  });

  const [isRegistrationMode, setIsRegistrationMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return (
      path.includes('/cadastro') ||
      path.includes('/onboarding') ||
      path.includes('/registrar') ||
      path.includes('/login') ||
      path.includes('/usuario') ||
      search.includes('mode=cadastro') ||
      search.includes('mode=onboarding') ||
      search.includes('mode=login') ||
      search.includes('type=client') ||
      search.includes('type=professional') ||
      search.includes('type=user') ||
      search.includes('type=usuario')
    );
  });

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
    const handleLocationSync = () => {
      const pathname = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();

      setIsEmbedMode(
        search.includes("embed=true") ||
        search.includes("form=") ||
        pathname.includes("/embed")
      );

      setIsRegistrationMode(
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
      );
    };

    window.addEventListener('popstate', handleLocationSync);
    return () => window.removeEventListener('popstate', handleLocationSync);
  }, []);

  if (isEmbedMode || isRegistrationMode) {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const modeParam = searchParams?.get('mode');
    const typeParam = searchParams?.get('type');
    const formParam = searchParams?.get('form') || searchParams?.get('f');
    const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';

    let targetForm: EmbedFormType = 'estabelecimento';
    if (
      formParam === 'estabelecimento' ||
      formParam === 'salao' ||
      formParam === 'cadastro' ||
      formParam === 'novonegocio' ||
      formParam === 'parceiro' ||
      typeParam === 'professional' ||
      pathname.includes('/onboarding') ||
      pathname.includes('/estabelecimento') ||
      pathname.includes('/cadastro') ||
      pathname.includes('/registrar')
    ) {
      targetForm = 'estabelecimento';
    } else if (
      formParam === 'usuario_login' ||
      formParam === 'user_login' ||
      formParam === 'login-usuario' ||
      pathname.includes('/embed/usuario-login')
    ) {
      targetForm = 'usuario_login';
    } else if (
      formParam === 'usuario' ||
      formParam === 'user' ||
      formParam === 'cadastro-usuario' ||
      formParam === 'cadastro_usuario' ||
      typeParam === 'user' ||
      typeParam === 'usuario' ||
      typeParam === 'client' ||
      pathname.includes('/usuario')
    ) {
      targetForm = modeParam === 'login' ? 'usuario_login' : 'usuario';
    } else if (
      formParam === 'mnv_login' ||
      formParam === 'mnv-login' ||
      formParam === 'mnv-acesso' ||
      modeParam === 'login' ||
      pathname.includes('/login')
    ) {
      targetForm = 'mnv_login';
    } else if (formParam === 'admin' || formParam === 'admin_login' || pathname.includes('/embed/admin')) {
      targetForm = 'admin';
    } else if (formParam === 'admin_recovery') {
      targetForm = 'admin_recovery';
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
