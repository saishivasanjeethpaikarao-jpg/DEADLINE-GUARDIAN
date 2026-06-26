import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AlarmHistoryItem } from '../types';
import { Clock, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';

interface AlarmHistoryChartProps {
  history: AlarmHistoryItem[];
}

export const AlarmHistoryChart: React.FC<AlarmHistoryChartProps> = ({ history }) => {
  const d3Container = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!history || history.length === 0 || !d3Container.current) return;

    // Process history: group by last 7 days
    const aggregateData = () => {
      const days: Record<string, { dateLabel: string; snooze: number; complete: number }> = {};
      const now = new Date();

      // Initialize the last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toDateString(); // unique day key
        const dateLabel = d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
        days[key] = { dateLabel, snooze: 0, complete: 0 };
      }

      // Populate counts
      history.forEach(item => {
        const itemDate = new Date(item.timestamp);
        const key = itemDate.toDateString();
        if (days[key]) {
          if (item.action === 'snooze') {
            days[key].snooze++;
          } else {
            days[key].complete++;
          }
        }
      });

      return Object.values(days);
    };

    const data = aggregateData();

    // D3 drawing logic
    const svg = d3.select(d3Container.current);
    svg.selectAll('*').remove(); // clear current content

    // Set dimensions and margins
    const margin = { top: 30, right: 20, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale (for the 7 days)
    const x0 = d3.scaleBand()
      .domain(data.map(d => d.dateLabel))
      .rangeRound([0, width])
      .paddingInner(0.25);

    // X1 scale (for grouping Completes vs Snoozes side-by-side within each day)
    const keys = ['complete', 'snooze'];
    const x1 = d3.scaleBand()
      .domain(keys)
      .rangeRound([0, x0.bandwidth()])
      .padding(0.08);

    // Y scale
    const maxVal = d3.max(data, d => Math.max(d.complete, d.snooze)) || 1;
    const y = d3.scaleLinear()
      .domain([0, Math.ceil(maxVal * 1.25)]) // add buffer on top
      .nice()
      .rangeRound([height, 0]);

    // Color scale: Completes (Olive), Snoozes (Coral)
    const colors = d3.scaleOrdinal<string>()
      .domain(keys)
      .range(['#5B6B43', '#C4705A']);

    // Gridlines for premium clean feel
    g.append('g')
      .attr('class', 'grid-lines')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-opacity', 0.6)
      .call(
        d3.axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => '')
      );

    // Add X Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x0).tickSize(0))
      .selectAll('text')
      .attr('class', 'font-mono text-[9px] fill-stone-600 font-bold')
      .attr('dy', '1em');

    // Add Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
      .selectAll('text')
      .attr('class', 'font-mono text-[9px] fill-stone-600 font-bold');

    // Hide axis lines
    g.selectAll('.domain').attr('stroke', '#292524').attr('stroke-width', 2);
    g.selectAll('.tick line').attr('stroke', '#292524').attr('stroke-width', 1);

    // Draw the grouped bars with nice entry animations
    const dayGroup = g.append('g')
      .selectAll('g')
      .data(data)
      .join('g')
      .attr('transform', d => `translate(${x0(d.dateLabel)},0)`);

    dayGroup.selectAll('rect')
      .data(d => keys.map(key => ({ key, value: d[key as 'complete' | 'snooze'] })))
      .join('rect')
      .attr('x', d => x1(d.key)!)
      .attr('y', height) // start at bottom for transition
      .attr('width', x1.bandwidth())
      .attr('height', 0)
      .attr('fill', d => colors(d.key)!)
      .attr('stroke', '#292524')
      .attr('stroke-width', 1.5)
      .attr('rx', 3) // rounded corners
      .attr('ry', 3)
      .transition()
      .duration(700)
      .delay((_d, i) => i * 100)
      .attr('y', d => y(d.value))
      .attr('height', d => height - y(d.value));

    // Simple tooltip indicators when hovered
    dayGroup.selectAll('rect')
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.85)
          .attr('transform', 'scale(1.02)');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('transform', 'scale(1)');
      });

  }, [history]);

  // Aggregate global counts for summary details
  const totalSnoozes = history.filter(h => h.action === 'snooze').length;
  const totalCompletes = history.filter(h => h.action === 'complete').length;
  const totalTriggers = totalSnoozes + totalCompletes;
  const completionRate = totalTriggers > 0 ? Math.round((totalCompletes / totalTriggers) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-[#292524] space-y-5 shadow-[4px_4px_0px_#292524] text-[#292524] text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#292524]/10 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-[#C4705A]" />
          <div>
            <h4 className="font-serif font-black text-sm">Smart Alarm Trigger History</h4>
            <p className="font-dm text-[11px] text-[#292524]/50">D3-rendered daily analytics for Procrastination alarms</p>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-3.5 font-mono text-[9px] font-black uppercase">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 bg-[#5B6B43] border border-[#292524] rounded-sm" />
            <span className="text-[#292524]">Immediate Complete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 bg-[#C4705A] border border-[#292524] rounded-sm" />
            <span className="text-[#292524]">Snoozed Alert</span>
          </div>
        </div>
      </div>

      {/* Grid: Left D3 SVG, Right Summary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* SVG Container (8 cols) */}
        <div className="lg:col-span-8 flex justify-center overflow-x-auto">
          {history.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-stone-400 font-dm text-xs italic">
              No recent smart alarm events found. Trigger an alarm first!
            </div>
          ) : (
            <svg
              ref={d3Container}
              width={600}
              height={280}
              className="max-w-full font-mono"
            />
          )}
        </div>

        {/* Metrics Summary (4 cols) */}
        <div className="lg:col-span-4 bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-4.5 space-y-4">
          <h5 className="font-serif font-black text-xs text-[#292524] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#5B6B43]" />
            Alarms Scorecard
          </h5>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-0.5">
              <span className="font-mono text-[9px] text-[#292524]/50 font-bold block uppercase">Immediate Completions</span>
              <span className="font-serif text-2xl font-black text-[#5B6B43]">{totalCompletes}</span>
            </div>
            <div className="space-y-0.5">
              <span className="font-mono text-[9px] text-[#292524]/50 font-bold block uppercase">Snoozed Actions</span>
              <span className="font-serif text-2xl font-black text-[#C4705A]">{totalSnoozes}</span>
            </div>
          </div>

          <div className="pt-3.5 border-t border-[#292524]/10 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-dm font-bold text-[#292524]">First-Time Complete Rate</span>
              <span className="font-mono font-black text-[#5B6B43]">{completionRate}%</span>
            </div>
            <div className="h-2 bg-[#292524]/10 rounded-full overflow-hidden border border-[#292524]/5">
              <div 
                className="bg-[#5B6B43] h-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }} 
              />
            </div>
          </div>

          <div className="flex items-start gap-2 bg-[#FCF8D5] border border-yellow-200 rounded-lg p-2.5 text-[11px] font-dm text-[#292524]/80 leading-snug">
            <AlertCircle className="h-4 w-4 text-[#C4705A] shrink-0 mt-0.5" />
            <p>
              {completionRate >= 60 
                ? "Excellent resilience! Your guardian shield holds strong with minimal snooze delays."
                : "High snooze trigger volume detected. Try setting more realistic task milestones during peak cognitive hours."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AlarmHistoryChart;
