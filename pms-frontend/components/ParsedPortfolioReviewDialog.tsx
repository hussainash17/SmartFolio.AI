import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Edit2, Check, X, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { ParsedPortfolioData, ParsedHolding } from "./UploadPortfolioDialog";
import { formatCurrency, formatPercent } from "../lib/utils";

interface ParsedPortfolioReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedPortfolioData;
  portfolioName: string;
  onApprove: (data: ParsedPortfolioData) => Promise<void>;
  onCancel: () => void;
}

export function ParsedPortfolioReviewDialog({
  open,
  onOpenChange,
  parsedData,
  portfolioName,
  onApprove,
  onCancel
}: ParsedPortfolioReviewDialogProps) {
  const [editableData, setEditableData] = useState<ParsedPortfolioData>(parsedData);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingHolding, setEditingHolding] = useState<ParsedHolding | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const handleEditHolding = (index: number) => {
    setEditingIndex(index);
    setEditingHolding({ ...editableData.holdings[index] });
  };

  const handleSaveHolding = () => {
    if (editingIndex !== null && editingHolding) {
      const updatedHoldings = [...editableData.holdings];
      updatedHoldings[editingIndex] = editingHolding;
      setEditableData({
        ...editableData,
        holdings: updatedHoldings
      });
      setEditingIndex(null);
      setEditingHolding(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingHolding(null);
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      await onApprove(editableData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isFullWidth ? 'max-w-[95vw]' : 'max-w-4xl'} w-full max-h-[95vh] flex flex-col p-0 transition-all duration-300`}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Review Parsed Portfolio Data
              </DialogTitle>
              <DialogDescription className="mt-2">
                Review the extracted data from your PDF statement for <strong>{portfolioName}</strong>. 
                You can edit any field if the parsing was incorrect.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="h-8 w-8 p-0 shrink-0"
              title={isFullWidth ? "Reduce width" : "Expand width"}
            >
              {isFullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📋 Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Client Code</Label>
                  <p className="text-sm font-medium">{editableData.clientInfo.clientCode}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">BO ID</Label>
                  <p className="text-sm font-medium">{editableData.clientInfo.boId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium">{editableData.clientInfo.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Statement Date</Label>
                  <p className="text-sm font-medium">{editableData.clientInfo.statementDate}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Account Type</Label>
                  <Badge variant="outline">{editableData.clientInfo.accountType}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Holdings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>📊 Holdings ({editableData.holdings.length} stocks)</span>
                <Badge variant="secondary" className="text-xs">
                  Click <Edit2 className="h-3 w-3 inline mx-1" /> to edit
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Symbol</TableHead>
                    <TableHead className="min-w-[180px]">Company</TableHead>
                    <TableHead className="text-right min-w-[80px]">Qty</TableHead>
                    <TableHead className="text-right min-w-[100px]">Cost Price</TableHead>
                    <TableHead className="text-right min-w-[110px]">Market Price</TableHead>
                    <TableHead className="text-right min-w-[120px]">Market Value</TableHead>
                    <TableHead className="text-right min-w-[100px]">Gain/Loss</TableHead>
                    <TableHead className="text-right min-w-[80px]">%</TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editableData.holdings.map((holding, index) => (
                    <TableRow key={index}>
                      {editingIndex === index && editingHolding ? (
                        <>
                          <TableCell>
                            <Input
                              value={editingHolding.symbol}
                              onChange={(e) => setEditingHolding({ ...editingHolding, symbol: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editingHolding.companyName}
                              onChange={(e) => setEditingHolding({ ...editingHolding, companyName: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingHolding.quantity}
                              onChange={(e) => setEditingHolding({ ...editingHolding, quantity: Number(e.target.value) })}
                              className="h-8 text-xs text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingHolding.costPrice}
                              onChange={(e) => setEditingHolding({ ...editingHolding, costPrice: Number(e.target.value) })}
                              className="h-8 text-xs text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingHolding.marketPrice}
                              onChange={(e) => setEditingHolding({ ...editingHolding, marketPrice: Number(e.target.value) })}
                              className="h-8 text-xs text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingHolding.marketValue}
                              onChange={(e) => setEditingHolding({ ...editingHolding, marketValue: Number(e.target.value) })}
                              className="h-8 text-xs text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingHolding.unrealizedGainLoss}
                              onChange={(e) => setEditingHolding({ ...editingHolding, unrealizedGainLoss: Number(e.target.value) })}
                              className="h-8 text-xs text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editingHolding.unrealizedGainLossPercent}
                              onChange={(e) => setEditingHolding({ ...editingHolding, unrealizedGainLossPercent: Number(e.target.value) })}
                              className="h-8 text-xs text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveHolding}
                                className="h-7 w-7 p-0 text-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="h-7 w-7 p-0 text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <span className="font-medium text-sm">{holding.symbol}</span>
                          </TableCell>
                          <TableCell className="text-sm">{holding.companyName}</TableCell>
                          <TableCell className="text-right text-sm">{holding.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(holding.costPrice)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(holding.marketPrice)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(holding.marketValue)}</TableCell>
                          <TableCell className={`text-right text-sm ${holding.unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <div className="flex items-center justify-end gap-1">
                              {holding.unrealizedGainLoss >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {formatCurrency(holding.unrealizedGainLoss)}
                            </div>
                          </TableCell>
                          <TableCell className={`text-right text-sm ${holding.unrealizedGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(holding.unrealizedGainLossPercent)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditHolding(index)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <span className="text-sm font-medium">Total Portfolio Value</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(editableData.totalPortfolioValue)}
                  </span>
                </div>
                <div className={`flex items-center justify-between p-4 rounded-lg ${
                  editableData.totalUnrealizedGainLoss >= 0 
                    ? 'bg-green-50 dark:bg-green-950/20' 
                    : 'bg-red-50 dark:bg-red-950/20'
                }`}>
                  <span className="text-sm font-medium">Total Unrealized Gain/Loss</span>
                  <span className={`text-lg font-bold ${
                    editableData.totalUnrealizedGainLoss >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(editableData.totalUnrealizedGainLoss)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Review Before Approving
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  Please carefully review all parsed data. Click the edit icon to modify any incorrect values. 
                  Once approved, these holdings will be added to your portfolio.
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            className="bg-green-600 hover:bg-green-700"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve & Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
