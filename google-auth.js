(() => {
  const signInAreas = [...document.querySelectorAll('[data-google-signin]')];
  let sdkPromise = null;
  let refreshPromise = null;

  function setStatus(message, enabled) {
    signInAreas.forEach(area => {
      const button = area.querySelector('.google-signin-button');
      const status = area.querySelector('.google-signin-status');
      if (button) {
        button.hidden = !enabled;
        button.replaceChildren();
      }
      if (status) {
        status.textContent = message;
        status.hidden = !message;
      }
    });
  }

  async function loadConfiguration() {
    if (window.ClearDropAPI && typeof window.ClearDropAPI.getGoogleConfig === 'function') {
      return await window.ClearDropAPI.getGoogleConfig();
    }
    try {
      const response = await fetch('auth.php?action=google_config', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const configuration = await response.json();
      if (!response.ok) {
        throw new Error(configuration.message || 'Google sign-in configuration could not be loaded.');
      }
      return configuration;
    } catch {
      return {
        enabled: false,
        message: 'Google sign-in is disabled in offline/demo mode. Please use demo credentials below.'
      };
    }
  }

  function loadGoogleSdk() {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      script.onload = () => window.google?.accounts?.id
        ? resolve()
        : reject(new Error('Google sign-in did not initialize.'));
      script.onerror = () => reject(new Error('Google sign-in could not load. Check the network connection.'));
      document.head.append(script);
    }).catch(error => {
      sdkPromise = null;
      throw error;
    });
    return sdkPromise;
  }

  async function initializeGoogleSignIn() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      setStatus('Checking Google sign-in configuration…', false);
      const configuration = await loadConfiguration();
      if (!configuration.enabled) {
        setStatus(configuration.message || 'Google sign-in is not enabled. Sign in using the demo accounts below.', false);
        return;
      }
      if (typeof configuration.clientId !== 'string' || typeof configuration.nonce !== 'string') {
        throw new Error('Google sign-in configuration is incomplete.');
      }

      await loadGoogleSdk();
      window.google.accounts.id.initialize({
        client_id: configuration.clientId,
        nonce: configuration.nonce,
        callback: response => {
          if (typeof response.credential === 'string' && response.credential !== '') {
            window.dispatchEvent(new CustomEvent('cleardrop:googleCredential', {
              detail: { credential: response.credential },
            }));
          }
        },
      });
      signInAreas.forEach(area => {
        const button = area.querySelector('.google-signin-button');
        button.replaceChildren();
        button.hidden = false;
        window.google.accounts.id.renderButton(button, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        });
        area.querySelector('.google-signin-status').hidden = true;
      });
    })().catch(error => {
      setStatus(error.message || 'Google sign-in setup failed. Check the PHP server and configuration.', false);
    }).finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  window.addEventListener('cleardrop:googleRefresh', initializeGoogleSignIn);
  initializeGoogleSignIn();
})();
