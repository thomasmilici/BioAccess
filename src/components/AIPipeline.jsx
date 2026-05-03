import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { PIPELINE_STAGES } from '../data/mockData';

export default function AIPipeline({ pipelineActivity }) {
  const [activeStage, setActiveStage] = useState(0);
  const [stageProgress, setStageProgress] = useState(Array(5).fill(0));
  const [recentEvents, setRecentEvents] = useState([]);

  // Simula la progressione della pipeline
  useEffect(() => {
    const interval = setInterval(() => {
      setStageProgress(prev => {
        const next = [...prev];
        // Avanza lo stage corrente
        next[activeStage] = Math.min(1, next[activeStage] + 0.08);
        if (next[activeStage] >= 1) {
          setActiveStage(prev => (prev + 1) % 5);
          next[activeStage] = 0;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [activeStage]);

  // Traccia eventi recenti dalla pipeline
  useEffect(() => {
    if (pipelineActivity.length > 0) {
      setRecentEvents(prev =>
        [...pipelineActivity.map(p => ({
          ...p,
          stageLabel: PIPELINE_STAGES.find(s => s.id === p.stage)?.label || p.stage,
        })), ...prev].slice(0, 8)
      );
    }
  }, [pipelineActivity]);

  return (
    <div className="glass-hover rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-accent-neon" />
          <h2 className="text-sm font-semibold text-gray-200">AI Pipeline — Stato in Tempo Reale</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          <span className="text-gray-500">
            {recentEvents.length} eventi recenti
          </span>
        </div>
      </div>

      {/* Pipeline stages visualization */}
      <div className="relative mb-6">
        {/* Connecting line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-bg-border">
          <motion.div
            className="h-full data-bar"
            animate={{
              width: ['0%', `${((activeStage + stageProgress[activeStage]) / 5) * 100}%`, `${((activeStage + stageProgress[activeStage]) / 5) * 100}%`],
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="grid grid-cols-5 gap-2 relative">
          {PIPELINE_STAGES.map((stage, i) => {
            const isActive = i === activeStage;
            const isComplete = i < activeStage || (i === activeStage && stageProgress[i] >= 1);
            const progress = stageProgress[i];

            return (
              <motion.div
                key={stage.id}
                className="flex flex-col items-center text-center"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center
                    relative z-10 transition-colors
                    ${isComplete ? 'bg-accent-green/20 border border-accent-green/30' :
                      isActive ? 'bg-accent-neon/20 border border-accent-neon/30' :
                      'bg-bg-primary border border-bg-border'}
                  `}
                  animate={isActive ? {
                    boxShadow: ['0 0 0px rgba(0,212,255,0)', '0 0 20px rgba(0,212,255,0.3)', '0 0 0px rgba(0,212,255,0)'],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-accent-green" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-accent-neon animate-spin" />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: stage.color + '40' }}
                    >
                      <span className="text-[10px] font-mono" style={{ color: stage.color }}>{i + 1}</span>
                    </div>
                  )}
                </motion.div>

                <p
                  className="text-[10px] mt-2 font-medium leading-tight"
                  style={{ color: isActive ? stage.color : isComplete ? '#00FF8880' : '#6B7280' }}
                >
                  {stage.label}
                </p>

                {/* Progress bar sotto ogni stage */}
                <div className="w-full mt-1 h-1 bg-bg-primary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: stage.color, width: `${progress * 100}%` }}
                  />
                </div>

                <p className="text-[9px] text-gray-600 mt-0.5 font-mono">{stage.duration}ms</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sub-steps detail */}
      <div className="mb-4 p-3 rounded-lg bg-bg-primary/50 border border-bg-border/30">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Stage Attivo: {PIPELINE_STAGES[activeStage].label}</p>
        <div className="flex items-center gap-2">
          {PIPELINE_STAGES[activeStage].subSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <motion.span
                className="text-[10px] font-mono px-2 py-1 rounded-md"
                style={{
                  backgroundColor: PIPELINE_STAGES[activeStage].color + '15',
                  color: PIPELINE_STAGES[activeStage].color,
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
              >
                {step}
              </motion.span>
              {i < PIPELINE_STAGES[activeStage].subSteps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-600" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent events stream */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Event Stream</p>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          <AnimatePresence>
            {recentEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-2 text-[10px] py-1"
              >
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: PIPELINE_STAGES.find(s => s.id === event.stage)?.color || '#666' }} />
                <span className="text-gray-500 font-mono">{event.personId}</span>
                <span className="text-gray-700">→</span>
                <span className="text-gray-400">{event.stageLabel}</span>
                <span className="text-gray-600 ml-auto font-mono">
                  {(event.progress * 100).toFixed(0)}%
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
