import React, { useEffect, useRef, useState } from 'react';
import { CrawlStatus as StatusType, CrawlLog, PageInfo } from '../types';
import {
  Download,
  Terminal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCheck,
  Globe,
  Trash2,
  ExternalLink,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface CrawlStatusProps {
  status: StatusType | null;
  onReset: () => void;
}

export default function CrawlStatus({ status, onReset }: CrawlStatusProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs console to bottom
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [status?.logs, autoScroll]);

  if (!status) return null;

  const successPages = status.pages.filter((p) => p.status === 'success');
  const crawlingPages = status.pages.filter((p) => p.status === 'crawling');
  const failedPages = status.pages.filter((p) => p.status === 'failed');
  const pendingPages = status.pages.filter((p) => p.status === 'pending');

  const startUrl = status.pages[0]?.url || status.currentUrl || '';

  const getDownloadFileName = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      let filename = url.hostname.replace(/^www\./i, '');
      filename = filename.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      if (url.pathname && url.pathname !== '/') {
        let cleanPath = url.pathname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (cleanPath) {
          filename = `${filename}-${cleanPath}`;
        }
      }
      return `${filename || 'document'}.pdf`;
    } catch {
      return 'compiled-document.pdf';
    }
  };

  const fileName = getDownloadFileName(startUrl);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-600 flex flex-col space-y-5 p-6 animate-fadeIn">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {status.active ? (
              <Loader2 className="text-indigo-600 w-5 h-5 animate-spin" />
            ) : status.completed && !status.error ? (
              <FileCheck className="text-emerald-600 w-5 h-5" />
            ) : (
              <AlertTriangle className="text-rose-500 w-5 h-5" />
            )}
            Process Synchronization Monitor
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono break-all max-w-lg">
            Target URL: <span className="text-indigo-600 font-bold">{status.currentUrl}</span>
          </p>
        </div>

        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition-all shrink-0 self-end md:self-auto flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-450" />
          Purge Queue
        </button>
      </div>

      {/* Active Generating Loading Card */}
      {status.active && (
        <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-5 md:p-6 text-slate-800 shadow-sm animate-pulse flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="bg-indigo-600 text-white p-3 rounded-xl animate-spin shrink-0">
              <Loader2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                Generating PDF Document...
              </span>
              <h3 className="text-base font-bold text-slate-800 pt-1">Active Scraping & PDF Rendering</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-lg mt-0.5">
                Headless Chromium is visiting the routes, executing script bundles, and organizing vectorized layout structures into the final compiled compilation.
              </p>
            </div>
          </div>
          <div className="w-full md:w-auto text-center md:text-right shrink-0 px-2">
            <span className="text-xs font-mono font-bold text-indigo-600 block">{status.progress}% Compiled</span>
            <div className="w-full md:w-32 bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden mx-auto md:ml-auto">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Completion & Download Trigger Card */}
      {status.completed && !status.error && status.pdfUrl && (
        <div className="bg-emerald-500/5 border border-emerald-200 rounded-2xl p-5 md:p-6 text-slate-800 shadow-sm animate-bounce-once">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                Compilation Succeeded
              </span>
              <h3 className="text-base font-bold text-slate-850 pt-1">Merged Document Assembled Successfully!</h3>
              <p className="text-xs text-slate-500">
                All recursively found pages have been rendered and combined into a single beautiful document.
              </p>

              {/* Document Specs */}
              <div className="grid grid-cols-2 gap-3 pt-3 text-[11px] max-w-xs font-mono text-slate-500">
                <div className="bg-white p-2 rounded border border-slate-200 shadow-3xs">
                  <span className="block text-[8px] text-slate-400 font-bold uppercase">TOTAL PAGES</span>
                  <span className="text-slate-800 font-bold text-sm">{status.totalPages || successPages.length + 1} pages</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 shadow-3xs">
                  <span className="block text-[8px] text-slate-400 font-bold uppercase">FILE SIZE</span>
                  <span className="text-slate-800 font-bold text-sm">{status.pdfSize || 'Approx 1.8 MB'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
              <a
                href={status.pdfUrl}
                download={fileName}
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5 active:translate-y-0 text-center font-bold px-6 py-4 rounded-xl text-xs tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-emerald-250 cursor-pointer font-sans"
              >
                <Download className="w-5 h-5 text-white" />
                Download Combined Document
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Error Card */}
      {status.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">Compilation Process Halted</h4>
            <p className="text-xs mt-1 leading-relaxed text-rose-700">{status.error}</p>
          </div>
        </div>
      )}

      {/* Real-time progress layout indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Progress Bar Widget */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between space-y-3 shadow-3xs">
          <span className="block text-[9px] uppercase tracking-wider text-slate-450 font-extrabold font-mono">Job Progress Ratio</span>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-indigo-600">{status.progress}%</span>
              <span className="text-[10px] text-slate-400 select-none">complete</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Queued Stats Widget */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 grid grid-cols-2 gap-2 text-center md:text-left shadow-3xs">
          <div className="border-r border-slate-200 pr-2">
            <span className="block text-[9px] uppercase tracking-wider text-emerald-600 font-bold font-mono">Completed</span>
            <span className="text-xl font-bold font-mono text-slate-800 mt-1 block">{successPages.length}</span>
            <span className="text-[9px] text-slate-400 block">dumps ready</span>
          </div>
          <div className="pl-2">
            <span className="block text-[9px] uppercase tracking-wider text-amber-600 font-bold font-mono">Crawling</span>
            <span className="text-xl font-bold font-mono text-slate-800 mt-1 block animate-pulse">{crawlingPages.length}</span>
            <span className="text-[9px] text-slate-400 block">active link</span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 grid grid-cols-2 gap-2 text-center md:text-left shadow-3xs">
          <div className="border-r border-slate-200 pr-2">
            <span className="block text-[9px] uppercase tracking-wider text-indigo-600 font-bold font-mono">Pending</span>
            <span className="text-xl font-bold font-mono text-slate-800 mt-1 block">{pendingPages.length}</span>
            <span className="text-[9px] text-slate-400 block">in queue</span>
          </div>
          <div className="pl-2">
            <span className="block text-[9px] uppercase tracking-wider text-rose-500 font-bold font-mono">Failed</span>
            <span className="text-xl font-bold font-mono text-slate-800 mt-1 block">{failedPages.length}</span>
            <span className="text-[9px] text-slate-400 block">timeouts</span>
          </div>
        </div>

        {/* Status indicator widget */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between space-y-1 shadow-3xs">
          <span className="block text-[9px] uppercase tracking-wider text-slate-450 font-extrabold font-mono">Overall Status</span>
          <div className="flex items-center gap-2 pt-1">
            <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-amber-400 animate-ping' : status.completed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-bold uppercase font-mono tracking-wide text-slate-700">
              {status.active ? 'Traversing' : status.completed && !status.error ? 'Completed' : 'Process Idle'}
            </span>
          </div>
          <span className="text-[9px] text-slate-450 leading-tight">
            {status.active ? 'Headless Chromium rendering views...' : 'Task thread idle.'}
          </span>
        </div>
      </div>

      {/* Crawled route details tracker */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          Route Ingestion Registry ({status.pages.length} items grouped)
        </h4>

        <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 font-mono text-xs">
          {status.pages.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-450 italic">
              No discovered pages populated in standard crawl scopes yet.
            </div>
          ) : (
            status.pages.map((p, idx) => (
              <div key={idx} className="hover:bg-amber-500/5 px-3 py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-slate-400 w-5 shrink-0 text-right">#{idx + 1}</span>

                  {p.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {p.status === 'crawling' && <Loader2 className="w-4 h-4 text-indigo-500 shrink-0 animate-spin" />}
                  {p.status === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
                  {p.status === 'pending' && <p className="w-2.5 h-2.5 border border-slate-300 rounded-full shrink-0 m-1" />}

                  <div className="min-w-0">
                    <span className="text-slate-800 block truncate text-xs font-semibold">{p.title || p.url}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{p.url}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 select-none text-[10px]">
                  {p.depth > 0 && (
                    <span className="text-slate-500 border border-slate-200 bg-white px-1.5 py-0.2 rounded font-sans text-[9px]">
                      Depth {p.depth}
                    </span>
                  )}
                  {p.status === 'success' && p.pdfBytesSize && (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-1 py-0.2 rounded">
                      {(p.pdfBytesSize / 1024).toFixed(0)} KB PDF
                    </span>
                  )}
                  {p.status === 'failed' && p.errorMessage && (
                    <span className="text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded" title={p.errorMessage}>
                      error
                    </span>
                  )}
                  {p.status === 'pending' && <span className="text-slate-400">waiting</span>}
                  {p.status === 'crawling' && <span className="text-indigo-600 animate-pulse font-bold">rendering</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Real-time interactive terminal logs drawer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            Background Thread Compiler Logs
          </h4>
          <label className="flex items-center gap-1.5 text-[10px] text-slate-400 select-none cursor-pointer font-semibold">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-indigo-600 rounded bg-white border-slate-300"
            />
            Auto scroll console
          </label>
        </div>

        <div
          ref={logTerminalRef}
          className="bg-slate-900 text-slate-305 text-xs rounded-xl p-4 font-mono border border-slate-850 max-h-56 overflow-y-auto space-y-1.5 select-text tracking-wide scrollbar-thin shadow-inner"
        >
          {status.logs.length === 0 ? (
            <p className="text-slate-550 italic">No log notifications printed by node.js crawl thread.</p>
          ) : (
            status.logs.map((log) => {
              let textClass = 'text-slate-300';
              let badge = '';
              if (log.type === 'success') {
                textClass = 'text-emerald-400 font-medium';
                badge = '✔ ';
              } else if (log.type === 'warning') {
                textClass = 'text-amber-400';
                badge = '⚠ ';
              } else if (log.type === 'error') {
                textClass = 'text-rose-400 font-bold';
                badge = '✘ ';
              }
              return (
                <div key={log.id} className="flex items-start gap-2 hover:bg-slate-800/50 py-0.5 rounded px-1 transition-all">
                  <span className="text-slate-500 select-none text-[10px] font-mono mt-0.5">[{log.timestamp}]</span>
                  <p className={`${textClass} leading-relaxed`}>
                    <span className="select-none text-[11px]">{badge}</span>
                    {log.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
