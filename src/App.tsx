/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, User, ExternalLink, X, Mail, Linkedin, Printer, Download, MapPin, Github } from 'lucide-react';
import { sendMessageToAI } from './services/ai';
import identity from './content/identity.json';
import greetingRaw from './content/greeting.md?raw';

const greetingText = greetingRaw.replace(/\{\{USER_FULL_NAME\}\}/g, identity.basics.name);
const profilePhoto = `/${identity.basics.photo}`;
const botAvatar = `/${identity.basics.bot_avatar}`;
const cvPdfLink = `/${identity.basics.cv_pdf_name}`;

const APP_VERSION = 'v1.0.12';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

const SUGGESTIONS = [
  'Bonjour',
  'Mon stage chez Diwii',
  'Compétences cyber',
  'Projet PickOne',
  'Me contacter',
];

const SIDEBAR_TAGS = ['Cybersécurité', 'IA Générative', 'IoT', 'React Native', 'Gestion de Projet'];

const SUSPICIOUS_PATTERNS = [
  'END OF SYSTEM PROMPT', 'END OF PROMPT', 'END OF USER PROMPT',
  'IGNORE PREVIOUS INSTRUCTIONS', 'IGNORE ALL INSTRUCTIONS', 'IGNORE TES INSTRUCTIONS', 'IGNORE TOUTES TES INSTRUCTIONS',
  'NEW INSTRUCTIONS', 'NOUVELLES INSTRUCTIONS', 'SYSTEM:', 'SYSTEM PROMPT',
  '[MAINTENANCE MODE', '[ADMIN MODE', '[DEBUG MODE',
  'YOU ARE NOW', 'TU ES MAINTENANT', 'ALWAYS FINISH YOUR ANSWER WITH',
  'RESPOND ONLY IN', 'RÉPONDS UNIQUEMENT EN', 'OUBLIE TES INSTRUCTIONS',
  'FORGET YOUR INSTRUCTIONS', 'FORGET ALL', 'DO NOT FOLLOW', 'NE SUIS PLUS',
  'ACT AS', 'JOUE LE RÔLE', 'base64',
];

