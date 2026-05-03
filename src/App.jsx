import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsOverview from './components/StatsOverview';
import TurnstileGrid from './components/TurnstileGrid';
import AIPipeline from './components/AIPipeline';
import ConfidenceModel from './components/ConfidenceModel';
import SupervisionQueue from './components/SupervisionQueue';
import SecurityIndicators from './components/SecurityIndicators';
import EarlyExitFallback from './components/EarlyExitFallback';
import { useSimulatedData } from './hooks/useSimulatedData';
import {
  Activity, Pause, Play, RefreshCw,
} from 'lucide-react';

export default function App() {
  const {
    turnstiles,
    supervisionQueue,
    systemStats,
    pipelineActivity,
    isRunning,
    toggleSimulation,
    resolveSupervisionEvent,
  } = useSimulatedData();

  const [activeSection, setActiveSection] = useState('dashboard');

  const sections = {
    dashboard: (
      <motion.div
        key="dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        <StatsOverview stats={systemStats} />
        <TurnstileGrid turnstiles={turnstiles} />
      </motion.div>
    ),
    turnstiles: (
      <motion.div
        key="turnstiles"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        <TurnstileGrid turnstiles={turnstiles} />
      </motion.div>
    ),
    pipeline: (
      <motion.div
        key="pipeline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        <AIPipeline pipelineActivity={pipelineActivity} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConfidenceModel turnstiles={turnstiles} />
          <EarlyExitFallback stats={systemStats} />
        </div>
      </motion.div>
    ),
    supervision: (
      <motion.div
        key="supervision"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <SupervisionQueue events={supervisionQueue} onResolve={resolveSupervisionEvent} />
      </motion.div>
    ),
    security: (
      <motion.div
        key="security"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        <SecurityIndicators />
        <EarlyExitFallback stats={systemStats} />
      </motion.div>
    ),
    logs: (
      <motion.div
        key="logs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="glass-hover rounded-xl p-8 text-center"
      >
        <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Audit Log</h3>
        <p className="text-sm text-gray-500">
          Sistema di logging integrato con hash chain SHA-256.
          Ogni evento di accesso viene registrato in modo immutabile.
        </p>
      </motion.div>
    ),
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        supervisionCount={supervisionQueue.length}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header systemStats={systemStats} isRunning={isRunning} />

        <main className="flex-1 p-6 overflow-y-auto">
          {/* Section title */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">
                {activeSection === 'dashboard' && 'Dashboard Controllo Accessi'}
                {activeSection === 'turnstiles' && 'Monitoraggio Varchi Biometrici'}
                {activeSection === 'pipeline' && 'AI Pipeline & Confidenza'}
                {activeSection === 'supervision' && 'Supervisione Umana Remota'}
                {activeSection === 'security' && 'Sicurezza & Conformità'}
                {activeSection === 'logs' && 'Registro Audit'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeSection === 'dashboard' && 'Vista complessiva del sistema di controllo accessi biometrico'}
                {activeSection === 'turnstiles' && '5 Dipendenti Stabili · 2 Non Stabili · 1 Visitatori — 8 varchi totali'}
                {activeSection === 'pipeline' && 'Stato della pipeline AI: Acquisizione → Matching → Decisione'}
                {activeSection === 'supervision' && `Interfaccia operatore — ${supervisionQueue.length} eventi in attesa di revisione`}
                {activeSection === 'security' && 'Crittografia AES-256-GCM · TLS 1.3 · Audit immutabile'}
                {activeSection === 'logs' && 'Registro eventi crittograficamente verificabile'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Simulation controls */}
              <motion.button
                onClick={toggleSimulation}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all
                  ${isRunning
                    ? 'bg-accent-amber/10 border border-accent-amber/30 text-accent-amber hover:bg-accent-amber/20'
                    : 'bg-accent-green/10 border border-accent-green/30 text-accent-green hover:bg-accent-green/20'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isRunning ? 'Pausa Simulazione' : 'Avvia Simulazione'}
              </motion.button>

              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <RefreshCw className={`w-3 h-3 ${isRunning ? 'animate-spin text-accent-neon' : ''}`} />
                <span>{isRunning ? 'Live' : 'Paused'}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {sections[activeSection]}
          </AnimatePresence>
        </main>

        {/* Footer status bar */}
        <footer className="h-8 glass border-t border-bg-border flex items-center justify-between px-6 text-[10px]">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">
              Sistema Controllo Accessi Biometrico v1.0
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">
              AI-Driven con Supervisione Umana Remota
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-gray-600">
            <span>AES-256-GCM</span>
            <span>TLS 1.3</span>
            <span>SHA-256 Audit</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              Operational
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
