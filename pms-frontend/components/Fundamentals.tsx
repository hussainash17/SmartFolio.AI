import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import { ResearchService, MarketService } from "../src/client";
import { Search, Building2, BarChart3, Users, Percent, Scale, Landmark, Newspaper, GitBranch, LineChart, Sparkles } from "lucide-react";

interface FundamentalsProps {
  defaultSymbol?: string;
}

type BasicInfo = {
  symbol: string;
  name: string;
  sector?: string;
  current_price?: number;
  market_cap?: number;
  enterprise_value?: number;
};

type Ratios = Record<string, number | undefined>;

type FundamentalResponse = {
  basic_info: BasicInfo;
  valuation_ratios: Ratios;
  profitability_ratios: Ratios;
  financial_strength: Ratios;
  growth_metrics: Ratios;
  dividend_info: Ratios;
  investment_score?: {
    score: number;
    max_score: number;
    rating: string;
  }
};

function formatNumber(n?: number | string | null) {
  if (n === undefined || n === null) return "-";
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "-";
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString();
}

function formatTk(n?: number | string | null) {
  if (n === undefined || n === null) return "-";
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "-";
  return `৳${Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPct(n?: number | string | null) {
  if (n === undefined || n === null) return "-";
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "-";
  return `${num.toFixed(2)}%`;
}

export function Fundamentals({ defaultSymbol }: FundamentalsProps) {
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(defaultSymbol);

  // Stock list for search/select
  const { data: stockList = [], isLoading: listLoading } = useQuery({
    queryKey: ["market", "list", { limit: 100, offset: 0 }],
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

  // Initialize selected symbol from list if not set yet
  useEffect(() => {
    if (!selectedSymbol && stockList.length > 0) {
      setSelectedSymbol(stockList[0].symbol);
    }
  }, [selectedSymbol, stockList]);

  // Company basic details (includes sector/industry and latest data)
  const { data: company, isLoading: companyLoading } = useQuery({
    enabled: !!selectedSymbol,
    queryKey: ["market", "stock", selectedSymbol],
    queryFn: async () => {
      const data = await MarketService.getStock({ symbol: selectedSymbol as string });
      return data as any;
    }
  });

  // Fundamentals from backend research service
  const { data: fundamentals, isLoading: fundamentalsLoading } = useQuery<FundamentalResponse>({
    enabled: !!selectedSymbol,
    queryKey: ["research", "fundamentals", selectedSymbol],
    queryFn: async () => {
      const resp = await ResearchService.getFundamentalAnalysis({ symbol: selectedSymbol as string });
      return resp as unknown as FundamentalResponse;
    }
  });

  // Chart data (daily)
  const { data: chart, isLoading: chartLoading } = useQuery({
    enabled: !!selectedSymbol,
    queryKey: ["market", "chart", selectedSymbol, "5Y"],
    queryFn: async () => {
      const resp = await MarketService.getChartData({ symbol: selectedSymbol as string, timeframe: "5Y" });
      return resp as any;
    }
  });

  // Sector peers
  const peers = useMemo(() => {
    if (!company?.sector) return [] as { symbol: string; name: string; sector: string }[];
    return stockList
      .filter((s) => s.sector === company.sector && s.symbol !== selectedSymbol)
      .slice(0, 5);
  }, [company, stockList, selectedSymbol]);

  const score = useMemo(() => {
    const v = fundamentals?.valuation_ratios;
    const p = fundamentals?.profitability_ratios;
    const f = fundamentals?.financial_strength;
    const g = fundamentals?.growth_metrics;
    const d = fundamentals?.dividend_info;

    // Bangladesh-weighted score
    let s = 0;
    if (p && (p["return_on_equity"] ?? 0) > 15 && (p["net_margin"] ?? 0) > 10) s += 30;
    if (g && (g["earnings_growth_3y"] ?? 0) > 10 && (g["revenue_growth_3y"] ?? 0) > 8) s += 20;
    if (v && (v["pe_ratio"] ?? 0) > 0) s += 15; // relative valuation handled in UI
    if (d && (d["dividend_yield"] ?? 0) > 2) s += 15;
    if (f && (f["debt_to_equity"] ?? 1) < 0.5 && (f["current_ratio"] ?? 0) > 1.2) s += 20;

    return Math.min(100, s);
  }, [fundamentals]);

  const filteredStocks = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return stockList;
    return stockList.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q));
  }, [query, stockList]);

  return (
    <div className="space-y-6">
      {/* Selector */}
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
            <Badge variant="outline">Sector: {company?.sector || "-"}</Badge>
            <Badge variant="secondary">Peers: {peers.length}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Company Profile & Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-muted-foreground">Ticker</div><div className="font-medium">{company?.symbol || fundamentals?.basic_info.symbol || "-"}</div></div>
            <div><div className="text-muted-foreground">Company</div><div className="font-medium">{company?.company_name || fundamentals?.basic_info.name || "-"}</div></div>
            <div><div className="text-muted-foreground">Sector</div><div className="font-medium">{company?.sector || fundamentals?.basic_info.sector || "-"}</div></div>
            <div><div className="text-muted-foreground">Face Value</div><div className="font-medium">৳10/৳100</div></div>
            <div><div className="text-muted-foreground">Market Cap</div><div className="font-medium">{formatTk(fundamentals?.basic_info.market_cap)}</div></div>
            <div><div className="text-muted-foreground">EV</div><div className="font-medium">{formatTk(fundamentals?.basic_info.enterprise_value)}</div></div>
            <div><div className="text-muted-foreground">Listing Date</div><div className="font-medium">—</div></div>
            <div><div className="text-muted-foreground">ISIN</div><div className="font-medium">—</div></div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for sections */}
      <Tabs defaultValue="financials">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="financials"><BarChart3 className="h-4 w-4 mr-1" /> Financial Statements</TabsTrigger>
          <TabsTrigger value="ratios"><Percent className="h-4 w-4 mr-1" /> Key Ratios</TabsTrigger>
          <TabsTrigger value="shareholding"><Users className="h-4 w-4 mr-1" /> Shareholding</TabsTrigger>
          <TabsTrigger value="corp-actions"><GitBranch className="h-4 w-4 mr-1" /> Corporate Actions</TabsTrigger>
          <TabsTrigger value="psi"><Newspaper className="h-4 w-4 mr-1" /> PSI & Disclosures</TabsTrigger>
          <TabsTrigger value="peers"><Landmark className="h-4 w-4 mr-1" /> Peer & Sector</TabsTrigger>
          <TabsTrigger value="chart"><LineChart className="h-4 w-4 mr-1" /> Chart</TabsTrigger>
          <TabsTrigger value="score"><Sparkles className="h-4 w-4 mr-1" /> Strength Score</TabsTrigger>
        </TabsList>

        {/* Financial Statements */}
        <TabsContent value="financials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Statement (TTM + 5Y)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>TTM</TableHead>
                    <TableHead>Y1</TableHead>
                    <TableHead>Y2</TableHead>
                    <TableHead>Y3</TableHead>
                    <TableHead>Y4</TableHead>
                    <TableHead>Y5</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Net Sales/Revenue</TableCell>
                    <TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>COGS</TableCell>
                    <TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Gross Profit / Margin</TableCell>
                    <TableCell>{formatPct(fundamentals?.profitability_ratios?.["gross_margin"])}</TableCell>
                    <TableCell colSpan={5}>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Operating Profit / Margin</TableCell>
                    <TableCell>{formatPct(fundamentals?.profitability_ratios?.["operating_margin"])}</TableCell>
                    <TableCell colSpan={5}>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>NPAT / Margin</TableCell>
                    <TableCell>{formatPct(fundamentals?.profitability_ratios?.["net_margin"])}</TableCell>
                    <TableCell colSpan={5}>—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>EPS (Basic)</TableCell>
                    <TableCell>—</TableCell><TableCell colSpan={5}>—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Balance Sheet (Key)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Total Assets</TableCell><TableCell>—</TableCell></TableRow>
                    <TableRow><TableCell>Total Liabilities</TableCell><TableCell>—</TableCell></TableRow>
                    <TableRow><TableCell>Shareholders’ Equity</TableCell><TableCell>—</TableCell></TableRow>
                    <TableRow><TableCell>Debt (ST/LT)</TableCell><TableCell>—</TableCell></TableRow>
                    <TableRow><TableCell>NAV/Share</TableCell><TableCell>—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Cash Flow (Key)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Operating Cash Flow</TableCell><TableCell>—</TableCell></TableRow>
                    <TableRow><TableCell>Investing Cash Flow</TableCell><TableCell>—</TableCell></TableRow>
                    <TableRow><TableCell>Financing Cash Flow</TableCell><TableCell>—</TableCell></TableRow>
                    <TableRow><TableCell>Free Cash Flow</TableCell><TableCell>—</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Key Ratios */}
        <TabsContent value="ratios" className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Profitability</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell>ROE</TableCell><TableCell>{formatPct(fundamentals?.profitability_ratios?.["return_on_equity"])}</TableCell></TableRow>
                  <TableRow><TableCell>ROA</TableCell><TableCell>{formatPct(fundamentals?.profitability_ratios?.["return_on_assets"])}</TableCell></TableRow>
                  <TableRow><TableCell>Gross Margin</TableCell><TableCell>{formatPct(fundamentals?.profitability_ratios?.["gross_margin"])}</TableCell></TableRow>
                  <TableRow><TableCell>Operating Margin</TableCell><TableCell>{formatPct(fundamentals?.profitability_ratios?.["operating_margin"])}</TableCell></TableRow>
                  <TableRow><TableCell>Net Margin</TableCell><TableCell>{formatPct(fundamentals?.profitability_ratios?.["net_margin"])}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Liquidity</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell>Current Ratio</TableCell><TableCell>{formatNumber(fundamentals?.financial_strength?.["current_ratio"])}</TableCell></TableRow>
                  <TableRow><TableCell>Quick Ratio</TableCell><TableCell>{formatNumber(fundamentals?.financial_strength?.["quick_ratio"])}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Leverage</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell>Debt/Equity</TableCell><TableCell>{formatNumber(fundamentals?.financial_strength?.["debt_to_equity"])}</TableCell></TableRow>
                  <TableRow><TableCell>Interest Coverage</TableCell><TableCell>{formatNumber(fundamentals?.financial_strength?.["interest_coverage"])}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Valuation</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell>P/E</TableCell><TableCell>{formatNumber(fundamentals?.valuation_ratios?.["pe_ratio"])}</TableCell></TableRow>
                  <TableRow><TableCell>P/B</TableCell><TableCell>{formatNumber(fundamentals?.valuation_ratios?.["price_to_book"])}</TableCell></TableRow>
                  <TableRow><TableCell>Dividend Yield</TableCell><TableCell>{formatPct(fundamentals?.dividend_info?.["dividend_yield"])}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Growth</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell>Revenue CAGR (3Y)</TableCell><TableCell>{formatPct(fundamentals?.growth_metrics?.["revenue_growth_3y"])}</TableCell></TableRow>
                  <TableRow><TableCell>EPS CAGR (3Y)</TableCell><TableCell>{formatPct(fundamentals?.growth_metrics?.["earnings_growth_3y"])}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shareholding Pattern */}
        <TabsContent value="shareholding">
          <Card>
            <CardHeader><CardTitle>Shareholding Pattern</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell>Sponsors/Directors</TableCell><TableCell>—</TableCell></TableRow>
                  <TableRow><TableCell>Government</TableCell><TableCell>—</TableCell></TableRow>
                  <TableRow><TableCell>Institutions</TableCell><TableCell>—</TableCell></TableRow>
                  <TableRow><TableCell>Foreign Investors</TableCell><TableCell>—</TableCell></TableRow>
                  <TableRow><TableCell>Public</TableCell><TableCell>—</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className="text-xs text-muted-foreground mt-2">Quarterly trend view coming soon.</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Corporate Actions */}
        <TabsContent value="corp-actions">
          <Card>
            <CardHeader><CardTitle>Corporate Actions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell>Dividend (Cash/Stock)</TableCell><TableCell>—</TableCell><TableCell>—</TableCell></TableRow>
                  <TableRow><TableCell>Rights Issue</TableCell><TableCell>—</TableCell><TableCell>—</TableCell></TableRow>
                  <TableRow><TableCell>Stock Split</TableCell><TableCell>—</TableCell><TableCell>—</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PSI & Disclosures */}
        <TabsContent value="psi">
          <Card>
            <CardHeader><CardTitle>Price-Sensitive Information</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">No PSI feed connected yet. Pulls will display from DSE, BSEC, and company announcements.</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peer & Sector */}
        <TabsContent value="peers">
          <Card>
            <CardHeader><CardTitle>Sector Comparison</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>P/E</TableHead>
                    <TableHead>P/B</TableHead>
                    <TableHead>Dividend Yld</TableHead>
                    <TableHead>ROE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {peers.map((p) => (
                    <TableRow key={p.symbol}>
                      <TableCell>{p.symbol}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{formatNumber(fundamentals?.valuation_ratios?.["pe_ratio"])}</TableCell>
                      <TableCell>{formatNumber(fundamentals?.valuation_ratios?.["price_to_book"])}</TableCell>
                      <TableCell>{formatPct(fundamentals?.dividend_info?.["dividend_yield"])}</TableCell>
                      <TableCell>{formatPct(fundamentals?.profitability_ratios?.["return_on_equity"])}</TableCell>
                    </TableRow>
                  ))}
                  {peers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No peers found in sector.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chart */}
        <TabsContent value="chart">
          <Card>
            <CardHeader><CardTitle>5-Year Price History</CardTitle></CardHeader>
            <CardContent>
              <div className="relative h-72 bg-gradient-to-b from-background to-muted/20 rounded-md overflow-hidden">
                <svg className="absolute inset-0 w-full h-full">
                  {/* Simple area chart from candles */}
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
                {(chartLoading || companyLoading || fundamentalsLoading) && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fundamental Strength Score */}
        <TabsContent value="score">
          <Card>
            <CardHeader><CardTitle>Fundamental Strength Score</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Overall Score</div>
                  <div className="text-4xl font-bold">{score}</div>
                  <div className="text-xs text-muted-foreground">Weighted by Bangladesh market behavior</div>
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm"><span>Profitability (30%)</span><span>{formatPct(fundamentals?.profitability_ratios?.["net_margin"])}</span></div>
                    <Slider value={[Math.min(100, Number(fundamentals?.profitability_ratios?.["net_margin"]) || 0)]} disabled max={100} step={1} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm"><span>Growth (20%)</span><span>{formatPct(fundamentals?.growth_metrics?.["earnings_growth_3y"])}</span></div>
                    <Slider value={[Math.min(100, Number(fundamentals?.growth_metrics?.["earnings_growth_3y"]) || 0)]} disabled max={100} step={1} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm"><span>Valuation (15%)</span><span>{formatNumber(fundamentals?.valuation_ratios?.["pe_ratio"])}</span></div>
                    <Slider value={[Math.min(100, 100 - Math.min(100, Number(fundamentals?.valuation_ratios?.["pe_ratio"]) || 0))]} disabled max={100} step={1} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm"><span>Dividend (15%)</span><span>{formatPct(fundamentals?.dividend_info?.["dividend_yield"])}</span></div>
                    <Slider value={[Math.min(100, Number(fundamentals?.dividend_info?.["dividend_yield"]) || 0)]} disabled max={100} step={1} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm"><span>Financial Health (20%)</span><span>D/E {formatNumber(fundamentals?.financial_strength?.["debt_to_equity"])}</span></div>
                    <Slider value={[Math.min(100, Math.max(0, 100 - (Number(fundamentals?.financial_strength?.["debt_to_equity"]) || 0) * 100))]} disabled max={100} step={1} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="text-xs text-muted-foreground">
        Data sources: DSE, company filings, and platform research. Some fields may be placeholders pending backend ingestion.
      </div>
    </div>
  );
}