/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';

// Booklet Configurations based on dividing an A4 sheet
const SIZES: Record<string, { name: string, cols: number, rows: number, orientation: 'portrait' | 'landscape', totalPages: number }> = {
  A8: { name: 'A8', cols: 4, rows: 4, orientation: 'portrait', totalPages: 32 },
  A7: { name: 'A7', cols: 4, rows: 2, orientation: 'landscape', totalPages: 16 },
  A6: { name: 'A6', cols: 2, rows: 2, orientation: 'portrait', totalPages: 8 },
  A5: { name: 'A5', cols: 2, rows: 1, orientation: 'landscape', totalPages: 4 },
};

export default function App() {
  const [size, setSize] = useState('A8');
  const [previewScale, setPreviewScale] = useState(0.5); // Default zoom 50% for screen
  
  const config = SIZES[size];

  // Standard Saddle-Stitch Imposition Math
  const { frontSheet, backSheet } = useMemo(() => {
    const N = config.totalPages;
    const spreadCols = config.cols / 2;
    const spreadRows = config.rows;
    
    const front = new Array<number>(N / 2);
    const back = new Array<number>(N / 2);

    for (let r = 0; r < spreadRows; r++) {
      for (let c = 0; c < spreadCols; c++) {
        const spreadIndex = r * spreadCols + c;
        
        // Front Spread (Left: High Even, Right: Low Odd)
        front[r * config.cols + 2 * c] = N - 2 * spreadIndex;
        front[r * config.cols + 2 * c + 1] = 2 * spreadIndex + 1;

        // Back Spread (Left: Low Even, Right: High Odd)
        const leftPageBack = 2 * spreadIndex + 2;
        const rightPageBack = N - 2 * spreadIndex - 1;

        // Flip logic: When flipping the physical paper, the columns mirror.
        const backC = spreadCols - 1 - c;
        back[r * config.cols + 2 * backC] = leftPageBack;
        back[r * config.cols + 2 * backC + 1] = rightPageBack;
      }
    }
    return { frontSheet: front, backSheet: back };
  }, [config]);

  const sheetWidth = config.orientation === 'portrait' ? '210mm' : '297mm';
  const sheetHeight = config.orientation === 'portrait' ? '297mm' : '210mm';

  // Dynamically update the print orientation rule
  const printStyles = `
    @media print {
      @page { size: A4 ${config.orientation}; margin: 0; }
      body { 
        margin: 0; 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: white;
      }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      /* Reset any preview scaling for the actual print */
      .sheet-wrapper {
        transform: scale(1) !important;
        margin: 0 !important;
        page-break-after: always;
      }
      .sheet-container {
        box-shadow: none !important;
        border: none !important;
      }
    }
  `;

  return (
    <div className="min-h-screen pb-20 font-sans text-neutral-900 bg-neutral-200">
      <style>{printStyles}</style>

      {/* Interactive Top Toolbar (Hidden on Print) */}
      <div className="no-print bg-white p-4 shadow-md flex flex-wrap items-center justify-between sticky top-0 z-50 gap-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-neutral-800">
          <span className="text-2xl">🐈</span> 
          Cat Booklet Binder
        </h1>
        
        <div className="flex flex-wrap items-center gap-6 bg-neutral-50 px-4 py-2 rounded-lg border border-neutral-200">
          <label className="font-semibold text-sm flex items-center gap-2">
            Notebook Size:
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="border border-neutral-300 rounded p-1 text-base bg-white cursor-pointer"
            >
              {Object.keys(SIZES).map(s => (
                <option key={s} value={s}>{s} ({SIZES[s].totalPages} pgs)</option>
              ))}
            </select>
          </label>

          <label className="font-semibold text-sm flex items-center gap-2 border-l pl-6 border-neutral-300">
            Preview Zoom:
            <input 
              type="range" min="0.3" max="1" step="0.05" 
              value={previewScale} 
              onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
              className="w-24 cursor-pointer"
            />
            <span className="w-8 text-right font-mono text-neutral-500">
              {Math.round(previewScale * 100)}%
            </span>
          </label>
        </div>

        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow transition-colors cursor-pointer"
        >
          Print / Save PDF
        </button>
      </div>

      {/* User Printing Instructions */}
      <div className="no-print text-center py-4 text-sm text-neutral-600 bg-blue-50 border-b border-blue-100">
        💡 <b>How to print:</b> Set scale to 100%, Margins to "None", Print Double-Sided. 
        <span className="font-bold ml-1 text-blue-800">
          {config.orientation === 'portrait' ? 'Flip on LONG edge.' : 'Flip on SHORT edge.'}
        </span>
      </div>

      {/* Visual Previews of the A4 Sheets */}
      <div className="flex flex-col xl:flex-row items-start justify-center gap-12 p-8" style={{ transformOrigin: 'top center' }}>
        
        {/* FRONT SHEET */}
        <div className="sheet-wrapper flex flex-col items-center" style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }}>
          <h2 className="no-print font-bold text-neutral-500 tracking-widest uppercase mb-4 text-2xl">Front Sheet</h2>
          <div 
            className="sheet-container bg-white shadow-2xl relative grid border-t border-l border-neutral-300 print:border-none"
            style={{ width: sheetWidth, height: sheetHeight, gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridTemplateRows: `repeat(${config.rows}, 1fr)` }}
          >
            {frontSheet.map((pageNum, idx) => <PageCell key={idx} pageNum={pageNum} />)}
          </div>
        </div>

        {/* BACK SHEET */}
        <div className="sheet-wrapper flex flex-col items-center" style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }}>
          <h2 className="no-print font-bold text-neutral-500 tracking-widest uppercase mb-4 text-2xl">Reverse Sheet</h2>
          <div 
            className="sheet-container bg-white shadow-2xl relative grid border-t border-l border-neutral-300 print:border-none"
            style={{ width: sheetWidth, height: sheetHeight, gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridTemplateRows: `repeat(${config.rows}, 1fr)` }}
          >
            {backSheet.map((pageNum, idx) => <PageCell key={idx} pageNum={pageNum} />)}
          </div>
        </div>

      </div>
    </div>
  );
}

// Individual Page Component
function PageCell({ pageNum }: { pageNum: number; key?: number | string }) {
  // Right-side pages in a spread are always odd numbers, Left are even.
  const isRightPage = pageNum % 2 !== 0;

  return (
    <div className="box-border relative flex flex-col border-r border-b border-dashed border-neutral-300" style={{ padding: '0.5cm' }}>
      
      {/* Inner Content Area (Safe Zone) */}
      <div className="flex-1 relative flex flex-col w-full h-full">
        
        {/* Bujo Dots Background (0.5cm spacing) */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #a3a3a3 1px, transparent 1px)',
            backgroundSize: '5mm 5mm',
            backgroundPosition: 'top left',
          }}
        />

        {/* Gatrivi Header */}
        <div className="relative z-10 w-full flex justify-center pt-1">
          <span className="bg-white px-2 text-[10px] font-serif text-neutral-500 tracking-[0.2em] uppercase">
            gatrivi
          </span>
        </div>

        <div className="flex-1" />

        {/* Page Number (Alternating Corners) */}
        <div className={`relative z-10 w-full flex ${isRightPage ? 'justify-end' : 'justify-start'}`}>
          <span className="bg-white px-1 text-[11px] font-semibold text-neutral-400 tabular-nums leading-none">
            {pageNum}
          </span>
        </div>
        
      </div>
    </div>
  );
}
