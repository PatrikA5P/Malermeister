
import React from 'react';
import { SERVICES, TARGET_SEGMENTS, TESTIMONIALS } from '../constants';

const StatPage3: React.FC = () => {
  return (
    <div className="bg-zinc-50 text-zinc-900 overflow-x-hidden">
      {/* --- HERO: BOLD INDUSTRIAL --- */}
      <section className="relative h-screen bg-black flex items-center pt-20">
        <div className="absolute top-0 right-0 w-2/3 h-full overflow-hidden opacity-40">
          <img src="https://images.unsplash.com/photo-1565008447742-97f6f38c985c?q=80&w=2070" className="w-full h-full object-cover" alt="Steel" />
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            <h1 className="text-8xl md:text-[12rem] font-black text-white leading-[0.8] tracking-tighter uppercase brand-font mb-10">
              BUILD <br/> <span className="text-olive-500">BOLD.</span>
            </h1>
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="h-px w-32 bg-olive-500 hidden md:block"></div>
              <p className="text-zinc-400 text-xl font-medium max-w-xl">Maler- & Gipsergeschäft Borer. Industrieller Standard für moderne Architektur.</p>
              <a href="#contact" className="px-8 py-8 bg-olive-600 text-white rounded-full font-black uppercase tracking-widest text-xs hover:scale-110 transition-transform flex items-center justify-center shrink-0 aspect-square">Jetzt Starten</a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-6 text-white/10 font-black text-9xl select-none leading-none">BORER ADMIN</div>
      </section>

      {/* --- SERVICES: BENTO BOX GRID --- */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-6 h-[800px]">
            <div className="md:col-span-2 md:row-span-2 bg-white p-12 flex flex-col justify-between border border-zinc-200">
               <div>
                 <span className="text-olive-600 font-bold uppercase tracking-widest text-xs">Core Expertise</span>
                 <h2 className="text-5xl font-black brand-font mt-4 uppercase leading-none">Malerarbeiten & Design</h2>
               </div>
               <p className="text-zinc-500 text-lg leading-relaxed">Hochwertige Oberflächen, präzise Kanten und nachhaltige Materialien für anspruchsvolle Projekte.</p>
               <img src={SERVICES[0].imageUrl} className="h-64 w-full object-cover rounded-xl mt-8" alt="Painting" />
            </div>
            <div className="md:col-span-2 bg-olive-600 p-12 text-white flex flex-col justify-center">
              <h3 className="text-3xl font-black brand-font uppercase mb-4">Gipser & Trockenbau</h3>
              <p className="opacity-80">Wir schaffen das Fundament für perfekte Räume.</p>
            </div>
            <div className="bg-zinc-900 p-8 text-white flex items-center justify-center">
               <span className="text-5xl font-black brand-font text-olive-500">15J+</span>
            </div>
            <div className="bg-white border border-zinc-200 p-8 flex flex-col justify-center text-center">
               <span className="font-bold text-xs uppercase tracking-widest text-zinc-400">Handwerk</span>
               <span className="text-xl font-black uppercase">Schweiz</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTACT: TECH PANEL --- */}
      <section className="py-32 bg-zinc-900">
        <div className="container mx-auto px-6 max-w-6xl bg-black rounded-[2rem] p-12 md:p-24 border border-zinc-800 shadow-2xl">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <div>
                <h2 className="text-6xl font-black text-white brand-font uppercase leading-none mb-8">Digitale <br/><span className="text-olive-600">Offerte.</span></h2>
                <p className="text-zinc-500 text-lg mb-12">Dank unserer KI-gestützten Planung erhalten Sie Ihr Angebot schneller als je zuvor. Keine Wartezeiten, volle Transparenz.</p>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 text-white">
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">⚡</div>
                    <span className="font-bold uppercase tracking-widest text-xs">Antwort in 24h</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                 <input className="w-full bg-zinc-900 border border-zinc-800 p-6 text-white outline-none focus:border-olive-600 transition-all font-bold" placeholder="NAME" />
                 <input className="w-full bg-zinc-900 border border-zinc-800 p-6 text-white outline-none focus:border-olive-600 transition-all font-bold" placeholder="E-MAIL" />
                 <textarea className="w-full bg-zinc-900 border border-zinc-800 p-6 text-white outline-none focus:border-olive-600 transition-all font-bold h-32" placeholder="PROJEKT"></textarea>
                 <button className="w-full bg-olive-600 p-6 text-white font-black uppercase tracking-[0.4em] hover:bg-olive-500 transition-all">Senden</button>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default StatPage3;
