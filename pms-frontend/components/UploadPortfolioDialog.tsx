import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { ParsedPortfolioReviewDialog } from "./ParsedPortfolioReviewDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { OpenAPI, PortfolioService } from "../src/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../hooks/queryKeys";

interface UploadPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId?: string;
  portfolioName?: string;
}

export interface ParsedHolding {
  symbol: string;
  companyName: string;
  quantity: number;
  costPrice: number;
  marketPrice: number;
  marketValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
}

export interface ParsedPortfolioData {
  clientInfo: {
    clientCode: string;
    boId: string;
    name: string;
    statementDate: string;
    accountType: string;
  };
  holdings: ParsedHolding[];
  totalPortfolioValue: number;
  totalUnrealizedGainLoss: number;
}

// Transform snake_case API response to camelCase
function transformApiResponse(apiData: any): ParsedPortfolioData {
  return {
    clientInfo: {
      clientCode: apiData.client_info.client_code,
      boId: apiData.client_info.bo_id,
      name: apiData.client_info.name,
      statementDate: apiData.client_info.statement_date,
      accountType: apiData.client_info.account_type,
    },
    holdings: apiData.holdings.map((holding: any) => ({
      symbol: holding.symbol,
      companyName: holding.company_name,
      quantity: Number(holding.quantity),
      costPrice: Number(holding.cost_price),
      marketPrice: Number(holding.market_price),
      marketValue: Number(holding.market_value),
      unrealizedGainLoss: Number(holding.unrealized_gain_loss),
      unrealizedGainLossPercent: Number(holding.unrealized_gain_loss_percent),
    })),
    totalPortfolioValue: Number(apiData.total_portfolio_value),
    totalUnrealizedGainLoss: Number(apiData.total_unrealized_gain_loss),
  };
}

// Transform camelCase data back to snake_case for backend
function transformToSnakeCase(data: ParsedPortfolioData): any {
  return {
    client_info: {
      client_code: data.clientInfo.clientCode,
      bo_id: data.clientInfo.boId,
      name: data.clientInfo.name,
      statement_date: data.clientInfo.statementDate,
      account_type: data.clientInfo.accountType,
    },
    holdings: data.holdings.map((holding) => ({
      symbol: holding.symbol,
      company_name: holding.companyName,
      quantity: holding.quantity,
      cost_price: holding.costPrice,
      market_price: holding.marketPrice,
      market_value: holding.marketValue,
      unrealized_gain_loss: holding.unrealizedGainLoss,
      unrealized_gain_loss_percent: holding.unrealizedGainLossPercent,
    })),
    total_portfolio_value: data.totalPortfolioValue,
    total_unrealized_gain_loss: data.totalUnrealizedGainLoss,
  };
}

// Broker house list
const BROKER_HOUSES = [
  { value: "kscl", label: "K-Securities and Consultants Limited" },
  { value: "brac_epl", label: "BRAC EPL Stock Brokerage" },
  { value: "lankabangla", label: "LankaBangla Securities Ltd." },
  { value: "idlc", label: "IDLC Securities Limited" },
  { value: "ucb", label: "UCB Capital Management Ltd." },
  { value: "shanta", label: "Shanta Securities" },
  { value: "doha", label: "Doha Securities Limited" },
];

