import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ isOpen, onClose }) {
  const { user } = useAuth();
  if (!isOpen || !user) return null;

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
    <div className="profile-modal-overlay open" id="profileModal" onClick={onClose} aria-hidden="false">
      <div
        className="profile-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profileModalTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="login-modal-close"
          id="profileModalClose"
          aria-label="Close profile"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="login-logo" style={{ marginBottom: '12px' }}>
          <svg className="drop-logo" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <ellipse className="drop-ripple" cx="24" cy="39" rx="15" ry="3" fill="#75D8F3"/>
            <path className="drop-shape" d="M24 4C18 13 10 22 10 30a14 14 0 0 0 28 0C38 22 30 13 24 4Z" fill="#B9F2FF" stroke="#4169E1" strokeWidth="2.5"/>
            <path className="drop-water" d="M14 30c0-5.6 4.5-10 10-10s10 4.4 10 10a10 10 0 0 1-20 0Z" fill="#1877D2"/>
            <path className="drop-shine" d="M18 24c1.4-2.3 3.2-4.6 5.2-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span>ClearDrop</span>
        </div>
        <h3 id="profileModalTitle">User Profile</h3>
        <div className="profile-field-list">
          <div className="profile-field-item">
            <span>Display Name</span>
            <strong id="profileDisplayName">{user.displayName || user.username}</strong>
          </div>
          <div className="profile-field-item">
            <span>Username / ID</span>
            <strong id="profileUsername">{user.username}</strong>
          </div>
          <div className="profile-field-item">
            <span>Assigned Role</span>
            <strong id="profileRole">{getRoleTitle(user.role)}</strong>
          </div>
          <div className="profile-field-item">
            <span>System Mode</span>
            <strong id="profileMode">Full-Stack Production</strong>
          </div>
          <div className="profile-field-item">
            <span>Status</span>
            <strong style={{ color: '#10B981' }}>Active</strong>
          </div>
        </div>
        <button className="btn btn-primary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
