import { Customer } from '../../officeTypes';

export const STANDARD_CUSTOMERS: Partial<Customer>[] = [
  {
    type: 'business',
    companyName: 'Baugenossenschaft Grünpark AG',
    contactNr: 'C-1001',
    address: {
      name: 'Baugenossenschaft Grünpark AG',
      street: 'Sihlquai 90',
      zip: '8005',
      city: 'Zürich',
      email: 'info@gruenpark.ch',
      phone: '+41 44 555 11 22',
      website: 'www.gruenpark.ch'
    },
    correspondenceType: 'email',
    language: 'de',
    notes: 'Rahmenvertrag Malerarbeiten Innen.'
  },
  {
    type: 'business',
    companyName: 'Hotel Alpenblick GmbH',
    contactNr: 'C-1002',
    address: {
      name: 'Hotel Alpenblick GmbH',
      street: 'Dorfstrasse 12',
      zip: '3920',
      city: 'Zermatt',
      email: 'technik@alpenblick.ch',
      phone: '+41 27 555 44 00',
      website: 'www.alpenblick.ch'
    },
    contactPerson: 'Marcel Lüthi',
    correspondenceType: 'email',
    language: 'de',
    notes: 'Saisonale Fassadenpflege.'
  },
  {
    type: 'private',
    firstName: 'Laura',
    lastName: 'Meier',
    contactNr: 'P-3001',
    address: {
      name: 'Laura Meier',
      street: 'Birkenweg 7',
      zip: '5000',
      city: 'Aarau',
      email: 'laura.meier@example.ch',
      phone: '+41 79 123 45 67'
    },
    correspondenceType: 'email',
    language: 'de',
    notes: 'Wohnungsrenovation Wohnzimmer.'
  }
];
