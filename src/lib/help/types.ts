export interface HelpFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  description?: string;
  items: HelpFaqItem[];
}

export interface HelpContactSection {
  title: string;
  paragraphs: string[];
  emailLabel: string;
  lgpdLinkLabel: string;
}

export interface HelpDocument {
  title: string;
  description: string;
  categories: HelpCategory[];
  contact: HelpContactSection;
}
