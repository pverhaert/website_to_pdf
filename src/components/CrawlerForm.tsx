import React, { useState } from 'react';
import { CrawlSettings } from '../types';
import {
  Globe,
  Sliders,
  Scissors,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Clock,
  Compass,
  Zap,
  Layout,
  Gauge,
  Loader2,
  HelpCircle,
  X
} from 'lucide-react';

interface CrawlerFormProps {
  onSubmit: (settings: CrawlSettings) => void;
  isLoading: boolean;
}

const DEFAULT_SETTINGS: CrawlSettings = {
  url: '',
  maxDepth: 1,
  maxPages: 25,
  orientation: 'portrait',
  format: 'A4',
  removeSelectors: 'header, footer, nav, aside, .cookie-banner, .announcement',
  waitTime: 1500,
  sameDomainOnly: true,
  includeHashRoutes: false,
  scale: 50,
  margin: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
};

export default function CrawlerForm({ onSubmit, isLoading }: CrawlerFormProps) {
  const [settings, setSettings] = useState<CrawlSettings>(DEFAULT_SETTINGS);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [helpModalType, setHelpModalType] = useState<'depth' | 'budget' | 'exclude' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.url.trim()) return;

    // Auto insert protocol if missing
    let finalUrl = settings.url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    onSubmit({
      ...settings,
      url: finalUrl,
    });
  };

  const handleMarginChange = (edge: 'top' | 'bottom' | 'left' | 'right', val: number) => {
    setSettings((prev) => ({
      ...prev,
      margin: {
        ...prev.margin,
        [edge]: val,
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-slate-600 space-y-5">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Sliders className="text-indigo-600 w-5 h-5" />
          Crawler Control Console
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Specify target URL path criteria and crawler instructions
        </p>
      </div>

      {/* Target URL Address */}
      <div className="space-y-1.5" id="form-field-url">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          Target Website Address (URL)
        </label>
        <div className="relative">
          <input
            type="text"
            required
            disabled={isLoading}
            value={settings.url}
            onChange={(e) => setSettings({ ...settings, url: e.target.value })}
            placeholder="e.g. https://news.ycombinator.com"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-mono transition-all duration-155 disabled:opacity-60"
          />
        </div>
      </div>

      {/* Max Crawl Depth */}
      <div className="space-y-1.5" id="form-field-depth">
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-450" />
            Crawling Nesting Depth
            <button
              type="button"
              onClick={() => setHelpModalType('depth')}
              className="text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
              title="Show guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </span>
          <span className="bg-slate-50 text-indigo-600 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-100">
            {settings.maxDepth === 0 ? 'Single Page (0)' : `${settings.maxDepth} ${settings.maxDepth === 1 ? 'depth level' : 'depth levels'}`}
          </span>
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="7"
            disabled={isLoading}
            value={settings.maxDepth}
            onChange={(e) => setSettings({ ...settings, maxDepth: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-100"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5">
            <span>0</span>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>
          </div>
        </div>
      </div>

      {/* Max Page Limit */}
      <div className="space-y-1.5" id="form-field-pages">
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-slate-450" />
            Maximum Page Budget
            <button
              type="button"
              onClick={() => setHelpModalType('budget')}
              className="text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
              title="Show guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-slate-50 text-indigo-600 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-100">
              {settings.maxPages} pages max
            </span>
            <input
              type="number"
              min="1"
              max="150"
              disabled={isLoading}
              value={settings.maxPages}
              onChange={(e) => setSettings({ ...settings, maxPages: Math.max(1, Math.min(150, parseInt(e.target.value) || 1)) })}
              className="w-12 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center font-mono text-[10px] text-indigo-600 font-bold focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
            />
          </div>
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max="200"
            disabled={isLoading}
            value={settings.maxPages}
            onChange={(e) => setSettings({ ...settings, maxPages: Math.max(1, Math.min(200, parseInt(e.target.value) || 1)) })}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-100"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">Presets:</span>
              {[10, 25, 50, 75, 100, 125, 150, 175, 200].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSettings({ ...settings, maxPages: preset })}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold font-sans text-[9px] border ${settings.maxPages === preset
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-450 leading-relaxed font-sans pt-0.5">
          💡 <span className="font-semibold text-slate-550">Budget Definition:</span> Controls the absolute ceiling of unique URL assets traversed and parsed into vector PDF segments to protect resources.
        </p>
      </div>

      {/* Target CSS element filter hide */}
      <div className="space-y-1.5" id="form-field-selectors">
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-slate-450" />
            Exclude Elements Selectors
            <button
              type="button"
              onClick={() => setHelpModalType('exclude')}
              className="text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
              title="Show guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </span>
          <span className="text-[10px] text-slate-400">Separated by comma</span>
        </label>
        <input
          type="text"
          disabled={isLoading}
          value={settings.removeSelectors}
          onChange={(e) => setSettings({ ...settings, removeSelectors: e.target.value })}
          placeholder="e.g. .cookie-banner, header, nav, #subscription"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 font-mono disabled:opacity-60"
        />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Strips out dynamic overlays (cookie bars, ads, sticky banners) during PDF print.
        </p>
      </div>

      {/* Advanced toggle button */}
      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-all cursor-pointer"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />}
          {showAdvanced ? 'Hide Advanced Options' : 'Reveal Layout & Margins Options'}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-4 pt-1 border-t border-slate-100 animate-slideDown">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Format selecting */}
            <div className="space-y-1.5" id="form-field-format">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                Paper Dimension
              </label>
              <select
                disabled={isLoading}
                value={settings.format}
                onChange={(e) => setSettings({ ...settings, format: e.target.value as any })}
                className="w-full bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-300"
              >
                <option value="A4">A4 (Standard)</option>
                <option value="Letter">US Letter</option>
                <option value="Legal">US Legal</option>
                <option value="Tabloid">Tabloid</option>
              </select>
            </div>

            {/* Orientation selecting */}
            <div className="space-y-1.5" id="form-field-orientation">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Layout className="w-3.5 h-3.5 text-slate-400" />
                Layout
              </label>
              <select
                disabled={isLoading}
                value={settings.orientation}
                onChange={(e) => setSettings({ ...settings, orientation: e.target.value as any })}
                className="w-full bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-300"
              >
                <option value="portrait">Portrait (Vertical)</option>
                <option value="landscape">Landscape (Horizontal)</option>
              </select>
            </div>

            {/* Wait hydration delay */}
            <div className="space-y-1.5" id="form-field-delay">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Hydration Delay
              </label>
              <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:border-indigo-300">
                <input
                  type="number"
                  disabled={isLoading}
                  value={settings.waitTime}
                  min="0"
                  max="15000"
                  step="500"
                  onChange={(e) => setSettings({ ...settings, waitTime: parseInt(e.target.value) || 0 })}
                  className="w-full bg-transparent text-xs text-slate-800 p-2.5 outline-none font-mono"
                />
                <span className="text-[10px] text-slate-400 font-mono pr-2.5 shrink-0">ms</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Same Domain restriction & hash route checkbox */}
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                Crawl Domain Scope
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={isLoading}
                    checked={settings.sameDomainOnly}
                    onChange={(e) => setSettings({ ...settings, sameDomainOnly: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-200 accent-indigo-600"
                  />
                  <span>Restrict to current domain name only</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={isLoading}
                    checked={settings.includeHashRoutes}
                    onChange={(e) => setSettings({ ...settings, includeHashRoutes: e.target.checked })}
                    className="w-4 h-4 rounded bg-white border-slate-200 accent-indigo-600"
                  />
                  <span>Traverse hash sub-links (e.g. <span className="font-mono text-slate-400 text-[10px]">/#/route</span>)</span>
                </label>
              </div>
            </div>

            {/* Layout Zoom Scale and margins */}
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between mb-1.5">
                <span>Layout Zoom & Margins</span>
                <span className="text-[10px] font-mono text-indigo-600 font-bold">{settings.scale}%</span>
              </label>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 shrink-0 w-8">Scale</span>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    disabled={isLoading}
                    value={settings.scale}
                    onChange={(e) => setSettings({ ...settings, scale: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg accent-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {(['top', 'bottom', 'left', 'right'] as const).map((edge) => (
                    <div key={edge} className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block text-center font-mono">{edge}</span>
                      <div className="flex items-center bg-white border border-slate-200 rounded px-1 px-1.5 py-0.5 font-mono text-center">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={settings.margin[edge]}
                          disabled={isLoading}
                          onChange={(e) => handleMarginChange(edge, parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent text-[10px] p-0.5 text-center text-slate-700 focus:outline-none"
                        />
                        <span className="text-[8px] text-slate-400">mm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary crawl trigger button */}
      <div className="pt-3">
        <button
          type="submit"
          disabled={isLoading || !settings.url.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-750 active:scale-[0.99] hover:-translate-y-0.5 active:translate-y-0 text-white disabled:opacity-60 font-bold py-4 px-6 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-250 tracking-wider uppercase disabled:pointer-events-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-white fill-current animate-pulse" />
              <span>Generate PDF</span>
            </>
          )}
        </button>
      </div>

      {helpModalType && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setHelpModalType(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 relative overflow-hidden animate-scaleUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setHelpModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Close guide"
            >
              <X className="w-4 h-4" />
            </button>

            {helpModalType === 'depth' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl border border-indigo-100 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Crawling Nesting Depth Guide</h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Parameter Configuration</p>
                  </div>
                </div>

                <div className="text-sm text-slate-650 space-y-3 leading-relaxed">
                  <p>Controls how many levels of links to follow recursively from the starting URL:</p>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 font-sans">
                    <div className="flex gap-2.5">
                      <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-[11px]">0</span>
                      <p><span className="font-semibold text-slate-850">Single Page (0):</span> Only crawls and prints the starting URL page.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-[11px]">1</span>
                      <p><span className="font-semibold text-slate-850">Direct Links (1):</span> Crawls the starting page and all links found directly on it.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-[11px]">2+</span>
                      <p><span className="font-semibold text-slate-850">Deep Ingestion (2+):</span> Recursively crawls links found on subsequent sub-pages.</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-450 italic bg-amber-50 border border-amber-150 rounded-xl p-3">
                    💡 Note: The crawler stays within the starting directory path and domain name to prevent crawling external pages or sibling folders.
                  </p>
                </div>
              </div>
            )}

            {helpModalType === 'budget' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl border border-indigo-100 shrink-0">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Maximum Page Budget Guide</h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Parameter Configuration</p>
                  </div>
                </div>

                <div className="text-sm text-slate-655 space-y-3 leading-relaxed">
                  <p>Defines a hard limit on the total number of pages crawled and compiled into the final PDF document:</p>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 font-sans">
                    <p>• <span className="font-semibold text-slate-850">Prevents runaway crawls</span> on massive websites with hundreds of paths.</p>
                    <p>• <span className="font-semibold text-slate-850">Reduces processing time</span> and controls the output PDF file footprint size.</p>
                    <p>• If the site has more links than this budget, the crawler stops immediately after reaching the limit and merges the already completed pages.</p>
                  </div>
                </div>
              </div>
            )}

            {helpModalType === 'exclude' && (
              <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl border border-indigo-100 shrink-0">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Exclude Elements Selectors</h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Print Formatting Guide</p>
                  </div>
                </div>

                <div className="text-sm text-slate-655 space-y-3.5 leading-relaxed">
                  <p>Removes distracting elements (like headers, sidebars, cookie compliance banners, popup modals, ads) so they do not overlap or clutter the printed PDF pages.</p>

                  <div className="border-t border-slate-150 pt-3 space-y-2">
                    <p className="font-bold text-slate-750 text-[13px]">How to find selectors using browser DevTools:</p>
                    <ol className="list-decimal pl-4 space-y-1.5">
                      <li>Right-click the unwanted page element and select <span className="font-semibold text-slate-800">Inspect</span> to open the DevTools elements tree.</li>
                      <li>Identify unique features in the highlighted HTML tag:
                        <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-500 font-mono text-[11px]">
                          <li>Tag: <span className="text-slate-700 font-semibold">header, nav, aside, footer</span></li>
                          <li>ID: <span className="text-slate-700 font-semibold">#cookie-banner</span></li>
                          <li>Class: <span className="text-slate-700 font-semibold">.modal-backdrop</span></li>
                        </ul>
                      </li>
                    </ol>
                  </div>

                  <div className="border-t border-slate-150 pt-3 space-y-2">
                    <p className="font-bold text-slate-750 text-[13px]">Targeting complex elements (e.g. Tailwind CSS):</p>
                    <p>If the element lacks a clean ID or class, but has Tailwind classes, e.g. <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-[11px]">&lt;div class="border-t border-neutral-200 bg-white"&gt;</code>, you can match it using an attribute substring selector:</p>
                    <p className="bg-slate-950 text-indigo-300 p-2.5 rounded-lg font-mono text-[10.5px] overflow-x-auto border border-slate-850">
                      div[class*="border-t border-neutral-200 bg-white"]
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Separate multiple rules using a comma: <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-[10px]">header, nav, div[class*="border-t"]</code></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
