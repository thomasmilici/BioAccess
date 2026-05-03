import { motion } from 'framer-motion';
import { Shield, Lock, Key, Fingerprint, Server, CheckCircle2, Activity } from 'lucide-react';

const SECURITY_LAYERS = [
  {
    id: 'aes',
    label: 'Crittografia AES-256',
    sublabel: 'Galois/Counter Mode',
    icon: Lock,
    status: 'active',
    details: 'Cifratura simmetrica a 256-bit con autenticazione GCM',
    color: '#00D4FF',
  },
  {
    id: 'tls',
    label: 'TLS 1.3',
    sublabel: 'Transport Layer Security',
    icon: Shield,
    status: 'active',
    details: 'Canale cifrato con Perfect Forward Secrecy',
    color: '#00FF88',
  },
  {
    id: 'bio',
    label: 'Template Protetto',
    sublabel: 'Feature Vector Cifrato',
    icon: Fingerprint,
    status: 'active',
    details: 'I template biometrici non lasciano mai il secure enclave',
    color: '#7C3AED',
  },
  {
    id: 'audit',
    label: 'Audit Log Immutabile',
    sublabel: 'Chain of Trust',
    icon: Server,
    status: 'active',
    details: 'Registro eventi con hash chain SHA-256',
    color: '#FFB347',
  },
];

export default function SecurityIndicators() {
  return (
    <div className="glass-hover rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Shield className="w-5 h-5 text-accent-green" />
        <h2 className="text-sm font-semibold text-gray-200">Sicurezza &amp; Conformità</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-[10px] text-accent-green font-semibold uppercase tracking-wider">Tutti i sistemi operativi</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECURITY_LAYERS.map((layer, i) => {
          const Icon = layer.icon;

          return (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl bg-bg-primary/50 border border-bg-border/30 hover:border-accent-green/20 transition-all group"
              whileHover={{ y: -2 }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${layer.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: layer.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-200">{layer.label}</p>
                    <CheckCircle2 className="w-3 h-3 text-accent-green flex-shrink-0" />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{layer.sublabel}</p>
                  <p className="text-[9px] text-gray-600 mt-1.5 leading-relaxed">{layer.details}</p>

                  {/* Status bar */}
                  <div className="mt-2 h-1 bg-bg-primary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: layer.color }}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* System fingerprint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 p-3 rounded-xl bg-bg-primary/50 border border-bg-border/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-accent-purple" />
            <span className="text-[10px] text-gray-400">Session Key Fingerprint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-accent-green" />
            <span className="text-[10px] font-mono text-gray-500">
              SHA256: a1b2c3d4e5f6...
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
