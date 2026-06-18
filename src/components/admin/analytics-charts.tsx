"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface AnalyticsChartsProps {
  registrationData: { date: string; count: number }[];
  cropData: { name: string; value: number }[];
  currentYieldTon: number;
  targetYieldTon: number;
}

export function AnalyticsCharts({ registrationData, cropData, currentYieldTon, targetYieldTon }: AnalyticsChartsProps) {
  const targetYield = targetYieldTon;
  const currentYield = currentYieldTon;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Registration Trend */}
      <Card className="shadow-sm border-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Registration Trend</CardTitle>
          <CardDescription>Daily farmer registrations (Last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Crop Distribution */}
      <Card className="shadow-sm border-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Crop Distribution</CardTitle>
          <CardDescription>Top crops by number of farms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cropData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {cropData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Yield vs Target */}
      <Card className="shadow-sm border-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Yield vs. Annual Target</CardTitle>
          <CardDescription>Progress towards annual platform goal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-3xl font-black text-primary">{(targetYield > 0 ? (currentYield / targetYield * 100) : 0).toFixed(1)}%</span>
                <span className="text-sm text-muted-foreground ml-2">of annual goal achieved</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Remaining</p>
                <p className="text-sm font-bold">{Math.max(0, targetYield - currentYield).toLocaleString()} Tons</p>
              </div>
            </div>
            <div className="h-12 w-full bg-slate-100 rounded-2xl overflow-hidden p-1.5 border border-slate-200">
              <div 
                className="h-full bg-primary rounded-xl transition-all duration-1000 ease-out shadow-lg shadow-primary/20 flex items-center justify-end px-4"
                style={{ width: `${Math.min(100, targetYield > 0 ? (currentYield / targetYield * 100) : 0)}%` }}
              >
                <span className="text-[10px] font-black text-white">CURRENT</span>
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tighter pt-1">
              <span>0 Tons</span>
              <span>{Math.round(targetYield / 2 / 1000)}k</span>
              <span>{Math.round(targetYield / 1000)}k (Target)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
