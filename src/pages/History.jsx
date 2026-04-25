import { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpRight, ArrowDownRight, Clock, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import './History.css';

const History = () => {
  const [trades, setTrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetch('http://localhost:8000/api/trades')
      .then(res => res.json())
      .then(data => {
        setTrades(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch trades:", err);
        setLoading(false);
      });
  }, []);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (trade.agent && trade.agent.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'All' || trade.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedTrades = filteredTrades.slice(pageStart, pageStart + pageSize);

  // Reset to page 1 when filters change
  const handleSearch = (val) => { setSearchTerm(val); setCurrentPage(1); };
  const handleFilter = (val) => { setFilterType(val); setCurrentPage(1); };
  const handlePageSize = (val) => { setPageSize(Number(val)); setCurrentPage(1); };

  // Build page button list with ellipsis
  const buildPageList = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="history-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Trade Activity</h1>
          <p>Complete historical record of all algorithmic signals and executions.</p>
        </div>
      </header>

      <div className="glass-panel history-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by pair or agent..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} className="text-secondary" />
          {['All', 'BUY', 'SELL'].map(type => (
            <button
              key={type}
              className={`filter-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => handleFilter(type)}
            >
              {type}
            </button>
          ))}
          <select
            className="page-size-select"
            value={pageSize}
            onChange={(e) => handlePageSize(e.target.value)}
          >
            {[10, 25, 50].map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-panel table-wrapper">
        {loading ? (
          <div className="loading-state">
            <Clock className="animate-spin" />
            <p>Loading historical data...</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Asset Pair</th>
                <th>Type</th>
                <th>Price</th>
                <th>Agent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedTrades.map(trade => (
                <tr key={trade.id}>
                  <td>
                    <div className="date-cell">
                      <Clock size={14} />
                      {formatDate(trade.timestamp)}
                    </div>
                  </td>
                  <td className="font-medium">{trade.pair}</td>
                  <td>
                    <span className={`signal-badge ${trade.type.toLowerCase()}`}>
                      {trade.type === 'BUY' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {trade.type}
                    </span>
                  </td>
                  <td className="font-mono">${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>
                    <div className="agent-cell">
                      <Bot size={14} />
                      {trade.agent ? trade.agent.name : 'Unknown'}
                    </div>
                  </td>
                  <td>
                    <span className="status-executed">Executed</span>
                  </td>
                </tr>
              ))}
              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-row">No trade records found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* ── Paginator ── */}
        {!loading && filteredTrades.length > 0 && (
          <div className="paginator">
            <span className="paginator-summary">
              Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredTrades.length)} of {filteredTrades.length} records
            </span>

            <div className="paginator-controls">
              <button
                className="page-btn nav"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {buildPageList().map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`page-btn ${safePage === p ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                className="page-btn nav"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
