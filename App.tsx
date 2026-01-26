
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
import OfficeApp from './components/OfficeApp';
import StatPage from './components/StatPage';
import StatPage2 from './components/StatPage2';
import StatPage3 from './components/StatPage3';
import StatPage4 from './components/StatPage4';
import StatPage5 from './components/StatPage5';
import StatPage6 from './components/StatPage6';
import StatPage7 from './components/StatPage7';

const App: React.FC = () => {
  // Views: 'website', 'stat', 'stat2', 'stat3', 'stat4', 'stat5', 'stat6', 'stat7', 'admin', 'office'
  const [currentView, setCurrentView] = useState<'website' | 'admin' | 'office' | 'stat' | 'stat2' | 'stat3' | 'stat4' | 'stat5' | 'stat6' | 'stat7'>('website');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      
      if (hash === '#admin') {
        setCurrentView('admin');
        window.scrollTo(0, 0);
      } else if (hash === '#office') {
        setCurrentView('office');
        window.scrollTo(0, 0);
      } else if (hash === '#stat') {
        setCurrentView('stat');
        window.scrollTo(0, 0);
      } else if (hash === '#stat2') {
        setCurrentView('stat2');
        window.scrollTo(0, 0);
      } else if (hash === '#stat3') {
        setCurrentView('stat3');
        window.scrollTo(0, 0);
      } else if (hash === '#stat4') {
        setCurrentView('stat4');
        window.scrollTo(0, 0);
      } else if (hash === '#stat5') {
        setCurrentView('stat5');
        window.scrollTo(0, 0);
      } else if (hash === '#stat6') {
        setCurrentView('stat6');
        window.scrollTo(0, 0);
      } else if (hash === '#stat7') {
        setCurrentView('stat7');
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
      office: '#office',
      stat: '#stat',
      stat2: '#stat2',
      stat3: '#stat3',
      stat4: '#stat4',
      stat5: '#stat5',
      stat6: '#stat6',
      stat7: '#stat7'
    };
    window.location.hash = hashMap[view];
  };

  const isLightPage = ['stat', 'stat2', 'stat4', 'stat5', 'stat6', 'stat7'].includes(currentView);

  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <QuoteTool onBack={() => navigateTo('website')} />
      </div>
    );
  }

  if (currentView === 'office') {
    return (
        <OfficeApp />
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
        {currentView === 'stat2' && <StatPage2 />}
        {currentView === 'stat3' && <StatPage3 />}
        {currentView === 'stat4' && <StatPage4 />}
        {currentView === 'stat5' && <StatPage5 />}
        {currentView === 'stat6' && <StatPage6 />}
        {currentView === 'stat7' && <StatPage7 />}
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

export default App;
