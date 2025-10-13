import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import {MarketService, OpenAPI} from "../src/client";
import { useFundamentals, useCompanyComparison } from "../hooks/useFundamentals";
import {
  Search, Building2, BarChart3, Users, Percent, Scale,
  Landmark, GitBranch, LineChart, Sparkles, TrendingUp,
  DollarSign, PieChart, Activity, Info
} from "lucide-react";

interface FundamentalsProps {
  defaultSymbol?: string;
}

function formatNumber(n?: number | string | null) {
  if (n === undefined || n === null) return "-";
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "-";
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTk(n?: number | string | null) {
  if (n === undefined || n === null) return "-";
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "-";
  return `৳${formatNumber(num)}`;
}

function formatPct(n?: number | string | null) {
  if (n === undefined || n === null) return "-";
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "-";
  return `${num.toFixed(2)}%`;
}

export function Fundamentals({ defaultSymbol }: FundamentalsProps) {
  const [query, setQuery] = useState("");
  // Set a default stock immediately - common DSE stocks
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(
    defaultSymbol || 'GP' // Default to GP (Grameenphone) as it's a major DSE stock
  );

  // Stock list for search/select (following the same pattern as useTrading)
  const { data: stockList = [], isLoading: listLoading, error: stockListError } = useQuery({
    queryKey: ["market", "list", { limit: 100, offset: 0 }],
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      const list = await MarketService.listStocks({ limit: 100, offset: 0 });
      return (list as any[]).map((c: any) => ({
        id: String(c.id),
        symbol: String(c.symbol),
        name: String(c.company_name || c.symbol),
        sector: String(c.sector || "Unknown"),
        industry: String(c.industry || "Unknown"),
      }));
    }
  });

  // Update selected symbol from list if we have a better option
  useEffect(() => {
    if (stockList.length > 0 && !defaultSymbol) {
      // Only update if we don't have a default and the current selection isn't in the list
      const currentExists = stockList.some(s => s.symbol === selectedSymbol);
      if (!currentExists) {
        setSelectedSymbol(stockList[0].symbol);
      }
    }
  }, [stockList, defaultSymbol, selectedSymbol]);

  // Use our new fundamentals hook
  const {
    companyInfo,
    marketSummary,
    shareholding,
    earnings,
    financialHealth,
    dividends,
    historicalRatios,
    dataAvailability,
    isLoading,
  } = useFundamentals(selectedSymbol);

  // Sector peers for comparison
  const peers = useMemo(() => {
    if (!companyInfo?.sector) return [] as { symbol: string; name: string; sector: string }[];
    return stockList
      .filter((s) => s.sector === companyInfo.sector && s.symbol !== selectedSymbol)
      .slice(0, 5);
  }, [companyInfo, stockList, selectedSymbol]);

  // Peer comparison data
  const peerSymbols = useMemo(() => {
    return [selectedSymbol, ...peers.map(p => p.symbol)].filter(Boolean) as string[];
  }, [selectedSymbol, peers]);

  const { data: peerComparison = [] } = useCompanyComparison(peerSymbols);

  // Chart data (for historical visualization)
  const { data: chart, isLoading: chartLoading } = useQuery({
    enabled: !!selectedSymbol,
    queryKey: ["market", "chart", selectedSymbol, "5Y"],
    queryFn: async () => {
      const resp = await MarketService.getChartData({ symbol: selectedSymbol as string, timeframe: "5Y" });
      return resp as any;
    }
  });

  const filteredStocks = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return stockList;
    return stockList.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q));
  }, [query, stockList]);

  // Calculate fundamental strength score
  const fundamentalScore = useMemo(() => {
    if (!marketSummary || !financialHealth) return 0;

    let score = 0;
    const pe = Number(marketSummary.current_pe) || 0;
    const divYield = Number(marketSummary.dividend_yield) || 0;
    const debtToEquity = Number(financialHealth.total_loan) / Math.max(1, Number(financialHealth.reserve_and_surplus) || 1);

    // P/E Score (lower is better, 0-30 points)
    if (pe > 0 && pe < 15) score += 30;
    else if (pe >= 15 && pe < 25) score += 20;
    else if (pe >= 25 && pe < 40) score += 10;

    // Dividend Yield Score (0-25 points)
    if (divYield > 5) score += 25;
    else if (divYield > 3) score += 15;
    else if (divYield > 1) score += 8;

    // Debt Score (0-25 points)
    if (debtToEquity < 0.3) score += 25;
    else if (debtToEquity < 0.7) score += 15;
    else if (debtToEquity < 1.5) score += 8;

    // Market Cap Score (0-20 points)
    const marketCap = Number(marketSummary.market_cap) || 0;
    if (marketCap > 10000) score += 20; // > 10B
    else if (marketCap > 5000) score += 15;
    else if (marketCap > 1000) score += 10;

    return Math.min(100, score);
  }, [marketSummary, financialHealth]);

  return (
    <div className="space-y-6">
      {/* Stock Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> Fundamental Analysis (DSE)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="col-span-2 flex gap-2">
            <Input
              placeholder="Search ticker or company name (e.g., GP, ROBI, BATBC)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder={listLoading ? "Loading..." : "Select symbol"} />
              </SelectTrigger>
              <SelectContent>
                {filteredStocks.map((s) => (
                  <SelectItem key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Sector: {companyInfo?.sector || "-"}</Badge>
            <Badge variant="secondary">Category: {companyInfo?.category || "-"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data Availability Notice */}
      {dataAvailability && !dataAvailability.has_basic_info && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
              <Info className="h-5 w-5" />
              <span className="text-sm">Limited fundamental data available for this company. Showing what's available.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Company Profile & Listing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-muted-foreground">Trading Code</div><div className="font-medium">{companyInfo?.trading_code || selectedSymbol || "-"}</div></div>
            <div><div className="text-muted-foreground">Company Name</div><div className="font-medium">{companyInfo?.company_name || "-"}</div></div>
            <div><div className="text-muted-foreground">Sector</div><div className="font-medium">{companyInfo?.sector || "-"}</div></div>
            <div><div className="text-muted-foreground">Category</div><div className="font-medium">{companyInfo?.category || "-"}</div></div>
            <div><div className="text-muted-foreground">Listing Year</div><div className="font-medium">{companyInfo?.listing_year || "-"}</div></div>
            <div><div className="text-muted-foreground">Website</div><div className="font-medium text-blue-600 dark:text-blue-400">{companyInfo?.website || "-"}</div></div>
            <div><div className="text-muted-foreground">Head Office</div><div className="font-medium text-xs">{companyInfo?.head_office || "-"}</div></div>
            <div><div className="text-muted-foreground">Factory</div><div className="font-medium text-xs">{companyInfo?.factory || "-"}</div></div>
          </div>

          {companyInfo?.contact && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-muted-foreground">Company Secretary</div><div className="font-medium">{companyInfo.contact.company_secretary || "-"}</div></div>
                <div><div className="text-muted-foreground">Email</div><div className="font-medium text-blue-600 dark:text-blue-400">{companyInfo.contact.email || "-"}</div></div>
                <div><div className="text-muted-foreground">Phone</div><div className="font-medium">{companyInfo.contact.cell || "-"}</div></div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Market Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Market Summary & Valuation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Last Price (LTP)</div>
              <div className="font-bold text-lg">{formatTk(marketSummary?.ltp)}</div>
              <div className={`text-xs ${Number(marketSummary?.ltp_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(marketSummary?.ltp_change) >= 0 ? '+' : ''}{formatTk(marketSummary?.ltp_change)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Current P/E</div>
              <div className="font-medium">{formatNumber(marketSummary?.current_pe)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Audited P/E</div>
              <div className="font-medium">{formatNumber(marketSummary?.audited_pe)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Dividend Yield</div>
              <div className="font-medium">{formatPct(marketSummary?.dividend_yield)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">NAV</div>
              <div className="font-medium">{formatTk(marketSummary?.nav)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Face Value</div>
              <div className="font-medium">{formatTk(marketSummary?.face_value)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Market Cap</div>
              <div className="font-medium">{formatTk(marketSummary?.market_cap)}M</div>
            </div>
            <div>
              <div className="text-muted-foreground">Paid-up Capital</div>
              <div className="font-medium">{formatTk(marketSummary?.paid_up_capital)}M</div>
            </div>
            <div>
              <div className="text-muted-foreground">Authorized Capital</div>
              <div className="font-medium">{formatTk(marketSummary?.authorized_capital)}M</div>
            </div>
            <div>
              <div className="text-muted-foreground">Reserve & Surplus</div>
              <div className="font-medium">{formatTk(marketSummary?.reserve_and_surplus)}M</div>
            </div>
            <div>
              <div className="text-muted-foreground">52W Low</div>
              <div className="font-medium">{formatTk(marketSummary?.week_52_range?.low)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">52W High</div>
              <div className="font-medium">{formatTk(marketSummary?.week_52_range?.high)}</div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-muted-foreground">Financial Year End</div><div className="font-medium">{marketSummary?.year_end || "-"}</div></div>
            <div><div className="text-muted-foreground">Last AGM</div><div className="font-medium">{marketSummary?.last_agm || "-"}</div></div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed sections */}
      <Tabs defaultValue="earnings">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="earnings"><TrendingUp className="h-4 w-4 mr-1" /> Earnings & Profit</TabsTrigger>
          <TabsTrigger value="financial-health"><Activity className="h-4 w-4 mr-1" /> Financial Health</TabsTrigger>
          <TabsTrigger value="shareholding"><Users className="h-4 w-4 mr-1" /> Shareholding</TabsTrigger>
          <TabsTrigger value="dividends"><Percent className="h-4 w-4 mr-1" /> Dividends</TabsTrigger>
          <TabsTrigger value="ratios"><BarChart3 className="h-4 w-4 mr-1" /> Historical Ratios</TabsTrigger>
          <TabsTrigger value="peers"><Landmark className="h-4 w-4 mr-1" /> Peer Comparison</TabsTrigger>
          <TabsTrigger value="chart"><LineChart className="h-4 w-4 mr-1" /> Price Chart</TabsTrigger>
          <TabsTrigger value="score"><Sparkles className="h-4 w-4 mr-1" /> Strength Score</TabsTrigger>
        </TabsList>

        {/* Earnings & Profit */}
        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Earnings (EPS Trend)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Previous Year EPS</TableHead>
                    <TableHead>Current Year EPS</TableHead>
                    <TableHead>Growth %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings?.quarters && earnings.quarters.length > 0 ? (
                    earnings.quarters.map((q, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{q.quarter}</TableCell>
                        <TableCell>{q.period}</TableCell>
                        <TableCell>{formatTk(q.prev_year_eps)}</TableCell>
                        <TableCell>{formatTk(q.current_year_eps)}</TableCell>
                        <TableCell className={Number(q.growth_percent) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPct(q.growth_percent)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No quarterly earnings data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {earnings?.annual && (
            <Card>
              <CardHeader>
                <CardTitle>Annual Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Previous Year EPS</div>
                    <div className="font-medium">{formatTk(earnings.annual.prev_year_eps)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Current Year EPS</div>
                    <div className="font-medium">{formatTk(earnings.annual.current_year_eps)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Growth %</div>
                    <div className={`font-medium ${Number(earnings.annual.growth_percent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPct(earnings.annual.growth_percent)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Annual Profit</div>
                    <div className="font-medium">{formatTk(earnings.annual.profit_million)}M</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financial Health */}
        <TabsContent value="financial-health">
          <Card>
            <CardHeader>
              <CardTitle>Financial Health & Debt Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-muted-foreground text-sm">Short-term Loan</div>
                  <div className="font-medium text-lg">{formatTk(financialHealth?.short_term_loan)}M</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Long-term Loan</div>
                  <div className="font-medium text-lg">{formatTk(financialHealth?.long_term_loan)}M</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Total Debt</div>
                  <div className="font-medium text-lg">{formatTk(financialHealth?.total_loan)}M</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Reserve & Surplus</div>
                  <div className="font-medium text-lg">{formatTk(financialHealth?.reserve_and_surplus)}M</div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-sm font-medium mb-1">Debt Status</div>
                <Badge variant={financialHealth?.debt_status?.toLowerCase().includes('healthy') ? 'default' : 'destructive'}>
                  {financialHealth?.debt_status || 'Unknown'}
                </Badge>
              </div>

              {financialHealth?.remarks && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <strong>Remarks:</strong> {financialHealth.remarks}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shareholding Pattern */}
        <TabsContent value="shareholding">
          <Card>
            <CardHeader>
              <CardTitle>Shareholding Pattern</CardTitle>
              <p className="text-sm text-muted-foreground">
                As of: {shareholding?.date ? new Date(shareholding.date).toLocaleDateString() : '-'}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Sponsors/Directors</TableCell>
                    <TableCell>{formatPct(shareholding?.director)}</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Government</TableCell>
                    <TableCell>{formatPct(shareholding?.govt)}</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Institutions</TableCell>
                    <TableCell>{formatPct(shareholding?.institute)}</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Foreign Investors</TableCell>
                    <TableCell>{formatPct(shareholding?.foreign)}</TableCell>
                    <TableCell className={Number(shareholding?.change?.foreign) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {shareholding?.change?.foreign ? `${Number(shareholding.change.foreign) >= 0 ? '+' : ''}${formatPct(shareholding.change.foreign)}` : '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Public</TableCell>
                    <TableCell>{formatPct(shareholding?.public)}</TableCell>
                    <TableCell className={Number(shareholding?.change?.public) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {shareholding?.change?.public ? `${Number(shareholding.change.public) >= 0 ? '+' : ''}${formatPct(shareholding.change.public)}` : '-'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dividends */}
        <TabsContent value="dividends">
          <Card>
            <CardHeader>
              <CardTitle>Dividend History (Last 10 Years)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Cash Dividend</TableHead>
                    <TableHead>Stock Dividend</TableHead>
                    <TableHead>Dividend Yield</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dividends && dividends.length > 0 ? (
                    dividends.map((d, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{d.year}</TableCell>
                        <TableCell>{d.cash_dividend || "-"}</TableCell>
                        <TableCell>{d.stock_dividend || "-"}</TableCell>
                        <TableCell>{formatPct(d.dividend_yield)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No dividend history available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historical Ratios */}
        <TabsContent value="ratios">
          <Card>
            <CardHeader>
              <CardTitle>Historical Financial Ratios (5 Years)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {historicalRatios?.years.map((year, idx) => (
                      <TableHead key={idx}>{year}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">EPS</TableCell>
                    {historicalRatios?.eps_history.map((eps, idx) => (
                      <TableCell key={idx}>{formatTk(eps)}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">P/E Ratio</TableCell>
                    {historicalRatios?.pe_history.map((pe, idx) => (
                      <TableCell key={idx}>{formatNumber(pe)}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">NAV</TableCell>
                    {historicalRatios?.nav_history.map((nav, idx) => (
                      <TableCell key={idx}>{formatTk(nav)}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Profit (M)</TableCell>
                    {historicalRatios?.profit_history.map((profit, idx) => (
                      <TableCell key={idx}>{formatTk(profit)}M</TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>

              {(!historicalRatios || historicalRatios.years.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  No historical ratio data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peer Comparison */}
        <TabsContent value="peers">
          <Card>
            <CardHeader>
              <CardTitle>Sector Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">
                Comparing {selectedSymbol} with {peers.length} peers in {companyInfo?.sector || 'same sector'}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>LTP</TableHead>
                    <TableHead>P/E</TableHead>
                    <TableHead>Div. Yield</TableHead>
                    <TableHead>NAV</TableHead>
                    <TableHead>Market Cap</TableHead>
                    <TableHead>EPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {peerComparison.length > 0 ? (
                    peerComparison.map((p: any, idx) => (
                      <TableRow key={idx} className={p.trading_code === selectedSymbol ? 'bg-muted/50 font-medium' : ''}>
                        <TableCell>{p.trading_code}</TableCell>
                        <TableCell>{p.company_name}</TableCell>
                        <TableCell>{formatTk(p.ltp)}</TableCell>
                        <TableCell>{formatNumber(p.pe)}</TableCell>
                        <TableCell>{formatPct(p.dividend_yield)}</TableCell>
                        <TableCell>{formatTk(p.nav)}</TableCell>
                        <TableCell>{formatTk(p.market_cap)}M</TableCell>
                        <TableCell>{formatTk(p.eps)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No peer comparison data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Chart */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>5-Year Price History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-72 bg-gradient-to-b from-background to-muted/20 rounded-md overflow-hidden">
                <svg className="absolute inset-0 w-full h-full">
                  {Array.isArray(chart?.candles) && chart.candles.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.7"
                      strokeWidth="2"
                      points={(() => {
                        const c = chart.candles as any[];
                        const prices = c.map((x) => Number(x.c));
                        const max = Math.max(...prices);
                        const min = Math.min(...prices);
                        const range = Math.max(1, max - min);
                        return c.map((pt, i) => {
                          const x = (i / (c.length - 1)) * 100;
                          const y = 100 - ((Number(pt.c) - min) / range) * 100;
                          return `${x},${y}`;
                        }).join(" ");
                      })()}
                    />
                  )}
                </svg>
                {(chartLoading || isLoading) && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Loading chart...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fundamental Strength Score */}
        <TabsContent value="score">
          <Card>
            <CardHeader>
              <CardTitle>Fundamental Strength Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Overall Score</div>
                  <div className="text-4xl font-bold">{fundamentalScore}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {fundamentalScore >= 70 ? 'Strong' : fundamentalScore >= 50 ? 'Moderate' : 'Weak'}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span>Valuation (P/E)</span>
                      <span>{formatNumber(marketSummary?.current_pe)}</span>
                    </div>
                    <Slider
                      value={[Math.min(100, Math.max(0, 100 - (Number(marketSummary?.current_pe) || 0) * 2))]}
                      disabled
                      max={100}
                      step={1}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span>Dividend Yield</span>
                      <span>{formatPct(marketSummary?.dividend_yield)}</span>
                    </div>
                    <Slider
                      value={[Math.min(100, (Number(marketSummary?.dividend_yield) || 0) * 10)]}
                      disabled
                      max={100}
                      step={1}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span>Financial Health</span>
                      <span>{financialHealth?.debt_status || '-'}</span>
                    </div>
                    <Slider
                      value={[fundamentalScore >= 70 ? 80 : fundamentalScore >= 50 ? 50 : 30]}
                      disabled
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="text-xs text-muted-foreground">
        Data sources: DSE, company filings, and platform research. Updated based on latest available information.
      </div>
    </div>
  );
}