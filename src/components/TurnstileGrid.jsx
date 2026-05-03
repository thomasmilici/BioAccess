import { motion } from 'framer-motion';
import TurnstileCard from './TurnstileCard';
import { TURNSTILE_CONFIG } from '../data/mockData';

export default function TurnstileGrid({ turnstiles }) {
  const stableTurnstiles = turnstiles.filter(t => t.type === 'stable');
  const nonStableTurnstiles = turnstiles.filter(t => t.type === 'nonStable');
  const visitorTurnstiles = turnstiles.filter(t => t.type === 'visitor');

  const SectionHeader = ({ config, count }) => (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-5 w-0.5 bg-accent-neon/50 rounded-full" />
      <h3 className="text-sm font-semibold text-gray-300">{config.label}</h3>
      <span className="text-[10px] text-gray-600 bg-bg-primary px-2 py-0.5 rounded-full">
        {count} varchi
      </span>
      <span className="text-[10px] text-gray-600">— {config.automation}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sezione Dipendenti Stabili */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <SectionHeader config={TURNSTILE_CONFIG.stable} count={stableTurnstiles.length} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stableTurnstiles.map((t, i) => (
            <TurnstileCard key={t.id} turnstile={t} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Sezione Personale Non Stabile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <SectionHeader config={TURNSTILE_CONFIG.nonStable} count={nonStableTurnstiles.length} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nonStableTurnstiles.map((t, i) => (
            <TurnstileCard key={t.id} turnstile={t} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Sezione Visitatori */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <SectionHeader config={TURNSTILE_CONFIG.visitor} count={visitorTurnstiles.length} />
        <div className="grid grid-cols-1 max-w-md gap-3">
          {visitorTurnstiles.map((t, i) => (
            <TurnstileCard key={t.id} turnstile={t} index={i} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
