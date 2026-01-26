
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-white py-12 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
             <span className="text-xl font-bold brand-font">
              MALER <span className="text-olive-600">Borer</span>
            </span>
            <p className="text-white/40 text-sm mt-2 font-medium uppercase tracking-widest">© {new Date().getFullYear()} Maler- & Gipsergeschäft Borer.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-white/40 font-bold uppercase tracking-[0.2em]">
            <a href="#contact" className="hover:text-olive-500 transition-colors">Kontakt</a>
            <a href="#" className="hover:text-olive-500 transition-colors">Impressum</a>
            <a href="#" className="hover:text-olive-500 transition-colors">Datenschutz</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
