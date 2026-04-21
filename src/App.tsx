import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Upload, Type, Layout, Printer, Image as ImageIcon, X, Images, Trash2, BoxSelect, Maximize, ArrowUp, Target, Info, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SizeConfig = { name: string, cols: number, rows: number, orientation: 'portrait' | 'landscape', totalPages: number };

const SIZES: Record<string, SizeConfig> = {
  A8: { name: 'A8', cols: 4, rows: 4, orientation: 'portrait', totalPages: 32 },
  A7: { name: 'A7', cols: 4, rows: 2, orientation: 'landscape', totalPages: 16 },
  A6: { name: 'A6', cols: 2, rows: 2, orientation: 'portrait', totalPages: 8 },
  A5: { name: 'A5', cols: 2, rows: 1, orientation: 'landscape', totalPages: 4 },
};

export type PageData = {
  pageNum: number;
  imageUrl: string | null;
  text: string;
  textStyle: 'none' | 'outline' | 'glass';
  imageFit: 'cover' | 'contain';
};

// Imposition math
function getImposition(config: SizeConfig) {
  const N = config.totalPages;
  const spreadCols = config.cols / 2;
  const spreadRows = config.rows;
  
  const front = new Array<number>(N / 2);
  const back = new Array<number>(N / 2);

  for (let r = 0; r < spreadRows; r++) {
    for (let c = 0; c < spreadCols; c++) {
      const spreadIndex = r * spreadCols + c;
      
      front[r * config.cols + 2 * c] = N - 2 * spreadIndex;
      front[r * config.cols + 2 * c + 1] = 2 * spreadIndex + 1;

      const leftPageBack = 2 * spreadIndex + 2;
      const rightPageBack = N - 2 * spreadIndex - 1;

      const backC = spreadCols - 1 - c;
      back[r * config.cols + 2 * backC] = leftPageBack;
      back[r * config.cols + 2 * backC + 1] = rightPageBack;
    }
  }
  return { frontSheet: front, backSheet: back };
}

