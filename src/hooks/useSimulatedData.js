import { useState, useEffect, useCallback, useRef } from 'react';
import { generateAllTurnstiles, generateSupervisionEvents, SYSTEM_STATS } from '../data/mockData';

export function useSimulatedData() {
  const [turnstiles, setTurnstiles] = useState(() => generateAllTurnstiles());
  const [supervisionQueue, setSupervisionQueue] = useState([]);
  const [systemStats, setSystemStats] = useState(SYSTEM_STATS);
  const [pipelineActivity, setPipelineActivity] = useState([]);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef(null);

  // Simula l'attività della pipeline AI
  const generatePipelineActivity = useCallback(() => {
    const stages = ['acquisition', 'geometric', 'matching', 'confidence', 'decision'];
    const count = 2 + Math.floor(Math.random() * 4);
    return Array.from({ length: count }, () => ({
      id: `PIPE-${Math.random().toString(36).substr(2, 9)}`,
      stage: stages[Math.floor(Math.random() * stages.length)],
      personId: `P${Math.floor(Math.random() * 99999)}`,
      progress: Math.random(),
      timestamp: Date.now(),
    }));
  }, []);

  // Aggiorna i varchi con nuovi dati simulati
  const updateTurnstiles = useCallback((prev) => {
    return prev.map(t => {
      const delta = (Math.random() - 0.5) * 0.06;
      const confidence = Math.max(0.6, Math.min(0.99, t.confidence + delta));
      const sim = Math.max(0.6, Math.min(0.99, t.components.sim + (Math.random() - 0.5) * 0.08));
      const stab = Math.max(0.6, Math.min(0.99, t.components.stab + (Math.random() - 0.5) * 0.06));
      const qual = Math.max(0.6, Math.min(0.99, t.components.qual + (Math.random() - 0.5) * 0.05));
      const live = Math.max(0.6, Math.min(0.99, t.components.live + (Math.random() - 0.5) * 0.07));
      const geom = Math.max(0.6, Math.min(0.99, t.components.geom + (Math.random() - 0.5) * 0.04));

      let status;
      const thresholds = t.type === 'visitor'
        ? { low: 0.92, high: 0.98 }
        : t.type === 'nonStable'
          ? { low: 0.90, high: 0.97 }
          : { low: 0.85, high: 0.95 };

      if (confidence >= thresholds.high) status = 'granted';
      else if (confidence >= thresholds.low) status = 'review';
      else status = 'denied';

      if (Math.random() > 0.7) {
        const names = ['Marco R.', 'Laura B.', 'Alessandro F.', 'Giulia C.', 'Francesco M.',
                       'Sofia L.', 'Andrea P.', 'Valentina D.', 'Lorenzo T.', 'Chiara S.'];
        return {
          ...t,
          confidence,
          status,
          personName: names[Math.floor(Math.random() * names.length)],
          lastAccess: new Date().toISOString(),
          components: { sim, stab, qual, live, geom },
          passageCount: t.passageCount + (Math.random() > 0.5 ? 1 : 0),
          pipelineStage: Math.floor(Math.random() * 5),
        };
      }

      return { ...t, confidence, status, components: { sim, stab, qual, live, geom } };
    });
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTurnstiles(prev => updateTurnstiles(prev));
      setPipelineActivity(generatePipelineActivity());
      setSystemStats(prev => ({
        ...prev,
        todayPassages: prev.todayPassages + Math.floor(Math.random() * 3),
        avgConfidence: (0.92 + Math.random() * 0.06).toFixed(3),
        supervisionRate: (0.025 + Math.random() * 0.04).toFixed(3),
        lastAudit: new Date().toISOString(),
      }));
    }, 2500);

    return () => clearInterval(intervalRef.current);
  }, [updateTurnstiles, generatePipelineActivity]);

  // Aggiorna la coda di supervisione quando cambiano i varchi
  useEffect(() => {
    setSupervisionQueue(generateSupervisionEvents(turnstiles));
  }, [turnstiles]);

  const toggleSimulation = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  const resolveSupervisionEvent = useCallback((eventId, approved) => {
    setSupervisionQueue(prev => prev.filter(e => e.id !== eventId));
    if (approved) {
      setTurnstiles(prev =>
        prev.map(t => {
          const event = supervisionQueue.find(e => e.id === eventId);
          if (event && t.id === event.turnstileId) {
            return { ...t, status: 'granted', confidence: Math.max(t.confidence, 0.85) };
          }
          return t;
        })
      );
    }
  }, [supervisionQueue]);

  return {
    turnstiles,
    supervisionQueue,
    systemStats,
    pipelineActivity,
    isRunning,
    toggleSimulation,
    resolveSupervisionEvent,
  };
}
