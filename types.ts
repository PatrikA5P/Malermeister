
export interface NavItem {
  label: string;
  href: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  stars: number;
}

export interface ProjectCategory {
  title: string;
  description: string;
  features: string[];
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
}

export interface Document {
  id: string;
  type: 'quote' | 'invoice';
  clientName: string;
  clientAddress: string;
  date: string;
  items: LineItem[];
  status: 'draft' | 'sent' | 'paid';
  relatedQuoteId?: string;
  isAiGenerated?: boolean;
}
