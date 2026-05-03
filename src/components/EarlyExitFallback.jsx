import { motion } from 'framer-motion';
import { GitBranch, ArrowDown, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const FALLBACK_STATES = [
  {
    level: 'HIGH',
    range: '≥ 0.95',
    action: 'Early Exit — Automazione Totale',
    description: 'Confidenza elevata: accesso automatico senza intervento umano',
    color: '#00FF88',
    icon: CheckCircle2,
    subsystems: ['Face Detection OK', 'Liveness 3D OK', 'Feature Match ≥ 95%'],
  },
  {
    level: 'MEDIUM',
    range: '0.85 — 0.95',
    action: 'Verifica Parziale — Monitoraggio',
    description: 'Confidenza media: accesso consentito con audit aumentato',
    color: '#FFB347',
    icon: Zap,
    subsystems: ['Face Detection OK', 'Liveness da verificare', 'Feature Match 85-95%'],
  },
  {
    level: 'LOW',
    range: '< 0.85',
    action: 'Escalation a Supervisione Umana',
    description: 'Confidenza insufficiente: blocco automatico e notifica operatore',
    color: '#FF4757',
    icon: AlertCircle,
    subsystems: ['Face Detection incerta', 'Liveness ambiguo', 'Feature Match < 85%'],
  },
];

export default function EarlyExitFallback({ stats }) {
  const [activeFlow, setActiveFlow] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const avgConf = Number(stats.avgConfidence) || 0.93;
      if (avgConf >= 0.95) setActiveFlow('HIGH');
      else if (avgConf >= 0.85) setActiveFlow('MEDIUM');
      else setActiveFlow('LOW');
    }, 3000);
    return () => clearInterval(interval);
  }, [stats.avgConfidence]);

  return (
    <div className="glass-hover rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <GitBranch className="w-5 h-5 text-accent-purple" />
        <h2 className="text-sm font-semibold text-gray-200">Sistema Early Exit &amp; Fallback</h2>
        <span className="ml-auto text-[10px] text-gray-500 font-mono">
          TH_LOW=0.85 | TH_HIGH=0.95
        </span>
      </div>

      {/* Flow diagram */}
      <div className="relative flex flex-col items-center gap-0">
        {FALLBACK_STATES.map((state, i) => {
          const Icon = state.icon;
          const isActive = activeFlow === state.level;

          return (
            <motion.div
              key={state.level}
              className="w-full"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <motion.div
                className={`
                  p-4 rounded-xl border transition-all cursor-pointer
                  ${isActive
                    ? 'border-opacity-50 shadow-lg'
                    : 'border-bg-border/30 bg-bg-primary/30 hover:border-bg-border/60'
                  }
                `}
                style={{
                  borderColor: isActive ? state.color : undefined,
                  boxShadow: isActive ? `0 0 20px ${state.color}15` : undefined,
                }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${isActive ? '' : 'opacity-70'}`}
                    style={{ backgroundColor: `${state.color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: state.color }} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                        style={{ color: state.color, backgroundColor: `${state.color}15` }}
                      >
                        {state.level}
                      </span>
                      <span className="text-[10px] text-gray-600 font-mono">
                        Confidence {state.range}
                      </span>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: state.color, backgroundColor: `${state.color}15` }}
                        >
                          ATTIVO
                        </motion.span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-gray-200 mt-1">{state.action}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{state.description}</p>

                    {/* Subsystems */}
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-3 pt-3 border-t border-white/5"
                      >
                        <div className="grid grid-cols-3 gap-2">
                          {state.subsystems.map((sub, j) => (
                            <motion.div
                              key={sub}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: j * 0.1 }}
                              className="text-center p-2 rounded-lg bg-bg-primary/70"
                            >
                              <p className="text-[9px] text-gray-400">{sub}</p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Connector arrow between states */}
              {i < FALLBACK_STATES.length - 1 && (
                <div className="flex justify-center py-1">
                  <motion.div
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <ArrowDown className="w-3 h-3 text-gray-700" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current system state */}
      <motion.div
        className="mt-4 p-3 rounded-xl bg-bg-primary/50 border border-bg-border/30 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-neon animate-pulse" />
          <span className="text-[10px] text-gray-400">Stato Sistema:</span>
        </div>
        <span className="text-[10px] font-semibold text-accent-neon">
          Confidence media attuale: {(Number(stats.avgConfidence) * 100).toFixed(1)}%
          {' → '}
          {Number(stats.avgConfidence) >= 0.95 ? 'Early Exit' :
           Number(stats.avgConfidence) >= 0.85 ? 'Monitoraggio' :
           'Supervisione Umana'}
        </span>
      </motion.div>
    </div>
  );
}
