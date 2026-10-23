'use client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { formatPriceTag } from '@/lib/utils';

interface ChartsProps {
  data: { salesData: { month: string; totalSales: number }[] };
}

// The axes draw in currentColor, so their color comes from the theme token on the container.
const Charts = ({ data: { salesData } }: ChartsProps) => {
  return (
    <ResponsiveContainer width='100%' height={350} className='text-muted-foreground'>
      <BarChart data={salesData}>
        <XAxis
          dataKey='month'
          stroke='currentColor'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='currentColor'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatPriceTag(value)}
        />
        <Bar
          dataKey='totalSales'
          fill='currentColor'
          radius={[4, 4, 0, 0]}
          className='fill-primary'
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default Charts;
