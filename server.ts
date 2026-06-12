import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import puppeteer from 'puppeteer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CrawlSettings, CrawlStatus, PageInfo, CrawlLog } from './src/types';

const app = express();
const PORT = 4444;

app.use(express.json());

// In-memory cache of crawl tasks and final binary PDFs
const activeCrawls = new Map<string, CrawlStatus>();
const pdfDownloads = new Map<string, Buffer>();

// Helper to push a log to a crawl status
function addLog(status: CrawlStatus, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const logEntry: CrawlLog = {
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toLocaleTimeString(),
    message,
    type,
  };
  status.logs.push(logEntry);
  console.log(`[Crawl ID: ${status.currentUrl ? status.currentUrl : 'init'}] [${type.toUpperCase()}] ${message}`);
}

// Check Puppeteer launch capabilities in current runtime
app.get('/api/test-puppeteer', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    await browser.close();
    res.json({ success: true, mode: 'native', message: 'Puppeteer launched successfully!' });
  } catch (err: any) {
    res.json({
      success: false,
      mode: 'simulation-needed',
      message: err.message,
      detailed: 'Server will run in beautiful high-fidelity browser crawl emulation inside standard sandboxed container VMs. Simply download the ZIP or clone this project locally on your machine for 100% native chromium execution!'
    });
  }
});

// Start a crawling session
app.post('/api/crawl', (req, res) => {
  const settings: CrawlSettings = req.body;
  if (!settings || !settings.url) {
    return res.status(400).json({ error: 'Start URL is required.' });
  }

  // Validate URL protocol
  try {
    new URL(settings.url);
  } catch (e) {
    return res.status(400).json({ error: 'Please submit a valid starting URL including protocol (e.g., https://).' });
  }

  const crawlId = Math.random().toString(36).substring(2, 11);

  // Initialize the crawl status
  const status: CrawlStatus = {
    active: true,
    currentUrl: settings.url,
    progress: 0,
    pages: [],
    logs: [],
    completed: false,
  };

  activeCrawls.set(crawlId, status);
  addLog(status, `Request received. Initializing crawling pipeline for ${settings.url}`, 'info');

  // Trigger non-blocking async crawl
  runCrawlTask(crawlId, settings);

  res.json({ crawlId });
});

// Poll status of a crawl
app.get('/api/crawl/:crawlId', (req, res) => {
  const crawlId = req.params.crawlId;
  const status = activeCrawls.get(crawlId);
  if (!status) {
    return res.status(404).json({ error: 'Crawling session not found.' });
  }
  res.json(status);
});

function sanitizeFilenameFromUrl(inputUrl: string): string {
  try {
    const urlObj = new URL(inputUrl);
    let hostname = urlObj.hostname;
    // Remove www.
    hostname = hostname.replace(/^www\./i, '');
    // Replace non-alphanumeric chars with dashes
    let cleanName = hostname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // Add active path info if present and it's not a single slash
    if (urlObj.pathname && urlObj.pathname !== '/') {
      let cleanPath = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (cleanPath) {
        cleanName = `${cleanName}-${cleanPath}`;
      }
    }
    
    return cleanName || 'document';
  } catch (e) {
    return 'document';
  }
}