export default function App() {
  const [appMode, setAppMode] = useState<'notebook' | 'booklet' | 'calibrate'>('notebook');
  const [size, setSize] = useState('A8');
  const [previewScale, setPreviewScale] = useState(0.5);
  const [mode, setMode] = useState<'edit' | 'print'>('edit');
  const [pages, setPages] = useState<PageData[]>([]);
  
  const config = SIZES[size];
  const { frontSheet, backSheet } = useMemo(() => getImposition(config), [config]);

  // Initialize or resize pages
  useEffect(() => {
    setPages(prev => {
      const N = SIZES[size].totalPages;
      const newPages = [...prev];
      // Extend if necessary
      while (newPages.length < N) {
        newPages.push({
          pageNum: newPages.length + 1,
          imageUrl: null,
          text: '',
          textStyle: 'outline',
          imageFit: 'cover'
        });
      }
      // If shrinking, we just keep the extra pages in memory, but only slice/use N pages
      return newPages;
    });
  }, [size]);

  const activePages = pages.slice(0, config.totalPages);

  const updatePage = (pageNum: number, updates: Partial<PageData>) => {
    setPages(prev => {
      const next = [...prev];
      const idx = pageNum - 1;
      if (next[idx]) {
        next[idx] = { ...next[idx], ...updates };
      }
      return next;
    });
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;

    setPages(prev => {
      const next = [...prev];
      let fileIdx = 0;
      for (let i = 0; i < config.totalPages && fileIdx < files.length; i++) {
        if (!next[i].imageUrl) { // only fill empty slots
          next[i] = {
            ...next[i],
            imageUrl: URL.createObjectURL(files[fileIdx])
          };
          fileIdx++;
        }
      }
      return next;
    });
    
    // Reset file input so same files could be uploaded again
    e.target.value = '';
  };

  const sheetWidth = config.orientation === 'portrait' ? '210mm' : '297mm';
  const sheetHeight = config.orientation === 'portrait' ? '297mm' : '210mm';

  const printStyles = `
    @media print {
      @page { size: A4 ${config.orientation}; margin: 0; }
      body { 
        margin: 0; 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: white;
      }
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
    <div className="min-h-screen bg-neutral-100 font-sans text-neutral-900 pb-20">
      <style>{printStyles}</style>

      {/* Top Toolbar - Hidden on Print */}
      <div className="print:hidden bg-white px-6 py-3 shadow-sm border-b border-neutral-200 flex flex-wrap items-center justify-between sticky top-0 z-50 gap-4">
        <h1 className="text-xl font-black flex items-center gap-2 text-neutral-800 tracking-tight shrink-0">
          <span className="text-2xl">🐈</span> 
          Cat Booklet Binder
        </h1>
        
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200 mr-auto ml-2 lg:ml-6 overflow-x-auto">
          <button 
            onClick={() => setAppMode('notebook')}
            className={cn("whitespace-nowrap px-3 py-1.5 text-sm font-semibold rounded-md transition-colors", appMode === 'notebook' ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
          >
            Blank Notebook
          </button>
          <button 
            onClick={() => setAppMode('booklet')}
            className={cn("whitespace-nowrap px-3 py-1.5 text-sm font-semibold rounded-md transition-colors", appMode === 'booklet' ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
          >
            Custom Booklet
          </button>
          <div className="w-px h-4 bg-neutral-300 mx-1 hidden md:block" />
           <button 
            onClick={() => setAppMode('calibrate')}
            className={cn("whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors text-amber-700", appMode === 'calibrate' ? "bg-amber-100 shadow-sm" : "hover:bg-amber-50 hover:text-amber-800")}
          >
            <Target className="w-4 h-4" /> Calibration Test
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {(appMode === 'booklet' || appMode === 'calibrate') && (
            <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
              <button 
                onClick={() => setMode('edit')}
                className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors", mode === 'edit' ? "bg-white shadow-sm text-blue-600" : "text-neutral-500 hover:text-neutral-700")}
              >
                <Layout className="w-4 h-4" /> Edit Sequence
              </button>
              <button 
                onClick={() => setMode('print')}
                className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors", mode === 'print' ? "bg-white shadow-sm text-blue-600" : "text-neutral-500 hover:text-neutral-700")}
              >
                <Printer className="w-4 h-4" /> Print Preview
              </button>
            </div>
          )}

          <div className="h-6 w-px bg-neutral-300 mx-1 hidden md:block" />

          <label className="font-semibold text-sm flex items-center gap-2">
            Size:
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="border border-neutral-300 rounded-md p-1.5 text-sm bg-white cursor-pointer shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {Object.keys(SIZES).map(s => (
                <option key={s} value={s}>{s} ({SIZES[s].totalPages} p)</option>
              ))}
            </select>
          </label>

          {(appMode === 'notebook' || mode === 'print') && (
            <label className="font-semibold text-sm flex items-center gap-2 ml-2">
              Zoom:
              <input 
                type="range" min="0.3" max="1" step="0.05" 
                value={previewScale} 
                onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                className="w-20 cursor-pointer accent-blue-600"
              />
            </label>
          )}

          {appMode === 'booklet' && mode === 'edit' && (
            <label className="bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2 text-sm ml-2">
              <Images className="w-4 h-4" />
              Batch Upload
              <input type="file" multiple accept="image/*" onChange={handleBulkUpload} className="hidden" />
            </label>
          )}

          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 text-sm ml-2"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {(appMode === 'notebook' || mode === 'print') && appMode !== 'calibrate' && (
        <div className="print:hidden text-center py-2 text-sm text-blue-800 bg-blue-50 border-b border-blue-100 font-medium tracking-wide">
          💡 Set print scale to <span className="font-bold">100%</span>, Margins to <span className="font-bold">"None"</span>, and Print Double-Sided. 
          <span className="font-bold ml-1">
            {config.orientation === 'portrait' ? 'Flip on LONG edge.' : 'Flip on SHORT edge.'}
          </span>
          <span className="ml-4 text-xs text-blue-600 font-normal opacity-80">(Or just press Ctrl+P/Cmd+P while in Edit mode)</span>
        </div>
      )}

      {/* Calibration Testing Explanation Modal */}
      {appMode === 'calibrate' && mode === 'edit' && (
        <div className="max-w-4xl mx-auto mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900 shadow-sm print:hidden mx-4">
           <h2 className="text-xl font-black mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-600" /> Print Failure Anticipation & Tests</h2>
           
           <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-bold flex items-center gap-1 mb-2"><Info className="w-4 h-4 shrink-0" /> 1. Margin Shrinkage</h3>
                <p className="text-sm">Browsers often apply unprintable margins and "Scale to Fit" settings. This unpredictably shrinks the grid and breaks front/back alignment.</p>
                <div className="mt-2 text-xs font-semibold bg-amber-100 px-2 py-1.5 rounded text-amber-800 border border-amber-200 shadow-inner">Fix: Set Print Scale to "100%" or "Actual Size". CSS margins are forced to 0.</div>
              </div>
              <div>
                <h3 className="font-bold flex items-center gap-1 mb-2"><Info className="w-4 h-4 shrink-0" /> 2. Duplex Flip Axis</h3>
                <p className="text-sm">Folding a booklet requires specific two-sided flipping mathematical formulas. If you choose the wrong axis, the back of your pages will be upside down.</p>
                <div className="mt-2 text-xs font-semibold bg-amber-100 px-2 py-1.5 rounded text-amber-800 border border-amber-200 shadow-inner">Fix: Check that you Flip on the <span className="font-black underline px-1">{config.orientation === 'portrait' ? 'LONG' : 'SHORT'}</span> edge.</div>
              </div>
              <div>
                <h3 className="font-bold flex items-center gap-1 mb-2"><Info className="w-4 h-4 shrink-0" /> 3. Hardware Drift</h3>
                <p className="text-sm">When feeding paper back in for the second side, home printers physically slip by 1-2mm. Perfect mechanical alignment doesn't exist.</p>
                <div className="mt-2 text-xs font-semibold bg-amber-100 px-2 py-1.5 rounded text-amber-800 border border-amber-200 shadow-inner">Fix: None! We engineered padded safe-zones inside every cell to absorb this drift invisibly.</div>
              </div>
           </div>

           <div className="mt-6 pt-4 border-t border-amber-200 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
             <div>
               <p className="font-bold text-neutral-800">Ready to test your printer logic & alignment?</p>
               <p className="text-sm text-neutral-600">Click Print and hold the output paper up to a bright light source.</p>
             </div>
             <button onClick={() => { setMode('print'); setTimeout(() => window.print(), 100); }} className="bg-amber-600 hover:bg-amber-700 text-white px-4 md:px-6 py-2 rounded-lg font-bold shadow transition-colors flex items-center gap-2">
               <Printer className="w-4 h-4" /> Print Registration Sheet
             </button>
           </div>
        </div>
      )}

      {/* Editor View (Hide from Print automatically via CSS print:hidden) */}
      <div className={cn("print:hidden", (appMode === 'booklet' && mode === 'edit') ? 'block' : 'hidden')}>
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 lg:gap-8 gap-4">
            {activePages.map((page, idx) => {
              const isFrontCover = idx === 0;
              const isBackCover = idx === activePages.length - 1;

              return (
                <div key={page.pageNum} className="flex flex-col bg-white p-3 rounded-2xl shadow-sm border border-neutral-200">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="font-bold text-neutral-700 text-sm">Page {page.pageNum}</span>
                    {isFrontCover && <span className="text-[10px] uppercase tracking-wider font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Front Cover</span>}
                    {isBackCover && <span className="text-[10px] uppercase tracking-wider font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">Back Cover</span>}
                  </div>
                  
                  {/* Aspect Ratio Preview */}
                  <div className="aspect-[1/1.414] bg-neutral-50 relative rounded-xl overflow-hidden border border-neutral-200 shadow-inner group">
                    <PageRender page={page} isRightPage={page.pageNum % 2 !== 0} />
                    
                    {/* Image Upload Overlay */}
                    <label className="absolute inset-0 z-40 cursor-pointer bg-black/0 group-hover:bg-black/20 focus-within:bg-black/20 transition-all flex items-center justify-center">
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) updatePage(page.pageNum, { imageUrl: URL.createObjectURL(file) });
                      }}/>
                      <Upload className="text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 drop-shadow-md w-8 h-8 transform scale-90 group-hover:scale-100 transition-all" />
                    </label>
                  </div>
                  
                  {/* Controls below card */}
                  <div className="mt-3 flex flex-col gap-2">
                    <input 
                      type="text" 
                      placeholder="Add text overlay..." 
                      value={page.text}
                      onChange={(e) => updatePage(page.pageNum, { text: e.target.value })}
                      className="w-full bg-neutral-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    
                    <div className="flex items-center justify-between gap-1 mt-1">
                      {/* Fit Toggle */}
                      <button 
                        onClick={() => updatePage(page.pageNum, { imageFit: page.imageFit === 'cover' ? 'contain' : 'cover' })}
                        className={cn("flex-1 flex justify-center items-center py-1.5 rounded-md transition-colors text-xs font-semibold border", page.imageUrl ? "hover:bg-neutral-100 text-neutral-700" : "opacity-50 cursor-not-allowed")}
                        disabled={!page.imageUrl}
                        title={`Image Fit: ${page.imageFit}`}
                      >
                        {page.imageFit === 'cover' ? <Maximize className="w-3.5 h-3.5" /> : <BoxSelect className="w-3.5 h-3.5" />}
                      </button>

                      {/* Text Style Toggle */}
                      <button 
                        onClick={() => {
                          const nextStyle = page.textStyle === 'outline' ? 'glass' : page.textStyle === 'glass' ? 'none' : 'outline';
                          updatePage(page.pageNum, { textStyle: nextStyle });
                        }}
                        className={cn("flex-2 flex justify-center items-center py-1.5 px-2 rounded-md transition-colors text-xs font-semibold border hover:bg-neutral-100 text-neutral-700")}
                        title={`Text Style: ${page.textStyle}`}
                      >
                        <Type className="w-3.5 h-3.5 mr-1" /> {page.textStyle === 'outline' ? 'Outline' : page.textStyle === 'glass' ? 'Glass' : 'Solid'}
                      </button>

                      {/* Clear Image */}
                      <button 
                        onClick={() => updatePage(page.pageNum, { imageUrl: null })}
                        className={cn("flex-1 flex justify-center items-center py-1.5 rounded-md transition-colors text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50", !page.imageUrl && "opacity-50 cursor-not-allowed")}
                        disabled={!page.imageUrl}
                        title="Clear Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Print View (Always block for print mode, visually toggled on screen) */}
      <div className={cn("print:flex print:flex-col print:items-center", (appMode === 'notebook' || appMode === 'calibrate' || mode === 'print') ? 'flex flex-col xl:flex-row items-center xl:items-start justify-center gap-12 p-8' : 'hidden')}>
        
        {/* FRONT SHEET */}
        <div className={cn("sheet-wrapper flex flex-col items-center", appMode === 'calibrate' && mode === 'edit' && 'hidden print:flex')} style={{ transform: (appMode === 'notebook' || mode === 'print' || appMode === 'calibrate') ? `scale(${previewScale})` : 'none', transformOrigin: 'top center' }}>
          <h2 className="print:hidden font-bold text-neutral-400 tracking-widest uppercase mb-4 text-xl">Front Sheet</h2>
          <div 
            className="sheet-container bg-white shadow-xl relative grid border-t border-l border-neutral-300 print:border-none"
            style={{ width: sheetWidth, height: sheetHeight, gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridTemplateRows: `repeat(${config.rows}, 1fr)` }}
          >
            {frontSheet.map((pageNum, idx) => {
              const page = appMode === 'notebook' || appMode === 'calibrate'
                ? { pageNum, imageUrl: null, text: '', textStyle: 'none', imageFit: 'cover' } as PageData
                : activePages[pageNum - 1]; // activePages is 0-indexed, pageNum is 1-indexed
              return <PageCellWrapper key={`f-${idx}`} page={page} isRightPage={pageNum % 2 !== 0} appMode={appMode} isFront={true} expectedFlip={config.orientation === 'portrait' ? 'LONG' : 'SHORT'} />;
            })}
          </div>
        </div>

        {/* BACK SHEET */}
        <div className={cn("sheet-wrapper flex flex-col items-center", appMode === 'calibrate' && mode === 'edit' && 'hidden print:flex')} style={{ transform: (appMode === 'notebook' || mode === 'print' || appMode === 'calibrate') ? `scale(${previewScale})` : 'none', transformOrigin: 'top center' }}>
          <h2 className="print:hidden font-bold text-neutral-400 tracking-widest uppercase mb-4 text-xl">Reverse Sheet</h2>
          <div 
            className="sheet-container bg-white shadow-xl relative grid border-t border-l border-neutral-300 print:border-none"
            style={{ width: sheetWidth, height: sheetHeight, gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridTemplateRows: `repeat(${config.rows}, 1fr)` }}
          >
            {backSheet.map((pageNum, idx) => {
              const page = appMode === 'notebook' || appMode === 'calibrate'
                ? { pageNum, imageUrl: null, text: '', textStyle: 'none', imageFit: 'cover' } as PageData
                : activePages[pageNum - 1];
              return <PageCellWrapper key={`b-${idx}`} page={page} isRightPage={pageNum % 2 !== 0} appMode={appMode} isFront={false} expectedFlip={config.orientation === 'portrait' ? 'LONG' : 'SHORT'} />;
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// Wrapper for the print grid
function PageCellWrapper({ page, isRightPage, appMode, isFront, expectedFlip }: { page: PageData, isRightPage: boolean, appMode?: string, isFront?: boolean, expectedFlip?: string, key?: string | number }) {
  if (!page && appMode !== 'calibrate') return <div className="border-r border-b border-dashed border-neutral-300" />;
  
  return (
    <div className="box-border relative flex flex-col border-r border-b border-dashed border-neutral-300 print:border-none p-[0.3cm] md:p-[0.5cm]">
       {appMode === 'calibrate' ? (
         <CalibrationRender isFront={isFront!} expectedFlip={expectedFlip!} />
       ) : (
         <PageRender page={page} isRightPage={isRightPage} isPrintMode={true} />
       )}
    </div>
  );
}

// Dedicated hardware anticipation calibration layout
function CalibrationRender({ isFront, expectedFlip }: { isFront: boolean, expectedFlip: string }) {
   return (
      <div className="absolute inset-[0.3cm] md:inset-[0.5cm] border-[1px] md:border-2 border-amber-300 bg-amber-50/20 flex flex-col justify-center items-center p-2 text-center text-amber-900 break-words print:border-black print:text-black print:border-[2px]">
        <ArrowUp className="absolute top-1 w-6 h-6 md:top-2 md:w-8 md:h-8 text-amber-400 print:text-black" />
        <div className="font-black text-xs md:text-lg lg:text-xl uppercase mt-[15%] tracking-widest leading-none">{isFront ? 'Front Side' : 'Back Side'}</div>
        
        {!isFront && (
           <div className="mt-2 md:mt-4 text-[7px] md:text-xs font-semibold bg-white p-1 md:p-2 border border-amber-200 print:border-black print:border-dashed rounded shadow-sm print:drop-shadow-none leading-tight">
              If this box is upside down,<br className="hidden md:block" />
              <b className="uppercase print:text-xs md:print:text-lg tracking-tight">FLIP ON {expectedFlip} EDGE</b>
           </div>
        )}
        
        {/* Registration Line Crosshairs */}
        <div className="absolute bottom-1 md:bottom-2 left-1 md:left-2 right-1 md:right-2 flex justify-between items-end">
          <div className="w-2 md:w-3 h-2 md:h-3 border-l-2 border-b-2 border-amber-400 print:border-black pointer-events-none" />
          <div className="text-[5px] md:text-[8px] opacity-60 font-bold uppercase tracking-widest px-1 md:px-2 leading-tight">Hold to light.<br/>Corners align perfectly if scale is 100%.</div>
          <div className="w-2 md:w-3 h-2 md:h-3 border-r-2 border-b-2 border-amber-400 print:border-black pointer-events-none" />
        </div>
        <div className="absolute top-1 md:top-2 left-1 md:left-2 right-1 md:right-2 flex justify-between items-start pointer-events-none">
           <div className="w-2 md:w-3 h-2 md:h-3 border-l-2 border-t-2 border-amber-400 print:border-black" />
           <div className="w-2 md:w-3 h-2 md:h-3 border-r-2 border-t-2 border-amber-400 print:border-black" />
        </div>
      </div>
   )
}

// The actual re-usable visual rendering of a page content
function PageRender({ page, isRightPage, isPrintMode = false }: { page: PageData, isRightPage: boolean, isPrintMode?: boolean }) {
  const outlineStyle = {
    textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0px 3px 5px rgba(0,0,0,0.6)',
  };

  return (
    <div className="relative w-full h-full bg-white overflow-hidden rounded-sm flex flex-col">
      {/* Background Dots */}
      {(!page.imageUrl || page.imageFit === 'contain') && (
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-80"
          style={{
            backgroundImage: 'radial-gradient(circle, #a3a3a3 1px, transparent 1px)',
            backgroundSize: '5mm 5mm',
            backgroundPosition: 'top left',
          }}
        />
      )}

      {/* Image */}
      {page.imageUrl && (
        <img 
          src={page.imageUrl} 
          className={cn("absolute inset-0 w-full h-full z-10", page.imageFit === 'cover' ? 'object-cover' : 'object-contain')}
          alt={`Page ${page.pageNum}`} 
        />
      )}

      {/* Text Overlay */}
      {page.text && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 z-20 pointer-events-none">
          {page.textStyle === 'glass' && (
            <div className="bg-white/40 backdrop-blur-md text-neutral-900 border border-white/50 px-3 py-2 rounded-xl shadow-lg text-center font-bold text-sm max-w-full break-words">
              {page.text}
            </div>
          )}
          {page.textStyle === 'outline' && (
            <div className="text-white font-black text-center text-lg max-w-full break-words tracking-tight leading-tight" style={outlineStyle}>
              {page.text}
            </div>
          )}
          {page.textStyle === 'none' && (
            <div className="text-neutral-900 font-bold bg-white/90 px-3 py-1.5 shadow-md rounded-md text-center max-w-full break-words text-sm border border-neutral-200">
              {page.text}
            </div>
          )}
        </div>
      )}

      {/* Gatrivi Header (Only visible if no image or contain mode) */}
      <div className="absolute top-1 left-0 right-0 z-30 flex justify-center pointer-events-none">
        {(!page.imageUrl || page.imageFit === 'contain') && (
          <span className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-b-md text-[9px] font-serif text-neutral-500 tracking-[0.2em] uppercase shadow-sm">
            gatrivi
          </span>
        )}
      </div>

      {/* Page Number */}
      <div className={cn("absolute bottom-1 z-30 pointer-events-none flex drop-shadow-sm", isRightPage ? 'right-1' : 'left-1')}>
         <span className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] md:text-[11px] font-semibold text-neutral-600 tabular-nums leading-none shadow-sm rounded-md border border-neutral-100">
           {page.pageNum}
         </span>
      </div>
    </div>
  );
}