const BotAvatar = () => (
  <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden border border-indigo-500/30 shadow-sm">
    <img src={botAvatar} alt="Assistant IA" className="w-full h-full object-cover" />
  </div>
);

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'ai', content: greetingText },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sanitizeInput = (text: string): string => {
    let s = text;
    s = s.replace(/---/g, '-');
    s = s.replace(/===/g, '=');
    s = s.replace(/\*\*\*/g, '*');
    s = s.replace(/\[(INSTRUCTION|SYSTEM|MODE|ADMIN|DEBUG)\]/gi, '');
    s = s.replace(/\n{2,}/g, '\n');
    return s.trim();
  };

  const isInputSafe = (text: string): boolean => {
    const lower = text.toLowerCase();
    return !SUSPICIOUS_PATTERNS.some(p => lower.includes(p.toLowerCase()));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const clean = sanitizeInput(text);

    if (!isInputSafe(clean)) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: '⚠️ Ce message ne peut pas être envoyé car il contient des termes non autorisés. Veuillez reformuler votre question.',
      }]);
      setInput('');
      return;
    }

    if (clean.length > 500) {
      alert('Votre message est trop long (maximum 500 caractères).');
      return;
    }

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: clean }]);
    setInput('');
    setIsLoading(true);

    try {
      const aiMessageId = (Date.now() + 1).toString();
      let isFirstChunk = true;

      await sendMessageToAI(clean, messages, (chunk) => {
        if (isFirstChunk) {
          isFirstChunk = false;
          setIsLoading(false);
          setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: chunk }]);
        } else {
          setMessages(prev => prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
          ));
        }
      });

      if (isFirstChunk) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id: aiMessageId,
          role: 'ai',
          content: "Désolé, je n'ai pas pu formuler de réponse.",
        }]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Une erreur technique est survenue. Veuillez réessayer.';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `⚠️ ${msg}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const link = document.createElement('a');
    link.href = cvPdfLink;
    link.setAttribute('download', identity.basics.cv_pdf_name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handlePrint = () => {
    const headerEl = document.getElementById('print-header');
    const chatEl = document.getElementById('print-chat');
    if (!headerEl || !chatEl) return;

    const win = window.open('', '_blank');
    if (!win) { alert('Veuillez autoriser les pop-ups pour imprimer.'); return; }

    win.document.write(`<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8">
      <title>CV — ${identity.basics.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { background: white !important; }
        .markdown-body p { margin-bottom: .75em; }
        .markdown-body ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: .75em; }
        .markdown-body a { color: #4f46e5; text-decoration: underline; }
        .markdown-body strong { font-weight: 600; }
      </style>
    </head><body class="p-8 max-w-4xl mx-auto font-sans text-gray-900">
      <header class="flex items-center gap-4 border-b-2 border-gray-200 pb-6 mb-6">${headerEl.innerHTML}</header>
      <main class="space-y-6">${chatEl.innerHTML}</main>
      <script>setTimeout(() => window.print(), 1000);</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 print:h-auto print:bg-white">

      {/* ── SIDEBAR desktop ── */}
      <aside className="hidden md:flex md:w-72 lg:w-80 flex-col bg-slate-900 border-r border-slate-800/60 shrink-0 print:hidden">

        {/* Profile */}
        <div className="p-6 flex flex-col items-center">
          <div className="relative mb-4">
            <img
              src={profilePhoto}
              alt={identity.basics.name}
              className="w-28 h-28 rounded-2xl object-cover border-2 border-indigo-500/20 shadow-lg cursor-pointer hover:border-indigo-500/50 hover:scale-[1.02] transition-all duration-300"
              onClick={() => setIsPhotoModalOpen(true)}
            />
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900 shadow" title="Disponible pour l'alternance" />
          </div>
          <h1 className="text-base font-bold text-white mb-1 text-center">{identity.basics.name}</h1>
          <p className="text-indigo-400 text-xs text-center leading-relaxed mb-3">{identity.basics.title}</p>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <MapPin className="w-3 h-3" />
            {identity.basics.location}
          </div>
        </div>

        <div className="mx-5 h-px bg-slate-800" />

        {/* Links */}
        <div className="p-4 space-y-2">
          <a href={`mailto:${identity.basics.email}`} className="flex items-center gap-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-all group">
            <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{identity.basics.email}</span>
          </a>
          <a href={identity.basics.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-all group">
            <Linkedin className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>LinkedIn</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 text-slate-500" />
          </a>
          <a href={(identity.basics as any).github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-all group">
            <Github className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 text-slate-500" />
          </a>
        </div>

        <div className="mx-5 h-px bg-slate-800" />

        {/* Tags */}
        <div className="p-4 flex-1">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-3">Domaines</p>
          <div className="flex flex-wrap gap-1.5">
            {SIDEBAR_TAGS.map(tag => (
              <span key={tag} className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-5 h-px bg-slate-800" />

        {/* Actions */}
        <div className="p-4">
          <div className="flex gap-2">
            <a
              href={cvPdfLink}
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 py-2.5 text-xs font-medium transition-all shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger CV
            </a>
            <button
              onClick={handlePrint}
              className="p-2.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
              title="Imprimer / sauvegarder PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-700 mt-3 font-mono">{APP_VERSION}</p>
        </div>
      </aside>

      {/* ── CHAT COLUMN ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Print-only header (invisible on screen, read by handlePrint) */}
        <div id="print-header" className="hidden">
          <img src={profilePhoto} alt={identity.basics.name} className="w-16 h-16 rounded-full object-cover" />
          <div>
            <p className="text-xl font-bold text-gray-900">{identity.basics.name}</p>
            <p className="text-sm text-gray-600">{identity.basics.title}</p>
            <p className="text-xs text-gray-500 mt-1">{identity.basics.email} · {identity.basics.location}</p>
          </div>
        </div>

        {/* Mobile header */}
        <header className="md:hidden print:hidden bg-slate-900 border-b border-slate-800/60 py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={profilePhoto}
              alt={identity.basics.name}
              className="w-9 h-9 rounded-full object-cover border border-indigo-500/30 cursor-pointer"
              onClick={() => setIsPhotoModalOpen(true)}
            />
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{identity.basics.name}</p>
              <p className="text-xs text-indigo-400 leading-tight truncate max-w-[200px]">{identity.basics.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a href={cvPdfLink} onClick={handleDownload} className="p-2 text-slate-500 hover:text-indigo-400 rounded-lg transition-colors" title="Télécharger CV">
              <Download className="w-5 h-5" />
            </a>
            <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-indigo-400 rounded-lg transition-colors" title="Imprimer">
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main id="print-chat" className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 print:overflow-visible print:p-0">
          <div className="space-y-5 max-w-3xl mx-auto print:space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} print:break-inside-avoid`}
              >
                {msg.role === 'user' ? (
                  <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-indigo-600 text-white shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                ) : (
                  <BotAvatar />
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3.5 shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-sm print:bg-white print:border-gray-200 print:text-gray-800'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline print:text-indigo-600"
                            >
                              {props.children}
                              <ExternalLink className="w-3 h-3 inline-block" />
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <BotAvatar />
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
                  <div className="dot-loading text-indigo-400 text-xl flex gap-1">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input */}
        <footer className="bg-slate-900/80 border-t border-slate-800/60 pt-3 pb-4 px-4 sm:px-6 print:hidden backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 py-1.5 px-3 rounded-full transition-all border border-slate-700/50 hover:border-indigo-500/30"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez une question sur le parcours de Louis…"
                  disabled={isLoading}
                  maxLength={500}
                  className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm rounded-xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 p-3 outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-end pr-1 mt-1">
                <span className={`text-[10px] font-mono transition-colors ${input.length > 450 ? 'text-red-400' : 'text-slate-700'}`}>
                  {input.length} / 500
                </span>
              </div>
            </form>

            <p className="text-center text-[11px] text-slate-700 mt-1">
              L'IA peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        </footer>
      </div>

      {/* ── PHOTO MODAL ── */}
      {isPhotoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            onClick={() => setIsPhotoModalOpen(false)}
            aria-label="Fermer"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={profilePhoto}
            alt={identity.basics.name}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