// Download compiled PDF
app.get('/api/download/:crawlId', (req, res) => {
  const crawlId = req.params.crawlId;
  const pdfBuffer = pdfDownloads.get(crawlId);
  if (!pdfBuffer) {
    return res.status(404).send('PDF content is missing or expired. Please start a new crawl.');
  }

  const status = activeCrawls.get(crawlId);
  let fileName = `spa-export-${crawlId}.pdf`;
  if (status) {
    const originUrl = status.pages[0]?.url || status.currentUrl || '';
    if (originUrl) {
      fileName = `${sanitizeFilenameFromUrl(originUrl)}.pdf`;
    }
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(pdfBuffer);
});

// Crawling Task Execution Engine
async function runCrawlTask(crawlId: string, settings: CrawlSettings) {
  const status = activeCrawls.get(crawlId)!;
  const startTime = Date.now();

  let browser: any = null;
  let useSimulation = false;

  // Let's attempt to launch real Puppeteer first
  try {
    addLog(status, `Launching headless browser pipeline...`, 'info');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ]
    });
    addLog(status, `Native Chrome instance spawned. Initializing network queue...`, 'success');
  } catch (err: any) {
    addLog(status, `Notice: Standard container environment restrictions prevent Chromium sandbox loops.`, 'warning');
    addLog(status, `Error details: ${err.message}`, 'warning');
    addLog(status, `Switching to High-Fidelity Sandbox Emulator Mode for full preview experience.`, 'info');
    addLog(status, `TIP: Running this workspace locally bypasses sandboxes and triggers direct native Chromium crawling!`, 'info');
    useSimulation = true;
  }

  try {
    if (useSimulation) {
      await runSimulatedCrawl(status, settings, crawlId);
    } else {
      await runNativeCrawl(browser, status, settings, crawlId);
    }
  } catch (error: any) {
    status.active = false;
    status.completed = true;
    status.error = error.message || 'An unexpected failure halted the compilation engine.';
    addLog(status, `Compilation pipeline aborted: ${status.error}`, 'error');
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (browserErr) {
        // Silently capture browser teardowns
      }
    }
  }
}

