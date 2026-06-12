# Website to PDF
>
> Transform Single Page Applications (SPAs) and dynamic websites into a single, unified, high-fidelity PDF vector document.

**Website to PDF** is a high-performance crawling and compilation engine. It traverses client-side routes, hydrates JavaScript states, strips unwanted elements, and compiles views into clean, print-ready PDFs.

---

## Key Features

- **SPA Router Traversal**: Recursively scans and parses route layers (e.g. React Router) to capture all subpages.
- **State Hydration Wait**: Customizable hydration timers ensure all dynamic components (charts, grids, APIs) are fully loaded before printing.
- **Node Selection Cleaning**: Interactively strips headers, footers, sidebars, or cookie consent banners using CSS selector rules.
- **Custom Print Layouts**: Tailor output document configuration (Margins, Portrait/Landscape, A4/Letter size, Scale percentage).
- **Hybrid Running Modes**: Automatically runs natively with Puppeteer on your local machine, or falls back to a sandbox template emulation layer when running in secure cloud container environments.
- **PDF Assembly & Compilation**: Uses pdf-lib to merge individual route layers into a single vector-based document.

---

## System Requirements

- **Runtime**: Node.js (v18.0.0 or higher recommended)
- **Package Manager**: npm (comes bundled with Node.js)
- **OS**: Windows, macOS, or Linux (native browser features require a local Chrome/Chromium installation)

## How to Run

1. **Clone the repository**:

   ```bash
   git clone https://github.com/pverhaert/website_to_pdf.git
   cd website_to_pdf
   ```

2. **Run the server**:
   - **Windows (Automatic)**: Double-click the `run.bat` file in the root directory. This will automatically check dependencies (installing them if missing), release port 4444, start the server, and open your browser.
   - **Manual (Terminal)**: Run the following commands in your terminal:

     ```bash
     npm install
     npm run dev
     ```

     Once the server starts, navigate to <http://localhost:4444> in your browser.

## Pro Tips for High Fidelity Exports

- **Authentication**: When crawling pages behind an auth wall, copy the project locally to let Puppeteer run natively in headful/configured modes or preload login states.
- **Custom CSS Removals**: To remove layout elements, pass comma-separated CSS selectors (e.g., header, footer, nav, .cookie-banner) in the removal input block.
- **Scale Factor**: If text overflows container borders, adjust the scale (e.g., set to 80% or 90%) to perfectly fit columns to page borders.
