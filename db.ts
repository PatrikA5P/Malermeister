
import Dexie, { Table } from 'dexie';
import { OfficeDocument, Expense, BankTransaction, OfficeSettings, Customer, Project, Product, Account, AccountGroup, BackupJob, BackupLog } from './officeTypes';
import { STANDARD_PRODUCTS } from './modules/products/db';
import { STANDARD_CUSTOMERS } from './modules/crm/db-crm';
import { KMU_ACCOUNTS_TSV } from './modules/accounting/db-accounting';

export class OfficeDB extends Dexie {
  documents!: Table<OfficeDocument>;
  expenses!: Table<Expense>;
  transactions!: Table<BankTransaction>;
  settings!: Table<OfficeSettings>;
  customers!: Table<Customer>;
  projects!: Table<Project>;
  products!: Table<Product>;
  accounts!: Table<Account>;
  accountGroups!: Table<AccountGroup>;
  
  // Backup Queue System
  backupJobs!: Table<BackupJob>;
  backupLogs!: Table<BackupLog>;

  constructor() {
    super('MalerBorerOfficeDB_V6'); 
    (this as any).version(1).stores({
      documents: '++id, docNumber, type, status, date, customerId, projectId, [type+status]',
      expenses: '++id, date, category, projectId, accountId',
      transactions: '++id, externalId, bookingDate, status, qrReference',
      settings: '++id',
      customers: '++id, lastName, companyName',
      projects: '++id, customerId, status',
      products: '++id, code',
      accounts: '++id, number, type, groupId, class',
      accountGroups: '++id, number, parentGroupId',
      // Backup Tables
      backupJobs: '++id, status, type, createdAt',
      backupLogs: '++id, jobId, timestamp'
    });
  }
}

export const db = new OfficeDB();

export const initSettings = async () => {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      companyName: 'Maler Borer',
      address: { name: 'Maler Borer', street: 'Musterstrasse 1', zip: '8000', city: 'Zürich', country: 'CH', email: 'info@maler-borer.ch', website: 'www.maler-borer.ch' },
      uidMwst: '',
      bankName: '',
      iban: '',
      qrIban: '',
      paymentTermsDays: 30,
      dunningRules: [
        { level: 1, daysAfterDue: 10, fee: 0, text: 'Zahlungserinnerung: Wir haben noch keinen Zahlungseingang festgestellt.' },
        { level: 2, daysAfterDue: 20, fee: 20, text: '1. Mahnung: Bitte begleichen Sie den offenen Betrag umgehend.' },
        { level: 3, daysAfterDue: 30, fee: 50, text: '2. Mahnung: Letzte Aufforderung vor Betreibung.' }
      ],
      vatMethod: 'effective',
      vatPeriod: 'quarter',
      vatRates: [
        { code: 'N', rate: 8.1, description: 'Normalsatz' },
        { code: 'R', rate: 2.6, description: 'Reduzierter Satz' },
        { code: 'S', rate: 3.8, description: 'Sondersatz' },
        { code: '0', rate: 0.0, description: 'Keine MWST' }
      ],
      layouts: {
        quote: {
            showLogo: true,
            introText: 'Gerne unterbreiten wir Ihnen folgende Offerte:',
            outroText: 'Wir freuen uns auf Ihren Auftrag.',
            termsSnippet: 'Es gelten die allgemeinen Geschäftsbedingungen (AGB) von Maler Borer.',
            emailSubject: 'Ihre Offerte {nr} von Maler Borer',
            emailBody: 'Guten Tag {kunde},\n\nAnbei erhalten Sie wie besprochen unsere Offerte.\n\nFreundliche Grüsse\nToni Borer'
        },
        invoice: {
            showLogo: true,
            introText: 'Für unsere Leistungen erlauben wir uns folgende Rechnung:',
            outroText: 'Besten Dank für Ihr Vertrauen.',
            termsSnippet: 'Zahlbar innert 30 Tagen netto.',
            emailSubject: 'Rechnung {nr} - Maler Borer',
            emailBody: 'Guten Tag {kunde},\n\nBesten Dank für den Auftrag. Anbei erhalten Sie die Rechnung.\n\nFreundliche Grüsse\nToni Borer'
        },
        dunning: { showLogo: true }
      },
      users: [
        { id: '1', name: 'Toni Borer', role: 'admin', permissions: ['read_all', 'write_all', 'export'] }
      ],
      // Währungseinstellungen - Schweiz als Standard
      defaultCurrency: 'CHF',
      supportedCurrencies: ['CHF', 'EUR', 'USD'],
      // Spracheinstellungen
      language: 'de',
      supportedLanguages: ['de', 'en', 'fr', 'it'],
      backup: {
          lastSuccess: undefined,
          provider: 'local',
          autoInterval: 'daily',
          encryptBackups: true
      }
    });
  }

  // --- Initialize Accounts from CSV ---
  const accountsCount = await db.accounts.count();
  const hasCashAccount = (await db.accounts.where('number').equals('1000').count()) > 0;
  
  if (accountsCount < 50 || !hasCashAccount) {
     if (accountsCount > 0) {
         await db.accounts.clear();
         await db.accountGroups.clear();
     }

     const lines = KMU_ACCOUNTS_TSV.split('\n').filter(l => l.trim());
     const dataRows = lines.slice(1); // Skip header

     const groupMap = new Map<string, number>();
     const pendingParentUpdates: {id: number, parentNum: string}[] = [];

     const groupsToInsert: any[] = [];
     const accountsToInsert: any[] = [];

     for(const line of dataRows) {
        const cols = line.split('\t').map(s => s.trim());
        if (cols.length < 5) continue;

        const nr = cols[0];
        const name = cols[1];
        const parentNr = cols[2];
        const typeRaw = cols[4];
        const vatBookable = cols[7] === 'JA';
        
        if (typeRaw === 'Gruppe') {
            groupsToInsert.push({ nr, name, parentNr });
        } else {
            accountsToInsert.push({ nr, name, parentNr, typeRaw, vatBookable });
        }
     }

     for (const g of groupsToInsert) {
         const id = await db.accountGroups.add({ number: g.nr, name: g.name, isActive: true });
         groupMap.set(g.nr, id as number);
         if(g.parentNr) pendingParentUpdates.push({ id: id as number, parentNum: g.parentNr });
     }

     for(const update of pendingParentUpdates) {
         const parentId = groupMap.get(update.parentNum);
         if(parentId) await db.accountGroups.update(update.id, { parentGroupId: parentId });
     }

     const mappedAccounts = accountsToInsert.map(a => {
         let type: any = 'asset';
         switch(a.typeRaw) {
             case 'Aktiv': type = 'asset'; break;
             case 'Passiv': type = 'liability'; break;
             case 'Ertrag': type = 'revenue'; break;
             case 'Aufwand': type = 'expense'; break;
             case 'Komplett': type = 'liability'; break;
             default: type = 'asset';
         }
         const groupId = groupMap.get(a.parentNr);
         const accClass = parseInt(a.nr.charAt(0));
         return { number: a.nr, name: a.name, type, groupId, class: accClass, isVatBookable: a.vatBookable, isActive: true };
     });

     await db.accounts.bulkAdd(mappedAccounts);
  }

  // --- Seed Comprehensive Products ---
  const productsCount = await db.products.count();
  if (productsCount === 0) {
    await db.products.bulkAdd(STANDARD_PRODUCTS as Product[]);
  }

  // --- Seed CRM Customers ---
  const customersCount = await db.customers.count();
  if (customersCount === 0) {
    await db.customers.bulkAdd(STANDARD_CUSTOMERS as Customer[]);
  }
};