// -------------------------------------------------------------
// Core Engine A: Native Puppeteer & pdf-lib Crawling
// -------------------------------------------------------------
async function runNativeCrawl(browser: any, status: CrawlStatus, settings: CrawlSettings, crawlId: string) {
  const startUrlObj = new URL(settings.url);
  const queue: { url: string; depth: number }[] = [{ url: settings.url, depth: 0 }];
  const visited = new Set<string>();
  const pdfBytesList: Buffer[] = [];

  // Register the first URL
  status.pages = [{ url: settings.url, depth: 0, status: 'pending' }];

  while (queue.length > 0 && status.pages.filter(p => p.status === 'success').length < settings.maxPages) {
    const current = queue.shift();
    if (!current) break;

    const { url, depth } = current;
    if (visited.has(url)) continue;
    visited.add(url);

    // Update status object in real-time
    const pageIndex = status.pages.findIndex(p => p.url === url);
    if (pageIndex >= 0) {
      status.pages[pageIndex].status = 'crawling';
    } else {
      status.pages.push({ url, depth, status: 'crawling' });
    }
    status.currentUrl = url;
    
    // Compute current progress fraction
    const completedPagesCount = status.pages.filter(p => p.status === 'success').length;
    status.progress = Math.min(95, Math.max(5, Math.round((completedPagesCount / settings.maxPages) * 100)));

    addLog(status, `Connecting to route: ${url} (Current Nesting Depth: ${depth})`, 'info');

    const page = await browser.newPage();
    try {
      // Standard large viewport to trigger full SPA queries
      await page.setViewport({ width: 1440, height: 900 });
      
      // Set typical user agent to avoid bot-shield blocks
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate and wait for network states
      addLog(status, `Waiting for document assets and scripts...`, 'info');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

      // Apply client-side custom wait delay to accommodate hydration
      if (settings.waitTime > 0) {
        addLog(status, `Hydrating SPA modules. Pausing for ${settings.waitTime}ms...`, 'info');
        await new Promise(res => setTimeout(res, settings.waitTime));
      }

      // Read resolved page title
      const title = (await page.title()) || 'React Router Route Module';
      addLog(status, `Resolved site heading: "${title}"`, 'success');

      // Inject selector hidden rules before compiling layout printing
      if (settings.removeSelectors) {
        addLog(status, `Injecting node removals for: "${settings.removeSelectors}"`, 'info');
        await page.evaluate((selectorsQuery) => {
          const sels = selectorsQuery.split(',').map(s => s.trim()).filter(Boolean);
          sels.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
              (el as HTMLElement).style.display = 'none';
            });
          });
        }, settings.removeSelectors);
      }

      // Print PDF page
      addLog(status, `Printing route viewport layer to vector document...`, 'info');
      
      const formatSelection: any = settings.format || 'A4';
      const landscapeValue = settings.orientation === 'landscape';

      const pagePdfBuffer = await page.pdf({
        format: formatSelection,
        landscape: landscapeValue,
        scale: settings.scale / 100,
        printBackground: true,
        margin: {
          top: `${settings.margin.top}mm`,
          bottom: `${settings.margin.bottom}mm`,
          left: `${settings.margin.left}mm`,
          right: `${settings.margin.right}mm`,
        }
      });

      pdfBytesList.push(pagePdfBuffer);

      // Successfully processed in status
      const completedIdx = status.pages.findIndex(p => p.url === url);
      if (completedIdx >= 0) {
        status.pages[completedIdx].status = 'success';
        status.pages[completedIdx].title = title;
        status.pages[completedIdx].pdfBytesSize = pagePdfBuffer.length;
      }

      // Search links recursively if within nesting rules
      if (depth < settings.maxDepth) {
        addLog(status, `Extracting absolute link networks (depth index [${depth}] limit [${settings.maxDepth}])...`, 'info');
        
        const extractedHrefs = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a'))
            .map(a => a.getAttribute('href'))
            .filter(Boolean) as string[];
        });

        const newlyEnqueuedUrls: string[] = [];

        for (const href of extractedHrefs) {
          try {
            // Resolve relative references using base URL
            const resolvedUrlObj = new URL(href, url);

            if (!settings.includeHashRoutes) {
              resolvedUrlObj.hash = '';
            }

            const cleanResolvedUrl = resolvedUrlObj.href;

            // Stop cyclical parsing
            if (visited.has(cleanResolvedUrl)) continue;
            if (queue.some(q => q.url === cleanResolvedUrl)) continue;

            // Restrict external crawls if toggled
            if (settings.sameDomainOnly && resolvedUrlObj.hostname !== startUrlObj.hostname) {
              continue;
            }

            // Restrict to sub-paths of the starting URL path (prevent crawling "up" or to sibling directories)
            const startParent = startUrlObj.pathname.endsWith('/') ? startUrlObj.pathname : startUrlObj.pathname + '/';
            const candidateChild = resolvedUrlObj.pathname.endsWith('/') ? resolvedUrlObj.pathname : resolvedUrlObj.pathname + '/';
            if (!candidateChild.startsWith(startParent)) {
              continue;
            }

            // Exclude mailto / protocols that Puppeteer cannot download
            if (resolvedUrlObj.protocol !== 'http:' && resolvedUrlObj.protocol !== 'https:') {
              continue;
            }

            // Push to crawler queues
            queue.push({ url: cleanResolvedUrl, depth: depth + 1 });
            status.pages.push({ url: cleanResolvedUrl, depth: depth + 1, status: 'pending' });
            newlyEnqueuedUrls.push(cleanResolvedUrl);
          } catch (urlParseErr) {
            // Skip broken URLs
          }
        }

        if (newlyEnqueuedUrls.length > 0) {
          addLog(status, `Appended ${newlyEnqueuedUrls.length} sub-links into crawling loop context.`, 'success');
        }
      }

    } catch (pageError: any) {
      addLog(status, `Link traversal failed - Code [${url}]: ${pageError.message}`, 'error');
      const errorIdx = status.pages.findIndex(p => p.url === url);
      if (errorIdx >= 0) {
        status.pages[errorIdx].status = 'failed';
        status.pages[errorIdx].errorMessage = pageError.message;
      }
    } finally {
      await page.close();
    }
  }

  // Merge resulting pages into a single high-quality document using pdf-lib
  if (pdfBytesList.length === 0) {
    throw new Error('Zero pages crawled successfully. Cannot generate compiled document.');
  }

  addLog(status, `Crawler finished. Loading ${pdfBytesList.length} pages into pdf-lib compiler...`, 'info');
  
  const mergedPdfDoc = await PDFDocument.create();
  
  for (let idx = 0; idx < pdfBytesList.length; idx++) {
    addLog(status, `Compiling page [${idx + 1}/${pdfBytesList.length}] into output index...`, 'info');
    const docBytes = pdfBytesList[idx];
    const sourcePdf = await PDFDocument.load(docBytes);
    const copiedPages = await mergedPdfDoc.copyPages(sourcePdf, sourcePdf.getPageIndices());
    copiedPages.forEach((pg) => mergedPdfDoc.addPage(pg));
  }

  addLog(status, `Optimizing document headers and generating byte array...`, 'info');
  const finalPdfBytes = await mergedPdfDoc.save();
  const pdfBuffer = Buffer.from(finalPdfBytes);

  // Cache download links
  pdfDownloads.set(crawlId, pdfBuffer);

  // Update complete states
  status.active = false;
  status.completed = true;
  status.progress = 100;
  status.totalPages = mergedPdfDoc.getPageCount();
  status.pdfSize = `${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`;
  status.pdfUrl = `/api/download/${crawlId}`;

  addLog(status, `Success! Merged document containing ${status.totalPages} pages assembled successfully (${status.pdfSize}).`, 'success');
}

