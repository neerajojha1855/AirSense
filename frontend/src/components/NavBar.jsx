import React from 'react';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/',        label: '🗺️  Dashboard',      end: true },
  { to: '/compare', label: '🌆  Multi-City',     end: false },
  { to: '/advisory',label: '💬  Citizen Advisory',end: false },
];

export default function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/favicon.png" alt="logo" width="25" height="25" />
          <div>
            <div className="brand-name">AirSense</div>
            <div className="brand-sub">AI Urban Air Quality Intelligence</div>
          </div>
        </a>
      </div>

      <div className="navbar-links">
        {LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-right">
        <span className="badge-pill badge-demo">📊 Test Mode</span>
        <span className="badge-pill badge-live">🟢 Live</span>
        <span className="badge-pill badge-city">🇮🇳 Delhi</span>
      </div>
    </nav>
  );
}
