import { useState } from "react";
import {
  useInvestmentGoals,
  useGoalContributions,
  useGoalProgress,
  useGoalSIPCalculation,
  useWhatIfScenario,
  useAssetAllocation,
  useProductRecommendations,
  useGoalAlerts,
  type UserInvestmentGoalCreate,
  type UserInvestmentGoalUpdate,
  type WhatIfScenarioRequest,
} from "../hooks/useInvestmentGoals";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  Target,
  Plus,
  Trash2,
  Edit,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  PieChart,
  Calculator,
  Zap,
  Bell,
  Award,
  LineChart,
} from "lucide-react";

const GOAL_TYPES = [
  { value: "RETIREMENT", label: "Retirement Planning", icon: "🏖️" },
  { value: "EDUCATION", label: "Child's Education", icon: "🎓" },
  { value: "HOME_PURCHASE", label: "Home Purchase", icon: "🏠" },
  { value: "VACATION", label: "Dream Vacation", icon: "✈️" },
  { value: "EMERGENCY_FUND", label: "Emergency Fund", icon: "🆘" },
  { value: "WEALTH_BUILDING", label: "Wealth Building", icon: "💰" },
  { value: "VEHICLE_PURCHASE", label: "Vehicle Purchase", icon: "🚗" },
  { value: "WEDDING", label: "Wedding", icon: "💍" },
  { value: "BUSINESS_STARTUP", label: "Business/Startup", icon: "💼" },
];

const RISK_TOLERANCE = [
  { value: "CONSERVATIVE", label: "Conservative", description: "Lower risk, stable returns" },
  { value: "MODERATE", label: "Moderate", description: "Balanced risk and returns" },
  { value: "AGGRESSIVE", label: "Aggressive", description: "Higher risk, higher potential returns" },
];

