import React, { useState, useEffect } from 'react';
import { AdminMasterApp } from './components/admin/AdminMasterApp';
import { UnifiedRegistrationForm } from './components/public/UnifiedRegistrationForm';

export const App: React.FC = () => {
  const [isRegistrationMode, setIsRegistrationMode] = useState(false);

  useEffect(() => {
    const pathname = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (
      pathname.includes('/cadastro') ||
      pathname.includes('/onboarding') ||
      pathname.includes('/registrar') ||
      pathname.includes('/login') ||
      search.includes('mode=cadastro') ||
      search.includes('mode=onboarding') ||
      search.includes('mode=login') ||
      search.includes('type=client') ||
      search.includes('type=professional')
    ) {
      setIsRegistrationMode(true);
    }
  }, []);

  if (isRegistrationMode) {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const modeParam = searchParams?.get('mode');
    const typeParam = searchParams?.get('type');
    const embedParam = searchParams?.get('embed');
    const slugParam = searchParams?.get('slug') || searchParams?.get('subdomain');
    const shouldLock =
      typeParam === 'client' ||
      typeParam === 'professional' ||
      embedParam === 'true' ||
      Boolean(slugParam);

    const initialMode: 'cadastro' | 'login' =
      modeParam === 'login' || modeParam === 'auth' || modeParam === 'entrar'
        ? 'login'
        : 'cadastro';

    return (
      <UnifiedRegistrationForm
        initialType={typeParam === 'professional' ? 'professional' : 'client'}
        initialMode={initialMode}
        targetSlug={slugParam || undefined}
        hideTypeSelector={shouldLock}
        onClose={() => {
          setIsRegistrationMode(false);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sovereign Admin Master Application */}
      <AdminMasterApp />
    </div>
  );
};

export default App;
