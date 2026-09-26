import React from 'react';
import { AdminMasterApp } from './components/admin/AdminMasterApp';

export const App: React.FC = () => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sovereign Admin Master Application */}
      <AdminMasterApp />
    </div>
  );
};

export default App;
