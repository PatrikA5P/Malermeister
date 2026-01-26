
import React, { useState, useRef, useEffect } from 'react';
import { getGeminiResponse } from '../geminiService';
import { Document } from '../types';

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Hoi! Ich bin der digitale Assistent von Maler Borer. Haben Sie Fragen zu unseren Arbeiten oder brauchen Sie direkt eine Offerte?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    const newHistory = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // Fix: getGeminiResponse now returns a full GenerateContentResponse object
      const response = await getGeminiResponse(userMsg, newHistory);
      
      // Fixed: Access functionCalls directly on the response object
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'createQuoteDraft') {
            const args = call.args as any;
            const draft: Document = {
              id: `AI-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              type: 'quote',
              clientName: args.clientName || 'Unbekannter Kunde',
              clientAddress: args.clientAddress || '',
              date: new Date().toISOString().split('T')[0],
              status: 'draft',
              isAiGenerated: true,
              items: (args.items || []).map((item: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                pricePerUnit: item.pricePerUnit
              }))
            };
            
            // Persist directly to shared storage using the consistent 'borer_docs' key
            const existingDocs = JSON.parse(localStorage.getItem('borer_docs') || '[]');
            const updatedDocs = [draft, ...existingDocs];
            localStorage.setItem('borer_docs', JSON.stringify(updatedDocs));
            
            // Notify other parts of the app
            window.dispatchEvent(new CustomEvent('new-ai-draft', { detail: draft }));
            
            setMessages(prev => [...prev, { 
              role: 'model', 
              text: `Perfekt! Ich habe eine Offerte für "${draft.clientName}" entworfen. Herr Borer wird die Details prüfen und Sie kontaktieren. Haben Sie noch weitere Wünsche?` 
            }]);
          }
        }
      } else if (response.text) {
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: 'Entschuldigung, da gab es ein technisches Problem. Bitte rufen Sie uns direkt an.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen ? (
        <div className="bg-white w-80 md:w-96 h-[500px] shadow-2xl rounded-2xl flex flex-col border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-black p-4 text-white flex justify-between items-center border-b border-olive-900/20">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-olive-600 rounded flex items-center justify-center font-bold">B</div>
              <div>
                <p className="font-bold text-sm leading-none brand-font">Borer Assistent</p>
                <p className="text-[10px] text-olive-400 uppercase tracking-widest font-bold mt-1">KI-Gestützt</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-olive-700 text-white rounded-br-none' : 'bg-white text-black shadow-sm border border-slate-100 rounded-bl-none'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 rounded-bl-none">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-olive-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-olive-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-olive-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Frage stellen..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:border-olive-600"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="bg-black text-white p-2 rounded-full hover:bg-olive-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-olive-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group relative border-2 border-white"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <span className="absolute -top-12 right-0 bg-black text-white text-[10px] py-1 px-3 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-widest">Frag den Borer</span>
        </button>
      )}
    </div>
  );
};

export default AIChat;
