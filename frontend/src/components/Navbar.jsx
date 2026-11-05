import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenProfile, onToggleSearch, isSearchOpen }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getRoleTitle = (role) => {
    const titles = {
      admin: 'Admin / Owner',
      inventory: 'Inventory & Purchasing',
      production: 'Production / Assembler',
      sales: 'Sales & Orders',
      partner: 'Partner / Customer',
      distributor: 'Community Distributor',
      customer: 'Demo Customer'
    };
    return titles[role] || 'ClearDrop Account';
  };

  return (
    <header>
      <nav className="wrap">
        <div className="logo">
          <svg className="drop-logo" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <ellipse className="drop-ripple" cx="24" cy="39" rx="15" ry="3" fill="#75D8F3"/>
            <path className="drop-shape" d="M24 4C18 13 10 22 10 30a14 14 0 0 0 28 0C38 22 30 13 24 4Z" fill="#B9F2FF" stroke="#4169E1" stroke-width="2.5"/>
            <path className="drop-water" d="M14 30c0-5.6 4.5-10 10-10s10 4.4 10 10a10 10 0 0 1-20 0Z" fill="#1877D2"/>
            <path className="drop-shine" d="M18 24c1.4-2.3 3.2-4.6 5.2-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          ClearDrop
        </div>

        <button
          className="hamburger"
          id="hamburger"
          aria-label="Menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span><span></span><span></span>
        </button>

        <ul className={`nav-links ${menuOpen ? 'open' : ''}`} id="navLinks">
          <li><a href="#home" onClick={() => setMenuOpen(false)}>Home</a></li>
          <li><a href="#dashboard" onClick={() => setMenuOpen(false)}>Order Materials</a></li>
          <li><a href="#catalog" onClick={() => setMenuOpen(false)}>Products &amp; BOM</a></li>
          <li><a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a></li>
          <li><a href="#orders" onClick={() => setMenuOpen(false)}>Pending Orders</a></li>
          <li><a href="#dashboard" className="nav-cta" onClick={() => setMenuOpen(false)}>Open Dashboard</a></li>

          <li className="nav-search-item">
            <button
              type="button"
              className={`nav-search-btn ${isSearchOpen ? 'active' : ''}`}
              id="navSearchBtn"
              aria-label="Search system parts"
              aria-expanded={isSearchOpen}
              onClick={onToggleSearch}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span>Search</span>
            </button>
          </li>

          {user && (
            <li className="nav-auth-item" id="navAuthItem">
              <div className="account-wrap" id="accountWrap">
                <button
                  type="button"
                  className={`nav-account-btn ${dropdownOpen ? 'active' : ''}`}
                  id="navAccountBtn"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  Account <span className="caret">▾</span>
                </button>
                <div className={`account-dropdown ${dropdownOpen ? 'open' : ''}`} id="accountDropdown">
                  <div className="account-dropdown-head">
                    <span className="account-dropdown-title">{getRoleTitle(user.role)}</span>
                    <span className="account-dropdown-id">ID: <span id="accountIdDisplay">{user.username}</span></span>
                  </div>
                  <a
                    href="#profile"
                    className="account-dropdown-link"
                    id="navProfileLink"
                    onClick={(e) => {
                      e.preventDefault();
                      setDropdownOpen(false);
                      onOpenProfile();
                    }}
                  >
                    Profile
                  </a>
                  <a
                    href="#orders"
                    className="account-dropdown-link"
                    onClick={() => setDropdownOpen(false)}
                  >
                    My Orders
                  </a>
                  <button
                    type="button"
                    className="account-dropdown-link account-logout"
                    id="logoutBtn"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
