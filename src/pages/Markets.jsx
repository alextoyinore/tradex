import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react';
import './Markets.css';

const Markets = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket('ws://localhost:8000/ws/stream');
      
      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'market_updates') {
            // Update prices if they exist, otherwise add them
            setMarkets(prev => {
              const newMarkets = [...prev];
              message.data.forEach(update => {
                // Only process market ticks for this table, ignore agent signals
                if (update.event_type !== 'market_tick') return;

                const idx = newMarkets.findIndex(m => m.pair === update.pair);
                if (idx >= 0) {
                  newMarkets[idx] = update;
                } else {
                  newMarkets.push(update);
                }
              });
              // Sort to maintain consistent order
              return newMarkets.sort((a, b) => a.pair.localeCompare(b.pair));
            });
          }
        } catch (e) {
          console.error("Error parsing message", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
      };
    } catch (e) {
      console.error("Failed to connect WebSocket", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="markets-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Markets</h1>
          <p>
            Live market data and tracking across multiple assets. 
            <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: connected ? 'var(--status-success)' : 'var(--status-danger)' }}>
              {connected ? '● LIVE' : '○ DISCONNECTED'}
            </span>
          </p>
        </div>
      </header>
      
      <div className="markets-controls glass-panel">
        <div className="markets-search">
          <Search size={18} color="var(--text-secondary)" />
          <input type="text" placeholder="Search markets (e.g., BTC/USD)" />
        </div>
        <div className="markets-filters">
          <button className="filter-btn active">All</button>
          <button className="filter-btn">Forex</button>
          <button className="filter-btn">Crypto</button>
          <button className="filter-btn">Commodity</button>
        </div>
      </div>

      <div className="glass-panel table-container">
        <table className="markets-table">
          <thead>
            <tr>
              <th>Asset Pair</th>
              <th>Asset Class</th>
              <th className="align-right">Price</th>
              <th className="align-right">24h Change</th>
              <th className="align-right">24h Volume</th>
              <th className="align-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {markets.length === 0 && (
              <tr>
                <td colSpan="6" className="align-center text-secondary">
                  Waiting for market data stream...
                </td>
              </tr>
            )}
            {markets.map((market, idx) => (
              <tr key={idx}>
                <td className="font-medium">{market.pair}</td>
                <td>
                  <span className={`asset-tag ${market.type.toLowerCase()}`}>
                    {market.type}
                  </span>
                </td>
                <td className="align-right font-medium">${market.price}</td>
                <td className="align-right">
                  <div className={`change-indicator ${market.change >= 0 ? 'positive' : 'negative'}`}>
                    {market.change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(market.change)}%
                  </div>
                </td>
                <td className="align-right text-secondary">{market.volume}</td>
                 <td className="align-center">
                  <button 
                    className="run-agent-btn"
                    onClick={() => navigate(`/?pair=${market.pair}`)}
                  >
                    Trade
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Markets;
