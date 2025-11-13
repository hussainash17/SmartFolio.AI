import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Shield,
  Save,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Loader2,
  CheckCircle2,
  Info,
  ArrowLeft,
  CircleDot
} from "lucide-react";
import { useUserRiskProfile } from "../hooks/useRisk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RiskManagementService, OpenAPI } from "../src/client";
import { UserRiskProfileCreate, RiskProfile } from "../src/client/types.gen";
import { queryKeys } from "../hooks/queryKeys";
import { toast } from "sonner";

interface RiskSettingsProps {
  onNavigate?: (view: string) => void;
}

// Helper function to normalize values for comparison (handle string/number differences)
const normalizeValue = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "0" : num.toFixed(1);
};

export function RiskSettings({ onNavigate }: RiskSettingsProps) {
  const queryClient = useQueryClient();
  const { data: riskProfile, isLoading, error } = useUserRiskProfile();

  // Form state
  const [riskProfileType, setRiskProfileType] = useState<RiskProfile>("MODERATE");
  const [maxPortfolioVolatility, setMaxPortfolioVolatility] = useState<string>("15.0");
  const [maxSinglePosition, setMaxSinglePosition] = useState<string>("20.0");
  const [maxSectorConcentration, setMaxSectorConcentration] = useState<string>("30.0");
  const [targetSharpeRatio, setTargetSharpeRatio] = useState<string>("1.0");
  const [maxDrawdownTolerance, setMaxDrawdownTolerance] = useState<string>("20.0");
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Track original/saved values for dirty state detection
  const [originalValues, setOriginalValues] = useState<{
    riskProfile: RiskProfile;
    volatility: string;
    singlePosition: string;
    sectorConcentration: string;
    sharpeRatio: string;
    drawdownTolerance: string;
  } | null>(null);

  // Initialize form with fetched data
  useEffect(() => {
    if (riskProfile) {
      setIsInitializing(true);
      const profile = riskProfile.risk_profile || "MODERATE";
      const volatility = normalizeValue(riskProfile.max_portfolio_volatility || "15.0");
      const singlePosition = normalizeValue(riskProfile.max_single_position || "20.0");
      const sectorConcentration = normalizeValue(riskProfile.max_sector_concentration || "30.0");
      const sharpeRatio = normalizeValue(riskProfile.target_sharpe_ratio || "1.0");
      const drawdownTolerance = normalizeValue(riskProfile.max_drawdown_tolerance || "20.0");

      setRiskProfileType(profile);
      setMaxPortfolioVolatility(volatility);
      setMaxSinglePosition(singlePosition);
      setMaxSectorConcentration(sectorConcentration);
      setTargetSharpeRatio(sharpeRatio);
      setMaxDrawdownTolerance(drawdownTolerance);

      // Store original values for comparison
      setOriginalValues({
        riskProfile: profile,
        volatility,
        singlePosition,
        sectorConcentration,
        sharpeRatio,
        drawdownTolerance,
      });
      
      // Mark initialization complete after a short delay to allow state to settle
      setTimeout(() => setIsInitializing(false), 100);
    }
  }, [riskProfile]);

  // Check if form has unsaved changes (normalize values for comparison)
  const hasUnsavedChanges = useMemo(() => {
    if (!originalValues || isInitializing) return false;
    
    return (
      riskProfileType !== originalValues.riskProfile ||
      normalizeValue(maxPortfolioVolatility) !== normalizeValue(originalValues.volatility) ||
      normalizeValue(maxSinglePosition) !== normalizeValue(originalValues.singlePosition) ||
      normalizeValue(maxSectorConcentration) !== normalizeValue(originalValues.sectorConcentration) ||
      normalizeValue(targetSharpeRatio) !== normalizeValue(originalValues.sharpeRatio) ||
      normalizeValue(maxDrawdownTolerance) !== normalizeValue(originalValues.drawdownTolerance)
    );
  }, [
    riskProfileType,
    maxPortfolioVolatility,
    maxSinglePosition,
    maxSectorConcentration,
    targetSharpeRatio,
    maxDrawdownTolerance,
    originalValues,
    isInitializing,
  ]);

  // Apply preset values when risk profile type changes (only if not initializing)
  useEffect(() => {
    if (isInitializing || !originalValues) return;

    const presets = {
      CONSERVATIVE: {
        maxPortfolioVolatility: "10.0",
        maxSinglePosition: "15.0",
        maxSectorConcentration: "25.0",
        targetSharpeRatio: "0.8",
        maxDrawdownTolerance: "15.0",
      },
      MODERATE: {
        maxPortfolioVolatility: "15.0",
        maxSinglePosition: "20.0",
        maxSectorConcentration: "30.0",
        targetSharpeRatio: "1.0",
        maxDrawdownTolerance: "20.0",
      },
      AGGRESSIVE: {
        maxPortfolioVolatility: "25.0",
        maxSinglePosition: "30.0",
        maxSectorConcentration: "40.0",
        targetSharpeRatio: "1.5",
        maxDrawdownTolerance: "30.0",
      },
    };

    const preset = presets[riskProfileType];
    if (preset && riskProfileType !== originalValues.riskProfile) {
      // Only apply preset if user changed the risk profile type
      setMaxPortfolioVolatility(preset.maxPortfolioVolatility);
      setMaxSinglePosition(preset.maxSinglePosition);
      setMaxSectorConcentration(preset.maxSectorConcentration);
      setTargetSharpeRatio(preset.targetSharpeRatio);
      setMaxDrawdownTolerance(preset.maxDrawdownTolerance);
    }
  }, [riskProfileType, isInitializing, originalValues]);

  // Mutation for updating risk profile
  const updateRiskProfileMutation = useMutation({
    mutationFn: async (data: UserRiskProfileCreate) => {
      return RiskManagementService.createUserRiskProfile({ requestBody: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userRiskProfile });
      toast.success("Risk profile updated successfully");
      // Update original values after successful save (normalize values)
      setOriginalValues({
        riskProfile: riskProfileType,
        volatility: normalizeValue(maxPortfolioVolatility),
        singlePosition: normalizeValue(maxSinglePosition),
        sectorConcentration: normalizeValue(maxSectorConcentration),
        sharpeRatio: normalizeValue(targetSharpeRatio),
        drawdownTolerance: normalizeValue(maxDrawdownTolerance),
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update risk profile");
    },
  });

  const handleSave = async () => {
    // Validate inputs
    const volatility = parseFloat(maxPortfolioVolatility);
    const singlePosition = parseFloat(maxSinglePosition);
    const sectorConcentration = parseFloat(maxSectorConcentration);
    const sharpeRatio = parseFloat(targetSharpeRatio);
    const drawdownTolerance = parseFloat(maxDrawdownTolerance);

    if (
      isNaN(volatility) || volatility < 0 || volatility > 100 ||
      isNaN(singlePosition) || singlePosition < 0 || singlePosition > 100 ||
      isNaN(sectorConcentration) || sectorConcentration < 0 || sectorConcentration > 100 ||
      isNaN(sharpeRatio) || sharpeRatio < 0 ||
      isNaN(drawdownTolerance) || drawdownTolerance < 0 || drawdownTolerance > 100
    ) {
      toast.error("Please enter valid values for all fields");
      return;
    }

    setIsSaving(true);
    try {
      await updateRiskProfileMutation.mutateAsync({
        risk_profile: riskProfileType,
        max_portfolio_volatility: volatility,
        max_single_position: singlePosition,
        max_sector_concentration: sectorConcentration,
        target_sharpe_ratio: sharpeRatio,
        max_drawdown_tolerance: drawdownTolerance,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskProfileColor = (profile: RiskProfile) => {
    switch (profile) {
      case "CONSERVATIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "MODERATE":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "AGGRESSIVE":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskProfileDescription = (profile: RiskProfile) => {
    switch (profile) {
      case "CONSERVATIVE":
        return "Lower risk, lower returns. Focus on capital preservation.";
      case "MODERATE":
        return "Balanced approach between risk and return.";
      case "AGGRESSIVE":
        return "Higher risk, higher potential returns. Suitable for long-term growth.";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading risk profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load risk profile. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to go back?")) {
        onNavigate?.("risk-analysis");
      }
    } else {
      onNavigate?.("risk-analysis");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-foreground">Risk Settings</h1>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <CircleDot className="h-3 w-3 mr-1 fill-yellow-600" />
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-lg mt-1">
              Configure your risk tolerance and portfolio risk parameters
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !hasUnsavedChanges} 
          size="lg"
          className={hasUnsavedChanges ? "bg-primary" : ""}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Current Settings Summary */}
      <Card className={`bg-muted/50 ${hasUnsavedChanges ? "border-yellow-300 border-2" : ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Settings Summary</CardTitle>
              <CardDescription>
                {hasUnsavedChanges 
                  ? "You have unsaved changes. Review and save your updates below."
                  : "Review your current risk profile settings below. Update any values as needed."}
              </CardDescription>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <CircleDot className="h-3 w-3 mr-1 fill-yellow-600" />
                Modified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Risk Profile</p>
              <Badge className={getRiskProfileColor(riskProfileType)}>
                {riskProfileType}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Max Volatility</p>
              <p className="text-lg font-semibold">{maxPortfolioVolatility}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Max Position</p>
              <p className="text-lg font-semibold">{maxSinglePosition}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Max Sector</p>
              <p className="text-lg font-semibold">{maxSectorConcentration}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Target Sharpe</p>
              <p className="text-lg font-semibold">{targetSharpeRatio}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Profile Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Profile Type
          </CardTitle>
          <CardDescription>
            Select your overall risk tolerance level. This will set default values for all risk parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="risk-profile">Risk Profile</Label>
            <Select value={riskProfileType} onValueChange={(value) => setRiskProfileType(value as RiskProfile)}>
              <SelectTrigger id="risk-profile" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSERVATIVE">Conservative</SelectItem>
                <SelectItem value="MODERATE">Moderate</SelectItem>
                <SelectItem value="AGGRESSIVE">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{riskProfileType}</strong>: {getRiskProfileDescription(riskProfileType)}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Risk Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Volatility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-4 w-4" />
              Portfolio Volatility
            </CardTitle>
            <CardDescription>
              Maximum acceptable annual volatility for your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="volatility">Max Portfolio Volatility (%)</Label>
              <div className="relative">
                <Input
                  id="volatility"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={maxPortfolioVolatility}
                  onChange={(e) => setMaxPortfolioVolatility(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Lower values indicate lower risk tolerance</span>
            </div>
          </CardContent>
        </Card>

        {/* Single Position Limit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-4 w-4" />
              Single Position Limit
            </CardTitle>
            <CardDescription>
              Maximum percentage of portfolio value in a single holding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="single-position">Max Single Position (%)</Label>
              <div className="relative">
                <Input
                  id="single-position"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={maxSinglePosition}
                  onChange={(e) => setMaxSinglePosition(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Helps prevent over-concentration in individual stocks</span>
            </div>
          </CardContent>
        </Card>

        {/* Sector Concentration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-4 w-4" />
              Sector Concentration
            </CardTitle>
            <CardDescription>
              Maximum percentage of portfolio value in a single sector
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sector-concentration">Max Sector Concentration (%)</Label>
              <div className="relative">
                <Input
                  id="sector-concentration"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={maxSectorConcentration}
                  onChange={(e) => setMaxSectorConcentration(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Diversification helps reduce sector-specific risks</span>
            </div>
          </CardContent>
        </Card>

        {/* Target Sharpe Ratio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-4 w-4" />
              Target Sharpe Ratio
            </CardTitle>
            <CardDescription>
              Target risk-adjusted return measure (higher is better)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sharpe-ratio">Target Sharpe Ratio</Label>
              <Input
                id="sharpe-ratio"
                type="number"
                step="0.1"
                min="0"
                value={targetSharpeRatio}
                onChange={(e) => setTargetSharpeRatio(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Typical range: 0.5-2.0. Above 1.0 is considered good.</span>
            </div>
          </CardContent>
        </Card>

        {/* Max Drawdown Tolerance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-4 w-4" />
              Maximum Drawdown Tolerance
            </CardTitle>
            <CardDescription>
              Maximum acceptable peak-to-trough decline in portfolio value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="drawdown">Max Drawdown Tolerance (%)</Label>
              <div className="relative">
                <Input
                  id="drawdown"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={maxDrawdownTolerance}
                  onChange={(e) => setMaxDrawdownTolerance(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Maximum decline from peak value you're willing to accept</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

