import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Check, 
  AlertCircle, 
  FileSpreadsheet, 
  Trash2, 
  Info,
  X,
  Loader2
} from 'lucide-react';
import { PortfolioHolding } from '../../types/business-os';
import { saveBatchPortfolioHoldings } from '../../lib/firestore-service';

interface CSVRow {
  ticker: string;
  name: string;
  exchange: string;
  assetClass: string;
  currency: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}

interface ValidationError {
  row: number;
  message: string;
  level: 'error' | 'warning';
}

interface PortfolioCSVImporterProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export const PortfolioCSVImporter: React.FC<PortfolioCSVImporterProps> = ({ onClose, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const cleanHeader = (h: string): string => {
    return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please upload a valid CSV file (.csv).');
      return;
    }
    
    setFile(selectedFile);
    setErrors([]);
    setParsedData([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      setErrors([{ row: 0, message: 'CSV file appears to be empty or lacks column headers.', level: 'error' }]);
      return;
    }

    // Parse headers
    const rawHeaders = lines[0].split(',');
    const headers = rawHeaders.map(cleanHeader);
    
    // Find column indexes
    const tickerIdx = headers.findIndex(h => h === 'ticker' || h === 'symbol' || h === 'asset');
    const quantityIdx = headers.findIndex(h => h === 'quantity' || h === 'qty' || h === 'count' || h === 'shares');
    const priceIdx = headers.findIndex(h => h === 'purchaseprice' || h === 'price' || h === 'cost' || h === 'avgcost' || h === 'costbasis');
    
    // Optional column indexes
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'company' || h === 'description');
    const exchangeIdx = headers.findIndex(h => h === 'exchange' || h === 'market');
    const assetClassIdx = headers.findIndex(h => h === 'assetclass' || h === 'type');
    const currencyIdx = headers.findIndex(h => h === 'currency' || h === 'curr');
    const dateIdx = headers.findIndex(h => h === 'purchasedate' || h === 'date' || h === 'tradedate');

    const newErrors: ValidationError[] = [];

    if (tickerIdx === -1) {
      newErrors.push({ row: 0, message: 'Required column "Ticker" / "Symbol" not identified.', level: 'error' });
    }
    if (quantityIdx === -1) {
      newErrors.push({ row: 0, message: 'Required column "Quantity" / "Shares" not identified.', level: 'error' });
    }
    if (priceIdx === -1) {
      newErrors.push({ row: 0, message: 'Required column "Purchase Price" / "Cost" not identified.', level: 'error' });
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV line splitting taking care of simple quotes
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const rowNum = i + 1;

      const rawTicker = values[tickerIdx];
      const rawQty = values[quantityIdx];
      const rawPrice = values[priceIdx];

      if (!rawTicker) {
        newErrors.push({ row: rowNum, message: 'Ticker symbol is missing.', level: 'error' });
        continue;
      }

      const ticker = rawTicker.toUpperCase().replace(/\s+/g, '');
      const quantity = parseFloat(rawQty);
      const purchasePrice = parseFloat(rawPrice.replace(/[$,₹]/g, ''));

      if (isNaN(quantity) || quantity <= 0) {
        newErrors.push({ row: rowNum, message: `Invalid quantity "${rawQty}". Must be positive number.`, level: 'error' });
        continue;
      }

      if (isNaN(purchasePrice) || purchasePrice < 0) {
        newErrors.push({ row: rowNum, message: `Invalid purchase price "${rawPrice}". Must be non-negative.`, level: 'error' });
        continue;
      }

      // Infer or resolve optional attributes
      const isIndia = ticker.endsWith('.NS') || ticker.endsWith('.BO') || ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'].includes(ticker);
      const defaultCurrency = isIndia ? 'INR' : 'USD';
      const defaultExchange = isIndia ? (ticker.endsWith('.BO') ? 'BSE' : 'NSE') : 'NASDAQ';

      const row: CSVRow = {
        ticker,
        name: (nameIdx !== -1 && values[nameIdx]) ? values[nameIdx] : ticker,
        exchange: (exchangeIdx !== -1 && values[exchangeIdx]) ? values[exchangeIdx].toUpperCase() : defaultExchange,
        assetClass: (assetClassIdx !== -1 && values[assetClassIdx]) ? values[assetClassIdx] : 'Equity',
        currency: (currencyIdx !== -1 && values[currencyIdx]) ? values[currencyIdx].toUpperCase() : defaultCurrency,
        quantity,
        purchasePrice,
        purchaseDate: (dateIdx !== -1 && values[dateIdx]) ? values[dateIdx] : new Date().toISOString().split('T')[0]
      };

      rows.push(row);
    }

    setErrors(newErrors);
    setParsedData(rows);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);

    try {
      const holdingsToSave: PortfolioHolding[] = parsedData.map((row, idx) => {
        const totalCost = row.quantity * row.purchasePrice;
        return {
          id: `holding_${row.ticker.toLowerCase()}_${Date.now()}_${idx}`,
          ticker: row.ticker,
          symbol: row.ticker,
          name: row.name,
          exchange: row.exchange,
          currency: row.currency,
          assetClass: row.assetClass,
          quantity: row.quantity,
          purchasePrice: row.purchasePrice,
          purchaseDate: row.purchaseDate,
          currentPrice: row.purchasePrice, // Initialized to buy price until batch quote refresh
          totalCost,
          currentValue: totalCost,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          notes: 'Imported via Brokerage Trade CSV',
          lastUpdated: new Date().toISOString()
        };
      });

      await saveBatchPortfolioHoldings(holdingsToSave);
      onImportComplete();
      onClose();
    } catch (err: any) {
      setErrors(prev => [...prev, { row: 0, message: `Failed to commit holdings: ${err.message}`, level: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = 'Ticker,Name,Quantity,PurchasePrice,PurchaseDate,Exchange,AssetClass,Currency\n' +
      'AAPL,Apple Inc.,50,185.50,2024-01-15,NASDAQ,Equity,USD\n' +
      'NVDA,NVIDIA Corporation,40,118.20,2024-03-20,NASDAQ,Equity,USD\n' +
      'MSFT,Microsoft Corporation,25,412.00,2024-02-10,NASDAQ,Equity,USD\n' +
      'RELIANCE.NS,Reliance Industries,100,2850.00,2024-04-05,NSE,Equity,INR\n';
    
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'NewsTracker_Portfolio_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#E6E5DE] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C1B18] text-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1C1B18]">
                Import Brokerage Holdings CSV
              </h2>
              <p className="text-xs font-mono text-[#68665E]">
                Fidelity, Schwab, Robinhood, Zerodha, Groww & generic trades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#68665E] hover:text-[#1C1B18] rounded-xl hover:bg-[#FAF9F5] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E6E5DE] hover:border-[#1C1B18] rounded-2xl p-8 text-center cursor-pointer bg-[#FCFAF6] hover:bg-[#FFFFFF] transition-all flex flex-col items-center justify-center gap-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#FAF9F5] border border-[#E6E5DE] flex items-center justify-center text-[#68665E]">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#1C1B18]">
                {file ? file.name : 'Click to select or drag and drop your trade CSV'}
              </p>
              <p className="text-xs text-[#68665E] font-mono">
                Supports Ticker, Quantity, Price, Date, Exchange headers
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadTemplate();
              }}
              className="mt-2 text-xs font-mono text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              Download standardized CSV template (.csv)
            </button>
          </div>

          {/* Validation Alerts */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1.5 text-xs text-red-800 font-mono">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Validation Warnings ({errors.length})
              </div>
              <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-y-auto">
                {errors.map((err, i) => (
                  <li key={i}>
                    {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#1C1B18]">
                  Parsed Positions Preview ({parsedData.length} records)
                </span>
                <span className="text-[#68665E]">
                  Ready to commit to single-user Firestore
                </span>
              </div>

              <div className="border border-[#E6E5DE] rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#FAF9F5] border-b border-[#E6E5DE] text-[#68665E]">
                    <tr>
                      <th className="py-2.5 px-3">Ticker</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3 text-right">Shares</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3">Market</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E5DE]">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#FCFAF6]">
                        <td className="py-2 px-3 font-bold text-[#1C1B18]">{row.ticker}</td>
                        <td className="py-2 px-3 text-[#68665E] truncate max-w-[150px]">{row.name}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#1C1B18]">{row.quantity.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#1C1B18]">
                          {row.currency === 'INR' ? '₹' : '$'}{row.purchasePrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-[#68665E]">{row.exchange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E6E5DE] bg-[#FAF9F5] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[#68665E] hover:text-[#1C1B18] transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleImport}
            disabled={parsedData.length === 0 || loading}
            className="px-5 py-2.5 rounded-xl bg-[#1C1B18] text-white text-xs font-mono font-bold hover:bg-[#33312B] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Committing Holdings...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Import {parsedData.length} Holdings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
