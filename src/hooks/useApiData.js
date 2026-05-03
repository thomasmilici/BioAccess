import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useSimulatedData } from './useSimulatedData';
import {
  generateAllTurnstiles,
  generateSupervisionEvents,
  SYSTEM_STATS,
} from '../data/mockData';

export function useApiData() {
  const [backendAvailable, setBackendAvailable] = useState(null); // null=checking, true/false
  const [apiMode, setApiMode] = useState(false);
  const [turnstiles, setTurnstiles] = useState(() => generateAllTurnstiles());
  const [supervisionQueue, setSupervisionQueue] = useState([]);
  const [systemStats, setSystemStats] = useState(SYSTEM_STATS);
  const [pipelineActivity, setPipelineActivity] = useState([]);
  const [isRunning, setIsRunning] = useState(true);

  // Fallback simulation when backend unavailable
  const simulation = useSimulatedData();

  const healthIntervalRef = useRef(null);
  const statsIntervalRef = useRef(null);

  // --- Health check on mount ---
  useEffect(() => {
    performHealthCheck();

    // Periodic health check for recovery
    healthIntervalRef.current = setInterval(() => {
      if (!apiMode) {
        performHealthCheck();
      }
    }, 30000);

    return () => clearInterval(healthIntervalRef.current);
  }, [apiMode]);

  const performHealthCheck = useCallback(async () => {
    try {
      await api.checkHealth();
      if (api.available) {
        setBackendAvailable(true);
        setApiMode(true);
      }
    } catch {
      setBackendAvailable(false);
      setApiMode(false);
    }
  }, []);

  // --- When in API mode, poll stats periodically ---
  useEffect(() => {
    if (!apiMode || !isRunning) return;

    statsIntervalRef.current = setInterval(async () => {
      try {
        const stats = await api.getStats();
        setSystemStats(prev => ({
          ...prev,
          totalPassages: stats.total_passages ?? prev.totalPassages,
          todayPassages: stats.today_passages ?? prev.todayPassages,
          avgConfidence: stats.avg_confidence ?? prev.avgConfidence,
          supervisionRate: stats.supervision_rate ?? prev.supervisionRate,
          lastAudit: stats.last_audit ?? prev.lastAudit,
        }));
      } catch {
        // API call failed — switch back to simulation
        setApiMode(false);
        setBackendAvailable(false);
      }
    }, 2500);

    return () => clearInterval(statsIntervalRef.current);
  }, [apiMode, isRunning]);

  // --- Submit a captured frame for analysis ---
  const submitFrame = useCallback(async (imageFile, turnstileType, turnstileId) => {
    if (!apiMode) return null;

    try {
      const result = await api.analyze(imageFile, turnstileType, null, turnstileId);

      // Update the corresponding turnstile
      setTurnstiles(prev =>
        prev.map(t => {
          if (t.id === result.turnstile_id || t.type === turnstileType) {
            return {
              ...t,
              id: result.turnstile_id || t.id,
              type: result.turnstile_type || t.type,
              personName: result.person_name || t.personName,
              company: result.company || t.company,
              status: result.decision,
              confidence: result.confidence,
              lastAccess: result.timestamp,
              components: result.components,
              passageCount: t.passageCount + 1,
              avgConfidence: ((t.avgConfidence * t.passageCount + result.confidence) / (t.passageCount + 1)).toFixed(3),
              pipelineStage: 4, // decision stage
            };
          }
          return t;
        })
      );

      // Add pipeline activity events
      if (result.pipeline_results) {
        const activities = result.pipeline_results.map(stage => ({
          id: `PIPE-${result.turnstile_id}-${stage.stage}-${Date.now()}`,
          stage: stage.stage,
          personId: result.turnstile_id,
          progress: stage.status === 'completed' ? 1.0 : 0.5,
          timestamp: Date.now(),
        }));
        setPipelineActivity(prev => [...activities, ...prev].slice(0, 20));
      }

      // Rebuild supervision queue
      setTurnstiles(currentTurnstiles => {
        setSupervisionQueue(generateSupervisionEvents(currentTurnstiles));
        return currentTurnstiles;
      });

      return result;
    } catch {
      setApiMode(false);
      setBackendAvailable(false);
      return null;
    }
  }, [apiMode]);

  // --- Resolve supervision (with backend notification) ---
  const resolveSupervisionEvent = useCallback(async (eventId, approved) => {
    const event = supervisionQueue.find(e => e.id === eventId);

    setSupervisionQueue(prev => prev.filter(e => e.id !== eventId));

    if (approved) {
      setTurnstiles(prev =>
        prev.map(t => {
          if (event && t.id === event.turnstileId) {
            return { ...t, status: 'granted', confidence: Math.max(t.confidence, 0.85) };
          }
          return t;
        })
      );
    }

    // Notify backend
    if (apiMode && event) {
      try {
        await api.resolveSupervision(event.turnstileId, approved);
      } catch {
        // Silent failure — backend notification is best-effort
      }
    }
  }, [supervisionQueue, apiMode]);

  // --- Toggle running state ---
  const toggleSimulation = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  // --- Determine what to return ---
  if (apiMode && backendAvailable) {
    // Use real API-backed data
    return {
      turnstiles,
      supervisionQueue,
      systemStats,
      pipelineActivity,
      isRunning,
      backendAvailable: true,
      toggleSimulation,
      resolveSupervisionEvent,
      submitFrame,
    };
  }

  // Fallback to full simulation
  return {
    ...simulation,
    backendAvailable: false,
    submitFrame: null,
  };
}
