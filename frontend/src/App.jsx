import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { inventoryApi } from './api/client';

import LoginScreen from './components/LoginScreen';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Stats from './components/Stats';
import InventoryDashboard from './components/InventoryDashboard';
import CatalogSection from './components/CatalogSection';
import BrowseLayers from './components/BrowseLayers';
import HowItWorks from './components/HowItWorks';
import About from './components/About';
import Footer from './components/Footer';

import StageModal from './components/StageModal';
import ProfileModal from './components/ProfileModal';
import QrScannerModal from './components/QrScannerModal';

export default function App() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedStage, setSelectedStage] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    materials: [],
    cart: [],
    orders: [],
    role: 'customer'
  });
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [basketMessage, setBasketMessage] = useState('');
  const [isBasketError, setIsBasketError] = useState(false);

  // Load dashboard data when authenticated
  const loadDashboard = async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingDashboard(true);
      const data = await inventoryApi.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
    }
  }, [isAuthenticated]);

  // Actions
  const handleAddMaterial = async (code) => {
    setBasketMessage('');
    setIsBasketError(false);
    try {
      const res = await inventoryApi.cartAdd(code);
      await loadDashboard();
      setBasketMessage(res.message || 'One unit added to basket.');
    } catch (err) {
      setBasketMessage(err.message);
      setIsBasketError(true);
    }
  };

  const handleRemoveMaterial = async (materialId) => {
    try {
      const res = await inventoryApi.cartRemove(materialId);
      await loadDashboard();
      setBasketMessage(res.message || 'One unit returned to stock.');
      setIsBasketError(false);
    } catch (err) {
      setBasketMessage(err.message);
      setIsBasketError(true);
    }
  };

  const handleRestockMaterial = async (materialId, quantity) => {
    try {
      const res = await inventoryApi.restock(materialId, quantity);
      await loadDashboard();
      setBasketMessage(res.message || 'Stock updated.');
      setIsBasketError(false);
    } catch (err) {
      setBasketMessage(err.message);
      setIsBasketError(true);
    }
  };

  const handleCheckout = async (customerName, contact) => {
    try {
      const res = await inventoryApi.checkout(customerName, contact);
      await loadDashboard();
      setBasketMessage(`Order #${res.orderId} is pending. Reserved stock is attached to order.`);
      setIsBasketError(false);
      // Smooth scroll to orders
      const ordersEl = document.getElementById('orders');
      if (ordersEl) ordersEl.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setBasketMessage(err.message);
      setIsBasketError(true);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      const res = await inventoryApi.updateOrderStatus(orderId, status);
      await loadDashboard();
      setBasketMessage(res.message || 'Order status updated.');
      setIsBasketError(false);
    } catch (err) {
      setBasketMessage(err.message);
      setIsBasketError(true);
    }
  };

  if (authLoading) {
    return (
      <div className="login-screen">
        <p style={{ color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>
          Initializing ClearDrop system…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div id="mainWebsite" className="revealed">
      <Navbar
        onOpenProfile={() => setIsProfileOpen(true)}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        isSearchOpen={isSearchOpen}
      />

      {/* SEARCH PANEL */}
      <div className={`search-panel ${isSearchOpen ? 'open' : ''}`} id="searchPanel">
        <div className="wrap search-panel-inner">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              id="searchInput"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filtration stages and components…"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <main>
        <Hero />
        <Stats />
        <InventoryDashboard
          dashboardData={dashboardData}
          onAddMaterial={handleAddMaterial}
          onRemoveMaterial={handleRemoveMaterial}
          onRestockMaterial={handleRestockMaterial}
          onCheckout={handleCheckout}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onRefresh={loadDashboard}
          onOpenScanner={() => setIsScannerOpen(true)}
          basketMessage={basketMessage}
          isBasketError={isBasketError}
          loading={loadingDashboard}
        />
        <CatalogSection />
        <BrowseLayers
          onSelectStage={(stage) => setSelectedStage(stage)}
          searchQuery={searchQuery}
        />
        <HowItWorks />
        <About />
      </main>

      <Footer />

      {/* MODALS */}
      <StageModal
        stageKey={selectedStage}
        onClose={() => setSelectedStage(null)}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddCode={handleAddMaterial}
      />
    </div>
  );
}
