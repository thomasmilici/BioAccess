// Configurazione varchi secondo specifiche tecniche
export const TURNSTILE_CONFIG = {
  stable: {
    count: 5,
    label: 'Dipendenti Stabili',
    automation: 'Totale',
    thresholds: { low: 0.85, high: 0.95 },
    baseConfidence: { min: 0.88, max: 0.99 },
    icon: 'UserCheck',
  },
  nonStable: {
    count: 2,
    label: 'Personale Non Stabile',
    automation: 'Soglie Conservative',
    thresholds: { low: 0.90, high: 0.97 },
    baseConfidence: { min: 0.82, max: 0.96 },
    icon: 'UserCog',
  },
  visitor: {
    count: 1,
    label: 'Visitatori / Eccezioni',
    automation: 'Escalation Frequente',
    thresholds: { low: 0.92, high: 0.98 },
    baseConfidence: { min: 0.70, max: 0.90 },
    icon: 'UserPlus',
  },
};

// Pipeline AI states
export const PIPELINE_STAGES = [
  {
    id: 'acquisition',
    label: 'Acquisizione Dinamica',
    subSteps: ['Face Detection', 'Liveness Check 3D', 'Qualità Immagine'],
    duration: 120,
    color: '#00D4FF',
  },
  {
    id: 'geometric',
    label: 'Analisi Geometrica',
    subSteps: ['Estrazione Landmark', 'Vettore Strutturale', 'Normalizzazione'],
    duration: 180,
    color: '#7C3AED',
  },
  {
    id: 'matching',
    label: 'Matching Biometrico',
    subSteps: ['Feature Vector', 'Similarity Score', 'Template Match'],
    duration: 200,
    color: '#FF6B9D',
  },
  {
    id: 'confidence',
    label: 'Modello di Confidenza',
    subSteps: ['w1·sim', 'w2·stab', 'w3·qual', 'w4·live', 'w5·geom'],
    duration: 150,
    color: '#FFB347',
  },
  {
    id: 'decision',
    label: 'Decisione Finale',
    subSteps: ['Early Exit Check', 'Threshold Compare', 'Action'],
    duration: 100,
    color: '#00FF88',
  },
];

// Modello di confidenza: Confidence = w1·sim + w2·stab + w3·qual + w4·live + w5·geom
export const CONFIDENCE_WEIGHTS = {
  w1: { name: 'Similarità (sim)', weight: 0.35, description: 'Corrispondenza feature vector vs template' },
  w2: { name: 'Stabilità (stab)', weight: 0.20, description: 'Consistenza tra acquisizioni consecutive' },
  w3: { name: 'Qualità (qual)', weight: 0.20, description: 'Nitidezza e risoluzione immagine' },
  w4: { name: 'Liveness (live)', weight: 0.15, description: 'Rilevamento anti-spoofing 3D' },
  w5: { name: 'Geometria (geom)', weight: 0.10, description: 'Validità struttura facciale' },
};

// Dati iniziali per i varchi
const generateTurnstile = (id, type) => {
  const config = TURNSTILE_CONFIG[type];

  const sim = 0.7 + Math.random() * 0.3;
  const stab = 0.7 + Math.random() * 0.3;
  const qual = 0.7 + Math.random() * 0.3;
  const live = 0.75 + Math.random() * 0.25;
  const geom = 0.8 + Math.random() * 0.2;

  const confidence = (
    sim * CONFIDENCE_WEIGHTS.w1.weight +
    stab * CONFIDENCE_WEIGHTS.w2.weight +
    qual * CONFIDENCE_WEIGHTS.w3.weight +
    live * CONFIDENCE_WEIGHTS.w4.weight +
    geom * CONFIDENCE_WEIGHTS.w5.weight
  );

  let status;
  if (confidence >= config.thresholds.high) status = 'granted';
  else if (confidence >= config.thresholds.low) status = 'review';
  else status = 'denied';

  const names = ['Marco R.', 'Laura B.', 'Alessandro F.', 'Giulia C.', 'Francesco M.',
                 'Sofia L.', 'Andrea P.', 'Valentina D.', 'Lorenzo T.', 'Chiara S.'];
  const companies = ['TechCorp SpA', 'DataSys Srl', 'CloudNet Srl', 'AILab SpA', 'SecureIT Srl',
                     'BioTech Inc', 'SmartSolutions', 'DigiSec Ltd', 'NetGuard Srl', 'CyberDef SpA'];

  return {
    id,
    type,
    label: config.label,
    personName: names[Math.floor(Math.random() * names.length)],
    company: companies[Math.floor(Math.random() * companies.length)],
    status,
    confidence,
    lastAccess: new Date(Date.now() - Math.random() * 300000).toISOString(),
    components: { sim, stab, qual, live, geom },
    passageCount: Math.floor(Math.random() * 500) + 50,
    avgConfidence: (confidence - 0.02 + Math.random() * 0.04).toFixed(3),
    pipelineStage: Math.floor(Math.random() * 5),
  };
};

export const generateAllTurnstiles = () => [
  ...Array.from({ length: 5 }, (_, i) => generateTurnstile(`STABLE-${i + 1}`, 'stable')),
  ...Array.from({ length: 2 }, (_, i) => generateTurnstile(`NONSTABLE-${i + 1}`, 'nonStable')),
  generateTurnstile('VISITOR-1', 'visitor'),
];

// Genera eventi di supervisione per operatori
export const generateSupervisionEvents = (turnstiles) => {
  const events = turnstiles
    .filter(t => t.status === 'denied' || t.status === 'review')
    .map(t => ({
      id: `EVT-${t.id}-${Date.now()}`,
      turnstileId: t.id,
      personName: t.personName,
      company: t.company,
      confidence: t.confidence,
      thresholdRequired: t.type === 'visitor' ? 0.92 : t.type === 'nonStable' ? 0.90 : 0.85,
      reason: t.confidence < 0.80
        ? 'Bassa corrispondenza feature vector'
        : t.components.live < 0.85
          ? 'Liveness check ambiguo - possibile spoofing'
          : 'Soglia conservativa superata - richiesta verifica umana',
      timestamp: new Date().toISOString(),
      videoSnippet: null, // Placeholder per snippet video
      pipelineData: {
        stage: t.pipelineStage,
        components: t.components,
      },
      urgency: t.confidence < 0.75 ? 'critical' : t.confidence < 0.85 ? 'high' : 'medium',
    }));

  return events.sort((a, b) => a.confidence - b.confidence);
};

// Dati complessivi di sistema
export const SYSTEM_STATS = {
  totalPassages: 12847,
  todayPassages: 342,
  avgConfidence: 0.934,
  supervisionRate: 0.038,
  activeOperators: 3,
  aiUptime: 99.97,
  encryptionStatus: 'AES-256-GCM',
  tlsVersion: 'TLS 1.3',
  lastAudit: new Date(Date.now() - 3600000).toISOString(),
};
