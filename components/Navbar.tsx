
import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from '../constants';

interface NavbarProps {
  onAdminClick?: () => void;
  forceDarkText?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onAdminClick, forceDarkText = false }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      
      if (href === '#admin' || href === '#quote-tool') {
        onAdminClick?.();
      } else {
        window.location.hash = href;
      }
      
      setMobileMenuOpen(false);
    }
  };

  // Bestimmt die Textfarbe: Dunkler Text bei Scroll oder wenn die Seite explizit hell ist.
  const shouldUseDarkText = isScrolled || forceDarkText;

  return (
    <nav className={`fixed w-full z-[100] transition-all duration-500 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <a href="#home" onClick={(e) => handleNavClick('#home', e)} className="flex items-center space-x-2 group">
          <div className={`w-10 h-10 flex items-center justify-center rounded shadow-lg transform rotate-3 group-hover:rotate-0 transition-all duration-300 ${shouldUseDarkText ? 'bg-zinc-900' : 'bg-olive-600'}`}>
            <span className="text-white font-bold text-xl brand-font">B</span>
          </div>
          <span className={`text-2xl font-bold tracking-tighter brand-font transition-colors duration-300 ${shouldUseDarkText ? 'text-zinc-900' : 'text-white'}`}>
            MALER <span className="text-olive-600">BORER</span>
          </span>
        </a>

        {/* Desktop Menu */}
        <div className="hidden lg:flex space-x-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(item.href, e)}
              className={`font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300 hover:text-olive-600 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-olive-600 after:transition-all hover:after:w-full ${shouldUseDarkText ? 'text-zinc-600' : 'text-white/90 hover:text-white'}`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Mobile Button */}
        <button 
          className={`lg:hidden focus:outline-none transition-colors duration-300 ${shouldUseDarkText ? 'text-zinc-900' : 'text-white'}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-zinc-950 transition-all duration-500 z-[110] flex flex-col items-center justify-center space-y-8 ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-4xl font-black text-white uppercase tracking-tighter hover:text-olive-500 transition-colors brand-font"
              onClick={(e) => handleNavClick(item.href, e)}
            >
              {item.label}
            </a>
          ))}
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="mt-12 text-zinc-500 uppercase tracking-widest text-xs font-bold"
          >
            Schliessen
          </button>
      </div>
    </nav>
  );
};

export default Navbar;