export function UploadPortfolioDialog({ 
  open, 
  onOpenChange, 
  portfolioId,
  portfolioName 
}: UploadPortfolioDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedPortfolioData | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [createdPortfolioId, setCreatedPortfolioId] = useState<string | null>(null);
  const [createdPortfolioName, setCreatedPortfolioName] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedBroker) return;

    setIsUploading(true);
    
    try {
      // If no portfolio provided, create one before parsing
      let targetPortfolioId = portfolioId;
      let targetPortfolioName = portfolioName;
      if (!targetPortfolioId) {
        const suggestedNameParts: string[] = [];
        if (selectedBroker) suggestedNameParts.push(selectedBroker.toUpperCase());
        suggestedNameParts.push("Imported Portfolio");
        const suggestedName = suggestedNameParts.join(" - ");
        const created = await PortfolioService.createPortfolio({
          requestBody: {
            name: suggestedName,
            description: "Created from uploaded portfolio PDF",
            is_default: false,
            is_active: true,
          },
        });
        targetPortfolioId = String((created as any).id);
        targetPortfolioName = (created as any).name || suggestedName;
        setCreatedPortfolioId(targetPortfolioId);
        setCreatedPortfolioName(targetPortfolioName);
        try {
          await PortfolioService.updatePortfolio({
            portfolioId: targetPortfolioId,
            requestBody: ({ cash_balance: 0 } as unknown) as any,
          });
        } catch {}
      }
      // Upload and parse PDF
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
      const response = await fetch(
        `${baseUrl}/api/v1/portfolio/${targetPortfolioId}/upload-statement?broker_house=${selectedBroker}`,
        {
          method: 'POST',
          headers: (OpenAPI as any).TOKEN ? { 
            Authorization: `Bearer ${(OpenAPI as any).TOKEN}` 
          } : undefined,
          credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Failed to parse PDF';
        
        if (response.status === 400) {
          toast.error('Invalid file format or corrupted PDF');
        } else if (response.status === 413) {
          toast.error('File size exceeds limit (max 10MB)');
        } else if (response.status === 422) {
          toast.error('PDF parsing failed. Please check the file format.');
        } else {
          toast.error(errorMessage);
        }
        
        setIsUploading(false);
        return;
      }

      const apiResponse = await response.json();
      const parsedData: ParsedPortfolioData = transformApiResponse(apiResponse);
      
      setIsUploading(false);
      setParsedData(parsedData);
      setShowReviewDialog(true);
      onOpenChange(false);
      toast.success(`PDF parsed successfully! ${targetPortfolioName ? `Target: ${targetPortfolioName}. ` : ''}Please review the data.`);
      
    } catch (error) {
      setIsUploading(false);
      console.error('Upload error:', error);
      toast.error('Failed to upload portfolio statement. Please try again.');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset state when dialog closes
      setSelectedFile(null);
      setSelectedBroker("");
    }
    onOpenChange(open);
  };

  const handleReviewClose = () => {
    setShowReviewDialog(false);
    setSelectedFile(null);
    setParsedData(null);
  };

  const handleReviewApprove = async (data: ParsedPortfolioData) => {
    try {
      const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
      const targetPortfolioId = portfolioId || createdPortfolioId;
      if (!targetPortfolioId) {
        toast.error('No portfolio available to save holdings.');
        return;
      }
      
      // Transform camelCase to snake_case for backend
      const snakeCaseData = transformToSnakeCase(data);
      
      const response = await fetch(
        `${baseUrl}/api/v1/portfolio/${targetPortfolioId}/holdings/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...((OpenAPI as any).TOKEN ? { 
              Authorization: `Bearer ${(OpenAPI as any).TOKEN}` 
            } : {})
          },
          credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
          body: JSON.stringify(snakeCaseData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Failed to save holdings';
        toast.error(errorMessage);
        return;
      }

      const result = await response.json();
      toast.success(`Successfully saved ${result.addedCount || 0} holdings!`);
      
      // Close dialog and reset state
      handleReviewClose();
      setCreatedPortfolioId(null);
      setCreatedPortfolioName(null);
      // Refresh portfolio lists and summary
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save holdings. Please try again.');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Portfolio Statement</DialogTitle>
            <DialogDescription>
              {portfolioName
                ? <>Upload a PDF statement for {portfolioName}. We'll automatically parse your holdings.</>
                : <>Upload a PDF portfolio statement. We'll create a new portfolio from it and parse your holdings.</>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Broker House Selection */}
            <div className="space-y-2">
              <Label htmlFor="broker-select">Select Broker House *</Label>
              <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                <SelectTrigger id="broker-select">
                  <SelectValue placeholder="Choose your broker house" />
                </SelectTrigger>
                <SelectContent>
                  {BROKER_HOUSES.map((broker) => (
                    <SelectItem key={broker.value} value={broker.value}>
                      {broker.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload Section */}
            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF files only (Max 10MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {selectedFile && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> The system will automatically extract holdings, prices, and other details from your PDF statement.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedBroker || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Parse
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {parsedData && (
        <ParsedPortfolioReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          parsedData={parsedData}
          portfolioName={portfolioName}
          onApprove={handleReviewApprove}
          onCancel={handleReviewClose}
        />
      )}
    </>
  );
}
