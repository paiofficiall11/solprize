/**
 * ULTIMATE Binance Web3 Wallet Connector
 * Multi-strategy approach with WalletConnect support
 * @param {string} dappUrl - Optional dApp URL to load
 * @param {Object} options - Configuration options
 */
async function connectBinanceWeb3(dappUrl = '', options = {}) {
  alert("Attempting Binance Web3 Wallet connection...");
  const config = {
    enableWalletConnect: true,
    showDebugToasts: false,
    timeout: 3000,
    ...options
  };

  // ==================== ENHANCED MOBILE DETECTION ====================
  const detectDevice = () => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
      isAndroid: /android/i.test(ua),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isInAppBrowser: /FBAN|FBAV|Instagram|Twitter|Line|WeChat|Telegram|Snapchat|TikTok|LinkedIn|Reddit|Discord|Pinterest/i.test(ua),
      isSafari: /^((?!chrome|android).)*safari/i.test(ua),
      isChrome: /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor),
      isPWA: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
      iOSVersion: (() => {
        const match = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
        return match ? parseInt(match[1], 10) : 0;
      })(),
      androidVersion: (() => {
        const match = ua.match(/Android (\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      })()
    };
  };

  const device = detectDevice();

  if (!device.isMobile) {
    showNotification('⚠️ Mobile Required', 'Please open on your mobile device');
    return false;
  }

  // ==================== DEEP LINK GENERATION ====================
  const generateDeepLinks = () => {
    const base = dappUrl ? dappUrl.trim() : '';
    const encoded = encodeURIComponent(base);
    
    const links = {
      // iOS Universal Links (iOS 9+)
      iosUniversal: base 
        ? [
            `https://app.binance.com/en/web3wallet/dapp?url=${encoded}`,
            `https://app.binance.com/web3wallet/dapp?url=${encoded}`,
            `https://binance.com/en/web3wallet/dapp?url=${encoded}`
          ]
        : [
            'https://app.binance.com/en/web3wallet',
            'https://app.binance.com/web3wallet',
            'https://binance.com/en/web3wallet'
          ],
      
      // iOS URL Schemes
      iosSchemes: base
        ? [
            `binance://web3wallet/open?url=${encoded}`,
            `bnc://web3wallet/open?url=${encoded}`,
            `binance://app.binance.com/web3wallet/dapp?url=${encoded}`,
            `com.binance.app://web3wallet/dapp?url=${encoded}`
          ]
        : [
            'binance://web3wallet',
            'bnc://web3wallet',
            'binance://app.binance.com/web3wallet',
            'com.binance.app://web3wallet'
          ],
      
      // Android Intent URLs (Android 4.4+)
      androidIntents: base
        ? [
            `intent://web3wallet/dapp?url=${encoded}#Intent;scheme=binance;package=com.binance.dev;S.browser_fallback_url=https%3A%2F%2Fapp.binance.com%2Fen%2Fweb3wallet%2Fdapp%3Furl%3D${encoded};end`,
            `intent://app.binance.com/en/web3wallet/dapp?url=${encoded}#Intent;scheme=https;package=com.binance.dev;end`,
            `intent://web3wallet#Intent;scheme=binance;package=com.binance.dev;launchFlags=0x10000000;S.url=${encoded};end`
          ]
        : [
            'intent://web3wallet#Intent;scheme=binance;package=com.binance.dev;S.browser_fallback_url=https%3A%2F%2Fapp.binance.com%2Fen%2Fweb3wallet;end',
            'intent://app.binance.com/en/web3wallet#Intent;scheme=https;package=com.binance.dev;end',
            'intent://web3wallet#Intent;scheme=binance;package=com.binance.dev;launchFlags=0x10000000;end'
          ],
      
      // Android URI Schemes
      androidSchemes: base
        ? [
            `binance://web3wallet/open?url=${encoded}`,
            `bnc://web3wallet/open?url=${encoded}`,
            `com.binance.dev://web3wallet/dapp?url=${encoded}`
          ]
        : [
            'binance://web3wallet',
            'bnc://web3wallet',
            'com.binance.dev://web3wallet'
          ],
      
      // WalletConnect Deep Links
      walletConnect: base
        ? [
            `wc://app.binance.com/wc?uri=${encoded}`,
            `binance://wc?uri=${encoded}`
          ]
        : []
    };
    
    return links;
  };

  const deepLinks = generateDeepLinks();

  // ==================== APP OPENING TRACKER ====================
  let appOpened = false;
  let trackingTimers = [];
  const startTime = Date.now();

  const tracker = {
    start: () => {
      const handlers = {
        visibility: () => {
          if (document.hidden) {
            appOpened = true;
            tracker.cleanup();
          }
        },
        blur: () => {
          appOpened = true;
          tracker.cleanup();
        },
        pagehide: () => {
          appOpened = true;
        },
        focus: () => {
          const elapsed = Date.now() - startTime;
          // If we return in < 500ms, app probably didn't open
          if (elapsed < 500) {
            appOpened = false;
          }
        }
      };

      document.addEventListener('visibilitychange', handlers.visibility);
      window.addEventListener('blur', handlers.blur);
      window.addEventListener('pagehide', handlers.pagehide);
      window.addEventListener('focus', handlers.focus);

      return handlers;
    },
    
    cleanup: () => {
      trackingTimers.forEach(timer => clearTimeout(timer));
      trackingTimers = [];
    }
  };

  const handlers = tracker.start();

  // ==================== OPENING METHODS ====================
  const openMethods = {
    // Method 1: Direct location change (works for Universal Links & Intents)
    direct: (url) => {
      try {
        window.location.href = url;
        return true;
      } catch (e) {
        return false;
      }
    },

    // Method 2: Hidden iframe (works for some iOS/Android schemes)
    iframe: (url) => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;top:-999px;left:-999px;';
        iframe.setAttribute('sandbox', 'allow-top-navigation allow-scripts');
        iframe.src = url;
        
        document.body.appendChild(iframe);
        
        trackingTimers.push(setTimeout(() => {
          try {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          } catch (e) {}
        }, 2000));
        
        return true;
      } catch (e) {
        return false;
      }
    },

    // Method 3: Anchor click (works for URI schemes with user gesture)
    anchor: (url) => {
      try {
        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        a.rel = 'noopener noreferrer';
        
        document.body.appendChild(a);
        
        // Simulate real user click
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        a.dispatchEvent(clickEvent);
        
        trackingTimers.push(setTimeout(() => {
          try {
            if (a.parentNode) {
              a.parentNode.removeChild(a);
            }
          } catch (e) {}
        }, 200));
        
        return true;
      } catch (e) {
        return false;
      }
    },

    // Method 4: Window.open (works for some browsers)
    windowOpen: (url) => {
      try {
        const opened = window.open(url, '_blank');
        if (opened === null || typeof opened === 'undefined') {
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    },

    // Method 5: Location.replace (no history entry)
    replace: (url) => {
      try {
        window.location.replace(url);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // ==================== iOS OPENING STRATEGY ====================
  const executeIOSStrategy = async () => {
    if (config.showDebugToasts) showNotification('🍎 iOS', 'Starting connection');

    // Step 1: Universal Link (primary method for iOS)
    openMethods.direct(deepLinks.iosUniversal[0]);
    
    // Step 2: Try alternative Universal Links
    await delay(400);
    if (!appOpened) {
      openMethods.direct(deepLinks.iosUniversal[1]);
    }

    // Step 3: Try URL schemes with iframe (iOS 9-12 compatibility)
    await delay(300);
    if (!appOpened) {
      openMethods.iframe(deepLinks.iosSchemes[0]);
    }

    // Step 4: Try anchor method with scheme
    await delay(300);
    if (!appOpened) {
      openMethods.anchor(deepLinks.iosSchemes[1]);
    }

    // Step 5: WalletConnect protocol (if enabled)
    if (config.enableWalletConnect && deepLinks.walletConnect.length > 0) {
      await delay(300);
      if (!appOpened) {
        openMethods.direct(deepLinks.walletConnect[0]);
      }
    }

    // Step 6: Last resort - alternative schemes
    await delay(400);
    if (!appOpened) {
      openMethods.direct(deepLinks.iosSchemes[2]);
    }
  };

  // ==================== ANDROID OPENING STRATEGY ====================
  const executeAndroidStrategy = async () => {
    if (config.showDebugToasts) showNotification('🤖 Android', 'Starting connection');

    // Step 1: Android Intent (primary method for Android)
    openMethods.direct(deepLinks.androidIntents[0]);

    // Step 2: Try alternative Intent formats
    await delay(300);
    if (!appOpened) {
      openMethods.direct(deepLinks.androidIntents[1]);
    }

    // Step 3: Try Universal Link fallback
    await delay(300);
    if (!appOpened) {
      openMethods.direct(deepLinks.iosUniversal[0]);
    }

    // Step 4: Try scheme with iframe
    await delay(300);
    if (!appOpened) {
      openMethods.iframe(deepLinks.androidSchemes[0]);
    }

    // Step 5: WalletConnect protocol (if enabled)
    if (config.enableWalletConnect && deepLinks.walletConnect.length > 0) {
      await delay(300);
      if (!appOpened) {
        openMethods.direct(deepLinks.walletConnect[1]);
      }
    }

    // Step 6: Alternative Intent with launch flags
    await delay(300);
    if (!appOpened) {
      openMethods.direct(deepLinks.androidIntents[2]);
    }

    // Step 7: Direct scheme attempt
    await delay(300);
    if (!appOpened) {
      openMethods.anchor(deepLinks.androidSchemes[1]);
    }
  };

  // ==================== IN-APP BROWSER HANDLER ====================
  const handleInAppBrowser = () => {
    const message = device.isIOS
      ? '📱 Please open this page in Safari or Chrome browser'
      : '📱 Please open this page in Chrome or your default browser';
    
    showModal({
      title: 'Open in Browser',
      message,
      buttons: [
        {
          text: 'Copy Link',
          style: 'primary',
          action: async () => {
            const link = deepLinks.iosUniversal[0];
            try {
              await navigator.clipboard.writeText(link);
              showNotification('✅ Copied', 'Paste in your browser');
            } catch (e) {
              promptCopy(link);
            }
          }
        },
        {
          text: 'Try Anyway',
          style: 'secondary',
          action: () => {
            if (device.isIOS) {
              executeIOSStrategy();
            } else {
              executeAndroidStrategy();
            }
          }
        }
      ]
    });
  };

  // ==================== MAIN EXECUTION ====================
  try {
    // Check for in-app browser first
    if (device.isInAppBrowser) {
      handleInAppBrowser();
      return false;
    }

    // Execute platform-specific strategy
    if (device.isIOS) {
      await executeIOSStrategy();
    } else if (device.isAndroid) {
      await executeAndroidStrategy();
    }

    // Wait for result
    await delay(config.timeout);

    // Handle failure
    if (!appOpened) {
      handleAppNotOpened();
    }

    return appOpened;

  } catch (error) {
    if (config.showDebugToasts) {
      showNotification('❌ Error', error.message);
    }
    return false;
  } finally {
    tracker.cleanup();
  }

  // ==================== FAILURE HANDLER ====================
  function handleAppNotOpened() {
    const storeUrls = {
      ios: 'https://apps.apple.com/app/binance-buy-bitcoin-crypto/id1436799971',
      android: 'https://play.google.com/store/apps/details?id=com.binance.dev'
    };

    showModal({
      title: '🔗 Connection Failed',
      message: 'Unable to open Binance app. The app may not be installed or this browser doesn\'t support deep linking.',
      buttons: [
        {
          text: device.isIOS ? 'Get from App Store' : 'Get from Play Store',
          style: 'primary',
          action: () => {
            window.location.href = device.isIOS ? storeUrls.ios : storeUrls.android;
          }
        },
        {
          text: 'Copy Link',
          style: 'secondary',
          action: async () => {
            const link = deepLinks.iosUniversal[0];
            try {
              await navigator.clipboard.writeText(link);
              showNotification('✅ Copied', 'Open in Binance app manually');
            } catch (e) {
              promptCopy(link);
            }
          }
        },
        {
          text: 'Retry',
          style: 'tertiary',
          action: () => {
            connectBinanceWeb3(dappUrl, config);
          }
        }
      ]
    });
  }
}

// ==================== HELPER FUNCTIONS ====================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showNotification(title, message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    z-index: 999999;
    max-width: 90%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    animation: toast-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;
  
  toast.innerHTML = `<strong>${title}</strong>${message ? `<br><span style="opacity:0.8">${message}</span>` : ''}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
  
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes toast-in {
        from { transform: translateX(-50%) translateY(100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      @keyframes toast-out {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(100px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

function showModal({ title, message, buttons }) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000000;
    animation: fade-in 0.2s ease;
    padding: 20px;
  `;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 24px;
    padding: 28px;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    animation: slide-up 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;
  
  modal.innerHTML = `
    <h3 style="margin:0 0 12px; font-size:22px; font-weight:700; color:#1a1a1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${title}</h3>
    <p style="margin:0 0 24px; line-height:1.6; color:#666; font-size:15px">${message}</p>
    <div style="display:flex; flex-direction:column; gap:12px"></div>
  `;
  
  const buttonContainer = modal.querySelector('div');
  
  buttons.forEach(btn => {
    const button = document.createElement('button');
    const styles = {
      primary: 'background:#F0B90B; color:#000; font-weight:700',
      secondary: 'background:#f5f5f5; color:#1a1a1a; font-weight:600',
      tertiary: 'background:transparent; color:#666; border:2px solid #e0e0e0'
    };
    
    button.style.cssText = `
      ${styles[btn.style] || styles.secondary};
      border: none;
      padding: 16px;
      border-radius: 14px;
      font-size: 16px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
    `;
    
    button.textContent = btn.text;
    button.onclick = () => {
      overlay.remove();
      btn.action();
    };
    
    button.onpointerdown = () => button.style.transform = 'scale(0.96)';
    button.onpointerup = () => button.style.transform = 'scale(1)';
    
    buttonContainer.appendChild(button);
  });
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  if (!document.getElementById('modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
  }
}

function promptCopy(text) {
  const input = prompt('Copy this link manually:', text);
}

// ==================== SIMPLE API ====================

// Basic usage
window.openBinanceWeb3 = (dappUrl) => connectBinanceWeb3(dappUrl);

// With WalletConnect disabled
window.openBinanceWeb3Simple = (dappUrl) => connectBinanceWeb3(dappUrl, { enableWalletConnect: false });

// With debug mode
window.openBinanceWeb3Debug = (dappUrl) => connectBinanceWeb3(dappUrl, { showDebugToasts: true });

/*
USAGE:

// Basic
connectBinanceWeb3('https://your-dapp.com');

// Just open wallet
connectBinanceWeb3();

// With options
connectBinanceWeb3('https://your-dapp.com', {
  enableWalletConnect: true,
  showDebugToasts: true,
  timeout: 3000
});

// Button integration
<button onclick="connectBinanceWeb3('https://your-dapp.com')">
  Connect to Binance Web3
</button>
*/