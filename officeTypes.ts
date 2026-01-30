
export type DocType = 'quote' | 'invoice' | 'purchase_order' | 'supplier_invoice' | 'supplier_credit';
export type DocStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'overdue' | 'paid' | 'cancelled';

export interface OfficeAddress {
  name: string;
  street: string;
  houseNr?: string;
  addition?: string;
  zip: string;
  city: string;
  country?: string;
  email?: string;
  email2?: string;
  phone?: string;
  phone2?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  skype?: string;
}

export interface AuthUser {
    id: string;
    email: string;
    companyId: string; // The Tenant ID
    role: 'owner' | 'admin' | 'worker';
    name: string;
}

export interface Customer {
  id?: number;
  type: 'private' | 'business';
  contactNr?: string;
  
  // Stammdaten Person
  salutation?: string;
  formOfAddress?: 'Du' | 'Sie';
  title?: string;
  firstName: string;
  lastName: string;
  birthday?: string;

  // Stammdaten Firma
  companyName?: string;
  
  // Data
  address: OfficeAddress;
  
  // Zusatzinfos
  category?: string;
  industry?: string;
  contactPerson?: string;
  correspondenceType?: 'email' | 'post';
  language?: string;
  notes?: string;
  
  // Weitere Kontaktinfos
  employeeCount?: number;
  hrNumber?: string;
  vatNumber?: string;
  taxId?: string;

  defaultDiscount?: number;
}

export interface Project {
  id?: number;
  customerId: number;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  startDate: string;
  budget?: number;
  notes?: string;
}

export interface ProductTier {
  minQty: number;
  maxQty?: number;
  discountPercent?: number;
  price: number;
}

export interface Product {
  id?: number;
  code: string;
  name: string;
  type: 'material' | 'service';
  unit: string;
  description?: string;
  contactPerson?: string;
  group?: string;

  // Pricing
  purchasePrice?: number;
  surchargePercent?: number; // Zuschlag in %
  price: number; // Verkaufspreis (Base)
  currency?: string;
  
  // Accounting
  accountId: number; // Legacy or default revenue account
  revenueAccountId?: number;
  expenseAccountId?: number;
  vatSalesCode?: string; // e.g. "N"
  vatPurchaseCode?: string; // e.g. "N"

  // Supplier
  supplierId?: number;
  supplierProductName?: string;
  supplierProductCode?: string;
  supplierProductDescription?: string;
  notes?: string;

  // Tiers
  pricingTiers?: ProductTier[];

  // Additional fields
  productGroup?: string;
  productSubGroup?: string;
  materialGroup?: string;
  isTemplate?: boolean;
}

export interface AccountGroup {
  id?: number;
  number: string;
  name: string;
  parentGroupId?: number;
  isActive?: boolean;
}

export interface Account {
  id?: number;
  number: string;
  name: string;
  type: 'asset' | 'liability' | 'revenue' | 'expense'; // Mapped to Aktiv/Passiv/Ertrag/Aufwand
  class?: number; 
  groupId?: number;
  balance?: number;
  isVatBookable?: boolean;
  defaultVatRate?: number;
  isActive?: boolean;
}

export interface OfficeLineItem {
  id: string;
  productId?: number;
  productCode?: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  discount?: number;
  accountId?: number;
  type?: 'material' | 'service'; 
  isOptional?: boolean;
  vatRate?: number;
}

export interface AuditEvent {
  ts: string;
  type: string;
  user?: string;
  meta?: Record<string, any>;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface OfficeDocument {
  id?: number;
  docNumber: string;
  type: DocType;
  status: DocStatus;
  date: string;
  
  validUntil?: string;
  executionStart?: string;
  executionEnd?: string;
  title?: string;
  description?: string;
  
  acceptedAt?: string;
  customerId?: number;
  projectId?: number;
  client: OfficeAddress;
  items: OfficeLineItem[];
  notes?: string;
  footer?: string;
  
  totalNet: number;
  totalTax: number;
  totalGross: number;
  paidAt?: string;
  dunningLevel?: number;
  qrReference?: string;
  currency?: string;
  
  relatedQuoteId?: number;
  auditTrail?: AuditEvent[];
  attachments?: DocumentAttachment[];
}

export interface Expense {
  id?: number;
  date: string;
  category: string;
  accountId?: number;
  projectId?: number;
  supplier: string;
  description: string;
  amountGross: number;
  taxRate: number;
  amountNet: number;
  receiptImage?: string;
}

export interface BankTransaction {
  id?: number;
  bookingDate: string;
  amount: number;
  currency: string;
  counterparty: string;
  reference: string;
  details: string;
  matchedDocId?: number;
  status: 'open' | 'matched' | 'ignored';
}

export interface VatRate {
  code: string;
  rate: number;
  description: string;
}

export interface DunningRule {
  level: number;
  daysAfterDue: number;
  fee: number;
  text: string;
}

export interface DocLayout {
  introText?: string;
  outroText?: string;
  termsSnippet?: string;
  emailSubject?: string;
  emailBody?: string;
  showLogo: boolean;
}

export interface TeamUser {
  id: string;
  name: string;
  role: 'admin' | 'accountant' | 'worker';
  permissions: string[];
}

export interface OfficeSettings {
  id?: number;
  companyName: string;
  address: OfficeAddress;
  logo?: string;
  uidMwst?: string;
  bankName: string;
  iban: string;
  qrIban?: string;
  paymentTermsDays: number;
  dunningRules: DunningRule[];
  vatMethod: 'effective' | 'saldo';
  vatPeriod: 'quarter' | 'semester';
  vatRates: VatRate[];
  layouts: {
    quote: DocLayout;
    invoice: DocLayout;
    dunning: DocLayout;
  };
  users: TeamUser[];
  currentUser?: TeamUser;
  // Backup Settings
  backup?: {
      lastSuccess?: string; // ISO Date
      provider?: 'google' | 'onedrive' | 'local';
      autoInterval?: 'daily' | 'manual';
  };
}

// --- BACKUP & QUEUE TYPES ---

export type BackupJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type BackupJobType = 'auto_restore' | 'manual_export';

export interface BackupJob {
    id?: number;
    type: BackupJobType;
    status: BackupJobStatus;
    createdAt: string;
    attempts: number;
    lastError?: string;
}

export interface BackupLog {
    id?: number;
    jobId: number;
    timestamp: string;
    status: 'success' | 'error';
    details: string;
    sizeBytes?: number;
}
