import React, { useState } from 'react';
import { AdminMasterApp } from './components/admin/AdminMasterApp';
import { SupabaseDiagnosticToast } from './components/SupabaseDiagnosticToast';

export const App: React.FC = () => {
  const [showDiagnostic, setShowDiagnostic] = useState(true);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sovereign Admin Master Application */}
      <AdminMasterApp />

      {/* Connection Diagnostic Toast */}
      {showDiagnostic && (
        <SupabaseDiagnosticToast onDismiss={() => setShowDiagnostic(false)} />
      )}
    </div>
  );
};

export default App;
