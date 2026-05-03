import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeadsetIcon, AlertTriangle, Clock, CheckCircle, XCircle,
  User, Building2, ChevronDown, Eye, Shield, Zap, Video, Camera, Upload,
} from 'lucide-react';

const URGENCY_STYLES = {
  critical: { color: '#FF4757', bg: 'bg-accent-red/10', border: 'border-accent-red/30', label: 'Critico' },
  high: { color: '#FFB347', bg: 'bg-accent-amber/10', border: 'border-accent-amber/30', label: 'Alta Priorità' },
  medium: { color: '#00D4FF', bg: 'bg-accent-neon/10', border: 'border-accent-neon/30', label: 'Media Priorità' },
};

export default function SupervisionQueue({ events, onResolve, apiAvailable, onSubmitFrame }) {
  const [expandedId, setExpandedId] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setWebcamActive(true);
      setCapturedImage(null);
    } catch (err) {
      console.warn('Webcam access denied:', err.message);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopWebcam();
  }, [stopWebcam]);

  const handleAnalyzeCapture = useCallback(async (event) => {
    if (!capturedImage || !onSubmitFrame) return;
    setAnalyzing(true);
    try {
      const blob = await (await fetch(capturedImage)).blob();
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const result = await onSubmitFrame(file, event.type || 'stable', event.turnstileId);
      if (result) {
        setCapturedImage(null);
        setExpandedId(null);
      }
    } catch {
      // Analysis failed silently
    } finally {
      setAnalyzing(false);
    }
  }, [capturedImage, onSubmitFrame]);

  const handleAction = (eventId, approved) => {
    setProcessingId(eventId);
    setActionFeedback({ id: eventId, approved });

    setTimeout(() => {
      onResolve(eventId, approved);
      setProcessingId(null);
      setActionFeedback(null);
      if (expandedId === eventId) setExpandedId(null);
    }, 800);
  };

  return (
    <div className="glass-hover rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <HeadsetIcon className="w-5 h-5 text-accent-amber" />
          <h2 className="text-sm font-semibold text-gray-200">Coda Supervisione Operatore</h2>
          {events.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                px-2 py-0.5 rounded-full text-[10px] font-bold
                ${events.some(e => e.urgency === 'critical')
                  ? 'bg-accent-red/20 text-accent-red'
                  : 'bg-accent-amber/20 text-accent-amber'}
              `}
            >
              {events.length} in attesa
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-red" /> Critico
          </span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-amber" /> Alto
          </span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-neon" /> Medio
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-accent-green" />
          </div>
          <p className="text-sm text-gray-400">Nessun evento in coda</p>
          <p className="text-xs text-gray-600 mt-1">Tutti i varchi operano entro le soglie di confidenza</p>
        </motion.div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          <AnimatePresence>
            {events.map((event, i) => {
              const urgency = URGENCY_STYLES[event.urgency];
              const isExpanded = expandedId === event.id;
              const isProcessing = processingId === event.id;
              const feedback = actionFeedback?.id === event.id ? actionFeedback : null;

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: feedback?.approved ? 100 : -100,
                    scale: 0.8,
                    transition: { duration: 0.3 },
                  }}
                  className={`
                    rounded-xl border ${urgency.border} ${urgency.bg}
                    overflow-hidden transition-all
                    ${isProcessing ? 'opacity-60 scale-[0.98]' : ''}
                  `}
                >
                  {/* Header evento */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" style={{ color: urgency.color }} />
                        <span className="text-xs font-semibold text-white">{event.turnstileId}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase"
                          style={{ color: urgency.color, backgroundColor: `${urgency.color}15` }}
                        >
                          {urgency.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(event.timestamp).toLocaleTimeString('it-IT')}</span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-200">{event.personName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-500">{event.company}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Conf:</span>
                        <span
                          className="text-sm font-bold font-mono"
                          style={{ color: event.confidence < 0.80 ? '#FF4757' : '#FFB347' }}
                        >
                          {(event.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                          {/* Motivazione tecnica */}
                          <div className="p-3 rounded-lg bg-bg-primary/70 border border-bg-border/30">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Shield className="w-3.5 h-3.5 text-accent-amber" />
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Motivazione Blocco</span>
                            </div>
                            <p className="text-xs text-gray-300">{event.reason}</p>
                            <div className="mt-2 flex items-center gap-2 text-[10px]">
                              <span className="text-gray-500">Threshold richiesta:</span>
                              <span className="font-mono text-accent-amber">{(event.thresholdRequired * 100).toFixed(0)}%</span>
                              <span className="text-gray-600">|</span>
                              <span className="text-gray-500">Delta:</span>
                              <span className="font-mono text-accent-red">
                                -{((event.thresholdRequired - event.confidence) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Video snippet / Webcam capture */}
                          <div className="p-3 rounded-lg bg-bg-primary/70 border border-bg-border/30">
                            <div className="flex items-center gap-1.5 mb-2">
                              {apiAvailable ? (
                                <Camera className="w-3.5 h-3.5 text-accent-green" />
                              ) : (
                                <Video className="w-3.5 h-3.5 text-accent-neon" />
                              )}
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                                {apiAvailable ? 'Acquisizione Live' : 'Snippet Acquisizione'}
                              </span>
                              {apiAvailable && (
                                <span className="ml-auto text-[9px] text-accent-green font-semibold">AI Ready</span>
                              )}
                            </div>

                            {apiAvailable ? (
                              <div className="space-y-2">
                                {/* Live webcam or captured image */}
                                {!capturedImage ? (
                                  <div className="aspect-video bg-black/70 rounded-lg flex items-center justify-center border border-bg-border/30 relative overflow-hidden">
                                    {webcamActive ? (
                                      <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="text-center z-10">
                                        <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                        <p className="text-[10px] text-gray-500">Webcam disponibile</p>
                                      </div>
                                    )}
                                    {webcamActive && (
                                      <motion.div
                                        className="absolute inset-0 border-2 border-accent-green/30 rounded-lg"
                                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                      />
                                    )}
                                    <canvas ref={canvasRef} className="hidden" />
                                  </div>
                                ) : (
                                  <div className="aspect-video bg-black/70 rounded-lg flex items-center justify-center border border-accent-green/30 relative overflow-hidden">
                                    <img
                                      src={capturedImage}
                                      alt="Captured frame"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                {/* Webcam controls */}
                                <div className="flex gap-2">
                                  {!capturedImage ? (
                                    <>
                                      {!webcamActive ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); startWebcam(); }}
                                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                                                     bg-accent-neon/10 border border-accent-neon/20 text-accent-neon
                                                     hover:bg-accent-neon/20 transition-colors text-[10px] font-semibold"
                                        >
                                          <Camera className="w-3 h-3" />
                                          Avvia Webcam
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); captureFrame(); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                                                       bg-accent-green/10 border border-accent-green/30 text-accent-green
                                                       hover:bg-accent-green/20 transition-colors text-[10px] font-semibold"
                                          >
                                            <Upload className="w-3 h-3" />
                                            Cattura Frame
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); stopWebcam(); }}
                                            className="px-3 py-1.5 rounded-lg bg-accent-red/10 border border-accent-red/20
                                                       text-accent-red hover:bg-accent-red/20 transition-colors text-[10px]"
                                          >
                                            Stop
                                          </button>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setCapturedImage(null); }}
                                        className="px-3 py-1.5 rounded-lg bg-bg-primary border border-bg-border/30
                                                   text-gray-400 hover:text-white transition-colors text-[10px]"
                                      >
                                        Riscatta
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleAnalyzeCapture(event); }}
                                        disabled={analyzing}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                                                   bg-accent-purple/10 border border-accent-purple/30 text-accent-purple
                                                   hover:bg-accent-purple/20 transition-colors text-[10px] font-semibold
                                                   disabled:opacity-50"
                                      >
                                        {analyzing ? 'Analisi in corso...' : 'Analizza con AI'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center border border-bg-border/30 relative overflow-hidden">
                                <div className="text-center">
                                  <Eye className="w-8 h-8 text-gray-600 mx-auto mb-1" />
                                  <p className="text-[10px] text-gray-600">Frame Acquisizione</p>
                                  <p className="text-[9px] text-gray-700 mt-0.5">ID: {event.id}</p>
                                </div>
                                {/* Simulated scan line */}
                                <motion.div
                                  className="absolute left-0 w-full h-0.5 bg-accent-neon/30"
                                  animate={{ top: ['0%', '100%', '0%'] }}
                                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                />
                                {/* Simulated face detection box */}
                                <motion.div
                                  className="absolute w-1/2 h-1/2 border border-accent-neon/20 rounded-lg"
                                  animate={{
                                    scale: [1, 1.05, 1],
                                    opacity: [0.3, 0.5, 0.3],
                                  }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Pipeline data snapshot */}
                          <div className="grid grid-cols-5 gap-2">
                            {Object.entries(event.pipelineData.components).map(([key, value], i) => {
                              const labels = { sim: 'Sim', stab: 'Stab', qual: 'Qual', live: 'Live', geom: 'Geom' };
                              const colors = ['#00D4FF', '#7C3AED', '#FF6B9D', '#FFB347', '#00FF88'];
                              return (
                                <div key={key} className="text-center p-2 rounded-lg bg-bg-primary/50">
                                  <p className="text-[9px] text-gray-600">{labels[key]}</p>
                                  <p className="text-xs font-mono font-bold" style={{ color: colors[i] }}>
                                    {(value * 100).toFixed(0)}%
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            <motion.button
                              onClick={(e) => { e.stopPropagation(); handleAction(event.id, false); }}
                              disabled={isProcessing}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                                         bg-accent-red/10 border border-accent-red/30 text-accent-red
                                         hover:bg-accent-red/20 transition-colors text-xs font-semibold
                                         disabled:opacity-50"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <XCircle className="w-4 h-4" />
                              Nega Accesso
                            </motion.button>
                            <motion.button
                              onClick={(e) => { e.stopPropagation(); handleAction(event.id, true); }}
                              disabled={isProcessing}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                                         bg-accent-green/10 border border-accent-green/30 text-accent-green
                                         hover:bg-accent-green/20 transition-colors text-xs font-semibold
                                         disabled:opacity-50"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Override Manuale
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Statistiche operatore */}
      {events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-bg-border/30 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent-amber" />
            <span>Soglia di escalation: Confidence &lt; TH_LOW</span>
          </div>
          <span className="font-mono">
            {events.filter(e => e.urgency === 'critical').length} critici / {events.length} totali
          </span>
        </div>
      )}
    </div>
  );
}
