import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DividendData {
  year: number;
  cash_dividend: string | number | null;
  stock_dividend: string | number | null;
  dividend_yield?: string | number | null;
}

interface ChartData {
  year: string;
  cash: number;
  stock: number;
}

export function DividendsChart({ data }: { data: DividendData[] | undefined }) {
  // Transform data for the chart
  const chartData = data
    ?.sort((a, b) => a.year - b.year) // Sort by year
    .map(d => ({
      year: String(d.year),
      cash: parseFloat(String(d.cash_dividend || 0)),
      stock: parseFloat(String(d.stock_dividend || 0))
    })) || [];
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No dividend data available
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip 
            formatter={(value: number, name: string) => {
              const label = name === 'cash' ? 'Cash Dividend' : 'Stock Dividend';
              return [`${value.toFixed(2)}%`, label];
            }}
            labelFormatter={(label) => `Year: ${label}`}
          />
          <Legend />
          <Bar 
            dataKey="cash" 
            name="Cash Dividend" 
            fill="#8884d8"
          />
          <Bar 
            dataKey="stock" 
            name="Stock Dividend" 
            fill="#82ca9d"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
