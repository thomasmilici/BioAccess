import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, DoorOpen, Cpu, Shield, HeadsetIcon,
  Activity, ChevronLeft, ChevronRight, Fingerprint,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'turnstiles', label: 'Monitor Varchi', icon: DoorOpen },
  { id: 'pipeline', label: 'AI Pipeline', icon: Cpu },
  { id: 'supervision', label: 'Supervisione', icon: HeadsetIcon, badge: 0 },
  { id: 'security', label: 'Sicurezza', icon: Shield },
  { id: 'logs', label: 'Audit Log', icon: Activity },
];

export default function Sidebar({ activeSection, onNavigate, supervisionCount }) {
  const [collapsed, setCollapsed] = useState(false);

  const items = NAV_ITEMS.map(item =>
    item.id === 'supervision' ? { ...item, badge: supervisionCount } : item
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      className="h-screen glass border-r border-bg-border flex flex-col sticky top-0 z-30"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-bg-border/50">
        <motion.div
          className="flex items-center gap-3 overflow-hidden"
          animate={{ opacity: 1 }}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-neon to-accent-purple flex items-center justify-center flex-shrink-0">
            <Fingerprint className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-semibold text-sm whitespace-nowrap"
              >
                <span className="text-white">Bio</span>
                <span className="neon-text">Access</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                transition-colors relative overflow-hidden
                ${isActive
                  ? 'bg-accent-neon/10 text-accent-neon'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge > 0 && (
                <span className={`
                  ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold
                  ${item.badge > 2 ? 'bg-accent-red text-white' : 'bg-accent-amber/20 text-accent-amber'}
                `}>
                  {item.badge}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent-neon rounded-r-full"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-bg-border/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
