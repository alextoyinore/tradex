import { useState } from 'react';
import { X, Bot } from 'lucide-react';
import './CreateAgentModal.css';

const CreateAgentModal = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: 'New Algo',
    pair: 'BTC/USD',
    strategy: 'Mean Reversion',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        onCreated();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="modal-icon"><Bot size={20} /></div>
            <h2>Configure New Algorithm</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Agent Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Trading Pair Focus</label>
            <select 
              value={formData.pair}
              onChange={e => setFormData({...formData, pair: e.target.value})}
            >
              <option value="BTC/USD">BTC/USD</option>
              <option value="ETH/USD">ETH/USD</option>
              <option value="EUR/USD">EUR/USD</option>
              <option value="GBP/USD">GBP/USD</option>
              <option value="XAU/USD">Gold (XAU/USD)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Computational Strategy</label>
            <select 
              value={formData.strategy}
              onChange={e => setFormData({...formData, strategy: e.target.value})}
            >
              <option value="Mean Reversion">Mean Reversion (RSI Bounds)</option>
              <option value="Trend Following">Trend Following (SMA Cross)</option>
              <option value="Scalping">Scalping (Micro SMA Cross)</option>
              <option value="Smart Money (SMC/ICT)">Smart Money (SMC/ICT) Imbalances</option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Booting Engine...' : 'Deploy Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAgentModal;
