import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Trash2, Mic, Volume2, VolumeX, Bot } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProject } from '@/lib/ProjectContext';

const SUGGESTED = [
  'How can I reduce waste?',
  'Why was this piece rotated?',
  'How much material am I saving?',
  'Can these pieces fit on one sheet?',
  'What does kerf mean?',
  'Which sheet size should I choose?',
  'Explain this layout.',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
];

export default function AIAssistant() {
  const { material, pieces, layout, baseline, selectedInstanceId, matDef } = useProject();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm ScrapSmart AI, your workshop copilot. Ask me about your layout, waste, kerf, or how to save material. I can see your current project." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lang, setLang] = useState('en');
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const recogRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const buildContext = useCallback(() => {
    let selectedPiece = null;
    if (selectedInstanceId && layout) {
      for (const s of layout.sheets) {
        const p = s.placements.find((pl) => pl.instanceId === selectedInstanceId);
        if (p) { selectedPiece = { ...p, sheet: s.index + 1 }; break; }
      }
    }
    return {
      material: { ...material, name: matDef.name },
      pieces: pieces.map((p) => ({ name: p.name, width: p.width, height: p.height, quantity: p.quantity, rotationAllowed: p.rotationAllowed })),
      stats: layout?.stats || null,
      baselineStats: baseline?.stats || null,
      selectedPiece,
    };
  }, [material, pieces, layout, baseline, selectedInstanceId, matDef]);

  const speak = useCallback((text) => {
    if (muted || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 500));
    u.lang = lang === 'en' ? 'en-US' : lang;
    u.rate = 1;
    speechSynthesis.speak(u);
  }, [muted, lang]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('scrapsmartChat', { message: msg, context: buildContext() });
      const reply = res?.data?.reply || res?.data?.error || "I couldn't reach the AI service right now. Please try again.";
      const isErr = !!res?.data?.error;
      setMessages((m) => [...m, { role: 'assistant', text: reply, error: isErr }]);
      speak(reply);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: "I couldn't connect to the AI service. Check that the chat function is deployed and try again.", error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = lang === 'en' ? 'en-US' : lang;
    r.interimResults = false;
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput(t);
      setListening(false);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recogRef.current = r;
    r.start();
    setListening(true);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full shadow-xl transition-all ${open ? 'bg-[#123D26] text-white' : 'bg-[#16A34A] text-white hover:bg-[#15803D]'}`}
      >
        {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        {!open && <span className="font-semibold text-sm">ScrapSmart AI</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-7rem)] bg-white rounded-2xl border border-[#E2E8E4] shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#123D26] to-[#15803D] text-white px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-sm">ScrapSmart AI</div>
              <div className="text-[11px] text-emerald-100/80">Your workshop copilot</div>
            </div>
            <button onClick={() => setMessages([messages[0]])} className="text-white/70 hover:text-white" title="Clear chat"><Trash2 className="w-4 h-4" /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F7F5]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[#16A34A] text-white rounded-br-sm' : m.error ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-bl-sm' : 'bg-white text-[#172B21] border border-[#E2E8E4] rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E2E8E4] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Suggested prompts */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1.5 rounded-full border border-[#E2E8E4] text-[#15803D] hover:bg-[#DCFCE7] transition text-left">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[#E2E8E4] bg-white">
            <div className="flex items-center gap-1.5 mb-2">
              <button onClick={toggleMic} className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${listening ? 'bg-red-100 text-[#DC2626] animate-pulse' : 'text-[#64748B] hover:bg-[#F4F7F5]'}`} title="Voice input">
                <Mic className="w-4 h-4" />
              </button>
              <button onClick={() => setMuted((m) => !m)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${muted ? 'text-[#94A3B8] hover:bg-[#F4F7F5]' : 'text-[#15803D] bg-[#DCFCE7]'}`} title={muted ? 'Unmute voice' : 'Mute voice'}>
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className="text-xs border border-[#E2E8E4] rounded-lg px-2 py-1.5 text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about your layout…"
                className="flex-1 px-3 py-2.5 rounded-xl border border-[#E2E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30"
              />
              <button onClick={() => send()} disabled={loading || !input.trim()} className="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center hover:bg-[#15803D] disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
