import { motion } from 'framer-motion';
import { UserCheck, UserCog, UserPlus, ArrowRight, Circle, Zap } from 'lucide-react';
import { TURNSTILE_CONFIG } from '../data/mockData';

const TYPE_ICONS = { stable: UserCheck, nonStable: UserCog, visitor: UserPlus };
const STATUS_STYLES = {
  granted: { color: '#00FF88', bg: 'bg-accent-green/10', border: 'border-accent-green/30', label: 'Accesso Consentito', glow: 'shadow-[0_0_15px_rgba(0,255,136,0.15)]' },
  review: { color: '#FFB347', bg: 'bg-accent-amber/10', border: 'border-accent-amber/30', label: 'In Revisione', glow: 'shadow-[0_0_15px_rgba(255,179,71,0.15)]' },
  denied: { color: '#FF4757', bg: 'bg-accent-red/10', border: 'border-accent-red/30', label: 'Accesso Negato', glow: 'shadow-[0_0_15px_rgba(255,71,87,0.15)]' },
};

export default function TurnstileCard({ turnstile, index }) {
  const Icon = TYPE_ICONS[turnstile.type];
  const status = STATUS_STYLES[turnstile.status];
  const confPct = (turnstile.confidence * 100).toFixed(1);
  const config = TURNSTILE_CONFIG[turnstile.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`glass-hover rounded-xl p-4 border ${status.border} ${status.glow} relative overflow-hidden`}
      whileHover={{ y: -2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${status.bg}`}>
            <Icon className="w-4 h-4" style={{ color: status.color }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-200">{turnstile.id}</p>
            <p className="text-[10px] text-gray-500">{turnstile.label}</p>
          </div>
        </div>
        <motion.div
          animate={{
            scale: turnstile.status === 'granted' ? [1, 1.2, 1] : 1,
            opacity: turnstile.status === 'granted' ? [1, 0.5, 1] : 1,
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Circle className="w-2 h-2" style={{ color: status.color, fill: status.color }} />
        </motion.div>
      </div>

      {/* Person info */}
      <div className="mb-3 p-2.5 rounded-lg bg-bg-primary/50">
        <p className="text-sm font-medium text-white">{turnstile.personName}</p>
        <p className="text-[10px] text-gray-500">{turnstile.company}</p>
      </div>

      {/* Confidence score */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Confidence Score</span>
          <motion.span
            key={confPct}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm font-bold font-mono"
            style={{ color: status.color }}
          >
            {confPct}%
          </motion.span>
        </div>
        <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${status.color}80, ${status.color})`,
              width: `${confPct}%`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${confPct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
        {/* Threshold markers */}
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-gray-600">TH_LOW: {(config.thresholds.low * 100).toFixed(0)}%</span>
          <span className="text-[9px] text-gray-600">TH_HIGH: {(config.thresholds.high * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ color: status.color, backgroundColor: `${status.color}15` }}
        >
          {status.label}
        </span>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Zap className="w-3 h-3" style={{ color: status.color }} />
          <span>{turnstile.passageCount} transiti</span>
        </div>
      </div>

      {/* Animated data flow line */}
      {turnstile.status === 'granted' && (
        <motion.div
          className="absolute bottom-0 left-0 h-[1px] bg-accent-green/30"
          animate={{ width: ['0%', '100%', '0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}
