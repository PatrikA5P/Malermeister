
import React from 'react';
import { SERVICES } from '../constants';

const Services: React.FC = () => {
  return (
    <section id="services" className="py-32 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <span className="text-olive-600 font-black uppercase tracking-[0.3em] text-xs">Unsere Expertise</span>
            <h2 className="text-5xl md:text-7xl font-bold text-black mt-4 leading-none">MEISTERHANDWERK <br/><span className="text-olive-600">IN JEDER SCHICHT.</span></h2>
          </div>
          <p className="text-black/50 max-w-sm text-lg font-medium leading-relaxed">
            Wir verarbeiten ausschliesslich Premium-Materialien für langlebige und ästhetische Resultate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SERVICES.map((service) => (
            <div key={service.id} className="group bg-white rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-slate-100 transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] hover:-translate-y-4">
              <div className="h-80 overflow-hidden relative">
                <img 
                  src={service.imageUrl} 
                  alt={service.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                  <span className="text-white font-bold uppercase tracking-widest text-sm flex items-center">
                    Projekt anfragen 
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </span>
                </div>
              </div>
              <div className="p-10">
                <div className="mb-6 flex justify-between items-start">
                  <div className="p-4 bg-olive-50 text-olive-600 rounded-2xl group-hover:bg-olive-600 group-hover:text-white transition-colors duration-300">
                    {service.id === 'painting' && (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    )}
                    {service.id === 'plastering' && (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    )}
                    {service.id === 'renovation' && (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    )}
                  </div>
                  <span className="text-slate-200 font-black text-4xl">0{service.id === 'painting' ? '1' : service.id === 'plastering' ? '2' : '3'}</span>
                </div>
                <h3 className="text-3xl font-bold text-black mb-4 brand-font">{service.title}</h3>
                <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                  {service.description}
                </p>
                <div className="h-1 w-12 bg-olive-200 group-hover:w-full transition-all duration-500"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
