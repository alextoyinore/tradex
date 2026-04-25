import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, LineChart, Settings, Activity, Clock } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Activity size={28} />
          TradeX AI
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>
        <NavLink 
          to="/agents" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <Bot size={20} />
          AI Agents
        </NavLink>
        <NavLink 
          to="/markets" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <LineChart size={20} />
          Markets
        </NavLink>
        <NavLink 
          to="/history" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <Clock size={20} />
          Activity
        </NavLink>
        
        <div style={{ flex: 1 }}></div>
        
        <NavLink 
          to="/settings" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <Settings size={20} />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
