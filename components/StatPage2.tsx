
import React from 'react';
import { SERVICES, TARGET_SEGMENTS, TESTIMONIALS } from '../constants';

const StatPage2: React.FC = () => {
  return (
    <div className="bg-white font-sans selection:bg-olive-200">
      {/* --- HERO: MINIMALIST --- */}
      <section className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-olive-600 font-bold tracking-[0.4em] text-[10px] uppercase mb-8 block">Borer Atelier</span>
            <h1 className="text-7xl lg:text-8xl font-black text-black leading-none mb-10 tracking-tight uppercase brand-font">
              Farbe & <br/><span className="text-olive-500 italic">Präzision.</span>
            </h1>
            <p className="text-zinc-500 text-lg mb-12 max-w-md leading-relaxed">
              Zeitlose Raumgestaltung durch meisterhaftes Handwerk. Wir definieren Oberflächen neu.
            </p>
            <div className="flex space-x-8">
              <a href="#contact" className="text-black font-black uppercase text-xs tracking-widest border-b-2 border-black pb-2 hover:text-olive-600 hover:border-olive-600 transition-all">Projekt starten</a>
              <a href="#services" className="text-zinc-400 font-black uppercase text-xs tracking-widest hover:text-black transition-all">Portfolio</a>
            </div>
          </div>
          <div className="relative aspect-[4/5] bg-zinc-200 overflow-hidden rounded-sm group">
            <img 
              src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1200" 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" 
              alt="Maler Arbeit"
            />
          </div>
        </div>
      </section>

      {/* --- SERVICES: GALLERY STYLE --- */}
      <section className="py-40">
        <div className="container mx-auto px-6">
          <div className="mb-32 text-center">
            <h2 className="text-5xl font-black brand-font uppercase tracking-tighter">Das Handwerk</h2>
            <div className="h-0.5 w-20 bg-olive-500 mx-auto mt-6"></div>
          </div>
          <div className="space-y-40">
            {SERVICES.map((service, idx) => (
              <div key={service.id} className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-24 items-center`}>
                <div className="flex-1 overflow-hidden">
                  <img src={service.imageUrl} className="w-full h-[600px] object-cover rounded-sm" alt={service.title} />
                </div>
                <div className="flex-1 max-w-md">
                  <span className="text-olive-600 font-bold text-6xl opacity-20 block mb-6 font-serif italic">0{idx+1}</span>
                  <h3 className="text-4xl font-black brand-font mb-6 uppercase">{service.title}</h3>
                  <p className="text-zinc-500 leading-loose mb-10">{service.description}</p>
                  <button className="px-10 py-4 border border-zinc-200 hover:border-olive-600 hover:bg-olive-600 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">Details ansehen</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- B2B: CLEAN SPLIT --- */}
      <section className="bg-zinc-950 py-32 text-white">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-32">
          <div>
            <h2 className="text-5xl font-black brand-font uppercase mb-12 leading-tight">Effizienz für <span className="text-olive-500">Immobilien profis.</span></h2>
            <div className="grid grid-cols-1 gap-10">
              {TARGET_SEGMENTS.verwaltung.features.map((f, i) => (
                <div key={i} className="flex items-start space-x-6">
                  <span className="w-12 h-px bg-olive-500 mt-3"></span>
                  <p className="text-zinc-400 font-medium">{f}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-olive-600 p-16 rounded-sm flex flex-col justify-center">
             <blockquote className="text-3xl font-light italic leading-relaxed mb-10">
               "Maler Borer ist die Definition von Verlässlichkeit im Zürcher Immobilienmarkt."
             </blockquote>
             <cite className="text-sm font-bold uppercase tracking-widest not-italic">— H.P. Müller, Verwaltung</cite>
          </div>
        </div>
      </section>

      {/* --- CONTACT: ARCHITECTURAL --- */}
      <section className="py-40 bg-white">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-6xl font-black brand-font uppercase mb-20 tracking-tighter">Kontaktieren <br/><span className="text-olive-500">Sie uns.</span></h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Vorname / Nachname</label>
              <input type="text" className="w-full border-b border-zinc-200 py-4 focus:border-black outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">E-Mail Adresse</label>
              <input type="email" className="w-full border-b border-zinc-200 py-4 focus:border-black outline-none transition-all" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Projektbeschreibung</label>
              <textarea rows={4} className="w-full border-b border-zinc-200 py-4 focus:border-black outline-none transition-all resize-none"></textarea>
            </div>
            <button className="md:col-span-2 w-full bg-black text-white py-6 font-black uppercase tracking-[0.3em] text-xs hover:bg-olive-600 transition-all">Anfrage Absenden</button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default StatPage2;
