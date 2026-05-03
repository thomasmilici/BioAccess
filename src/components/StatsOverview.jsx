import { motion } from 'framer-motion';
import { Users, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

const STAT_CARDS = [
  { key: 'todayPassages', label: 'Transiti Oggi', icon: Users, color: '#00D4FF', format: v => v.toLocaleString() },
  { key: 'avgConfidence', label: 'Confidenza Media', icon: TrendingUp, color: '#00FF88', format: v => (Number(v) * 100).toFixed(1) + '%' },
  { key: 'supervisionRate', label: 'Tasso Escalation', icon: AlertTriangle, color: '#FFB347', format: v => (Number(v) * 100).toFixed(1) + '%' },
  { key: 'aiUptime', label: 'AI Uptime', icon: Activity, color: '#7C3AED', format: v => v + '%' },
];

export default function StatsOverview({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CARDS.map((card, i) => {
        const Icon = card.icon;
        const value = stats[card.key];

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-hover rounded-xl p-4 relative overflow-hidden group"
          >
            {/* Background glow */}
            <div
              className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ background: `radial-gradient(circle, ${card.color}, transparent)` }}
            />

            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
                <motion.p
                  key={value}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-bold font-mono tracking-tight"
                  style={{ color: card.color }}
                >
                  {card.format(value)}
                </motion.p>
              </div>
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
            </div>

            {/* Mini sparkline bar */}
            <div className="mt-3 h-1 bg-bg-primary rounded-full overflow-hidden relative z-10">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${card.color}80, ${card.color})`,
                  width: `${Math.min(100, (parseFloat(value) || 0) * (card.key === 'supervisionRate' ? 1000 : card.key === 'avgConfidence' ? 100 : card.key === 'aiUptime' ? 1 : 0.3))}%`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (parseFloat(value) || 0) * (card.key === 'supervisionRate' ? 1000 : card.key === 'avgConfidence' ? 100 : card.key === 'aiUptime' ? 1 : 0.3))}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
