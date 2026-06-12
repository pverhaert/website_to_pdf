import React, { useEffect, useState } from 'react';
import CrawlerForm from './components/CrawlerForm';
import CrawlStatus from './components/CrawlStatus';
import { CrawlSettings, CrawlStatus as StatusType } from './types';
import {
  FileText,
  Terminal,
  Server,
  Download,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  BookOpen,
  Globe,
  Sparkles,
  Github,
  MonitorCheck
} from 'lucide-react';

export default function App() {
  const [crawlId, setCrawlId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusType | null>(null);
  const [serverMode, setServerMode] = useState<{ mode: string; message: string; success: boolean } | null>(null);
  const [isLoadingModeCheck, setIsLoadingModeCheck] = useState(true);

  // Check the backend capabilities on page load
  useEffect(() => {
    async function checkServerCapabilities() {
      try {
        const res = await fetch('/api/test-puppeteer');
        if (res.ok) {
          const data = await res.json();
          setServerMode({
            mode: data.mode,
            message: data.message || data.detailed,
            success: data.success
          });
        } else {
          setServerMode({
            mode: 'unknown',
            message: 'Server did not respond with capabilities metadata but is active.',
            success: false
          });
        }
      } catch (err) {
        setServerMode({
          mode: 'error',
          message: 'Express backend endpoint offline or compiling initial files...',
          success: false
        });
      } finally {
        setIsLoadingModeCheck(false);
      }
    }
    checkServerCapabilities();
  }, []);

  // Poll current crawl session
  useEffect(() => {
    if (!crawlId) return;

    let timer: NodeJS.Timeout;

    async function pollCrawlStatus() {
      try {
        const res = await fetch(`/api/crawl/${crawlId}`);
        if (res.ok) {
          const currentStatus: StatusType = await res.json();
          setStatus(currentStatus);

          // Stop polling if complete or failed
          if (currentStatus.completed) {
            setCrawlId(null);
          }
        } else {
          console.warn('Crawl status response failed index check.');
        }
      } catch (pollErr) {
        console.error('Poller error occurred:', pollErr);
      }
    }

    // Trigger immediate check then hook interval rate
    pollCrawlStatus();
    timer = setInterval(pollCrawlStatus, 1200);

    return () => {
      clearInterval(timer);
    };
  }, [crawlId]);

  const handleCrawlSubmit = async (settings: CrawlSettings) => {
    setStatus(null);
    setCrawlId(null);

    try {
      // Initialize basic temporary status before getting ID
      setStatus({
        active: true,
        currentUrl: settings.url,
        progress: 5,
        pages: [],
        logs: [
          {
            id: 'init-local',
            timestamp: new Date().toLocaleTimeString(),
            message: `Opening request pipeline to ${settings.url}...`,
            type: 'info',
          },
        ],
        completed: false,
      });

      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setCrawlId(data.crawlId);
      } else {
        const errData = await res.json();
        setStatus((prev) => prev ? {
          ...prev,
          active: false,
          completed: true,
          error: errData.error || 'Server rejected current crawl request parameters.',
        } : null);
      }
    } catch (startErr: any) {
      setStatus((prev) => prev ? {
        ...prev,
        active: false,
        completed: true,
        error: startErr.message || 'Network transport failed starting crawler thread.',
      } : null);
    }
  };

  const handleQueueReset = () => {
    setCrawlId(null);
    setStatus(null);
  };

  const isCrawlRunning = status?.active === true;

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#001e33] flex flex-col font-sans selection:bg-[#e2001a]/10 selection:text-[#e2001a]">

      {/* Thomas More corporate accent brand layout line */}
      <div className="h-1.5 bg-[#e2001a] w-full shrink-0" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 flex-1 w-full flex flex-col space-y-6 animate-fadeIn">

        {/* Navigation / Hero Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200" id="header-nav">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {/* Overlapping Speech Bubbles / Triangles custom brand representation of Thomas More */}
              <div className="relative w-12 h-10 flex items-center shrink-0">
                {/* Red bubble */}
                <div className="absolute top-0 left-0 w-6 h-6 rounded-full bg-[#e2001a] opacity-90 shadow-sm flex items-center justify-center text-[10px] text-white font-extrabold" title="Thomas More brand element">P</div>
                {/* Teal bubble */}
                <div className="absolute bottom-0 left-3.5 w-6 h-6 rounded-full bg-[#00b1cb] opacity-90 shadow-sm flex items-center justify-center text-[10px] text-white font-extrabold">F</div>
                {/* Yellow bubble */}
                <div className="absolute top-1.5 left-6 w-6 h-6 rounded-full bg-[#ffd100] opacity-95 shadow-xs flex items-center justify-center text-[10px] text-white font-extrabold">D</div>
              </div>
              <div className="h-8 w-[1.5px] bg-slate-200" />
              <div>
                <h1 className="text-xl md:text-2xl font-black text-[#001e33] tracking-tight leading-none flex items-center gap-2">
                  <span>Website to PDF</span>
                  <span className="text-[#e2001a] font-normal uppercase text-xs tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">Export</span>
                </h1>
                <p className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase mt-0.5">SPA & Website to Single High-Fidelity PDF Vector Engine</p>
              </div>
            </div>
            <p className="text-xs text-slate-550 max-w-xl leading-relaxed">
              Welcome to the customized academic document tool. This utility allows you to map entire client-side single-page networks or standard multi-page websites within host boundaries and combine high-quality layout views into a single unified workspace document.
            </p>
          </div>

          {/* Connection Status Indicator */}
          <div className="shrink-0 font-mono text-xs w-full md:w-auto" id="server-status-pill">
            {isLoadingModeCheck ? (
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-500 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span>Scanning engine capabilities...</span>
              </div>
            ) : serverMode?.success ? (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl text-emerald-700 shadow-sm">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] block">Chrome Engine Active</span>
                  <span className="text-[10px] text-slate-500 block font-sans">Native headless vector print available</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-xl text-amber-700 shadow-sm">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] block">VM Sandbox Mode Active</span>
                  <span className="text-[10px] text-slate-500 block font-sans">Interactive template cover + emulations live</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Sandbox Instruction Callout Overlay */}
        {!isLoadingModeCheck && !serverMode?.success && (
          <div className="bg-amber-500/5 border border-amber-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-fadeIn">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-amber-600" />
                Interactive Emulator Simulation Active (VM Sandbox Mode)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                Because this test workspace compiles in a sandboxed Cloud Run browser frame, standard Linux operating system security configurations prevent launch loops for Chromium. To bypass constraints, we built a <b>High-Fidelity Document Emulator</b>. The emulator lets you trace live deep links and download combined cover index PDF sheets!
              </p>
              <p className="text-xs font-semibold text-slate-700">
                Tip: Copying this project to your machine (ZIP or GitHub) launches native background Chromium crawls automatically!
              </p>
            </div>
          </div>
        )}

        {/* Control Desk Main Board Grid Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Settings Parameters Panel */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            <CrawlerForm onSubmit={handleCrawlSubmit} isLoading={isCrawlRunning} />
          </div>

          {/* Solution, Charts, and Execution Logs Feed */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            {status ? (
              <CrawlStatus status={status} onReset={handleQueueReset} />
            ) : (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px] text-slate-500">
                <div className="bg-indigo-50 text-indigo-600 p-4 rounded-full border border-indigo-100 mb-4 animate-pulse">
                  <MonitorCheck className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Crawler Queue Standby</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed">
                  Enter an absolute starting URL in the parameters panel, adjust link search nest levels, and trigger execution of deep crawling processes.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => handleCrawlSubmit({
                      url: 'https://news.ycombinator.com',
                      maxDepth: 1,
                      maxPages: 3,
                      orientation: 'portrait',
                      format: 'A4',
                      removeSelectors: 'header, footer, nav, .cookie-banner',
                      waitTime: 1000,
                      sameDomainOnly: true,
                      includeHashRoutes: false,
                      scale: 80,
                      margin: { top: 10, bottom: 10, left: 10, right: 10 }
                    })}
                    className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium shadow-2xs"
                  >
                    Quickstart: Hacker News (3 pgs)
                  </button>
                  <button
                    onClick={() => handleCrawlSubmit({
                      url: 'https://react.dev',
                      maxDepth: 1,
                      maxPages: 4,
                      orientation: 'portrait',
                      format: 'A4',
                      removeSelectors: 'header, nav, footer, .cookie-consent',
                      waitTime: 2000,
                      sameDomainOnly: true,
                      includeHashRoutes: false,
                      scale: 80,
                      margin: { top: 10, bottom: 10, left: 10, right: 10 }
                    })}
                    className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium shadow-2xs"
                  >
                    Quickstart: React.dev (4 pgs)
                  </button>
                  <button
                    onClick={() => handleCrawlSubmit({
                      url: 'https://laravel.com/docs/13.x',
                      maxDepth: 1,
                      maxPages: 10,
                      orientation: 'portrait',
                      format: 'A4',
                      removeSelectors: 'header, nav, aside, footer, .cookie-consent, div[class*="border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"]',
                      waitTime: 2000,
                      sameDomainOnly: true,
                      includeHashRoutes: false,
                      scale: 70,
                      margin: { top: 10, bottom: 10, left: 10, right: 10 }
                    })}
                    className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium shadow-2xs"
                  >
                    Quickstart: Laravel 13 docs (10 pgs)
                  </button>
                </div>
              </div>
            )}


          </div>

        </main>

      </div>

      {/* Footer Branding line */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400 shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p>
            Site2PDF Pro • High Performance Website & Single Page Application PDF Crawler
          </p>
          <div className="flex gap-4">
            <span>Local Instance: 127.0.0.1:4444 ✔</span>
            <span>Tech Stack: Express • React • Tailwind • Puppeteer</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
