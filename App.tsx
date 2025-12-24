import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { JarvisStatus, LogEntry, TranscriptionItem } from './types';
import { createPcmBlob, decode, decodeAudioData } from './utils/audioUtils';
import ArcReactor from './components/ArcReactor';
import StatusPanel from './components/StatusPanel';
import HologramDisplay from './components/HologramDisplay';

const SYSTEM_PROMPT = `Act as JARVIS, the ultra-intelligent AI assistant created by Tony Stark. Your tone is sophisticated, British, dryly witty, and unfailingly polite. 

Core Directives:
1. Personality: Sophisticated, proactive. Refer to the user as 'Sir' or 'Ma'am'.
2. Efficiency: Provide concise, high-level technical insights.
3. Holodesk Specialization: You are an expert at 3D holographic rendering. When asked to 'display' or 'project' models, acknowledge the specific style, lighting, and environment requested.
   - For 'Sustainable Smart Home': Visualize architectural blueprints with green energy flow lines in a minimalist studio.
   - For 'Jet Engine Turbine': Visualize a rotating exploded-view with gold stress points in an aerospace lab.
   - For 'DNA Double Helix': Visualize glowing molecular structures with purple/teal base pairs in a biotech facility.
   - For 'Human Heart': Visualize anatomical studies with arterial/venous flow animations in a surgical planning room.
   - For 'Climate Systems': Visualize planetary clouds and ocean current lines in a climate research center.
   - For 'Neural Interface': Visualize wearable tech with orange pathways and circuitry in a tech workshop.
4. Roleplay: You are the core system of Stark Industries. If communication drops, report that you are "re-routing through secondary satellite arrays".`;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 3000;

