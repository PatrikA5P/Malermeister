
import React from 'react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Background Image with optimized Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1562664377-709f2c337eb2?q=80&w=2070")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent backdrop-blur-[1px]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 pt-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center space-x-2 mb-6 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-olive-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-olive-500"></span>
            </span>
            <span className="text-white text-xs font-black uppercase tracking-[0.3em]">JETZT VERFÜGBAR IN DER REGION</span>
          </div>
          
          <h1 className="text-6xl md:text-9xl font-black text-white leading-[0.9] mb-8 drop-shadow-2xl italic tracking-tighter">
            QUALITÄT <br /> 
            <span className="text-olive-500 not-italic uppercase">DIE STREICHT.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-2xl font-light leading-relaxed">
            Maler- & Gipserhandwerk auf höchstem Niveau. Ich kombiniere <span className="text-white font-semibold">Schweizer Gründlichkeit</span> mit modernen Techniken für Verwaltungen und anspruchsvolle Privatkunden.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center md:justify-start">
            <a 
              href="#contact" 
              className="group bg-olive-600 hover:bg-olive-500 text-white font-bold py-5 px-12 rounded-sm shadow-[0_20px_50px_rgba(124,141,47,0.3)] transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-lg flex items-center justify-center"
            >
              Offerte anfragen
              <svg className="w-5 h-5 ml-3 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
            <a 
              href="#services" 
              className="bg-white hover:bg-black hover:text-white text-black font-bold py-5 px-12 rounded-sm transition-all uppercase tracking-widest text-lg flex items-center justify-center"
            >
              Meine Expertise
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;