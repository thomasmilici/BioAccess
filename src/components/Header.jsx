import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock, Bell, ShieldCheck, Activity } from 'lucide-react';

export default function Header({ systemStats, isRunning }) {
  const [time, setTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isRunning && Math.random() > 0.85) {
      const notif = {
        id: Date.now(),
        msg: `Transito elaborato - Conf: ${(0.85 + Math.random() * 0.14).toFixed(3)}`,
        time: new Date(),
      };
      setNotifications(prev => [notif, ...prev].slice(0, 5));
    }
  }, [isRunning]);

  return (
    <header className="h-16 glass border-b border-bg-border flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-accent-green' : 'bg-accent-red'} animate-pulse`} />
          <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
            {isRunning ? 'Sistema Attivo' : 'Simulazione In Pausa'}
          </span>
        </div>

        <div className="h-4 w-px bg-bg-border" />

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">
            {time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div className="h-4 w-px bg-bg-border" />

        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-green" />
          <span className="text-gray-500">{systemStats.encryptionStatus}</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-500">{systemStats.tlsVersion}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Indicatori rapidi */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-accent-neon" />
            <span className="text-gray-400">AI Uptime</span>
            <span className="font-mono text-accent-green">{systemStats.aiUptime}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            {systemStats.supervisionRate < 0.05 ? (
              <Wifi className="w-3.5 h-3.5 text-accent-green" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-accent-amber" />
            )}
            <span className="text-gray-400">Escalation</span>
            <span className="font-mono text-accent-amber">{(systemStats.supervisionRate * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Notifiche */}
        <div className="relative">
          <Bell className="w-5 h-5 text-gray-400 hover:text-white transition-colors cursor-pointer" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-neon rounded-full animate-pulse" />
          )}

          <AnimatePresence>
            {notifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-72 glass border border-bg-border rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="p-3 border-b border-bg-border/50">
                  <span className="text-xs font-semibold text-gray-300">Notifiche Recenti</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-3 py-2 border-b border-bg-border/20 text-xs hover:bg-white/5"
                    >
                      <p className="text-gray-300">{n.msg}</p>
                      <p className="text-gray-600 mt-0.5 font-mono text-[10px]">
                        {n.time.toLocaleTimeString('it-IT')}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
