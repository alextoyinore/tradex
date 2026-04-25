import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import { useTheme } from '../context/ThemeContext';

const TradingChart = ({ data, markers = [] }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null); // Persistent chart instance — never destroyed on theme change
  const { theme } = useTheme();
  const [seriesInstance, setSeriesInstance] = useState(null);
  const markersPluginRef = useRef(null); // v5: markers live in a plugin, not on the series

  // ─── Initialize chart ONCE ───────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = activeTheme === 'dark';
    const textColor = isDark ? '#8899aa' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0].contentRect) {
        chart.applyOptions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(data);
    chart.timeScale().fitContent();
    setSeriesInstance(candlestickSeries);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []); // ← Empty deps: initialize once, never re-mount

  // ─── Apply theme colours WITHOUT destroying the chart ────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = activeTheme === 'dark';
    chartRef.current.applyOptions({
      layout: {
        textColor: isDark ? '#8899aa' : '#64748b',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
      },
    });
  }, [theme]); // ← Only updates colours, viewport is preserved

  // ─── Update candle data ──────────────────────────────────────────────────
  useEffect(() => {
    if (seriesInstance && data.length > 0) {
      seriesInstance.setData(data);
    }
  }, [data, seriesInstance]);

  // ─── Update signal markers (lightweight-charts v5 API) ──────────────────
  useEffect(() => {
    if (!seriesInstance) return;

    const formatted = markers
      .filter(m => m.timestamp && m.price)
      .map(m => {
        const ts = Math.floor(new Date(m.timestamp).getTime() / 1000);
        const isBuy = m.signal === 'BUY' || m.type === 'BUY';
        return {
          time: ts,
          position: isBuy ? 'belowBar' : 'aboveBar',
          color: isBuy ? '#10b981' : '#ef4444',
          shape: isBuy ? 'arrowUp' : 'arrowDown',
          text: isBuy ? 'B' : 'S',
          size: 1,
        };
      })
      .sort((a, b) => a.time - b.time);

    // v5: use the createSeriesMarkers plugin instead of series.setMarkers()
    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(formatted);
    } else {
      markersPluginRef.current = createSeriesMarkers(seriesInstance, formatted);
    }
  }, [markers, seriesInstance]);

  return (
    <div
      ref={chartContainerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default TradingChart;
