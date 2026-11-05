import React, { useState } from 'react';

const QUICK_CHIPS = [
  { code: 'CLD-SAND-001', label: 'Fine Sand' },
  { code: 'CLD-CARBON-001', label: 'Carbon' },
  { code: 'CLD-CERAMIC-001', label: 'Ceramic' },
  { code: 'CLD-TANK-001', label: 'Water Tank' },
  { code: 'CLD-FAUCET-001', label: 'Outlet Tap' },
  { code: 'CLD-GRAVEL-001', label: 'Gravel' },
  { code: 'CLD-MESH-001', label: 'Screen' }
];

export default function QrScannerModal({ isOpen, onClose, onAddCode }) {
  const [manualCode, setManualCode] = useState('');
  const [message, setMessage] = useState('Camera scanner ready. You can also tap a quick test material below.');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onAddCode(manualCode.trim());
    setManualCode('');
    onClose();
  };

  const handleChipClick = (code) => {
    onAddCode(code);
    onClose();
  };

  return (
    <div className="scanner-overlay open" id="scannerOverlay" onClick={onClose} aria-hidden="false">
      <div
        className="scanner-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scannerTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="login-modal-close"
          id="closeScannerBtn"
          aria-label="Close scanner"
          onClick={onClose}
        >
          &times;
        </button>
        <span className="eyebrow">Quick add</span>
        <h2 id="scannerTitle">Scan a material QR code</h2>
        <p>
          Point your phone camera at a ClearDrop material label or tap a sample code below to test instantly.
        </p>

        <p className="scanner-message" id="scannerMessage" role="status">
          {message}
        </p>

        <form id="manualQrForm" className="manual-qr-form" onSubmit={handleSubmit}>
          <label htmlFor="manualQrCode">Material QR code</label>
          <div>
            <input
              id="manualQrCode"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              autoComplete="off"
              placeholder="Example: CLD-SAND-001"
              required
            />
            <button className="btn btn-primary" type="submit">
              Add code
            </button>
          </div>

          <div className="qr-quick-chips">
            <span>Tap to test QR materials:</span>
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.code}
                type="button"
                className="qr-quick-chip"
                onClick={() => handleChipClick(chip.code)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
