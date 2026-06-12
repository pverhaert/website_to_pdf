export interface CrawlSettings {
  url: string;
  maxDepth: number;
  maxPages: number;
  orientation: 'portrait' | 'landscape';
  format: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  removeSelectors: string; // e.g., "header, footer, nav, .cookie-banner"
  waitTime: number; // in milliseconds, to wait for SPAs to render
  sameDomainOnly: boolean;
  includeHashRoutes: boolean;
  scale: number; // zoom percentage
  margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface CrawlLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface PageInfo {
  url: string;
  depth: number;
  title?: string;
  status: 'pending' | 'crawling' | 'success' | 'failed';
  pdfBytesSize?: number;
  errorMessage?: string;
}

export interface CrawlStatus {
  active: boolean;
  currentUrl: string;
  progress: number; // 0 to 100
  pages: PageInfo[];
  logs: CrawlLog[];
  completed: boolean;
  error?: string;
  pdfUrl?: string;
  pdfSize?: string;
  totalPages?: number;
}
