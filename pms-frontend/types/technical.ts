export interface DonchianChannelData {
  symbol: string;
  company_name: string;
  current_price: number;
  data_points: number;
  latest_date: string;
  includes_current_day: boolean;
  cached: boolean;
  channels: Array<{
    period: number;
    resistance: number;
    support: number;
    middle: number;
    range: number;
  }>;
}

