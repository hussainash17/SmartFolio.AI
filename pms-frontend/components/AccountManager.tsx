import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  Shield,
  User,
  Settings,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  Percent
} from "lucide-react";
import { AuthUser } from "../hooks/useAuth";
import { AccountBalance, Transaction } from "../types/trading";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Portfolio } from "../types/portfolio";
import { formatCurrency } from "../lib/utils";
import { usePortfolios } from "../hooks/usePortfolios";

interface AccountManagerProps {
  user: AuthUser | null;
  accountBalance: AccountBalance;
  transactions: Transaction[];
  portfolios: Portfolio[];
  // Optional action props injected from parent
  onDeposit?: (amount: number, portfolioId: string) => Promise<void> | void;
  onWithdraw?: (amount: number, portfolioId: string) => Promise<void> | void;
  onUpdateCreditLimit?: (amount: number) => Promise<void> | void;
}

export function AccountManager({ user, accountBalance, transactions, portfolios, onDeposit, onWithdraw, onUpdateCreditLimit }: AccountManagerProps) {
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [creditLimit, setCreditLimit] = useState<string>("");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(portfolios[0]?.id ?? null);
  const [detailPortfolioId, setDetailPortfolioId] = useState<string | null>(null);
  const [commissionRates, setCommissionRates] = useState<Record<string, string>>({});
  const { updatePortfolio } = usePortfolios();

  useEffect(() => {
    if (!portfolios.length) {
      if (selectedPortfolioId !== null) {
        setSelectedPortfolioId(null);
      }
      return;
    }
    if (!selectedPortfolioId || !portfolios.some((p) => p.id === selectedPortfolioId)) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  const hasPortfolios = portfolios.length > 0;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpCircle className="h-4 w-4 text-red-600" />;
      case 'dividend':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'trade':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'fee':
        return <CreditCard className="h-4 w-4 text-orange-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionVariant = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'default' as const;
      case 'withdrawal':
        return 'destructive' as const;
      case 'dividend':
        return 'secondary' as const;
      case 'trade':
        return 'outline' as const;
      case 'fee':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const accountTypeColors = {
    individual: 'bg-gray-100 text-gray-800',
    premium: 'bg-blue-100 text-blue-800',
    professional: 'bg-purple-100 text-purple-800',
  };

  // Helper functions to handle AuthUser vs trading User differences
  const getAccountType = () => 'individual'; // Default for AuthUser
  const getJoinDate = () => user?.createdAt ? user.createdAt.toISOString() : new Date().toISOString();
  const getAccountNumber = () => `PM${user?.id?.slice(0, 8).toUpperCase()}` || 'PM00000000';
  const getFirstName = () => user?.name?.split(' ')[0] || 'First';
  const getLastName = () => user?.name?.split(' ')[1] || 'Last';

  const marginUtilization = accountBalance.dayTradingBuyingPower
    ? (accountBalance.marginUsed / accountBalance.dayTradingBuyingPower) * 100
    : 0;

  const formatPercentage = (value: number) => {
    const formatted = Number.isFinite(value) ? value.toFixed(2) : "0.00";
    return `${value >= 0 ? "+" : ""}${formatted}%`;
  };

  const handleDeposit = async () => {
    const amt = Number(depositAmount || 0);
    if (!amt || amt <= 0) return;
    if (!selectedPortfolioId) {
      toast.error('Please select a portfolio before making a deposit.');
      return;
    }
    if (!onDeposit) {
      toast.error('Deposit action is not available right now.');
      return;
    }
    try {
      await onDeposit(amt, selectedPortfolioId);
      toast.success('Deposit successful');
      setDepositAmount('');
    } catch (error) {
      console.error(error);
      toast.error('Deposit failed. Please try again.');
    }
  };

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmount || 0);
    if (!amt || amt <= 0) return;
    if (!selectedPortfolioId) {
      toast.error('Please select a portfolio before making a withdrawal.');
      return;
    }
    if (!onWithdraw) {
      toast.error('Withdrawal action is not available right now.');
      return;
    }
    try {
      await onWithdraw(amt, selectedPortfolioId);
      toast.success('Withdrawal successful');
      setWithdrawAmount('');
    } catch (error) {
      console.error(error);
      toast.error('Withdrawal failed. Please try again.');
    }
  };

  const handleUpdateCredit = async () => {
    const amt = Number(creditLimit || 0);
    if (amt < 0) return;
    await onUpdateCreditLimit?.(amt);
    toast.success('Credit limit updated');
  };

  const handleUpdateCommission = async (portfolioId: string) => {
    const rate = Number(commissionRates[portfolioId] || 0);
    if (rate < 0 || rate > 100) {
      toast.error('Commission rate must be between 0 and 100%');
      return;
    }
    try {
      await updatePortfolio(portfolioId, { brokerCommission: rate });
      toast.success('Commission rate updated');
      // Clear the input after successful update
      setCommissionRates(prev => ({ ...prev, [portfolioId]: '' }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to update commission rate');
    }
  };

  // Initialize commission rates from portfolios
  useEffect(() => {
    const rates: Record<string, string> = {};
    portfolios.forEach(p => {
      if (p.brokerCommission != null) {
        rates[p.id] = String(p.brokerCommission);
      }
    });
    setCommissionRates(prev => ({ ...prev, ...rates }));
  }, [portfolios]);

  return (
    <div className="space-y-6">
      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Account Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountBalance.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Cash: {formatCurrency(accountBalance.cashBalance)} |
              Stocks: {formatCurrency(accountBalance.stockValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Buying Power</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountBalance.buyingPower)}</div>
            <p className="text-xs text-muted-foreground">
              Day Trading: {formatCurrency(accountBalance.dayTradingBuyingPower)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Margin Used</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountBalance.marginUsed)}</div>
            <Progress value={marginUtilization} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {marginUtilization.toFixed(1)}% of available margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Quick Funds</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {hasPortfolios ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Target Portfolio</label>
                <Select
                  value={selectedPortfolioId ?? ''}
                  onValueChange={(value) => setSelectedPortfolioId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Create a portfolio to enable deposits and withdrawals.
              </p>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Deposit amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                type="number"
                min={0}
                disabled={!hasPortfolios}
              />
              <Button size="sm" onClick={handleDeposit} disabled={!hasPortfolios}>
                Deposit
              </Button>
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Withdraw amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                type="number"
                min={0}
                disabled={!hasPortfolios}
              />
              <Button size="sm" variant="outline" onClick={handleWithdraw} disabled={!hasPortfolios}>
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Account Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {detailPortfolioId ? (
            (() => {
              const p = portfolios.find(x => x.id === detailPortfolioId);
              const stockValue = Math.max((p?.totalValue || 0) - (p?.cash || 0), 0);
              const gainLoss = stockValue - (p?.totalCost || 0);
              const gainLossPercent = (p && p.totalCost > 0) ? (gainLoss / p.totalCost) * 100 : 0;
              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold">{p?.name}</h2>
                      <p className="text-sm text-muted-foreground">Portfolio metrics</p>
                    </div>
                    <Button variant="outline" onClick={() => setDetailPortfolioId(null)}>Back to Overview</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Total Value</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{formatCurrency(p?.totalValue || 0)}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Cash</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{formatCurrency(p?.cash || 0)}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Stock Value</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{formatCurrency(stockValue)}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Invested Capital</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold">{formatCurrency(p?.totalCost || 0)}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Unrealized P/L</CardTitle></CardHeader>
                      <CardContent>
                        <div className={`text-2xl ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(gainLoss)}</div>
                        <p className={`text-xs ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercentage(gainLossPercent)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Broker Commission</CardTitle></CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{(p?.brokerCommission ?? 0.5).toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">Applied to all trades</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader><CardTitle>Credit Limit</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 border rounded px-2 py-1 text-sm"
                            placeholder="Credit limit"
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(e.target.value)}
                            type="number"
                            min={0}
                          />
                          <Button variant="outline" onClick={handleUpdateCredit}>Update Credit</Button>
                        </div>
                        <div className="text-sm text-muted-foreground self-center">
                          Boost buying power: Cash + Credit - Reserved
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Broker Commission</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          Current commission rate: <span className="font-medium">{(p?.brokerCommission ?? 0.5).toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 border rounded px-2 py-1 text-sm"
                            placeholder="0.5"
                            value={commissionRates[p?.id || ''] ?? String(p?.brokerCommission ?? 0.5)}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100)) {
                                setCommissionRates(prev => ({ ...prev, [p?.id || '']: value }));
                              }
                            }}
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <Button
                            variant="outline"
                            onClick={() => p && handleUpdateCommission(p.id)}
                            disabled={!p || commissionRates[p.id] === String(p.brokerCommission ?? 0.5)}
                          >
                            Update Commission
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Commission is applied as a percentage of the total trade amount for all BUY and SELL transactions.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Account Number</p>
                        <p className="font-medium">{getAccountNumber()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Account Type</p>
                        <Badge className={accountTypeColors[getAccountType() as keyof typeof accountTypeColors]}>
                          {getAccountType().charAt(0).toUpperCase() + getAccountType().slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{user?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Join Date</p>
                        <p className="font-medium">{formatDate(getJoinDate())}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Balance Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {hasPortfolios ? (
                      <div className="space-y-3">
                        {portfolios.map((portfolio) => {
                          const stockValue = Math.max(portfolio.totalValue - portfolio.cash, 0);
                          const gainLoss = stockValue - portfolio.totalCost;
                          const gainLossPercent = portfolio.totalCost > 0 ? (gainLoss / portfolio.totalCost) * 100 : 0;
                          return (
                            <button
                              key={portfolio.id}
                              type="button"
                              onClick={() => setDetailPortfolioId(portfolio.id)}
                              className="rounded-lg border bg-muted/20 p-3 text-left w-full hover:border-foreground/20 hover:shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">{portfolio.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Created {new Date(portfolio.createdDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Total Value</p>
                                  <p className="text-sm font-semibold">
                                    {formatCurrency(portfolio.totalValue)}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Cash Balance</p>
                                  <p className="font-medium">
                                    {formatCurrency(portfolio.cash)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Stock Value</p>
                                  <p className="font-medium">
                                    {formatCurrency(stockValue)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Invested Capital</p>
                                  <p className="font-medium">
                                    {formatCurrency(portfolio.totalCost)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Unrealized P/L</p>
                                  <p className={`font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(gainLoss)} ({formatPercentage(gainLossPercent)})
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No portfolios available yet. Create a portfolio to see detailed breakdowns.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Activity</CardTitle>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 5).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.type)}
                              <Badge variant={getTransactionVariant(transaction.type)}>
                                {transaction.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive'}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transaction History</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <Badge variant={getTransactionVariant(transaction.type)}>
                            {transaction.type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive'}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <p className="p-2 bg-muted rounded">{getFirstName()}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <p className="p-2 bg-muted rounded">{getLastName()}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <p className="p-2 bg-muted rounded">{user?.email || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Number</label>
                  <p className="p-2 bg-muted rounded">{getAccountNumber()}</p>
                </div>
              </div>
              <Button>Edit Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive important account and trading notifications</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">API Access</h4>
                    <p className="text-sm text-muted-foreground">Manage API keys for third-party applications</p>
                  </div>
                  <Button variant="outline">Manage</Button>
                </div>



                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Account Statements</h4>
                    <p className="text-sm text-muted-foreground">Download monthly and annual statements</p>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Broker Commission Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the broker commission rate for each portfolio. Commission is applied as a percentage of the total trade amount for all BUY and SELL transactions.
              </p>
              {hasPortfolios ? (
                <div className="space-y-4">
                  {portfolios.map((portfolio) => {
                    const currentCommission = portfolio.brokerCommission ?? 0.5;
                    const commissionInput = commissionRates[portfolio.id] ?? String(currentCommission);
                    return (
                      <div key={portfolio.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{portfolio.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Current rate: {currentCommission.toFixed(2)}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            className="w-24 border rounded px-2 py-1 text-sm"
                            placeholder="0.5"
                            value={commissionInput}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100)) {
                                setCommissionRates(prev => ({ ...prev, [portfolio.id]: value }));
                              }
                            }}
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateCommission(portfolio.id)}
                            disabled={commissionInput === String(currentCommission) || !commissionInput}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create a portfolio to configure commission rates.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
