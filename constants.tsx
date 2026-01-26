
import React from 'react';
import { NavItem, Service, Testimonial, ProjectCategory, LineItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '#home' },
  { label: 'KI Designer (A)', href: '#stat' },
  { label: 'Exklusiv (B)', href: '#stat2' },
  { label: 'Industrial (C)', href: '#stat3' },
  { label: 'Modern (D)', href: '#stat4' },
  { label: 'Minimal (E)', href: '#stat5' },
  { label: 'Organic (F)', href: '#stat6' },
  { label: 'Digital (G)', href: '#stat7' },
  { label: 'Verwaltung', href: '#admin' },
  { label: 'Büro Login', href: '#office' },
];

export const STANDARD_ITEMS: Partial<LineItem>[] = [
  { description: 'Wandanstrich (Dispersion)', unit: 'm2', pricePerUnit: 12.50 },
  { description: 'Deckenanstrich (Dispersion)', unit: 'm2', pricePerUnit: 14.00 },
  { description: 'Abrieb/Weissputz Q3', unit: 'm2', pricePerUnit: 45.00 },
  { description: 'Rissarmierung mit Vlies', unit: 'm2', pricePerUnit: 18.00 },
  { description: 'Abdeckarbeiten & Schutz', unit: 'Paush', pricePerUnit: 150.00 },
  { description: 'Stundenansatz Maler', unit: 'Std', pricePerUnit: 85.00 },
];

export const SERVICES: Service[] = [
  {
    id: 'painting',
    title: 'Malerarbeiten',
    description: 'Vom klassischen Wandanstrich bis zu exklusiven Dekortechniken. Toni Borer bringt Farbe in Ihr Leben – präzise und sauber.',
    icon: 'brush',
    imageUrl: 'https://images.unsplash.com/photo-1595844730298-b960ff98fee0?q=80&w=1200',
  },
  {
    id: 'plastering',
    title: 'Gipserarbeiten',
    description: 'Glattputz, Weissputz oder dekorative Strukturen. Wir sorgen für das perfekte Fundament Ihrer Raumgestaltung.',
    icon: 'layer-group',
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592dea58ef23?q=80&w=1200',
  },
  {
    id: 'renovation',
    title: 'Renovationen',
    description: 'Komplette Auffrischung für Altbauten und Liegenschaften. Wir erhalten Werte und schaffen neues Wohlbefinden.',
    icon: 'hammer',
    imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1200',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Hans-Peter Müller',
    role: 'Immobilienverwaltung Müller & Co.',
    content: 'Toni Borer ist unser zuverlässigster Partner bei Mieterwechseln. Schnell, sauber und absolut unkompliziert. Ein echter Handschlag-Unternehmer!',
    stars: 5,
  },
  {
    id: '2',
    name: 'Beatrix von Au',
    role: 'Privatkundin, Zürichberg',
    content: 'Die Beratung war exzellent. Herr Borer hat ein Auge für Details, das man heute nur noch selten findet. Unser Wohnzimmer sieht fantastisch aus.',
    stars: 5,
  },
  {
    id: '3',
    name: 'Markus Weber',
    role: 'Geschäftsführer Weber IT',
    content: 'Hervorragende Arbeit bei unserer Bürosanierung. Termingerecht fertiggestellt, trotz engem Zeitplan. Absolut empfehlenswert.',
    stars: 5,
  },
];

export const TARGET_SEGMENTS: Record<string, ProjectCategory> = {
  verwaltung: {
    title: 'Verwaltungen & KMU',
    description: 'Effizienz und Verlässlichkeit sind der Schlüssel. Wir verstehen den Zeitdruck bei Mieterwechseln.',
    features: [
      'Termingarantie bei Wohnungsabgaben',
      'Direkte Kommunikation mit Mietern',
      'Pauschalpreise für Standardarbeiten',
      'Kurzfristige Verfügbarkeit',
    ],
  },
  privat: {
    title: 'Exklusive Privatkunden',
    description: 'Ihr Zuhause verdient das Beste. Wir setzen auf hochwertige Materialien und ästhetische Perfektion.',
    features: [
      'Individuelle Farbberatung vor Ort',
      'Stucco Veneziano & Edelputze',
      'Maximale Sauberkeit während der Arbeit',
      'Persönliche Betreuung durch den Chef',
    ],
  },
};
