import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Earmark } from 'types/database.types';

type EarmarkChartProps = {
  data: Earmark[];
};

const EarmarkChart: React.FC<EarmarkChartProps> = ({ data }) => {
  // Prepare data for the chart - group by agency
  const chartData = React.useMemo(() => {
    const agencyTotals: Record<string, number> = {};
    
    // Sum amounts by agency
    data.forEach(earmark => {
      const agency = earmark.agency || 'Unknown';
      agencyTotals[agency] = (agencyTotals[agency] || 0) + earmark.amount;
    });
    
    // Convert to array format for Recharts
    return Object.entries(agencyTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value) // Sort descending
      .slice(0, 5); // Top 5 agencies
  }, [data]);

  if (data.length === 0) {
    return <p>No data to display</p>;
  }

  return (
    <div className="w-full h-80 mt-4">
      <h3 className="text-lg font-medium mb-2">Top Agencies by Funding</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" name="Amount ($)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EarmarkChart;