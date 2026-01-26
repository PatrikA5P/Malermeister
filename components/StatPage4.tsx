
import React from 'react';
import { SERVICES, TARGET_SEGMENTS, TESTIMONIALS } from '../constants';

const StatPage4: React.FC = () => {
  return (
    <div className="bg-[#FCFCFA] font-sans selection:bg-olive-100">
      {/* --- HERO: SOFT & WELCOMING --- */}
      <section className="min-h-screen flex items-center py-20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1">
              <div className="inline-block bg-olive-50 text-olive-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">Meisterbetrieb seit 2010</div>
              <h1 className="text-6xl md:text-8xl font-black text-zinc-900 leading-[0.9] mb-10 brand-font uppercase">
                Gefühl für <br/><span className="text-olive-600 italic">Oberflächen.</span>
              </h1>
              <p className="text-zinc-500 text-xl leading-relaxed max-w-lg mb-12">Wir schaffen Atmosphäre durch Farbe und Struktur. Ehrlich, sauber und nachhaltig.</p>
              <div className="flex flex-wrap gap-4">
                <a href="#contact" className="bg-zinc-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-olive-600 transition-all shadow-xl shadow-zinc-200">Kostenlose Beratung</a>
                <a href="#services" className="bg-white border border-zinc-100 text-zinc-400 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:text-zinc-900 transition-all">Unsere Werte</a>
              </div>
            </div>
            <div className="flex-1 relative">
               <div className="absolute -inset-4 bg-olive-100 rounded-[4rem] blur-3xl opacity-30"></div>
               <img src="https://images.unsplash.com/photo-1595844730298-b960ff98fee0?q=80&w=1200" className="relative z-10 w-full aspect-square object-cover rounded-[3rem] shadow-2xl" alt="Maler" />
            </div>
          </div>
        </div>
      </section>

      {/* --- SERVICES: SOFT CARDS --- */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {SERVICES.map(s => (
              <div key={s.id} className="bg-white p-12 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-zinc-50 hover:-translate-y-4 transition-all duration-500 group">
                 <div className="w-20 h-20 bg-olive-50 rounded-3xl flex items-center justify-center mb-10 group-hover:bg-olive-600 transition-colors">
                    <span className="text-3xl grayscale group-hover:grayscale-0">🎨</span>
                 </div>
                 <h3 className="text-3xl font-black brand-font mb-6 uppercase">{s.title}</h3>
                 <p className="text-zinc-500 leading-relaxed mb-8">{s.description}</p>
                 <div className="h-1.5 w-12 bg-olive-200 rounded-full group-hover:w-full transition-all duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- TRUST: CIRCULAR ELEMENTS --- */}
      <section className="py-32 bg-zinc-50">
        <div className="container mx-auto px-6 text-center">
           <h2 className="text-4xl font-black brand-font uppercase mb-20">Was Kunden schätzen</h2>
           <div className="flex flex-wrap justify-center gap-10">
              {TESTIMONIALS.map(t => (
                <div key={t.id} className="bg-white p-10 rounded-full w-80 h-80 flex flex-col items-center justify-center shadow-lg border border-zinc-100">
                   <p className="text-sm italic text-zinc-500 mb-6 leading-relaxed">"{t.content.slice(0, 80)}..."</p>
                   <span className="font-bold text-black uppercase tracking-widest text-[10px]">{t.name}</span>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* --- FINAL CALL --- */}
      <section className="py-40">
        <div className="container mx-auto px-6 bg-olive-600 rounded-[4rem] p-12 md:p-24 text-white text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent"></div>
           <div className="relative z-10 max-w-2xl mx-auto">
             <h2 className="text-6xl font-black brand-font uppercase mb-10 leading-none">Ihre Wände <br/> verdienen <span className="text-zinc-900">Borer.</span></h2>
             <p className="text-white/80 text-xl mb-12">Rufen Sie uns unverbindlich an oder schreiben Sie uns. Wir freuen uns auf Ihr Projekt.</p>
             <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <a href="tel:+41790000000" className="bg-white text-olive-600 px-12 py-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-zinc-900 hover:text-white transition-all">Anrufen</a>
                <a href="#contact" className="bg-zinc-900 text-white px-12 py-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all">Nachricht</a>
             </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default StatPage4;
