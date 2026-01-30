
import { Product } from '../../officeTypes';

export const STANDARD_PRODUCTS: Partial<Product>[] = [
  // Regie & Pauschalen
  { code: 'MB-S-001', name: 'Regieansatz Maler', unit: 'Std', price: 95.0, accountId: 3000, type: 'service', productGroup: 'Regie & Pauschalen', productSubGroup: 'Regie Maler', isTemplate: true },
  { code: 'MB-S-002', name: 'Regieansatz Gipser', unit: 'Std', price: 98.0, accountId: 3000, type: 'service', productGroup: 'Regie & Pauschalen', productSubGroup: 'Regie Gipser', isTemplate: true },
  { code: 'MB-S-003', name: 'Baustelleneinrichtung (Pauschale)', unit: 'Psch', price: 180.0, accountId: 3000, type: 'service', productGroup: 'Regie & Pauschalen', productSubGroup: 'Baustelleneinrichtung', isTemplate: true },
  { code: 'MB-S-004', name: 'Entsorgung (Pauschale)', unit: 'Psch', price: 120.0, accountId: 3000, type: 'service', productGroup: 'Regie & Pauschalen', productSubGroup: 'Entsorgung', isTemplate: true },

  // Vorarbeiten
  { code: 'MB-S-010', name: 'Reinigen / Entfetten (Teilflächen)', unit: 'm2', price: 3.5, accountId: 3000, type: 'service', productGroup: 'Vorarbeiten', productSubGroup: 'Reinigung / Entfetten', isTemplate: true },
  { code: 'MB-S-011', name: 'Schleifen / Waschen (Untergrundvorbereitung)', unit: 'm2', price: 6.5, accountId: 3000, type: 'service', productGroup: 'Vorarbeiten', productSubGroup: 'Schleifen / Waschen', isTemplate: true },
  { code: 'MB-S-012', name: 'Absäuern & Neutralisieren (Boden)', unit: 'm2', price: 8.5, accountId: 3000, type: 'service', productGroup: 'Vorarbeiten', productSubGroup: 'Absäuern & Neutralisieren', isTemplate: true },
  { code: 'MB-S-013', name: 'Demontage / Montage (Kleinbauteile)', unit: 'Std', price: 95.0, accountId: 3000, type: 'service', productGroup: 'Vorarbeiten', productSubGroup: 'Demontage / Montage', isTemplate: true },

  // Abdecken
  { code: 'MB-S-020', name: 'Abdecken Böden (PE-Folie / Floorliner) inkl. Entfernen', unit: 'm2', price: 4.8, accountId: 3000, type: 'service', productGroup: 'Abdeck- & Schutzarbeiten', productSubGroup: 'Böden', isTemplate: true },
  { code: 'MB-S-021', name: 'Abdecken Sockel / Kanten (Klebeband)', unit: 'lfm', price: 1.2, accountId: 3000, type: 'service', productGroup: 'Abdeck- & Schutzarbeiten', productSubGroup: 'Sockel', isTemplate: true },
  { code: 'MB-S-022', name: 'Abdecken Bauteile / Möbel (Pauschale)', unit: 'Psch', price: 150.0, accountId: 3000, type: 'service', productGroup: 'Abdeck- & Schutzarbeiten', productSubGroup: 'Bauteile', isTemplate: true },
  { code: 'MB-S-023', name: 'Staubschutz (Staubwand / Schutzsystem) Pauschale', unit: 'Psch', price: 220.0, accountId: 3000, type: 'service', productGroup: 'Abdeck- & Schutzarbeiten', productSubGroup: 'Staubschutz', isTemplate: true },

  // Spachtel & Untergrund
  { code: 'MB-S-030', name: 'Dübellöcher füllen / Ausbessern (Standard)', unit: 'Psch', price: 90.0, accountId: 3000, type: 'service', productGroup: 'Untergrund & Spachtel', productSubGroup: 'Dübellöcher', isTemplate: true },
  { code: 'MB-S-031', name: 'Spachtel- & Reparaturarbeiten (Teilflächen)', unit: 'm2', price: 14.0, accountId: 3000, type: 'service', productGroup: 'Untergrund & Spachtel', productSubGroup: 'Ausbessern / Flick', isTemplate: true },
  { code: 'MB-S-032', name: 'Risse schliessen / Ausfugen (innen)', unit: 'lfm', price: 4.5, accountId: 3000, type: 'service', productGroup: 'Untergrund & Spachtel', productSubGroup: 'Fugen / Risse', isTemplate: true },
  { code: 'MB-S-033', name: 'Brandschutzspachtel (Öffnungen / Durchbrüche)', unit: 'Psch', price: 180.0, accountId: 3000, type: 'service', productGroup: 'Untergrund & Spachtel', productSubGroup: 'Brandschutzspachtel', isTemplate: true },
  { code: 'MB-S-034', name: 'Grundieren / Isolieren (Teilflächen)', unit: 'm2', price: 4.2, accountId: 3000, type: 'service', productGroup: 'Untergrund & Spachtel', productSubGroup: 'Grundieren / Isolieren', isTemplate: true },

  // Innenanstriche
  { code: 'MB-S-040', name: 'Wandanstrich Dispersion 2x', unit: 'm2', price: 14.5, accountId: 3000, type: 'service', productGroup: 'Innenanstriche', productSubGroup: 'Wände Dispersion', isTemplate: true },
  { code: 'MB-S-041', name: 'Deckenanstrich Dispersion 2x', unit: 'm2', price: 15.5, accountId: 3000, type: 'service', productGroup: 'Innenanstriche', productSubGroup: 'Decken Dispersion', isTemplate: true },
  { code: 'MB-S-042', name: 'Anstrich Latexfarbe 2x (Küche / Gang)', unit: 'm2', price: 18.5, accountId: 3000, type: 'service', productGroup: 'Innenanstriche', productSubGroup: 'Latexfarbe (strapazierfähig)', isTemplate: true },

  // Holz Lack / Öl / Lasur
  { code: 'MB-S-050', name: 'Holz lackieren: Vorlack + Fertiglack', unit: 'm2', price: 28.0, accountId: 3000, type: 'service', productGroup: 'Lackierarbeiten Holz', productSubGroup: 'Fertiglack', isTemplate: true },
  { code: 'MB-S-051', name: 'Holz ölen 2x', unit: 'm2', price: 22.0, accountId: 3000, type: 'service', productGroup: 'Lackierarbeiten Holz', productSubGroup: 'Ölen', isTemplate: true },
  { code: 'MB-S-052', name: 'Holz lasieren 2x', unit: 'm2', price: 24.0, accountId: 3000, type: 'service', productGroup: 'Lackierarbeiten Holz', productSubGroup: 'Lasieren', isTemplate: true },

  // Metall Lack / Rostschutz
  { code: 'MB-S-060', name: 'Metall: Rostschutzgrundierung (Teilflächen)', unit: 'm2', price: 9.5, accountId: 3000, type: 'service', productGroup: 'Lackierarbeiten Metall', productSubGroup: 'Rostschutz', isTemplate: true },
  { code: 'MB-S-061', name: 'Metall lackieren: Vorlack + Fertiglack', unit: 'm2', price: 32.0, accountId: 3000, type: 'service', productGroup: 'Lackierarbeiten Metall', productSubGroup: 'Fertiglack', isTemplate: true },

  // Bodenbeschichtung 2K
  { code: 'MB-S-070', name: '2K-Primer grundieren 1x', unit: 'm2', price: 9.0, accountId: 3000, type: 'service', productGroup: 'Bodenbeschichtungen 2K', productSubGroup: '2K-Primer', isTemplate: true },
  { code: 'MB-S-071', name: '2K-Bodenbeschichtung 2x (Farbton)', unit: 'm2', price: 38.0, accountId: 3000, type: 'service', productGroup: 'Bodenbeschichtungen 2K', productSubGroup: '2K-Bodenbeschichtung', isTemplate: true },
  { code: 'MB-S-072', name: 'Antirutsch-Beschichtung (2K) 1x', unit: 'm2', price: 12.5, accountId: 3000, type: 'service', productGroup: 'Bodenbeschichtungen 2K', productSubGroup: 'Antirutsch', isTemplate: true },
  { code: 'MB-S-073', name: '2K-Klarlack seidenglanz (farblos) 1x', unit: 'm2', price: 14.0, accountId: 3000, type: 'service', productGroup: 'Bodenbeschichtungen 2K', productSubGroup: '2K-Klarlack', isTemplate: true },
  { code: 'MB-S-074', name: 'Quarzsand-System (einblasen / einrollen) inkl. Versiegelung', unit: 'm2', price: 18.0, accountId: 3000, type: 'service', productGroup: 'Bodenbeschichtungen 2K', productSubGroup: 'Quarzsand-System', isTemplate: true },

  // Fassade & Aussen
  { code: 'MB-S-080', name: 'Fassade Hochdruckreinigung', unit: 'm2', price: 6.5, accountId: 3000, type: 'service', productGroup: 'Fassade & Aussenarbeiten', productSubGroup: 'Hochdruckreinigung', isTemplate: true },
  { code: 'MB-S-081', name: 'Fassade Reinigung inkl. Fungizid', unit: 'm2', price: 8.5, accountId: 3000, type: 'service', productGroup: 'Fassade & Aussenarbeiten', productSubGroup: 'Fungizid-Reinigung', isTemplate: true },
  { code: 'MB-S-082', name: 'Fassade Risse schliessen (ausfugen)', unit: 'lfm', price: 5.5, accountId: 3000, type: 'service', productGroup: 'Fassade & Aussenarbeiten', productSubGroup: 'Risse schliessen', isTemplate: true },
  { code: 'MB-S-083', name: 'Fassadenanstrich 2x', unit: 'm2', price: 19.5, accountId: 3000, type: 'service', productGroup: 'Fassade & Aussenarbeiten', productSubGroup: 'Fassadenanstrich', isTemplate: true },
  { code: 'MB-S-084', name: 'Dachhimmel / Holzfassade: Vorlack + Fertiglack', unit: 'm2', price: 29.0, accountId: 3000, type: 'service', productGroup: 'Fassade & Aussenarbeiten', productSubGroup: 'Dachhimmel / Holzfassade', isTemplate: true },

  // Gipser
  { code: 'MB-G-001', name: 'Weissputz / Feinspachtel Q3', unit: 'm2', price: 45.0, accountId: 3000, type: 'service', productGroup: 'Gipserarbeiten', productSubGroup: 'Trockenbau-nah (Spachteln / Fugen)', isTemplate: true },
  { code: 'MB-G-002', name: 'Abrieb ausbessern / neu (Teilflächen)', unit: 'm2', price: 38.0, accountId: 3000, type: 'service', productGroup: 'Gipserarbeiten', productSubGroup: 'Abrieb', isTemplate: true },
  { code: 'MB-G-003', name: 'Putz neu aufziehen / Reparatur (innen)', unit: 'm2', price: 52.0, accountId: 3000, type: 'service', productGroup: 'Gipserarbeiten', productSubGroup: 'Putz neu / Reparatur', isTemplate: true },

  // Fliesen
  { code: 'MB-F-001', name: 'Fliesen entfernen (Rückbau)', unit: 'm2', price: 28.0, accountId: 3000, type: 'service', productGroup: 'Fliesenarbeiten', productSubGroup: 'Rückbau', isTemplate: true },
  { code: 'MB-F-002', name: 'Fliesen kleben (Verlegen)', unit: 'm2', price: 95.0, accountId: 3000, type: 'service', productGroup: 'Fliesenarbeiten', productSubGroup: 'Verlegen', isTemplate: true },
  { code: 'MB-F-003', name: 'Fliesen ausfugen', unit: 'm2', price: 18.0, accountId: 3000, type: 'service', productGroup: 'Fliesenarbeiten', productSubGroup: 'Ausfugen', isTemplate: true },

  // Beispiel Materialpositionen
  { code: 'MB-M-001', name: 'Kleinmaterial pauschal (Bänder, Rollen, Folien, etc.)', unit: 'Psch', price: 65.0, accountId: 3000, type: 'material', productGroup: 'Regie & Pauschalen', productSubGroup: 'Baustelleneinrichtung', materialGroup: 'Kleinmaterial / Montage', isTemplate: true },
  { code: 'MB-M-010', name: 'Rissband / Armierungsband (Material)', unit: 'Rolle', price: 12.0, accountId: 3000, type: 'material', productGroup: 'Untergrund & Spachtel', productSubGroup: 'Fugen / Risse', materialGroup: 'Spachtel / Fugen / Bänder', isTemplate: true },
  { code: 'MB-M-020', name: '2K-Primer (Material)', unit: 'Set', price: 85.0, accountId: 3000, type: 'material', productGroup: 'Bodenbeschichtungen 2K', productSubGroup: '2K-Primer', materialGroup: '2K-Systeme & Additive', isTemplate: true },
  { code: 'MB-M-021', name: '2K-Bodenbeschichtung (Material, Farbton)', unit: 'Set', price: 165.0, accountId: 3000, type: 'material', productGroup: 'Bodenbeschichtungen 2K', productSubGroup: '2K-Bodenbeschichtung', materialGroup: '2K-Systeme & Additive', isTemplate: true },
  { code: 'MB-M-022', name: 'Quarzsand (Material)', unit: 'Sack', price: 28.0, accountId: 3000, type: 'material', productGroup: 'Bodenbeschichtungen 2K', productSubGroup: 'Quarzsand-System', materialGroup: '2K-Systeme & Additive', isTemplate: true }
];
