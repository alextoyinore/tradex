import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TrendingUp, Activity, DollarSign, BarChart3, Clock, ChevronDown, Plus, Maximize2, Minimize2, Bot } from 'lucide-react';
import TradingChart from '../components/TradingChart';
import CreateAgentModal from '../components/CreateAgentModal';
import './Dashboard.css';

const TIMEFRAMES = [
  { value: '1m', label: '1m', isAlgo: true },
  { value: '5m', label: '5m', isAlgo: true },
  { value: '15m', label: '15m', isAlgo: false },
  { value: '1h', label: '1h', isAlgo: false },
];

const StatCard = ({ title, value, change, isPositive, icon: Icon }) => (
  <div className="glass-panel stat-card">
    <div className="stat-header">
      <h3 className="stat-title">{title}</h3>
      <div className="stat-icon-wrapper">
        <Icon size={20} />
      </div>
    </div>
    <div className="stat-value">{value}</div>
    <div className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
      {isPositive ? '+' : '-'}{Math.abs(change)}%
      <span className="stat-change-text">vs last week</span>
    </div>
  </div>
);

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState(searchParams.get('pair') || 'BTC/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [isExpanded, setIsExpanded] = useState(false);
  const [tfDropdownOpen, setTfDropdownOpen] = useState(false);
  const tfDropdownRef = useRef(null);

  // Close TF dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (tfDropdownRef.current && !tfDropdownRef.current.contains(e.target)) {
        setTfDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [agents, setAgents] = useState([]);
  const [signals, setSignals] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(25000); 
  const [portfolioChange, setPortfolioChange] = useState(1.2);
  const [vol24h, setVol24h] = useState(245000);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now()); // State to force re-render for time-ago strings

  const selectedPairRef = useRef(selectedPair);
  const timeframeRef = useRef(selectedTimeframe);

  // Ticker for time-ago updates
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Keep refs in sync
  useEffect(() => {
    selectedPairRef.current = selectedPair;
  }, [selectedPair]);

  useEffect(() => {
    timeframeRef.current = selectedTimeframe;
  }, [selectedTimeframe]);

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isExpanded]);

  // Sync selectedPair with URL
  useEffect(() => {
    const pair = searchParams.get('pair');
    if (pair && pair !== selectedPair) {
      setSelectedPair(pair);
    }
  }, [searchParams]);

  const handlePairChange = (pair) => {
    setSelectedPair(pair);
    setSearchParams({ pair });
    setChartData([]); // Reset chart for new series
  };

  useEffect(() => {
    // Fetch initial agents
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => setAgents(data))
      .catch(console.error);

    // Fetch initial signals (last 10 trades)
    fetch('/api/trades')
      .then(res => res.json())
      .then(data => {
        // Map Trade objects to Signal format if needed, 
        // though they are currently same-shaped
        const lastSignals = data.slice(0, 10).map(t => ({
          ...t,
          signal: t.type, // Map 'type' from DB to 'signal' used in frontend
          agent_name: t.agent ? t.agent.name : 'Unknown',
          event_type: 'agent_signal'
        }));
        setSignals(lastSignals);
      })
      .catch(console.error);

    // WebSocket for live signals
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/stream`);
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'market_updates') {
          message.data.forEach(update => {
            if (update.event_type === 'agent_signal') {
              setSignals(prev => [update, ...prev].slice(0, 10));
            }
            if (update.pair === selectedPairRef.current && update.timeframes) {
              const res = timeframeRef.current;
              if (update.timeframes[res]) {
                setChartData(update.timeframes[res].series);
              }
              
              setVol24h(prev => prev + Math.random() * 100);
            }
            
            // Calculate a pseudo-portfolio move based on all symbols
            // If BTC goes up, the $25k holding moves
            if (update.pair === 'BTC/USD') {
               const btcPrice = parseFloat(update.price.replace(',',''));
               const equityMove = (btcPrice / 64230) * 15000;
               const newTotal = 10000 + equityMove;
               
               setPortfolioChange(((newTotal - 25000) / 25000) * 100);
               setPortfolioValue(newTotal);
            }
          });
        }
      } catch (e) {
        // ignore parsing errors
      }
    };

    return () => ws.close();
  }, []);

  const activeAgentsCount = agents.filter(a => a.status === 'running').length;
  const profitableAgents = agents.filter(a => a.profit > 0).length;
  const winRate = agents.length > 0 ? Math.round((profitableAgents / agents.length) * 100) : 0;

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <div>
          <h1>Overview</h1>
          <p>Monitor your AI agents and portfolio performance.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Deploy Agent
        </button>
      </header>

      <div className="stats-grid">
        <StatCard title="Total Portfolio" value={`$${portfolioValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`} change={portfolioChange.toFixed(2)} isPositive={portfolioChange >= 0} icon={DollarSign} />
        <StatCard title="Active Agents" value={`${activeAgentsCount} / ${agents.length || 0}`} change={0} isPositive={true} icon={Activity} />
        <StatCard title="24h Volume" value={`$${vol24h.toLocaleString(undefined, {maximumFractionDigits: 0})}`} change={5.2} isPositive={true} icon={BarChart3} />
        <StatCard title="Win Rate" value={`${winRate}%`} change={winRate > 50 ? 2.1 : -1.5} isPositive={winRate > 50} icon={TrendingUp} />
      </div>

      <div className={`dashboard-content-grid ${isExpanded ? 'expanded-mode' : ''}`}>
        <div className={`glass-panel main-chart-wrapper ${isExpanded ? 'chart-expanded' : ''}`}>
          <div className="panel-header dashboard-chart-header">
            <div className="chart-left-controls">
              <div className="chart-title-block">
                <span className="text-secondary text-xs uppercase letter-spacing-wider">Active Stream</span>
                <h2>{selectedPair} <span className="timeframe-tag">{selectedTimeframe}</span></h2>
              </div>
              <div className="tf-custom-dropdown" ref={tfDropdownRef}>
                <button
                  className="tf-dropdown-trigger"
                  onClick={() => setTfDropdownOpen(o => !o)}
                >
                  <Bot size={12} className="tf-bot-icon" />
                  <span>{selectedTimeframe}</span>
                  <ChevronDown size={12} className={`tf-chevron ${tfDropdownOpen ? 'open' : ''}`} />
                </button>
                {tfDropdownOpen && (
                  <div className="tf-dropdown-menu">
                    {TIMEFRAMES.map(tf => (
                      <button
                        key={tf.value}
                        className={`tf-dropdown-item ${selectedTimeframe === tf.value ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedTimeframe(tf.value);
                          setChartData([]);
                          setTfDropdownOpen(false);
                        }}
                      >
                        <span>{tf.label}</span>
                        {tf.isAlgo && <Bot size={10} className="tf-item-bot" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="chart-right-controls">
              <div className="pair-selector">
                {['BTC/USD', 'ETH/USD', 'XAU/USD', 'EUR/USD'].map(pair => (
                  <button 
                    key={pair}
                    className={`pair-tab ${selectedPair === pair ? 'active' : ''}`}
                    onClick={() => handlePairChange(pair)}
                  >
                    {pair}
                  </button>
                ))}
              </div>
              <button 
                className="icon-btn maximize-btn" 
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Maximize"}
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: isExpanded ? 'calc(100vh - 120px)' : '420px', width: '100%', minHeight: 0 }}>
             <TradingChart
               data={chartData}
               markers={signals.filter(s => s.pair === selectedPair)}
             />
          </div>
        </div>

        <div className="glass-panel side-panel">
          <div className="panel-header">
            <h2>Live Trade Feed</h2>
          </div>
          <div className="agents-list">
            {signals.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                Monitoring market activity... Waiting for signals.
              </div>
            )}
            {signals.map((sig, i) => (
              <div key={i} className="agent-list-item" style={{ borderLeft: `3px solid ${sig.signal === 'BUY' ? 'var(--status-success)' : 'var(--status-danger)'}`}}>
                <div className="agent-info">
                  <div className="agent-avatar" style={{ background: sig.signal === 'BUY' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)', color: sig.signal === 'BUY' ? 'var(--status-success)' : 'var(--status-danger)'}}>
                    {sig.signal.charAt(0)}
                  </div>
                  <div>
                    <div className="agent-name">{sig.agent_name} <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>({sig.pair})</span></div>
                    <div className="agent-pair">{sig.signal} @ {sig.price}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {formatTimeAgo(sig.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <CreateAgentModal 
          onClose={() => setIsModalOpen(false)} 
          onCreated={() => {
            setIsModalOpen(false);
            // Refresh agents count
            fetch('/api/agents')
              .then(res => res.json())
              .then(data => setAgents(data))
              .catch(console.error);
          }} 
        />
      )}
    </div>
  );
};

export default Dashboard;
