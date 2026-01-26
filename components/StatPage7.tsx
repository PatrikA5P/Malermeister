
import React, { useState } from 'react';
import { SERVICES } from '../constants';

const StatPage7: React.FC = () => {
  const [activeVibe, setActiveVibe] = useState<'minimal' | 'warm' | 'bold'>('minimal');

  const vibes = {
    minimal: {
      bg: 'bg-zinc-50',
      accent: 'text-olive-600',
      btn: 'bg-zinc-900',
      label: 'Minimalist White',
      image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1200'
    },
    warm: {
      bg: 'bg-[#F5F2ED]',
      accent: 'text-orange-800',
      btn: 'bg-orange-900',
      label: 'Warm Earth',
      image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200'
    },
    bold: {
      bg: 'bg-zinc-200',
      accent: 'text-blue-900',
      btn: 'bg-blue-950',
      label: 'Modern Royal',
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200'
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 ${vibes[activeVibe].bg}`}>
      {/* --- HERO: THE DIGITAL ATELIER --- */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-3 mb-8 bg-white/50 backdrop-blur-md border border-white p-2 pr-6 rounded-full shadow-sm">
              <div className="w-10 h-10 bg-olive-600 rounded-full flex items-center justify-center text-white font-black">B</div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">100% Chefsache Garantie</span>
            </div>
            
            <h1 className={`text-7xl lg:text-[8rem] font-black leading-[0.85] tracking-tighter uppercase brand-font mb-10 transition-colors duration-500 ${vibes[activeVibe].accent}`}>
              Handwerk <br/> trifft <br/> <span className="italic">Vision.</span>
            </h1>
            
            <p className="text-zinc-500 text-xl max-w-lg mb-12 leading-relaxed font-medium">
              Manuel Borer kombiniert meisterhafte Ausführung mit digitaler Planung. Ihr Projekt verdient die Präzision eines Einzelunternehmers.
            </p>

            {/* VIBE SELECTOR - The "Cool" Element */}
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-zinc-100 max-w-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 text-center">Wählen Sie Ihre Raum-Aura</p>
              <div className="flex justify-between gap-3">
                {(['minimal', 'warm', 'bold'] as const).map((v) => (
                  <button 
                    key={v}
                    onClick={() => setActiveVibe(v)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeVibe === v ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-10 bg-olive-500/10 blur-[100px] rounded-full"></div>
            <div className="relative aspect-square overflow-hidden rounded-[4rem] shadow-2xl border-[12px] border-white">
              <img 
                src={vibes[activeVibe].image} 
                className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110" 
                alt="Digital Preview" 
              />
              <div className="absolute bottom-8 left-8 right-8 bg-white/80 backdrop-blur-md p-6 rounded-2xl flex justify-between items-center shadow-lg translate-y-20 group-hover:translate-y-0 transition-transform">
                <div>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Palette</span>
                  <p className="font-bold text-black uppercase">{vibes[activeVibe].label}</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-inner" style={{backgroundColor: vibes[activeVibe].accent.includes('olive') ? '#7c8d2f' : vibes[activeVibe].accent.includes('orange') ? '#7c2d12' : '#1e3a8a'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- USP SECTION: THE DIFFERENCE --- */}
      <section className="py-32 bg-zinc-900 text-white rounded-[5rem] mx-6">
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <span className="text-olive-500 font-bold uppercase tracking-[0.4em] text-xs">Warum Maler Borer?</span>
            <h2 className="text-5xl lg:text-7xl font-black brand-font uppercase mt-4">Der Vorteil <br/> des <span className="text-olive-500">Einzelmeisters.</span></h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:border-olive-500 transition-colors group">
              <div className="text-5xl mb-8 group-hover:scale-110 transition-transform origin-left">👤</div>
              <h3 className="text-2xl font-bold mb-4 uppercase brand-font">Chefsache-Garantie</h3>
              <p className="text-zinc-400 leading-relaxed">Keine wechselnden Ansprechpartner. Der Inhaber berät Sie, plant Ihr Projekt und führt es persönlich aus. Maximale Verbindlichkeit.</p>
            </div>
            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:border-olive-500 transition-colors group">
              <div className="text-5xl mb-8 group-hover:scale-110 transition-transform origin-left">🛡️</div>
              <h3 className="text-2xl font-bold mb-4 uppercase brand-font">Staubfrei-Versprechen</h3>
              <p className="text-zinc-400 leading-relaxed">Wir nutzen H13-Industrie-Luftreiniger. Ihre Möbel bleiben sauber, die Luft bleibt rein. Ideal für Renovationen im bewohnten Zustand.</p>
            </div>
            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:border-olive-500 transition-colors group">
              <div className="text-5xl mb-8 group-hover:scale-110 transition-transform origin-left">⚡</div>
              <h3 className="text-2xl font-bold mb-4 uppercase brand-font">48h Express-Offerte</h3>
              <p className="text-zinc-400 leading-relaxed">Dank digitaler Aufmaß-Technik erhalten Sie ein verbindliches Angebot innerhalb von 48 Stunden nach dem Erstgespräch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- AI ATELIER SECTION: CALL TO ACTION --- */}
      <section className="py-40">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row items-stretch border border-zinc-100">
            <div className="lg:w-1/2 p-12 md:p-20 flex flex-col justify-center">
               <div className="flex items-center space-x-3 mb-6">
                 <span className="flex h-3 w-3 rounded-full bg-olive-500"></span>
                 <span className="text-xs font-black uppercase tracking-widest text-olive-600">Neu: Digitales Atelier</span>
               </div>
               <h2 className="text-5xl font-black brand-font uppercase leading-none mb-8 text-black">Planen Sie <br/> mit <span className="text-olive-600">KI-Präzision.</span></h2>
               <p className="text-zinc-500 text-lg mb-10 leading-relaxed">Laden Sie ein Foto Ihres Raums hoch und lassen Sie Manuel Borer einen digitalen Entwurf erstellen. Keine bösen Überraschungen, nur Vorfreude.</p>
               <a href="#contact" className="inline-block bg-black text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-olive-600 transition-all text-center">Atelier-Termin buchen</a>
            </div>
            <div className="lg:w-1/2 bg-zinc-100 relative min-h-[400px]">
               <img src="https://images.unsplash.com/photo-1581850518616-bcb8077fa2aa?q=80&w=1200" className="w-full h-full object-cover" alt="Designer at work" />
               <div className="absolute inset-0 bg-gradient-to-l from-white/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTACT: THE FINAL LAYER --- */}
      <section id="contact" className="py-32">
        <div className="container mx-auto px-6 max-w-3xl text-center">
           <h2 className="text-6xl font-black brand-font uppercase mb-12 tracking-tighter text-black">Lassen Sie uns <br/> <span className="text-olive-600 italic">Farbe bekennen.</span></h2>
           <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-zinc-100">
              <form className="space-y-8 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <input className="w-full border-b-2 border-zinc-100 py-4 focus:border-olive-600 outline-none font-bold uppercase tracking-widest text-xs" placeholder="NAME" />
                  <input className="w-full border-b-2 border-zinc-100 py-4 focus:border-olive-600 outline-none font-bold uppercase tracking-widest text-xs" placeholder="TEL / EMAIL" />
                </div>
                <textarea className="w-full border-b-2 border-zinc-100 py-4 focus:border-olive-600 outline-none font-bold uppercase tracking-widest text-xs h-32 resize-none" placeholder="IHR PROJEKT (Z.B. 4-ZIMMER WOHNUNG STREICHEN)"></textarea>
                <button className={`w-full py-8 text-white font-black uppercase tracking-[0.4em] text-xs rounded-2xl transition-all shadow-2xl ${vibes[activeVibe].btn}`}>Unverbindliche Anfrage Senden</button>
              </form>
           </div>
        </div>
      </section>
    </div>
  );
};

export default StatPage7;
