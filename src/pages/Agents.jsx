import { useState, useEffect } from 'react';
import { Play, Square, Settings, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import CreateAgentModal from '../components/CreateAgentModal';
import './Agents.css';

const AgentCard = ({ agent, onToggle }) => {
  const isRunning = agent.status === 'running';
  const isProfitable = agent.profit >= 0;

  return (
    <div className="glass-panel agent-card">
      <div className="agent-header">
        <div className="agent-title-block">
          <h3>{agent.name}</h3>
          <span className={`status-badge ${agent.status}`}>{agent.status}</span>
        </div>
        <button className="icon-button" title="Configure">
          <Settings size={18} />
        </button>
      </div>
      
      <div className="agent-details">
        <div className="detail-row">
          <span className="detail-label">Trading Pair</span>
          <span className="detail-value">{agent.pair}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Strategy</span>
          <span className="detail-value">{agent.strategy}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Uptime</span>
          <span className="detail-value">{agent.uptime}</span>
        </div>
      </div>

      <div className="agent-performance">
        <span className="detail-label">Total Profit</span>
        <div className={`profit-value ${isProfitable ? 'positive' : 'negative'}`}>
          {isProfitable ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          {Math.abs(agent.profit)}%
        </div>
      </div>

      <div className="agent-actions">
        {isRunning ? (
          <button className="danger-btn full-width" onClick={() => onToggle(agent.id)}>
            <Square size={16} /> Stop Agent
          </button>
        ) : (
          <button className="primary-btn full-width" onClick={() => onToggle(agent.id)}>
            <Play size={16} /> Start Agent
          </button>
        )}
      </div>
    </div>
  );
};

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (e) {
      console.error("Failed to fetch agents", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggle = async (agentId) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/toggle`, {
        method: 'POST'
      });
      if (res.ok) {
        // Refresh the agents list after toggle
        fetchAgents();
      }
    } catch (e) {
      console.error("Failed to toggle agent", e);
    }
  };

  return (
    <div className="agents-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1>AI Agents</h1>
          <p>Deploy and manage your automated trading algorithms.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Create Agent
        </button>
      </header>

      <div className="agents-grid">
        {loading && <p>Loading agents from backend...</p>}
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} onToggle={handleToggle} />
        ))}
      </div>

      {isModalOpen && (
        <CreateAgentModal 
          onClose={() => setIsModalOpen(false)} 
          onCreated={fetchAgents} 
        />
      )}
    </div>
  );
};

export default Agents;
