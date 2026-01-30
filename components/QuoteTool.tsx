
import React from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { H1, P } from './ui/Typography';

interface QuoteToolProps {
  onBack: () => void;
}

const QuoteTool: React.FC<QuoteToolProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
            <H1>Verwaltung</H1>
            <Button variant="outline" onClick={onBack} label="Zurück zur Website" />
        </div>
        
        <Card title="Administration" subtitle="Schnellzugriff">
            <div className="space-y-4">
                <P>
                    Dies ist der administrative Bereich für Webseiten-Einstellungen (Legacy). 
                    Für die vollständige Büro-Verwaltung nutzen Sie bitte das "Büro Login".
                </P>
                <div className="flex gap-4">
                    <Button variant="solid" label="Zum Büro Login" onClick={() => window.location.hash = '#office'} />
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default QuoteTool;
