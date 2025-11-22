import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, BarChart3, PieChart, Bell, Clock, DollarSign, Percent } from 'lucide-react';

const PremiumTraderDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock data - in production, this would come from your API
  const portfolioData = {
    totalValue: 15847320,
    dailyPL: 234580,
    dailyPLPercent: 1.50,
    weeklyPL: 456780,
    weeklyPLPercent: 2.98,
    monthlyPL: 892340,
    monthlyPLPercent: 5.97,
    unrealizedPL: 1247890,
    unrealizedPLPercent: 8.55,
    realizedPLYTD: 567890,
    realizedPLDaily: 45670,
    totalInvested: 14599430,
    totalCash: 892450,
    dsexComp1D: 0.32,
    dsexComp1W: 1.15,
    dsexComp1M: 2.44,
    dsexCompYTD: 8.76,
    sparkline: [0, 0.5, 0.3, 0.8, 1.2, 0.9, 1.5]
  };

  const brokers = [
    { name: 'IDLC Securities', value: 6234580, dailyPL: 89340, dailyPLPct: 1.45, unrealizedPL: 456780, cash: 234560, marginUsed: 1200000, marginRatio: 0.32, pendingOrders: 3, trades: 12 },
    { name: 'UCB Stock Brokerage', value: 5678920, dailyPL: 98450, dailyPLPct: 1.76, unrealizedPL: 567890, cash: 456780, marginUsed: 800000, marginRatio: 0.24, pendingOrders: 2, trades: 8 },
    { name: 'BRAC EPL', value: 3933820, dailyPL: 46790, dailyPLPct: 1.20, unrealizedPL: 223220, cash: 201110, marginUsed: 500000, marginRatio: 0.19, pendingOrders: 1, trades: 5 }
  ];

  const marketData = {
    dsex: 6234.56,
    dsexChange: 1.24,
    advancers: 187,
    decliners: 143,
    unchanged: 28,
    volume: 23456789
  };

  const topMovers = [
    { symbol: 'SQURPHARMA', name: 'Square Pharma', contribution: 45670, price: 245.60, change: 3.45, volume: 456780 },
    { symbol: 'BRACBANK', name: 'BRAC Bank', contribution: 34560, price: 54.30, change: 2.87, volume: 1234567 },
    { symbol: 'BATBC', name: 'British American Tobacco', contribution: 28900, price: 567.80, change: 2.34, volume: 234567 },
    { symbol: 'GPH', name: 'GPH Ispat', contribution: -23450, price: 32.40, change: -3.21, volume: 567890 },
    { symbol: 'BEXIMCO', name: 'Beximco Pharma', contribution: -18670, price: 89.70, change: -2.56, volume: 345678 }
  ];

  const sectorExposure = [
    { sector: 'Banking', value: 4234560, percent: 26.7 },
    { sector: 'Pharmaceuticals', value: 3456780, percent: 21.8 },
    { sector: 'Telecom', value: 2678900, percent: 16.9 },
    { sector: 'Energy', value: 2234560, percent: 14.1 },
    { sector: 'Manufacturing', value: 1892340, percent: 11.9 },
    { sector: 'Others', value: 1350180, percent: 8.6 }
  ];

  const alerts = [
    { type: 'price', message: 'SQURPHARMA crossed ৳250', time: '10:23 AM', priority: 'high' },
    { type: 'margin', message: 'Margin ratio approaching 35% limit', time: '10:15 AM', priority: 'high' },
    { type: 'volatility', message: 'GPH volatility spike detected', time: '09:45 AM', priority: 'medium' },
    { type: 'dividend', message: 'BRACBANK announces 20% dividend', time: '09:30 AM', priority: 'low' }
  ];

  const recentTrades = [
    { symbol: 'SQURPHARMA', type: 'BUY', qty: 500, price: 242.30, broker: 'IDLC', realizedPL: 0, time: '10:34 AM' },
    { symbol: 'BATBC', type: 'SELL', qty: 200, price: 565.40, broker: 'UCB', realizedPL: 12340, time: '10:28 AM' },
    { symbol: 'BRACBANK', type: 'BUY', qty: 1000, price: 53.80, broker: 'BRAC EPL', realizedPL: 0, time: '10:15 AM' }
  ];

  const watchlist = [
    { symbol: 'WALTONHIL', price: 1456.70, change: 2.34, volume: 45678, momentum: 'strong' },
    { symbol: 'BERGERPBL', price: 1876.40, change: -1.23, volume: 23456, momentum: 'weak' },
    { symbol: 'RENATA', price: 876.50, change: 0.87, volume: 34567, momentum: 'neutral' }
  ];

  const Sparkline = ({ data }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg className="w-24 h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-emerald-400"
        />
      </svg>
    );
  };

  const formatCurrency = (value) => {
    return `৳${(value / 100000).toFixed(2)}L`;
  };

  const formatNumber = (value) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
    return value.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-mono">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">DSE TRADER PRO</h1>
          <p className="text-xs text-slate-500">Multi-Broker Portfolio Management</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Market Open</div>
          <div className="text-lg font-semibold">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</div>
        </div>
      </div>

      {/* Hero Portfolio Snapshot */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 mb-6 border border-slate-700 shadow-2xl">
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-2">
            <div className="text-xs text-slate-400 mb-1">TOTAL PORTFOLIO VALUE</div>
            <div className="text-4xl font-bold text-emerald-400 mb-2">{formatCurrency(portfolioData.totalValue)}</div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1 text-lg font-semibold ${portfolioData.dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {portfolioData.dailyPL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {formatCurrency(Math.abs(portfolioData.dailyPL))}
              </div>
              <div className={`text-lg ${portfolioData.dailyPLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {portfolioData.dailyPLPercent >= 0 ? '+' : ''}{portfolioData.dailyPLPercent.toFixed(2)}%
              </div>
              <Sparkline data={portfolioData.sparkline} />
            </div>
          </div>
          
          <div>
            <div className="text-xs text-slate-400 mb-1">WEEKLY P/L</div>
            <div className={`text-xl font-bold ${portfolioData.weeklyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(portfolioData.weeklyPL)}
            </div>
            <div className={`text-sm ${portfolioData.weeklyPLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolioData.weeklyPLPercent >= 0 ? '+' : ''}{portfolioData.weeklyPLPercent.toFixed(2)}%
            </div>
          </div>
          
          <div>
            <div className="text-xs text-slate-400 mb-1">MONTHLY P/L</div>
            <div className={`text-xl font-bold ${portfolioData.monthlyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(portfolioData.monthlyPL)}
            </div>
            <div className={`text-sm ${portfolioData.monthlyPLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolioData.monthlyPLPercent >= 0 ? '+' : ''}{portfolioData.monthlyPLPercent.toFixed(2)}%
            </div>
          </div>
          
          <div>
            <div className="text-xs text-slate-400 mb-1">UNREALIZED P/L</div>
            <div className={`text-xl font-bold ${portfolioData.unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(portfolioData.unrealizedPL)}
            </div>
            <div className={`text-sm ${portfolioData.unrealizedPLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolioData.unrealizedPLPercent >= 0 ? '+' : ''}{portfolioData.unrealizedPLPercent.toFixed(2)}%
            </div>
          </div>
          
          <div>
            <div className="text-xs text-slate-400 mb-1">REALIZED P/L (YTD)</div>
            <div className={`text-xl font-bold ${portfolioData.realizedPLYTD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(portfolioData.realizedPLYTD)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Today: {formatCurrency(portfolioData.realizedPLDaily)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-6 gap-6 mt-6 pt-6 border-t border-slate-700">
          <div>
            <div className="text-xs text-slate-400">INVESTED</div>
            <div className="text-lg font-semibold">{formatCurrency(portfolioData.totalInvested)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">TOTAL CASH</div>
            <div className="text-lg font-semibold text-cyan-400">{formatCurrency(portfolioData.totalCash)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">vs DSEX 1D</div>
            <div className={`text-lg font-semibold ${portfolioData.dsexComp1D >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolioData.dsexComp1D >= 0 ? '+' : ''}{portfolioData.dsexComp1D.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">vs DSEX 1W</div>
            <div className={`text-lg font-semibold ${portfolioData.dsexComp1W >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolioData.dsexComp1W >= 0 ? '+' : ''}{portfolioData.dsexComp1W.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">vs DSEX 1M</div>
            <div className={`text-lg font-semibold ${portfolioData.dsexComp1M >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolioData.dsexComp1M >= 0 ? '+' : ''}{portfolioData.dsexComp1M.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">vs DSEX YTD</div>
            <div className={`text-lg font-semibold ${portfolioData.dsexCompYTD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolioData.dsexCompYTD >= 0 ? '+' : ''}{portfolioData.dsexCompYTD.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Broker Cards & Market Intelligence Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {brokers.map((broker, idx) => (
          <div key={idx} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="text-xs text-slate-400 mb-2 font-semibold">{broker.name}</div>
            <div className="text-2xl font-bold text-slate-100 mb-1">{formatCurrency(broker.value)}</div>
            <div className={`text-sm font-semibold mb-3 ${broker.dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {broker.dailyPL >= 0 ? '+' : ''}{formatCurrency(broker.dailyPL)} ({broker.dailyPLPct.toFixed(2)}%)
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Unrealized P/L:</span>
                <span className={broker.unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatCurrency(broker.unrealizedPL)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash:</span>
                <span className="text-cyan-400">{formatCurrency(broker.cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Margin Used:</span>
                <span className={broker.marginRatio > 0.3 ? 'text-amber-400' : 'text-slate-300'}>
                  {formatCurrency(broker.marginUsed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Margin Ratio:</span>
                <span className={broker.marginRatio > 0.3 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                  {(broker.marginRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-500">Pending Orders:</span>
                <span className="text-amber-300 font-semibold">{broker.pendingOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Today's Trades:</span>
                <span className="text-slate-300">{broker.trades}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Market Intelligence */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-400 mb-2 font-semibold flex items-center gap-2">
            <Activity size={14} />
            MARKET OVERVIEW
          </div>
          <div className="mb-3">
            <div className="text-lg text-slate-300">DSEX Index</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{marketData.dsex.toFixed(2)}</div>
              <div className={`text-sm font-semibold ${marketData.dsexChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {marketData.dsexChange >= 0 ? '+' : ''}{marketData.dsexChange.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Advancers:</span>
              <span className="text-emerald-400 font-semibold">{marketData.advancers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Decliners:</span>
              <span className="text-red-400 font-semibold">{marketData.decliners}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unchanged:</span>
              <span className="text-slate-400">{marketData.unchanged}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-500">Volume:</span>
              <span className="text-slate-300">{formatNumber(marketData.volume)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Market Breadth</div>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500" style={{ width: `${(marketData.advancers / (marketData.advancers + marketData.decliners + marketData.unchanged)) * 100}%` }}></div>
              <div className="bg-red-500" style={{ width: `${(marketData.decliners / (marketData.advancers + marketData.decliners + marketData.unchanged)) * 100}%` }}></div>
              <div className="bg-slate-600" style={{ width: `${(marketData.unchanged / (marketData.advancers + marketData.decliners + marketData.unchanged)) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Movers & Risk Panel Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Top Movers */}
        <div className="col-span-2 bg-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-3 font-semibold flex items-center gap-2">
            <TrendingUp size={16} />
            TOP PORTFOLIO MOVERS - TODAY
          </div>
          <div className="space-y-2">
            {topMovers.map((stock, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{stock.symbol}</div>
                  <div className="text-xs text-slate-500">{stock.name}</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="font-semibold">৳{stock.price.toFixed(2)}</div>
                    <div className={`text-xs ${stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right w-24">
                    <div className="text-xs text-slate-500">Impact</div>
                    <div className={`font-bold ${stock.contribution >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stock.contribution >= 0 ? '+' : ''}{formatCurrency(Math.abs(stock.contribution))}
                    </div>
                  </div>
                  <div className="text-right w-20">
                    <div className="text-xs text-slate-500">Vol</div>
                    <div className="text-xs">{formatNumber(stock.volume)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk & Exposure Summary */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-3 font-semibold flex items-center gap-2">
            <AlertTriangle size={16} />
            RISK METRICS
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-slate-500 mb-1">Portfolio Beta (vs DSEX)</div>
              <div className="text-xl font-bold text-amber-400">1.23</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Volatility Score</div>
              <div className="text-xl font-bold text-orange-400">7.8/10</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Max Drawdown (1M)</div>
              <div className="text-xl font-bold text-red-400">-12.34%</div>
            </div>
            <div className="pt-3 border-t border-slate-800">
              <div className="text-slate-500 mb-2">Concentration Risk (Top 3)</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>SQURPHARMA</span>
                  <span className="font-semibold">18.7%</span>
                </div>
                <div className="flex justify-between">
                  <span>BATBC</span>
                  <span className="font-semibold">15.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>BRACBANK</span>
                  <span className="font-semibold">12.9%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Exposure & Alerts Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Sector Exposure */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-3 font-semibold flex items-center gap-2">
            <PieChart size={16} />
            SECTOR EXPOSURE
          </div>
          <div className="space-y-2">
            {sectorExposure.map((sector, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{sector.sector}</span>
                  <span className="font-semibold">{sector.percent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    style={{ width: `${sector.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="col-span-2 bg-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-3 font-semibold flex items-center gap-2">
            <Bell size={16} />
            ALERTS & NOTIFICATIONS
          </div>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-2 rounded border ${
                alert.priority === 'high' ? 'bg-red-950/20 border-red-900' :
                alert.priority === 'medium' ? 'bg-amber-950/20 border-amber-900' :
                'bg-slate-800/50 border-slate-700'
              }`}>
                <div className={`mt-1 ${
                  alert.priority === 'high' ? 'text-red-400' :
                  alert.priority === 'medium' ? 'text-amber-400' :
                  'text-slate-400'
                }`}>
                  <Bell size={14} />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-200">{alert.message}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Clock size={10} />
                    {alert.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trades & Watchlist Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Trades */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-3 font-semibold flex items-center gap-2">
            <BarChart3 size={16} />
            RECENT TRADES
          </div>
          <div className="space-y-2">
            {recentTrades.map((trade, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    trade.type === 'BUY' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {trade.type}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{trade.symbol}</div>
                    <div className="text-xs text-slate-500">{trade.broker}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{trade.qty} @ ৳{trade.price.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">{trade.time}</div>
                </div>
                {trade.realizedPL > 0 && (
                  <div className="text-emerald-400 font-semibold text-sm">
                    +{formatCurrency(trade.realizedPL)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-3 font-semibold flex items-center gap-2">
            <Activity size={16} />
            WATCHLIST
          </div>
          <div className="space-y-2">
            {watchlist.map((stock, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{stock.symbol}</div>
                  <div className="text-xs text-slate-500">Vol: {formatNumber(stock.volume)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">৳{stock.price.toFixed(2)}</div>
                  <div className={`text-xs ${stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                  </div>
                </div>
                <div className={`ml-3 px-2 py-1 rounded text-xs font-semibold ${
                  stock.momentum === 'strong' ? 'bg-emerald-900/50 text-emerald-400' :
                  stock.momentum === 'weak' ? 'bg-red-900/50 text-red-400' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {stock.momentum.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumTraderDashboard; 