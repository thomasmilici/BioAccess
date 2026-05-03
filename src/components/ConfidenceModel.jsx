import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Sigma, Info } from 'lucide-react';
import { CONFIDENCE_WEIGHTS } from '../data/mockData';

export default function ConfidenceModel({ turnstiles }) {
  const [selectedTurnstile, setSelectedTurnstile] = useState(null);
  const [hoveredWeight, setHoveredWeight] = useState(null);

  // Seleziona il primo turnstile come default
  useEffect(() => {
    if (turnstiles.length > 0 && !selectedTurnstile) {
      setSelectedTurnstile(turnstiles[0]);
    }
  }, [turnstiles, selectedTurnstile]);

  const selected = selectedTurnstile || turnstiles[0];
  const components = selected?.components || { sim: 0, stab: 0, qual: 0, live: 0, geom: 0 };

  const calculatedConfidence = (
    components.sim * CONFIDENCE_WEIGHTS.w1.weight +
    components.stab * CONFIDENCE_WEIGHTS.w2.weight +
    components.qual * CONFIDENCE_WEIGHTS.w3.weight +
    components.live * CONFIDENCE_WEIGHTS.w4.weight +
    components.geom * CONFIDENCE_WEIGHTS.w5.weight
  );

  const weightEntries = Object.entries(CONFIDENCE_WEIGHTS);
  const componentMap = {
    w1: 'sim',
    w2: 'stab',
    w3: 'qual',
    w4: 'live',
    w5: 'geom',
  };

  const maxBarWidth = 300;

  return (
    <div className="glass-hover rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Calculator className="w-5 h-5 text-accent-purple" />
        <h2 className="text-sm font-semibold text-gray-200">Modello di Confidenza</h2>
        <span className="text-[10px] text-gray-600 bg-bg-primary px-2 py-0.5 rounded-full font-mono">
          C = w1·sim + w2·stab + w3·qual + w4·live + w5·geom
        </span>
      </div>

      {/* Selezione turnstile */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {turnstiles.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTurnstile(t)}
            className={`
              text-[10px] px-2.5 py-1 rounded-md font-mono transition-all
              ${selected?.id === t.id
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                : 'bg-bg-primary text-gray-500 border border-transparent hover:border-bg-border'
              }
            `}
          >
            {t.id}
          </button>
        ))}
      </div>

      {/* Component bars */}
      <div className="space-y-3 mb-4">
        {weightEntries.map(([key, { name, weight, description }], i) => {
          const compKey = componentMap[key];
          const compValue = components[compKey] || 0;
          const contribution = compValue * weight;
          const barColor = ['#00D4FF', '#7C3AED', '#FF6B9D', '#FFB347', '#00FF88'][i];

          return (
            <motion.div
              key={key}
              className="relative"
              onMouseEnter={() => setHoveredWeight(key)}
              onMouseLeave={() => setHoveredWeight(null)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-400">{key}</span>
                  <span className="text-[11px] text-gray-300">{name}</span>
                  <span className="text-[10px] text-gray-600">w={weight.toFixed(2)}</span>
                </div>
                <span className="text-[11px] font-mono" style={{ color: barColor }}>
                  {contribution.toFixed(3)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: barColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${contribution * 100}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 15, delay: i * 0.1 }}
                  />
                </div>
                <span className="text-[10px] font-mono text-gray-600 w-10 text-right">
                  ×{compValue.toFixed(3)}
                </span>
              </div>

              {/* Tooltip */}
              {hoveredWeight === key && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 -top-8 p-2 rounded-lg bg-bg-primary border border-bg-border text-[10px] text-gray-400 z-10 whitespace-nowrap"
                >
                  {description}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Risultato calcolo */}
      <motion.div
        className="p-4 rounded-xl bg-gradient-to-r from-bg-primary to-bg-card border border-accent-purple/20"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sigma className="w-5 h-5 text-accent-purple" />
            <span className="text-sm font-semibold text-gray-200">Confidence Score</span>
          </div>
          <motion.span
            key={calculatedConfidence.toFixed(4)}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-2xl font-bold font-mono ${
              calculatedConfidence >= 0.95 ? 'text-accent-green' :
              calculatedConfidence >= 0.85 ? 'text-accent-amber' :
              'text-accent-red'
            }`}
          >
            {calculatedConfidence.toFixed(4)}
          </motion.span>
        </div>
        {/* Decision outcome */}
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            calculatedConfidence >= 0.95 ? 'bg-accent-green' :
            calculatedConfidence >= 0.85 ? 'bg-accent-amber' :
            'bg-accent-red'
          } animate-pulse`} />
          <span className="text-xs text-gray-500">
            {calculatedConfidence >= 0.95 ? 'Automazione Totale — Early Exit' :
             calculatedConfidence >= 0.85 ? 'Verifica Parziale — Monitoraggio' :
             'Escalation a Supervisione Umana'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
