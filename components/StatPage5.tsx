
import React from 'react';
import { SERVICES, TARGET_SEGMENTS } from '../constants';

const StatPage5: React.FC = () => {
  return (
    <div className="bg-[#f2f2f2] text-[#1a1a1a] font-sans selection:bg-olive-500 selection:text-white">
      {/* --- HERO: VERTICAL TYPO & SPLIT --- */}
      <section className="min-h-screen flex flex-col lg:flex-row border-b border-black/10">
        <div className="lg:w-1/2 flex flex-col justify-center p-12 lg:p-24 bg-white">
          <div className="mb-12">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-olive-600">Established 2010</span>
          </div>
          <h1 className="text-8xl lg:text-[12rem] font-black leading-[0.8] tracking-tighter uppercase brand-font mb-12">
            Pure <br/><span className="text-olive-600">Borer.</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-sm mb-12 font-medium">
            Handwerk in seiner ehrlichsten Form. Keine Kompromisse, nur Qualität.
          </p>
          <div className="flex gap-4">
            <a href="#contact" className="bg-black text-white px-12 py-5 font-black uppercase tracking-widest text-[10px] hover:bg-olive-600 transition-all">Anfrage</a>
          </div>
        </div>
        <div className="lg:w-1/2 relative bg-zinc-900 group overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1565008447742-97f6f38c985c?q=80&w=2070" 
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" 
            alt="Texture"
          />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-12 rotate-90 text-[15rem] font-black text-white/5 whitespace-nowrap pointer-events-none uppercase">
            CRAFTSMAN
          </div>
        </div>
      </section>

      {/* --- SERVICES: GRID CARDS --- */}
      <section className="py-32 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black/10 border border-black/10">
            {SERVICES.map((s, i) => (
              <div key={s.id} className="bg-white p-12 hover:bg-zinc-50 transition-colors group">
                <span className="text-4xl font-black text-zinc-100 group-hover:text-olive-100 transition-colors mb-8 block brand-font italic">0{i+1}</span>
                <h3 className="text-4xl font-black brand-font mb-6 uppercase tracking-tight">{s.title}</h3>
                <p className="text-zinc-400 mb-10 leading-relaxed font-medium">{s.description}</p>
                <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
                  <span className="w-12 h-px bg-black group-hover:w-20 group-hover:bg-olive-600 transition-all"></span>
                  Details
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- DESIGN ELEMENT: COLOR PALETTE --- */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-8 px-4">
              <div className="w-64 h-96 bg-olive-500 rounded-sm p-6 flex flex-col justify-end text-white">
                <span className="font-mono text-xs">#7C8D2F</span>
                <span className="font-black text-2xl uppercase">Borer Olive</span>
              </div>
              <div className="w-64 h-96 bg-zinc-900 rounded-sm p-6 flex flex-col justify-end text-white">
                <span className="font-mono text-xs">#0D1005</span>
                <span className="font-black text-2xl uppercase">Deep Stone</span>
              </div>
              <div className="w-64 h-96 bg-zinc-200 rounded-sm p-6 flex flex-col justify-end text-black">
                <span className="font-mono text-xs">#ECEEE3</span>
                <span className="font-black text-2xl uppercase">Light Plaster</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- CONTACT: FULLSCREEN DARK --- */}
      <section className="bg-black text-white py-40">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
            <div>
              <h2 className="text-7xl font-black brand-font uppercase leading-none mb-12">Reden <br/> wir <br/> <span className="text-olive-500 italic">Farbe.</span></h2>
              <div className="space-y-4 text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <p>Maler- & Gipsergeschäft Manuel Borer</p>
                <p>8001 Zürich, Schweiz</p>
                <p className="text-white">+41 79 000 00 00</p>
              </div>
            </div>
            <form className="space-y-12">
              <div className="relative group">
                <input type="text" className="w-full bg-transparent border-b border-zinc-800 py-4 outline-none focus:border-olive-500 transition-all font-bold text-xl uppercase placeholder:text-zinc-800" placeholder="NAME" />
              </div>
              <div className="relative group">
                <input type="email" className="w-full bg-transparent border-b border-zinc-800 py-4 outline-none focus:border-olive-500 transition-all font-bold text-xl uppercase placeholder:text-zinc-800" placeholder="E-MAIL" />
              </div>
              <div className="relative group">
                <textarea rows={3} className="w-full bg-transparent border-b border-zinc-800 py-4 outline-none focus:border-olive-500 transition-all font-bold text-xl uppercase placeholder:text-zinc-800 resize-none" placeholder="PROJEKT"></textarea>
              </div>
              <button className="w-full py-8 border-2 border-white text-white font-black uppercase tracking-[0.5em] hover:bg-white hover:text-black transition-all">SENDEN</button>
            </form>
          </div>
        </div>
      </section>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StatPage5;
