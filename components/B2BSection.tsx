
import React from 'react';
import { TARGET_SEGMENTS } from '../constants';

const B2BSection: React.FC = () => {
  return (
    <section id="b2b" className="py-24 bg-black text-white overflow-hidden relative border-y border-white/5">
      {/* Decorative background circle */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-olive-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-olive-400 font-bold uppercase tracking-widest text-sm">Partnerschaft</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-8">VERWALTUNGEN & PRIVATKUNDEN</h2>
            <p className="text-white/60 text-lg mb-12 max-w-xl">
              Wir wissen, dass jedes Projekt andere Anforderungen hat. Ob Effizienz bei einer Mietwohnung oder Perfektion in der Villa – wir liefern das passende Ergebnis.
            </p>

            <div className="space-y-12">
              {Object.entries(TARGET_SEGMENTS).map(([key, segment]) => (
                <div key={key} className="bg-white/5 p-8 rounded-lg border border-white/10 hover:border-olive-600/50 transition-colors">
                  <h3 className="text-2xl font-bold text-olive-400 mb-4">{segment.title}</h3>
                  <p className="text-white/80 mb-6">{segment.description}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {segment.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-sm text-white/60">
                        <svg className="w-5 h-5 text-olive-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img src="https://images.unsplash.com/photo-1574359411659-15573a27f812?q=80&w=800" alt="Arbeit" className="rounded-lg shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" />
                <div className="bg-olive-600 p-6 rounded-lg">
                  <span className="text-4xl font-bold block text-white">15+</span>
                  <span className="text-sm uppercase tracking-widest font-semibold text-white/90">Jahre Erfahrung</span>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="bg-white text-black p-6 rounded-lg">
                  <span className="text-4xl font-bold block">100%</span>
                  <span className="text-sm uppercase tracking-widest font-semibold">Termintreue</span>
                </div>
                <img src="https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?q=80&w=800" alt="Arbeit 2" className="rounded-lg shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default B2BSection;
