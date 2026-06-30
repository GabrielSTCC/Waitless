export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  list?: string[];
}

export interface LegalDocument {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}