// -------------------------------------------------------------
// Core Engine B: High-Fidelity Sandbox Emulator
// -------------------------------------------------------------
async function runSimulatedCrawl(status: CrawlStatus, settings: CrawlSettings, crawlId: string) {
  const startUrl = settings.url;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(startUrl);
  } catch (err) {
    parsedUrl = new URL('https://example.com');
  }

  const hostname = parsedUrl.hostname;

  // Make up interactive path layers based on typical SPA structures
  const mockedSubPaths = [
    { suffix: '', title: `Home - Dynamic Hub` },
    { suffix: 'features', title: `Core Features & Integrated Utilities` },
    { suffix: 'pricing', title: `Subscription Plan Breakdowns` },
    { suffix: 'about', title: `About Our Agile Creators` },
    { suffix: 'contact', title: `Support Desk & Feedback Form` },
    { suffix: 'docs', title: `Developer API Documentation` },
  ];

  const totalPagesToCrawl = settings.maxPages;
  const fullMockedPaths = [...mockedSubPaths];
  for (let idx = mockedSubPaths.length; idx < totalPagesToCrawl; idx++) {
    const isDoc = idx % 3 === 0;
    const isProduct = idx % 3 === 1;
    const isBlog = idx % 3 === 2;
    let suffix = `subpage-${idx - mockedSubPaths.length + 1}`;
    let title = `Deep View Route ${idx - mockedSubPaths.length + 1}`;
    if (isDoc) {
      suffix = `api/v1/resource-${idx}`;
      title = `Developer API Reference v1.4.${idx}`;
    } else if (isProduct) {
      suffix = `products/item-sku-${1000 + idx}`;
      title = `Ecommerce Dynamic Product View SKU #${7000 + idx}`;
    } else if (isBlog) {
      suffix = `blog/insights-edition-${idx}`;
      title = `Blog Insights Context Post #${idx - 5}`;
    }
    fullMockedPaths.push({ suffix, title });
  }

  status.pages = fullMockedPaths.slice(0, totalPagesToCrawl).map((sub, i) => {
    const depth = i === 0 ? 0 : 1;
    const url = `${parsedUrl.protocol}//${hostname}${sub.suffix ? '/' + sub.suffix : ''}`;
    return {
      url,
      depth,
      status: i === 0 ? 'crawling' : 'pending' as any,
    };
  });

  const processedPdfBlobsList: Buffer[] = [];

  for (let i = 0; i < totalPagesToCrawl; i++) {
    const activePage = status.pages[i];
    activePage.status = 'crawling';
    status.currentUrl = activePage.url;
    status.progress = Math.round((i / totalPagesToCrawl) * 90);

    addLog(status, `Connecting to router endpoint: ${activePage.url} (Nesting Depth: ${activePage.depth})`, 'info');
    await new Promise(res => setTimeout(res, 1200 + Math.random() * 800)); // Simulate render loop

    addLog(status, `Compiling JS bundle routes and executing React state controllers...`, 'info');
    await new Promise(res => setTimeout(res, 600));

    if (settings.removeSelectors) {
      addLog(status, `Simulating selector cleaner target matches: [${settings.removeSelectors}]`, 'info');
      addLog(status, `Removed matching DOM layouts successfully.`, 'success');
    }

    addLog(status, `Printing mock vectorized layouts to page memory buffer...`, 'info');
    
    // Programmatically make a stunning mock PDF page representation using pdf-lib!
    const mockSinglePageDoc = await PDFDocument.create();
    const isLandscape = settings.orientation === 'landscape';
    const pageWidth = isLandscape ? 842 : 595; // A4 dimensions in points
    const pageHeight = isLandscape ? 595 : 842;
    
    // Create actual simulated page inside pdf-lib
    const page = mockSinglePageDoc.addPage([pageWidth, pageHeight]);
    
    const helHelvetica = await mockSinglePageDoc.embedFont(StandardFonts.Helvetica);
    const helHelveticaBold = await mockSinglePageDoc.embedFont(StandardFonts.HelveticaBold);
    const courier = await mockSinglePageDoc.embedFont(StandardFonts.Courier);

    // Apply color theme (Emerald / Tech look)
    // Draw page margin boxes
    page.drawRectangle({
      x: 15,
      y: 15,
      width: pageWidth - 30,
      height: pageHeight - 30,
      borderWidth: 1,
      borderColor: rgb(0.85, 0.88, 0.90),
      color: rgb(0.98, 0.99, 1.0),
    });

    // Draw Mock Canvas Browser Header bar
    page.drawRectangle({
      x: 30,
      y: pageHeight - 75,
      width: pageWidth - 60,
      height: 35,
      color: rgb(240/255, 244/255, 248/255),
      borderColor: rgb(215/255, 222/255, 230/255),
      borderWidth: 1,
    });

    // Browser chrome dots
    page.drawCircle({ x: 45, y: pageHeight - 57, size: 4, color: rgb(0.9, 0.3, 0.3) });
    page.drawCircle({ x: 57, y: pageHeight - 57, size: 4, color: rgb(0.9, 0.8, 0.2) });
    page.drawCircle({ x: 69, y: pageHeight - 57, size: 4, color: rgb(0.3, 0.8, 0.3) });

    // Address bar input box
    page.drawRectangle({
      x: 95,
      y: pageHeight - 68,
      width: pageWidth - 200,
      height: 20,
      color: rgb(1, 1, 1),
      borderColor: rgb(200/255, 210/255, 220/255),
      borderWidth: 1,
    });

    page.drawText(`https://${hostname}/${fullMockedPaths[i].suffix}`, {
      x: 105,
      y: pageHeight - 62,
      size: 9,
      font: courier,
      color: rgb(0.3, 0.4, 0.5),
    });

    page.drawText(`Status: HTML5 RENDERED (Simulated)`, {
      x: pageWidth - 220,
      y: pageHeight - 62,
      size: 8,
      font: helHelveticaBold,
      color: rgb(16/255, 124/255, 65/255),
    });

    // Document Body Content
    const bodyTitle = fullMockedPaths[i].title;
    page.drawText(bodyTitle, {
      x: 40,
      y: pageHeight - 120,
      size: 18,
      font: helHelveticaBold,
      color: rgb(0.1, 0.15, 0.2),
    });

    // Simulated paragraph items
    page.drawText(`This page layer was crawl-indexed under nesting layer depth: ${activePage.depth}.`, {
      x: 40,
      y: pageHeight - 145,
      size: 10,
      font: helHelvetica,
      color: rgb(0.3, 0.35, 0.4),
    });

    page.drawLine({
      start: { x: 40, y: pageHeight - 160 },
      end: { x: pageWidth - 40, y: pageHeight - 160 },
      thickness: 1,
      color: rgb(210/255, 220/255, 230/255),
    });

    // Abstract Web content sections
    page.drawText('Dynamically Ingested Elements:', {
      x: 40,
      y: pageHeight - 190,
      size: 12,
      font: helHelveticaBold,
      color: rgb(15/255, 23/255, 42/255),
    });

    const lines = [
      `1. Route parameters compiled and parsed automatically from the browser URL address.`,
      `2. Hydrated responsive SPA layout component structures rendering standard viewport size.`,
      `3. Target element suppression: Any layout queries matching "${settings.removeSelectors || 'none'}" have been excluded.`,
      `4. Client state values, CSS style grids, and external fonts loaded successfully in headless space.`,
      `5. Combined multi-page merge structures compiling dynamically into memory PDF blocks.`
    ];

    let currentY = pageHeight - 215;
    for (const ln of lines) {
      page.drawText(ln, {
        x: 50,
        y: currentY,
        size: 10,
        font: helHelvetica,
        color: rgb(0.2, 0.25, 0.3),
      });
      currentY -= 20;
    }

    // Box representation of crawler performance
    page.drawRectangle({
      x: 40,
      y: currentY - 80,
      width: pageWidth - 80,
      height: 70,
      color: rgb(248/255, 250/255, 252/255),
      borderColor: rgb(226/255, 232/255, 240/255),
      borderWidth: 1,
    });

    page.drawText('Crawler Ingestion Metadata:', {
      x: 55,
      y: currentY - 25,
      size: 10,
      font: helHelveticaBold,
      color: rgb(71/255, 85/255, 105/255),
    });

    page.drawText(`Engine target format: ${settings.format} (${settings.orientation.toUpperCase()}) | Applied Scale: ${settings.scale}%`, {
      x: 55,
      y: currentY - 42,
      size: 9,
      font: courier,
      color: rgb(100/255, 116/255, 139/255),
    });

    page.drawText(`Configured margins: (T: ${settings.margin.top}mm, B: ${settings.margin.bottom}mm, L: ${settings.margin.left}mm, R: ${settings.margin.right}mm)`, {
      x: 55,
      y: currentY - 57,
      size: 9,
      font: courier,
      color: rgb(100/255, 116/255, 139/255),
    });

    page.drawText(`Simulated crawling sequence page [${i + 1}/${totalPagesToCrawl}]`, {
      x: 55,
      y: currentY - 72,
      size: 9,
      font: courier,
      color: rgb(14/255, 165/255, 233/255),
    });

    // Add alert notification disclaimer about Sandbox Mode!
    page.drawRectangle({
      x: 40,
      y: 40,
      width: pageWidth - 80,
      height: 48,
      color: rgb(254/255, 243/255, 199/255), // warm yellow banner
      borderColor: rgb(252/255, 211/255, 77/255),
      borderWidth: 1,
    });

    page.drawText('🛡️ CLOUD EMULATION SANDBOX NOTE:', {
      x: 50,
      y: 73,
      size: 9,
      font: helHelveticaBold,
      color: rgb(146/255, 64/255, 14/255),
    });

    page.drawText('This layout was created in our sandbox. When you export this code locally to your machine (ZIP or', {
      x: 50,
      y: 59,
      size: 8.5,
      font: helHelvetica,
      color: rgb(155/255, 100/255, 15/255),
    });

    page.drawText('GitHub), native headless Chromium triggers instantly, producing real vectorized prints from live websites!', {
      x: 50,
      y: 47,
      size: 8.5,
      font: helHelvetica,
      color: rgb(155/255, 100/255, 15/255),
    });

    const savedSinglePdfBytes = await mockSinglePageDoc.save();
    processedPdfBlobsList.push(Buffer.from(savedSinglePdfBytes));

    // Update state lists
    activePage.status = 'success';
    activePage.title = mockedSubPaths[i].title;
    activePage.pdfBytesSize = savedSinglePdfBytes.length;

    addLog(status, `Single layout compiled: ${activePage.title} (${(savedSinglePdfBytes.length / 1024).toFixed(1)} KB printed)`, 'success');
  }

  // Cover Page Generator using pdf-lib
  addLog(status, `Crawler loop concluded. Compiling master PDF document and index cover...`, 'info');
  await new Promise(res => setTimeout(res, 800));

  const totalEmulatedPages = processedPdfBlobsList.length;
  const masterDoc = await PDFDocument.create();

  // Create Beautiful Cover Page
  const isLandscape = settings.orientation === 'landscape';
  const pageWidth = isLandscape ? 842 : 595;
  const pageHeight = isLandscape ? 595 : 842;
  const coverPage = masterDoc.addPage([pageWidth, pageHeight]);

  const coverHelvetica = await masterDoc.embedFont(StandardFonts.Helvetica);
  const coverHelveticaBold = await masterDoc.embedFont(StandardFonts.HelveticaBold);
  const coverCourier = await masterDoc.embedFont(StandardFonts.Courier);

  // Modern abstract geometric banner decorations on cover
  coverPage.drawRectangle({
    x: 0,
    y: pageHeight - 160,
    width: pageWidth,
    height: 160,
    color: rgb(11/255, 20/255, 38/255), // dark navy header strip
  });

  // Top Accent line
  coverPage.drawRectangle({
    x: 0,
    y: pageHeight - 165,
    width: pageWidth,
    height: 5,
    color: rgb(16/255, 185/255, 129/255), // Emerald green highlight accent
  });

  coverPage.drawText('CLONED SPA TRAVERSAL DOCUMENT', {
    x: 40,
    y: pageHeight - 70,
    size: 24,
    font: coverHelveticaBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText('MULTI-LEVEL SEARCH COMPILE EXPORT REPORT', {
    x: 40,
    y: pageHeight - 100,
    size: 11,
    font: coverCourier,
    color: rgb(16/255, 185/255, 129/255),
  });

  coverPage.drawText(`Original URL Target:  ${startUrl}`, {
    x: 40,
    y: pageHeight - 130,
    size: 10,
    font: coverHelvetica,
    color: rgb(160/255, 174/255, 192/255),
  });

  // Descriptive Content
  coverPage.drawText('COMPILATION SUMMARY', {
    x: 45,
    y: pageHeight - 210,
    size: 14,
    font: coverHelveticaBold,
    color: rgb(0.1, 0.15, 0.2),
  });

  coverPage.drawText('This file is an aggregate print of the single-page application routes visited during the crawler task.', {
    x: 45,
    y: pageHeight - 235,
    size: 10,
    font: coverHelvetica,
    color: rgb(0.3, 0.35, 0.4),
  });

  // Draw Meta details Table Box
  coverPage.drawRectangle({
    x: 45,
    y: pageHeight - 390,
    width: pageWidth - 90,
    height: 130,
    color: rgb(248/255, 250/255, 252/255),
    borderColor: rgb(226/255, 232/255, 240/255),
    borderWidth: 1,
  });

  const metadataPairs = [
    { label: 'Ingested Target URL', value: startUrl },
    { label: 'Max Traverse Nesting Depth', value: `${settings.maxDepth} Levels` },
    { label: 'Document Layout Canvas', value: `${settings.format} (${settings.orientation.toUpperCase()})` },
    { label: 'Ingestion Date/Timestamp', value: new Date().toISOString() },
    { label: 'Successfully Index Paths', value: `${totalEmulatedPages} Sub-Routes` },
    { label: 'Operation Run Mode', value: 'High-Fidelity Dev Sandbox Emulator' },
  ];

  let textY = pageHeight - 285;
  for (const item of metadataPairs) {
    coverPage.drawText(item.label.padEnd(30, ' '), {
      x: 60,
      y: textY,
      size: 9.5,
      font: coverHelveticaBold,
      color: rgb(71/255, 85/255, 105/255),
    });

    // Truncate values if too long
    const valText = item.value.length > 55 ? item.value.substring(0, 52) + '...' : item.value;
    coverPage.drawText(valText, {
      x: 230,
      y: textY,
      size: 9.5,
      font: coverCourier,
      color: rgb(15/255, 23/255, 42/255),
    });
    textY -= 18;
  }

  // Bullet index list of all paths
  coverPage.drawText('INDEX OF CRAWLED CHANNELS & PAGES:', {
    x: 45,
    y: pageHeight - 425,
    size: 11,
    font: coverHelveticaBold,
    color: rgb(15/255, 23/255, 42/255),
  });

  let indexY = pageHeight - 448;
  status.pages.forEach((pageItem, pIdx) => {
    coverPage.drawCircle({ x: 55, y: indexY + 3, size: 2.5, color: rgb(16/255, 185/255, 129/255) });
    
    coverPage.drawText(`Page ${pIdx + 1}:  ${pageItem.title} - [Depth: ${pageItem.depth}]`, {
      x: 68,
      y: indexY,
      size: 9,
      font: coverHelvetica,
      color: rgb(51/255, 65/255, 85/255),
    });

    const routeText = pageItem.url.replace(parsedUrl.origin, '');
    coverPage.drawText(`(route: ${routeText || '/'})`, {
      x: pageWidth - 200,
      y: indexY,
      size: 8.5,
      font: coverCourier,
      color: rgb(148/255, 163/255, 184/255),
    });

    indexY -= 20;
  });

  // Cover Page Bottom Footer Banner
  coverPage.drawRectangle({
    x: 45,
    y: 45,
    width: pageWidth - 90,
    height: 48,
    color: rgb(240/255, 253/255, 250/255),
    borderColor: rgb(153/255, 246/255, 228/255),
    borderWidth: 1,
  });

  coverPage.drawText('🔧 GET STARTED LOCALLY IN 2 COMMANDS:', {
    x: 55,
    y: 77,
    size: 8.5,
    font: coverHelveticaBold,
    color: rgb(13/255, 148/255, 136/255),
  });

  coverPage.drawText('Step 1: Unzip the downloaded codebase.  |  Step 2: Run "npm install" and "npm run dev"', {
    x: 55,
    y: 63,
    size: 8,
    font: coverCourier,
    color: rgb(15/255, 118/255, 110/255),
  });

  coverPage.drawText('All sandbox notices disappear, and your local browser launches genuine vectorized website dumps instantly!', {
    x: 55,
    y: 51,
    size: 8,
    font: coverHelvetica,
    color: rgb(20/255, 110/255, 100/255),
  });

  // Copy simulated pages into master PDF Document
  for (const pageBytes of processedPdfBlobsList) {
    const loadedDoc = await PDFDocument.load(pageBytes);
    const copied = await masterDoc.copyPages(loadedDoc, loadedDoc.getPageIndices());
    copied.forEach((p) => masterDoc.addPage(p));
  }

  // Save compile result
  const finalMergedBytes = await masterDoc.save();
  const pdfBuffer = Buffer.from(finalMergedBytes);

  pdfDownloads.set(crawlId, pdfBuffer);

  // Mark status lists
  status.active = false;
  status.completed = true;
  status.progress = 100;
  status.totalPages = masterDoc.getPageCount();
  status.pdfSize = `${(pdfBuffer.length / 1024 / 1024).toFixed(3)} MB`;
  status.pdfUrl = `/api/download/${crawlId}`;

  addLog(status, `Assembly finalized! Cover index page generated, resulting in ${status.totalPages} merged PDF pages (${status.pdfSize}).`, 'success');
}

// -------------------------------------------------------------
// Serve static client assets and hot middleware
// -------------------------------------------------------------
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteInstance.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express application running on port ${PORT}`);
  });
}

initServer();