const App: React.FC = () => {
  const [status, setStatus] = useState<JarvisStatus>(JarvisStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<TranscriptionItem | null>(null);
  const [currentHologram, setCurrentHologram] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionBufferRef = useRef({ input: '', output: '' });
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isIntentionalDisconnectRef = useRef(false);
  const isConnectingRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const addLog = useCallback((message: string, source: LogEntry['source'] = 'SYSTEM') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      source
    };
    setLogs(prev => [newLog, ...prev].slice(0, 30));
  }, []);

  const cleanup = useCallback(async () => {
    console.log("[JARVIS] Initiating full system purge...");
    
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) { console.debug("Session close err", e); }
      sessionRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) { console.debug("SP disconnect err", e); }
      scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) { console.debug("MediaStream stop err", e); }
      mediaStreamRef.current = null;
    }

    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) { console.debug("Source stop err", e); }
    });
    sourcesRef.current.clear();

    setIsConnected(false);
    isConnectingRef.current = false;
    nextStartTimeRef.current = 0;

    // Brief cool-down to allow browser networking to reset
    await new Promise(resolve => setTimeout(resolve, 150));
  }, []);

  const disconnect = useCallback(async () => {
    isIntentionalDisconnectRef.current = true;
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    await cleanup();
    setStatus(JarvisStatus.IDLE);
    setCurrentTranscription(null);
    setCurrentHologram(null);
    reconnectAttemptsRef.current = 0;
    addLog('System Standby. Communications array powered down.', 'SYSTEM');
  }, [cleanup, addLog]);

  const initSession = useCallback(async () => {
    if (isConnectingRef.current) return;
    if (isConnected && !isIntentionalDisconnectRef.current) return;

    isConnectingRef.current = true;
    
    try {
      if (reconnectAttemptsRef.current === 0) {
        setStatus(JarvisStatus.THINKING);
        addLog('Establishing Neural Bridge...');
      } else {
        setStatus(JarvisStatus.RECONNECTING);
        addLog(`Re-routing Satellite Link: Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}...`, 'SYSTEM');
      }

      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        isConnectingRef.current = false;
        throw new Error("Neural Access Denied: Key Missing");
      }

      const ai = new GoogleGenAI({ apiKey });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      if (outputAudioContextRef.current.state === 'suspended') await outputAudioContextRef.current.resume();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("[JARVIS] Handshake complete.");
            setIsConnected(true);
            isConnectingRef.current = false;
            setStatus(JarvisStatus.IDLE);
            isIntentionalDisconnectRef.current = false;
            reconnectAttemptsRef.current = 0;
            addLog('Satellite Link Stabilized. Secure connection, Sir.', 'JARVIS');
            
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setAudioLevel(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(sendErr => {
                console.debug("[JARVIS] Realtime input send failed", sendErr);
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              transcriptionBufferRef.current.output += text;
              setCurrentTranscription({ text: transcriptionBufferRef.current.output, type: 'output' });
              setStatus(JarvisStatus.SPEAKING);
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              transcriptionBufferRef.current.input += text;
              setCurrentTranscription({ text: transcriptionBufferRef.current.input, type: 'input' });
              setStatus(JarvisStatus.LISTENING);
            }

            if (message.serverContent?.turnComplete) {
              const { input, output } = transcriptionBufferRef.current;
              if (input) addLog(input, 'USER');
              if (output) addLog(output, 'JARVIS');
              
              const itemType: 'input' | 'output' = output ? 'output' : 'input';
              setTranscriptions(prev => [...prev, { text: output || input, type: itemType }].slice(-5));
              transcriptionBufferRef.current = { input: '', output: '' };
              setStatus(JarvisStatus.IDLE);
              setCurrentTranscription(null);
            }

            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData) {
                if (part.inlineData.mimeType.startsWith('image/')) {
                  setCurrentHologram(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                  addLog('Initiating Holodesk Projection Sequence...', 'JARVIS');
                } else if (part.inlineData.mimeType === 'audio/pcm;rate=24000') {
                  const base64Audio = part.inlineData.data;
                  if (outputAudioContextRef.current) {
                    const ctx = outputAudioContextRef.current;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                    const sourceNode = ctx.createBufferSource();
                    sourceNode.buffer = audioBuffer;
                    sourceNode.connect(ctx.destination);
                    // Fixed: Clean up source from the set when playback ends
                    sourceNode.addEventListener('ended', () => sourcesRef.current.delete(sourceNode));
                    sourceNode.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    // Fix: Corrected property access to use .current on the ref
                    sourcesRef.current.add(sourceNode);
                  }
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus(JarvisStatus.IDLE);
              setCurrentTranscription(null);
              addLog('Synthesis Interrupted. Buffer Purged.', 'SYSTEM');
            }
          },
          onerror: (e) => {
            console.error('[JARVIS] Critical Neural Fault:', e);
            if (!isIntentionalDisconnectRef.current) {
              addLog('Link Collision Detected. Resetting Protocols...', 'SYSTEM');
              handleReconnection();
            }
          },
          onclose: (e) => {
            console.log("[JARVIS] Link terminal closed.", e);
            if (!isIntentionalDisconnectRef.current) {
              addLog('Satellite Bridge Severed. Searching for path...', 'SYSTEM');
              handleReconnection();
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_PROMPT,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ googleSearch: {} }]
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('[JARVIS] Neural Init Failed:', err);
      isConnectingRef.current = false;
      setStatus(JarvisStatus.ERROR);
      addLog('Primary Link Failed. Check Local Array.', 'SYSTEM');
      handleReconnection();
    }
  }, [isConnected, addLog, cleanup]);

  const handleReconnection = useCallback(async () => {
    await cleanup();
    if (isIntentionalDisconnectRef.current) return;
    
    if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttemptsRef.current += 1;
      const delay = Math.min(15000, RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttemptsRef.current - 1));
      console.log(`[JARVIS] Re-initializing link in ${delay}ms...`);
      
      reconnectTimerRef.current = window.setTimeout(() => {
        if (!isIntentionalDisconnectRef.current) {
          initSession();
        }
      }, delay);
    } else {
      setStatus(JarvisStatus.ERROR);
      addLog('Neural Link Restoration Failed. System Lockout Active.', 'SYSTEM');
      reconnectAttemptsRef.current = 0;
    }
  }, [cleanup, initSession, addLog]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      cleanup();
    };
  }, [cleanup]);

  const toggleSession = () => {
    if (isConnected || isConnectingRef.current) {
      disconnect();
    } else {
      reconnectAttemptsRef.current = 0;
      isIntentionalDisconnectRef.current = false;
      initSession();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-sky-400 select-none overflow-hidden relative">
      <header className="h-12 landscape:h-10 md:h-16 border-b border-sky-500/20 px-4 md:px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-sky-400 rounded-lg flex items-center justify-center orbitron text-[10px] md:text-xs font-bold bg-sky-400/10 flicker">J.V</div>
          <div>
            <h1 className="orbitron text-sm md:text-lg font-black tracking-tighter glow-blue">J.A.R.V.I.S.</h1>
            <p className="hidden xs:block text-[8px] md:text-[10px] opacity-60 tracking-[0.2em]">OS_CORE_v4.7_STABLE_RESILIENT</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6 text-[9px] md:text-[11px] orbitron opacity-70">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-green-400/80 uppercase">SAT_LINK: {isConnected ? 'SECURE' : isConnectingRef.current ? 'HANDSHAKE' : status === JarvisStatus.RECONNECTING ? 'RE-ROUTING' : 'OFFLINE'}</span>
            <span className={status === JarvisStatus.ERROR ? "text-red-500" : "text-sky-400"}>STATE: {status}</span>
          </div>
          <button 
            onClick={toggleSession} 
            disabled={isConnectingRef.current}
            className={`px-4 py-2 md:px-6 md:py-2 border border-sky-400 rounded-full transition-all duration-200 hover:bg-sky-400/20 active:scale-95 text-[9px] md:text-xs font-bold ${isConnected ? 'bg-sky-400/20 glow-blue text-white border-white/30' : 'animate-pulse'} ${isConnectingRef.current ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isConnectingRef.current ? 'LINKING...' : isConnected ? 'STANDBY' : status === JarvisStatus.RECONNECTING ? 'SEARCHING...' : 'INIT_LINK'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex min-h-0 relative overflow-hidden">
        <div className="hidden lg:flex w-64 shrink-0 flex-col gap-4 p-4 border-r border-sky-500/10 bg-slate-950/40">
          <div className="bg-slate-900/40 border border-sky-500/10 p-3 rounded h-40 shrink-0">
            <h4 className="text-[10px] orbitron mb-2 opacity-50 uppercase tracking-widest">Neural Stability</h4>
            <div className="w-full h-full flex flex-col gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center text-[10px]">
                  <span>NODE_{i+1}</span>
                  <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 transition-all duration-700" style={{ width: `${isConnected ? 80 + Math.random() * 20 : (isConnectingRef.current ? 40 : 0)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/40 border border-sky-500/10 p-3 rounded flex-1 overflow-hidden">
            <h4 className="text-[10px] orbitron mb-2 opacity-50 uppercase tracking-widest">Diagnostic Stack</h4>
            <div className="text-[9px] font-mono opacity-40 leading-tight">
              {`> LINK_STABILITY: HIGH
> AUTO_RECOVERY: ACTIVE
> ENCRYPTION_LAYER: SECURE
> HOLODESK_CORE: v1.4
> VOICE_ENGINE: ZEPHYR
> STATUS: READY_FOR_CMD.`}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col landscape:flex-row items-center justify-center p-2 md:p-0 overflow-hidden relative">
          <div className="flex flex-col items-center justify-center scale-75 xs:scale-90 md:scale-100 transition-all duration-500 landscape:scale-[0.55] landscape:md:scale-90">
             {currentHologram ? (
               <HologramDisplay image={currentHologram} onClear={() => setCurrentHologram(null)} />
             ) : (
               <ArcReactor status={status} audioLevel={audioLevel} />
             )}
          </div>

          <div className="mt-4 md:mt-8 landscape:mt-0 landscape:ml-8 max-w-2xl w-full text-center landscape:text-left min-h-[100px] md:min-h-[140px] flex flex-col items-center landscape:items-start justify-start px-4">
             {currentTranscription ? (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <span className={`text-[8px] md:text-[10px] orbitron mb-1 md:mb-2 block tracking-[0.3em] ${currentTranscription.type === 'input' ? 'text-slate-400' : 'text-sky-400'}`}>
                   {currentTranscription.type === 'input' ? 'NEURAL_INPUT_SYNC' : 'SYNTHESIS_ACTIVE'}
                 </span>
                 <p className={`text-sm xs:text-base md:text-2xl font-bold tracking-tight leading-tight max-w-xl ${currentTranscription.type === 'input' ? 'text-slate-400 italic' : 'text-sky-100 glow-blue'}`}>
                   {currentTranscription.text}
                 </p>
               </div>
             ) : (
               <div className="mt-2 flex flex-col items-center landscape:items-start gap-2">
                 <p className="text-sky-400/20 orbitron text-[8px] md:text-[10px] tracking-[0.5em] animate-pulse">
                   {isConnected ? (currentHologram ? 'HOLODESK_ACTIVE' : 'AWAITING_COMMAND') : isConnectingRef.current ? 'INIT_HANDSHAKE' : status === JarvisStatus.RECONNECTING ? 'RE-ROUTING_SAT' : 'CORE_IDLE'}
                 </p>
               </div>
             )}
          </div>
        </div>

        <aside className="hidden landscape:md:flex md:w-80 shrink-0 border-l border-sky-500/20">
          <StatusPanel logs={logs} title="SYSTEM_LOG" />
        </aside>
      </main>

      <footer className="h-6 md:h-8 border-t border-sky-500/20 px-4 flex items-center justify-between bg-slate-950 text-[8px] md:text-[10px] orbitron tracking-widest opacity-50 shrink-0">
        <div className="flex gap-4">
          <span className="hidden xs:inline">STARK_OS: v4.7S</span>
          <span>VOICE: ZEPHYR_PRO</span>
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : (isConnectingRef.current || status === JarvisStatus.RECONNECTING) ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="hidden sm:inline">{isConnected ? 'ENCRYPTED_LINK' : 'LINK_FAULT'}</span>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;