import { Search, Bell, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Header = () => {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun size={20} />;
    if (theme === 'dark') return <Moon size={20} />;
    return <Monitor size={20} />;
  };

  return (
    <header className="top-header">
      <div className="header-search">
        <Search size={18} color="var(--text-secondary)" />
        <input type="text" placeholder="Search markets, agents..." />
      </div>
      
      <div className="header-actions">
        <button className="icon-button" onClick={cycleTheme} title={`Current theme: ${theme}`}>
          {getThemeIcon()}
        </button>
        <button className="icon-button">
          <Bell size={20} />
        </button>
        <div className="user-profile">
          <div className="user-avatar">TX</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Trader</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pro Plan</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
