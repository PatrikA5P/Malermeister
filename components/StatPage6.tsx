
import React from 'react';
import { SERVICES, TESTIMONIALS } from '../constants';

const StatPage6: React.FC = () => {
  return (
    <div className="bg-[#fff] font-sans overflow-x-hidden selection:bg-olive-600 selection:text-white">
      {/* --- HERO: ORGANIC & FLOATING --- */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-12">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-olive-50/50 rounded-bl-[20rem] -z-10"></div>
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-sm border border-zinc-100 mb-8">
              <span className="w-2 h-2 bg-olive-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Maler & Gipser Meister</span>
            </div>
            <h1 className="text-7xl lg:text-[7rem] font-bold text-zinc-900 leading-[0.95] tracking-tight mb-10 brand-font">
              Räume neu <br/><span className="text-olive-600 italic">erleben.</span>
            </h1>
            <p className="text-zinc-500 text-lg leading-relaxed max-w-lg mb-12">
              Verwandeln Sie Ihr Zuhause in einen Ort der Ruhe. Wir vereinen höchste Präzision mit einem Gespür für Ästhetik.
            </p>
            <div className="flex flex-wrap gap-6">
              <a href="#contact" className="px-10 py-5 bg-zinc-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-olive-600 transition-all shadow-xl shadow-zinc-200">Offerte anfragen</a>
              <div className="flex -space-x-3 items-center">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-zinc-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                  </div>
                ))}
                <span className="ml-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">500+ Projekte</span>
              </div>
            </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-olive-500 rounded-[3rem] rotate-6 scale-95 opacity-20 -z-10"></div>
             <img 
               src="https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?q=80&w=1200" 
               className="w-full aspect-[4/5] object-cover rounded-[3rem] shadow-2xl" 
               alt="Modern Interior" 
             />
          </div>
        </div>
      </section>

      {/* --- SERVICES: FLOATING BUBBLES --- */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold brand-font mb-24 uppercase">Unsere Kompetenzen</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {SERVICES.map((s, i) => (
              <div key={s.id} className="group relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-olive-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-700 -z-10"></div>
                <div className="mb-10 flex justify-center">
                  <div className="w-24 h-24 bg-white shadow-xl rounded-[2rem] flex items-center justify-center text-3xl group-hover:rotate-12 transition-transform">
                    {i === 0 ? '🖌️' : i === 1 ? '🧱' : '✨'}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4 uppercase tracking-tight brand-font">{s.title}</h3>
                <p className="text-zinc-500 leading-relaxed font-medium mb-8">{s.description}</p>
                <div className="w-8 h-1 bg-olive-200 mx-auto group-hover:w-24 transition-all duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- TRUST: LIQUID STATS --- */}
      <section className="py-24 bg-zinc-900 rounded-[5rem] mx-6">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center text-white">
           <div>
             <span className="text-6xl font-black brand-font text-olive-500 block mb-4">48H</span>
             <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Angebotsgarantie</span>
           </div>
           <div>
             <span className="text-6xl font-black brand-font text-white block mb-4">100%</span>
             <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Schweizer Qualität</span>
           </div>
           <div>
             <span className="text-6xl font-black brand-font text-olive-500 block mb-4">15J+</span>
             <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Berufserfahrung</span>
           </div>
        </div>
      </section>

      {/* --- TESTIMONIALS: SOFT CAROUSEL VIBE --- */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="flex overflow-x-auto pb-12 gap-8 snap-x">
            {TESTIMONIALS.map(t => (
              <div key={t.id} className="min-w-[320px] md:min-w-[450px] bg-slate-50 p-12 rounded-[3rem] snap-center">
                <div className="text-olive-600 text-5xl mb-8">“</div>
                <p className="text-xl text-zinc-700 italic leading-relaxed mb-10">
                  {t.content}
                </p>
                <div>
                  <h4 className="font-bold text-zinc-900 uppercase brand-font">{t.name}</h4>
                  <p className="text-xs font-black uppercase tracking-widest text-olive-600 mt-2">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER CTA: SOFT PILL --- */}
      <section className="py-40 bg-white">
        <div className="container mx-auto px-6 max-w-4xl text-center bg-olive-50 p-24 rounded-[4rem] border border-olive-100 relative overflow-hidden">
           <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/50 rounded-full blur-3xl"></div>
           <h2 className="text-5xl font-bold brand-font mb-10 uppercase tracking-tighter">Bereit für ein <span className="text-olive-600">neues Gefühl?</span></h2>
           <p className="text-zinc-500 text-lg mb-12">Lassen Sie uns gemeinsam besprechen, wie wir Ihre Räume transformieren können.</p>
           <a href="mailto:info@maler-borer.ch" className="inline-block bg-zinc-900 text-white px-16 py-6 rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-olive-600 transition-all shadow-2xl">Email Senden</a>
        </div>
      </section>
    </div>
  );
};

export default StatPage6;
