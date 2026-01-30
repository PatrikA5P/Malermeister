
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import B2BSection from './components/B2BSection';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AIChat from './components/AIChat';
import QuoteTool from './components/QuoteTool';
import StatPage from './components/StatPage';


const MarketingApp: React.FC = () => {
  // Views: 'website', 'stat', 'admin'
  const [currentView, setCurrentView] = useState<'website' | 'admin' | 'stat'>('website');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      
      if (hash === '#admin') {
        setCurrentView('admin');
        window.scrollTo(0, 0);
      } else if (hash === '#stat') {
        setCurrentView('stat');
        window.scrollTo(0, 0);
      } else if (hash === '#home' || hash === '') {
        setCurrentView('website');
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: any) => {
    const hashMap: any = {
      website: '#home',
      admin: '#admin',
      stat: '#stat'
    };
    window.location.hash = hashMap[view];
  };

  // Bestimmt, ob die aktuelle Seite einen hellen Hintergrund im Hero-Bereich hat.
  const isLightPage = ['stat'].includes(currentView);

  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <QuoteTool onBack={() => navigateTo('website')} />
      </div>
    );
  }

  return (
    <div className="relative">
      <Navbar 
        onAdminClick={() => navigateTo('admin')} 
        forceDarkText={isLightPage}
      />
      <main>
        {currentView === 'stat' && <StatPage />}
        {currentView === 'website' && (
          <>
            <Hero />
            <Services />
            <B2BSection />
            <Testimonials />
            <Contact />
          </>
        )}
      </main>
      <Footer />
      <AIChat />
    </div>
  );
};

export default MarketingApp;
