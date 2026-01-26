
import React from 'react';

const Contact: React.FC = () => {
  return (
    <section id="contact" className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
          <div>
            <span className="text-olive-600 font-black uppercase tracking-[0.3em] text-xs">Kontakt</span>
            <h2 className="text-6xl md:text-8xl font-bold text-black mb-12 leading-[0.8] tracking-tighter">
              BEREIT FÜR <br /> <span className="text-olive-600 italic">DEN NEUANSTRICH?</span>
            </h2>
            <p className="text-xl text-slate-500 mb-16 max-w-lg leading-relaxed font-medium">
              Ob Grossüberbauung oder privates Wohnzimmer – ich berate Sie persönlich und erstelle ein verbindliches Angebot innerhalb von 48 Stunden.
            </p>

            <div className="space-y-10">
              <a href="tel:+41790000000" className="flex items-center space-x-6 group">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center rounded-2xl shadow-xl group-hover:bg-olive-600 group-hover:-rotate-6 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-1">Direktwahl Herr Borer</p>
                  <span className="text-2xl font-bold text-black hover:text-olive-600 transition-colors">+41 79 000 00 00</span>
                </div>
              </a>

              <a href="mailto:info@maler-borer.ch" className="flex items-center space-x-6 group">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center rounded-2xl shadow-xl group-hover:bg-olive-600 group-hover:rotate-6 transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-1">E-Mail Korrespondenz</p>
                  <span className="text-2xl font-bold text-black hover:text-olive-600 transition-colors">info@maler-borer.ch</span>
                </div>
              </a>
            </div>
            
            <div className="mt-20 p-8 bg-olive-50 rounded-3xl border border-olive-100 flex items-center space-x-6">
               <div className="w-20 h-20 rounded-full bg-olive-200 flex-shrink-0 flex items-center justify-center font-black text-olive-700 text-3xl">B</div>
               <div>
                 <p className="text-black font-bold text-lg">"Handwerk ist Vertrauenssache."</p>
                 <p className="text-olive-600 font-bold uppercase tracking-widest text-xs mt-1">Ihr Inhaber, Manuel Borer</p>
               </div>
            </div>
          </div>

          <div className="bg-slate-50 p-10 md:p-16 rounded-[3rem] border border-slate-200 shadow-[0_50px_100px_rgba(0,0,0,0.05)]">
            <h3 className="text-3xl font-bold text-black mb-10 brand-font">Projekt-Details</h3>
            <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="relative">
                  <input type="text" className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-200 focus:border-olive-600 outline-none transition-all font-bold text-lg peer placeholder-transparent" id="name" placeholder="Name" />
                  <label htmlFor="name" className="absolute left-0 top-0 text-slate-400 text-xs font-bold uppercase tracking-widest transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-lg peer-focus:top-0 peer-focus:text-xs peer-focus:text-olive-600">Ihr Name</label>
                </div>
                <div className="relative">
                  <input type="email" className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-200 focus:border-olive-600 outline-none transition-all font-bold text-lg peer placeholder-transparent" id="email" placeholder="Email" />
                  <label htmlFor="email" className="absolute left-0 top-0 text-slate-400 text-xs font-bold uppercase tracking-widest transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-lg peer-focus:top-0 peer-focus:text-xs peer-focus:text-olive-600">E-Mail Adresse</label>
                </div>
              </div>
              
              <div className="space-y-4">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Ich brauche Hilfe bei:</span>
                <div className="flex flex-wrap gap-3">
                  {['Malerarbeiten', 'Gipserarbeiten', 'Renovation', 'Beratung'].map(tag => (
                    <button key={tag} type="button" className="px-6 py-2 rounded-full border-2 border-slate-200 text-xs font-bold uppercase tracking-widest hover:border-olive-600 hover:text-olive-600 transition-all focus:bg-olive-600 focus:text-white focus:border-olive-600">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea rows={4} className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-200 focus:border-olive-600 outline-none transition-all font-bold text-lg peer placeholder-transparent resize-none" id="msg" placeholder="Nachricht"></textarea>
                <label htmlFor="msg" className="absolute left-0 top-0 text-slate-400 text-xs font-bold uppercase tracking-widest transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-lg peer-focus:top-0 peer-focus:text-xs peer-focus:text-olive-600">Beschreiben Sie Ihr Projekt</label>
              </div>

              <button className="w-full bg-black hover:bg-olive-600 text-white font-black py-6 rounded-2xl shadow-2xl transition-all transform active:scale-95 uppercase tracking-[0.3em] text-sm">
                Anfrage jetzt senden
              </button>
              
              <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Antwort in der Regel innerhalb von 24h
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
