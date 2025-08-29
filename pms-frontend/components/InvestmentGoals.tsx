import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KycService } from "../src/client/sdk.gen";
import type { UserInvestmentGoalCreate, UserInvestmentGoalUpdate, InvestmentGoal, UserInvestmentGoalContributionCreate } from "../src/client/types.gen";
import { queryKeys } from "../hooks/queryKeys";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Trash2, Plus, Target } from "lucide-react";

const GOAL_TYPES: InvestmentGoal[] = [
  "RETIREMENT",
  "EDUCATION",
  "WEALTH_BUILDING",
  "INCOME_GENERATION",
  "CAPITAL_PRESERVATION",
  "SHORT_TERM_GAINS",
];

export function InvestmentGoals() {
  const qc = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: queryKeys.investmentGoals,
    queryFn: async () => KycService.getInvestmentGoals(),
  });

  const [newGoal, setNewGoal] = useState<UserInvestmentGoalCreate>({ goal_type: "WEALTH_BUILDING", target_amount: 10000, priority: 2, description: null as any, is_active: true, target_date: null as any });

  const createGoal = useMutation({
    mutationFn: (body: UserInvestmentGoalCreate) => KycService.createInvestmentGoal({ requestBody: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.investmentGoals }),
  });

  const updateGoal = useMutation({
    mutationFn: (payload: { id: string; body: UserInvestmentGoalUpdate }) => KycService.updateInvestmentGoal({ goalId: payload.id, requestBody: payload.body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.investmentGoals }),
  });

  const deleteGoal = useMutation({
    mutationFn: (id: string) => KycService.deleteInvestmentGoal({ goalId: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.investmentGoals }),
  });

  const goalWithProgress = useMemo(() => goals.map((g: any) => ({
    ...g,
    progress: Number(g.target_amount) ? 0 : 0,
  })), [goals]);

  const [contribAmount, setContribAmount] = useState<Record<string, string>>({});

  const addContribution = useMutation({
    mutationFn: (payload: { goalId: string; body: UserInvestmentGoalContributionCreate }) => KycService.createGoalContribution({ goalId: payload.goalId, requestBody: payload.body }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.goalContributions(variables.goalId) });
    },
  });

  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useQuery({
    queryKey: ['kyc', 'goals', 'progress'],
    queryFn: async () => {
      const result: Record<string, number> = {};
      for (const g of (goals as any[])) {
        try {
          const contribs = await KycService.listGoalContributions({ goalId: g.id });
          const sum = (contribs as any[]).reduce((acc, c) => acc + Number(c.amount || 0), 0);
          const target = Number(g.target_amount || 0);
          result[g.id] = target > 0 ? Math.min(100, (sum / target) * 100) : 0;
        } catch {}
      }
      setProgressMap(result);
      return result;
    },
    enabled: (goals as any[]).length > 0,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Investment Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">My Goals</TabsTrigger>
              <TabsTrigger value="new">Create Goal</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {goals.length === 0 && (
                <div className="text-sm text-muted-foreground">No goals yet. Create your first one.</div>
              )}
              {goalWithProgress.map((g: any) => (
                <div key={g.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{String(g.goal_type).replaceAll('_', ' ')}</div>
                      <div className="text-sm text-muted-foreground">Target: ${Number(g.target_amount || 0).toLocaleString()} {g.target_date ? `• Due: ${new Date(g.target_date).toLocaleDateString()}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => updateGoal.mutate({ id: g.id, body: { is_active: !g.is_active } })}>{g.is_active ? 'Deactivate' : 'Activate'}</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteGoal.mutate(g.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Progress</div>
                    <div className="text-xs font-medium">{Number(progressMap[g.id] || 0).toFixed(1)}%</div>
                  </div>
                  <Progress value={Number(progressMap[g.id] || 0)} className="h-2" />

                  <div className="flex items-end gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div>
                        <Label htmlFor={`contrib-${g.id}`}>Add Contribution</Label>
                        <Input id={`contrib-${g.id}`} type="number" min="1" value={contribAmount[g.id] || ''} onChange={(e) => setContribAmount((s) => ({ ...s, [g.id]: e.target.value }))} placeholder="Amount" />
                      </div>
                    </div>
                    <Button onClick={() => {
                      const amt = parseInt(contribAmount[g.id] || '0', 10);
                      if (!amt || amt <= 0) return;
                      addContribution.mutate({ goalId: g.id, body: { amount: amt } as any });
                      setContribAmount((s) => ({ ...s, [g.id]: '' }));
                    }}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="new">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Goal Type</Label>
                  <Select value={newGoal.goal_type} onValueChange={(v) => setNewGoal((s) => ({ ...s, goal_type: v as InvestmentGoal }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select goal" /></SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.replaceAll('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Amount</Label>
                  <Input type="number" min="0" value={String(newGoal.target_amount ?? '')} onChange={(e) => setNewGoal((s) => ({ ...s, target_amount: e.target.value === '' ? null as any : parseInt(e.target.value, 10) }))} placeholder="e.g. 10000" />
                </div>
                <div>
                  <Label>Priority (1=High)</Label>
                  <Input type="number" min="1" value={String(newGoal.priority ?? 1)} onChange={(e) => setNewGoal((s) => ({ ...s, priority: Math.max(1, parseInt(e.target.value || '1', 10)) }))} />
                </div>
                <div>
                  <Label>Target Date</Label>
                  <Input type="date" onChange={(e) => setNewGoal((s) => ({ ...s, target_date: e.target.value ? new Date(e.target.value).toISOString() as any : null as any }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input value={String(newGoal.description || '')} onChange={(e) => setNewGoal((s) => ({ ...s, description: e.target.value || null as any }))} placeholder="Optional" />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={() => createGoal.mutate(newGoal)}><Plus className="h-4 w-4 mr-1" /> Create Goal</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}