export function InvestmentGoalsEnhanced() {
  const { goals, isLoading, createGoal, updateGoal, deleteGoal } = useInvestmentGoals();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Investment Goals
          </h1>
          <p className="text-muted-foreground mt-1">
            Define, track, and achieve your financial dreams
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GoalCreateForm
              onSuccess={() => setShowCreateDialog(false)}
              onCreate={createGoal.mutateAsync}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals Overview */}
      {goals.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-6xl">🎯</div>
            <h3 className="text-xl font-semibold">No Goals Yet</h3>
            <p className="text-muted-foreground">
              Start your investment journey by creating your first financial goal.
              Whether it's retirement, education, or buying a home, we'll help you achieve it!
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Goal
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Goals Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onSelect={() => setSelectedGoalId(goal.id)}
                onDelete={() => deleteGoal.mutate(goal.id)}
                isSelected={selectedGoalId === goal.id}
              />
            ))}
          </div>

          {/* Selected Goal Details */}
          {selectedGoal && (
            <Card>
              <GoalDetails
                goal={selectedGoal}
                onUpdate={(data) => updateGoal.mutate({ goalId: selectedGoal.id, data })}
                onClose={() => setSelectedGoalId(null)}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== GOAL CARD ====================
function GoalCard({ goal, onSelect, onDelete, isSelected }: any) {
  const goalType = GOAL_TYPES.find((t) => t.value === goal.goal_type) || GOAL_TYPES[0];
  const progress = goal.progress_percentage || 0;
  const timeRemaining = goal.time_remaining_months || 0;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? "ring-2 ring-primary shadow-lg" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{goalType.icon}</span>
            <div>
              <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
              <p className="text-sm text-muted-foreground">{goalType.label}</p>
            </div>
          </div>
          {!goal.is_active && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Target</p>
            <p className="font-semibold text-lg">{(goal.target_amount || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current</p>
            <p className="font-semibold text-lg">{(goal.current_amount || 0).toLocaleString()}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {timeRemaining > 0 ? `${timeRemaining} months left` : "Target reached"}
          </div>
          {goal.monthly_contribution && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {goal.monthly_contribution}/mo
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== GOAL DETAILS ====================
function GoalDetails({ goal, onUpdate, onClose }: any) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <div>
          <h2 className="text-2xl font-bold">{goal.goal_name}</h2>
          <p className="text-muted-foreground">
            {GOAL_TYPES.find((t) => t.value === goal.goal_type)?.label}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <TabsList className="px-6">
        <TabsTrigger value="overview" className="gap-2">
          <LineChart className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="sip" className="gap-2">
          <Calculator className="h-4 w-4" />
          SIP Calculator
        </TabsTrigger>
        <TabsTrigger value="whatif" className="gap-2">
          <Zap className="h-4 w-4" />
          What-If Scenarios
        </TabsTrigger>
        <TabsTrigger value="allocation" className="gap-2">
          <PieChart className="h-4 w-4" />
          Asset Allocation
        </TabsTrigger>
        <TabsTrigger value="recommendations" className="gap-2">
          <Award className="h-4 w-4" />
          Recommendations
        </TabsTrigger>
        <TabsTrigger value="alerts" className="gap-2">
          <Bell className="h-4 w-4" />
          Alerts
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="px-6 pb-6">
        <GoalOverview goal={goal} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="sip" className="px-6 pb-6">
        <GoalSIPCalculator goalId={goal.id} />
      </TabsContent>

      <TabsContent value="whatif" className="px-6 pb-6">
        <GoalWhatIfScenarios goalId={goal.id} />
      </TabsContent>

      <TabsContent value="allocation" className="px-6 pb-6">
        <GoalAssetAllocation goalId={goal.id} />
      </TabsContent>

      <TabsContent value="recommendations" className="px-6 pb-6">
        <GoalRecommendations goalId={goal.id} />
      </TabsContent>

      <TabsContent value="alerts" className="px-6 pb-6">
        <GoalAlerts goalId={goal.id} />
      </TabsContent>
    </Tabs>
  );
}

// ==================== GOAL OVERVIEW ====================
function GoalOverview({ goal, onUpdate }: any) {
  const { data: progress } = useGoalProgress(goal.id);
  const { contributions, addContribution, deleteContribution } = useGoalContributions(goal.id);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionDesc, setContributionDesc] = useState("");

  return (
    <div className="space-y-6 mt-4">
      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {progress ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-2xl font-bold">{(progress?.current_value ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Target Amount</p>
                  <p className="text-2xl font-bold">{(progress?.target_amount ?? 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">{Number(progress?.progress_percentage ?? 0).toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Time Remaining</p>
                  <p className="text-2xl font-bold">{Number(progress?.time_remaining_months ?? 0)} mo</p>
                </div>
              </div>

              <Progress value={Number(progress?.progress_percentage ?? 0)} className="h-3" />

              <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Contributions</p>
                  <p className="text-lg font-semibold">{(progress?.contributions_total ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Returns</p>
                  <p className="text-lg font-semibold">{(progress?.investment_returns ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projected Amount</p>
                  <p className="text-lg font-semibold">{(progress?.projected_final_amount ?? 0).toLocaleString()}</p>
                </div>
              </div>

              {progress.is_on_track ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>On Track! 🎉</AlertTitle>
                  <AlertDescription>
                    You're on track to achieve this goal. Keep up the great work!
                    {Number(progress?.ahead_by_amount ?? 0) > 0 && (
                      <span className="block mt-1">You're ahead by {(progress?.ahead_by_amount ?? 0).toLocaleString()}!</span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Action Needed</AlertTitle>
                  <AlertDescription>
                    You're currently off-track by {(progress?.shortfall_amount ?? 0).toLocaleString()}.
                    Consider increasing your monthly contribution to {(progress?.monthly_pace_required ?? 0).toLocaleString()}.
                  </AlertDescription>
                </Alert>
              )}

              {/* Milestones */}
              {progress.milestones && progress.milestones.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Milestones</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {progress.milestones.map((milestone, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          milestone.achieved ? "bg-green-50 border-green-200" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {milestone.achieved ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span className="font-semibold">{milestone.percentage}%</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(milestone?.amount ?? 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Loading progress data...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contributions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contributions
          </CardTitle>
          <CardDescription>
            Track all your contributions towards this goal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Contribution Form */}
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                type="number"
                placeholder="Amount"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Description (optional)"
                value={contributionDesc}
                onChange={(e) => setContributionDesc(e.target.value)}
              />
            </div>
            <Button
              onClick={async () => {
                if (!contributionAmount || parseFloat(contributionAmount) <= 0) return;
                await addContribution.mutateAsync({
                  amount: parseFloat(contributionAmount),
                  description: contributionDesc || undefined,
                });
                setContributionAmount("");
                setContributionDesc("");
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <Separator />

          {/* Contributions List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {contributions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No contributions yet. Add your first contribution above!
              </p>
            ) : (
              contributions.map((contrib) => (
                <div
                  key={contrib.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        ₹{contrib.amount.toLocaleString()}
                      </p>
                      {contrib.description && (
                        <p className="text-sm text-muted-foreground">
                          - {contrib.description}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(contrib.contribution_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteContribution.mutate(contrib.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== SIP CALCULATOR ====================
function GoalSIPCalculator({ goalId }: { goalId: string }) {
  const { data: sipCalc, isLoading } = useGoalSIPCalculation(goalId);

  if (isLoading) {
    return <div className="text-center py-8">Calculating SIP requirements...</div>;
  }

  if (!sipCalc) {
    return <div className="text-center py-8 text-muted-foreground">No SIP data available</div>;
  }

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            SIP Calculation Results
          </CardTitle>
          <CardDescription>
            Based on your goal parameters and expected returns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Current Situation</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Amount</span>
                  <span className="font-semibold">
                    ₹{sipCalc.current_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Amount</span>
                  <span className="font-semibold">
                    ₹{sipCalc.target_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Remaining</span>
                  <span className="font-semibold">{sipCalc.time_remaining_months} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Return (p.a.)</span>
                  <span className="font-semibold">{sipCalc.expected_annual_return}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Required Investment</h4>
              <div className="space-y-2">
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                  <span className="font-semibold">Monthly SIP Required</span>
                  <span className="text-2xl font-bold">{sipCalc.required_monthly_sip.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Investment</span>
                  <span className="font-semibold">{sipCalc.total_investment_required.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Returns</span>
                  <span className="font-semibold text-green-600">{sipCalc.expected_returns.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {sipCalc.is_achievable ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Goal is Achievable! 🎯</AlertTitle>
              <AlertDescription>
                With consistent monthly investments, you can achieve this goal.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Goal May Be Challenging</AlertTitle>
              <AlertDescription>
                Shortfall: ₹{sipCalc.shortfall_amount?.toLocaleString()}. Consider extending
                the timeline or increasing your monthly investment.
              </AlertDescription>
            </Alert>
          )}

          {sipCalc.recommendations && sipCalc.recommendations.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Recommendations
              </h4>
              <ul className="space-y-2">
                {sipCalc.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== WHAT-IF SCENARIOS ====================
function GoalWhatIfScenarios({ goalId }: { goalId: string }) {
  const whatIfMutation = useWhatIfScenario();
  const [scenarioType, setScenarioType] = useState<WhatIfScenarioRequest["scenario_type"]>("increase_sip");
  const [newValue, setNewValue] = useState("");

  const handleCalculate = async () => {
    const scenario: WhatIfScenarioRequest = { scenario_type: scenarioType };

    if (scenarioType === "increase_sip" || scenarioType === "decrease_sip") {
      scenario.new_monthly_sip = parseFloat(newValue);
    } else if (scenarioType === "delay_goal" || scenarioType === "advance_goal") {
      scenario.new_target_date = newValue;
    } else if (scenarioType === "change_return") {
      scenario.new_return_rate = parseFloat(newValue);
    }

    await whatIfMutation.mutateAsync({ goalId, scenario });
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            What-If Analysis
          </CardTitle>
          <CardDescription>
            Explore different scenarios to optimize your goal strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Scenario Type</Label>
              <Select value={scenarioType} onValueChange={(v: any) => setScenarioType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase_sip">Increase Monthly SIP</SelectItem>
                  <SelectItem value="decrease_sip">Decrease Monthly SIP</SelectItem>
                  <SelectItem value="delay_goal">Delay Goal Timeline</SelectItem>
                  <SelectItem value="advance_goal">Advance Goal Timeline</SelectItem>
                  <SelectItem value="change_return">Change Expected Returns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                {scenarioType.includes("sip") && "New SIP Amount"}
                {scenarioType.includes("goal") && "New Target Date"}
                {scenarioType.includes("return") && "New Return Rate (%)"}
              </Label>
              <Input
                type={scenarioType.includes("goal") ? "date" : "number"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={
                  scenarioType.includes("sip")
                    ? "e.g., 5000"
                    : scenarioType.includes("return")
                    ? "e.g., 12"
                    : ""
                }
              />
            </div>
          </div>

          <Button onClick={handleCalculate} className="gap-2" disabled={whatIfMutation.isPending}>
            <Zap className="h-4 w-4" />
            Calculate Scenario
          </Button>

          {whatIfMutation.data && (
            <div className="mt-6 space-y-4 border-t pt-4">
              <h4 className="font-semibold">Scenario Comparison</h4>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Original Scenario</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly SIP</span>
                      <span className="font-semibold">
                        {whatIfMutation.data.original_scenario.monthly_sip.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Date</span>
                      <span className="font-semibold">
                        {new Date(whatIfMutation.data.original_scenario.target_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projected Amount</span>
                      <span className="font-semibold">
                        {whatIfMutation.data.original_scenario.projected_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shortfall</span>
                      <span className="font-semibold text-red-600">
                        {whatIfMutation.data.original_scenario.shortfall.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-primary">New Scenario</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly SIP</span>
                      <span className="font-semibold">
                        {whatIfMutation.data.new_scenario.monthly_sip.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Date</span>
                      <span className="font-semibold">
                        {new Date(whatIfMutation.data.new_scenario.target_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projected Amount</span>
                      <span className="font-semibold">
                        {whatIfMutation.data.new_scenario.projected_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shortfall</span>
                      <span className="font-semibold text-green-600">
                        {whatIfMutation.data.new_scenario.shortfall.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Impact Analysis</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>
                    Amount Difference: {Math.abs(whatIfMutation.data.impact.amount_difference).toLocaleString()}
                  </p>
                  <p className="font-semibold mt-2">{whatIfMutation.data.recommendation}</p>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== ASSET ALLOCATION ====================
function GoalAssetAllocation({ goalId }: { goalId: string }) {
  const { data: allocation, isLoading } = useAssetAllocation(goalId);

  if (isLoading) {
    return <div className="text-center py-8">Loading asset allocation...</div>;
  }

  if (!allocation) {
    return <div className="text-center py-8 text-muted-foreground">No allocation data available</div>;
  }

  const allocationData = [
    { name: "Equity", value: allocation.recommended_allocation.equity, color: "#3b82f6" },
    { name: "Debt", value: allocation.recommended_allocation.debt, color: "#10b981" },
    { name: "Gold", value: allocation.recommended_allocation.gold, color: "#f59e0b" },
    { name: "Cash", value: allocation.recommended_allocation.cash, color: "#6b7280" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Recommended Asset Allocation
          </CardTitle>
          <CardDescription>
            Based on your risk profile and time horizon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Risk Tolerance</p>
              <p className="text-lg font-semibold capitalize">{allocation.risk_tolerance}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time Horizon</p>
              <p className="text-lg font-semibold">{allocation.time_horizon_years} years</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rebalancing</p>
              <p className="text-lg font-semibold">{allocation.rebalancing_frequency}</p>
            </div>
          </div>

          {/* Allocation Bars */}
          <div className="space-y-4">
            {allocationData.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-semibold">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Strategy Rationale</AlertTitle>
            <AlertDescription>{allocation.rationale}</AlertDescription>
          </Alert>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Rebalancing Guidelines</h4>
            <p className="text-sm text-muted-foreground">
              We recommend rebalancing {allocation.rebalancing_frequency.toLowerCase()} or when any
              asset class drifts by more than {allocation.suggested_drift_threshold}% from the
              target allocation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== RECOMMENDATIONS ====================
function GoalRecommendations({ goalId }: { goalId: string }) {
  const { data: recommendations, isLoading } = useProductRecommendations(goalId);

  if (isLoading) {
    return <div className="text-center py-8">Loading recommendations...</div>;
  }

  if (!recommendations) {
    return <div className="text-center py-8 text-muted-foreground">No recommendations available</div>;
  }

  const productTypeIcons: Record<string, string> = {
    mutual_fund: "📊",
    etf: "📈",
    stock: "💹",
    bond: "🏦",
    fd: "🏛️",
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Investment Product Recommendations
          </CardTitle>
          <CardDescription>
            Curated products aligned with your goal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.recommendations.map((rec, idx) => (
            <Card key={idx} className="border-l-4" style={{ borderLeftColor: getRiskColor(rec.risk_level) }}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{productTypeIcons[rec.product_type] || "📌"}</span>
                    <div>
                      <h4 className="font-semibold text-lg">{rec.product_name}</h4>
                      <p className="text-sm text-muted-foreground">{rec.category}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    Score: {rec.suitability_score}/100
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Return</p>
                    <p className="font-semibold">{rec.expected_return}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <p className="font-semibold capitalize">{rec.risk_level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Min Investment</p>
                    <p className="font-semibold">{rec.min_investment.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Liquidity</p>
                    <p className="font-semibold">{rec.liquidity}</p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground border-t pt-3">
                  {rec.rationale}
                </div>
              </CardContent>
            </Card>
          ))}

          {recommendations.diversification_note && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Diversification Note</AlertTitle>
              <AlertDescription>{recommendations.diversification_note}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== ALERTS ====================
function GoalAlerts({ goalId }: { goalId: string }) {
  const { data: alertsData, isLoading } = useGoalAlerts(goalId);

  if (isLoading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  if (!alertsData) {
    return <div className="text-center py-8 text-muted-foreground">No alerts data available</div>;
  }

  const severityIcons: Record<string, any> = {
    high: AlertTriangle,
    medium: Info,
    low: CheckCircle,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 bg-red-50";
      case "medium":
        return "border-yellow-500 bg-yellow-50";
      case "low":
        return "border-blue-500 bg-blue-50";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Goal Alerts & Notifications
              </CardTitle>
              <CardDescription>Important updates and action items</CardDescription>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{alertsData.overall_health_score}</div>
              <div className="text-xs text-muted-foreground">Health Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertsData.alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold">All Good! 🎉</p>
              <p className="text-sm text-muted-foreground">
                No alerts at this time. Your goal is on track.
              </p>
            </div>
          ) : (
            alertsData.alerts.map((alert, idx) => {
              const Icon = severityIcons[alert.severity] || Info;
              return (
                <Alert key={idx} className={getSeverityColor(alert.severity)}>
                  <Icon className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    {alert.title}
                    <Badge variant="outline" className="capitalize">
                      {alert.alert_type}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{alert.message}</p>
                    {alert.action_required && (
                      <p className="font-semibold text-sm">
                        Action Required: {alert.action_required}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </AlertDescription>
                </Alert>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CREATE GOAL FORM ====================
function GoalCreateForm({ onSuccess, onCreate }: any) {
  const [formData, setFormData] = useState<UserInvestmentGoalCreate>({
    goal_name: "",
    goal_type: "WEALTH_BUILDING",
    target_amount: 0,
    risk_tolerance: "MODERATE",
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate(formData);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <DialogTitle>Create New Investment Goal</DialogTitle>
        <DialogDescription>
          Define your financial goal and we'll help you achieve it with a personalized investment
          plan.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Goal Name*</Label>
          <Input
            required
            placeholder="e.g., Retirement Fund, Child's College Education"
            value={formData.goal_name}
            onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
          />
        </div>

        <div>
          <Label>Goal Type*</Label>
          <Select
            value={formData.goal_type}
            onValueChange={(v) => setFormData({ ...formData, goal_type: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
          <Label>Target Amount*</Label>
            <Input
              type="number"
              required
              placeholder="e.g., 5000000"
              value={formData.target_amount || ""}
              onChange={(e) =>
                setFormData({ ...formData, target_amount: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div>
            <Label>Target Date</Label>
            <Input
              type="date"
              value={formData.target_date || ""}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
          <Label>Current Amount</Label>
            <Input
              type="number"
              placeholder="e.g., 100000"
              value={formData.current_amount || ""}
              onChange={(e) =>
                setFormData({ ...formData, current_amount: parseFloat(e.target.value) || undefined })
              }
            />
          </div>

          <div>
          <Label>Monthly Contribution</Label>
            <Input
              type="number"
              placeholder="e.g., 10000"
              value={formData.monthly_contribution || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  monthly_contribution: parseFloat(e.target.value) || undefined,
                })
              }
            />
          </div>
        </div>

        <div>
          <Label>Risk Tolerance*</Label>
          <Select
            value={formData.risk_tolerance}
            onValueChange={(v: any) => setFormData({ ...formData, risk_tolerance: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RISK_TOLERANCE.map((risk) => (
                <SelectItem key={risk.value} value={risk.value}>
                  <div>
                    <div className="font-semibold">{risk.label}</div>
                    <div className="text-xs text-muted-foreground">{risk.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Expected Return Rate (% p.a.)</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g., 12"
            value={formData.expected_return_rate || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                expected_return_rate: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>

        <div>
          <Label>Description</Label>
          <Input
            placeholder="Add any additional details about this goal"
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Goal
        </Button>
      </div>
    </form>
  );
}

// Helper function
function getRiskColor(riskLevel: string): string {
  switch (riskLevel.toLowerCase()) {
    case "low":
    case "conservative":
      return "#10b981";
    case "medium":
    case "moderate":
      return "#f59e0b";
    case "high":
    case "aggressive":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

