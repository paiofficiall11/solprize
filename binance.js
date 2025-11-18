/**
 * OFFICIAL Binance Web3 Wallet Deep Link Connector
 * Based on Binance's official @binance/w3w-utils package API
 * Implements proper deep linking as per Binance documentation
 * @param {string} dappUrl - Your dApp URL to open in Binance Web3 Wallet
 * @param {number} chainId - Optional default chain ID (e.g., 56 for BSC, 1 for Ethereum)
 */
async function connectBinanceWeb3(dappUrl = '', chainId = null) {
  
  // ==================== DEVICE DETECTION ====================
  const detectDevice = () => {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
      isAndroid: /android/i.test(ua),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isInAppBrowser: /FBAN|FBAV|Instagram|Twitter|Line|WeChat|Telegram|Snapchat|TikTok|LinkedIn|Discord/i.test(ua),
      isBinanceApp: typeof window.binancew3w !== 'undefined' || window.ethereum?.isBinance === true,
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };
  };

  const device = detectDevice();

  // ==================== CHECK IF ALREADY IN BINANCE ====================
  // Based on official documentation: window.ethereum.isBinance
  if (device.isBinanceApp) {
    showNotification('✅ Already Connected', 'You are in Binance Web3 Wallet');
    
    // If dApp URL provided and we're in Binance, try to navigate to it
    if (dappUrl && dappUrl.trim()) {
      try {
        window.location.href = dappUrl.trim();
      } catch (e) {
        console.error('Navigation error:', e);
      }
    }
    return true;
  }

  // Block non-mobile
  if (!device.isMobile) {
    showNotification('📱 Mobile Required', 'Open this page on your mobile device');
    return false;
  }

  // ==================== GENERATE OFFICIAL DEEP LINKS ====================
  // Based on Binance's official getDeeplink() API
  const generateOfficialDeepLinks = () => {
    const url = dappUrl?.trim() || '';
    const encoded = encodeURIComponent(url);
    
    // Official format from @binance/w3w-utils
    const links = {
      // Official Universal Links (HTTP) - Most reliable
      universalLinks: url 
        ? [
            `https://app.binance.com/en/web3wallet/dapp?url=${encoded}${chainId ? `&chainId=${chainId}` : ''}`,
            `https://app.binance.com/web3wallet/dapp?url=${encoded}${chainId ? `&chainId=${chainId}` : ''}`,
            `https://app.binance.com/uni-qr/dapp?url=${encoded}${chainId ? `&chainId=${chainId}` : ''}`
          ]
        : [
            'https://app.binance.com/en/web3wallet',
            'https://app.binance.com/web3wallet',
            'https://app.binance.com/uni-qr/wallet'
          ],
      
      // Official BNC Scheme (deeplink format)
      bncSchemes: url
        ? [
            `bnc://app.binance.com/web3wallet/dapp?url=${encoded}${chainId ? `&chainId=${chainId}` : ''}`,
            `bnc://app.binance.com/mp/app?appId=dapp&startPagePath=dapp&startPageQuery=url%3D${encoded}${chainId ? `%26chainId%3D${chainId}` : ''}`
          ]
        : [
            'bnc://app.binance.com/web3wallet',
            'bnc://app.binance.com/mp/app?appId=web3wallet'
          ],
      
      // Binance scheme variations
      binanceSchemes: url
        ? [
            `binance://app.binance.com/web3wallet/dapp?url=${encoded}`,
            `binance://web3wallet/dapp?url=${encoded}`
          ]
        : [
            'binance://app.binance.com/web3wallet',
            'binance://web3wallet'
          ],
      
      // Android Intent URLs (for better Android compatibility)
      androidIntents: device.isAndroid ? (url
        ? [
            `intent://app.binance.com/web3wallet/dapp?url=${encoded}#Intent;scheme=https;package=com.binance.dev;S.browser_fallback_url=https%3A%2F%2Fapp.binance.com%2Fen%2Fweb3wallet%2Fdapp%3Furl%3D${encoded};end`,
            `intent://web3wallet/dapp?url=${encoded}#Intent;scheme=bnc;package=com.binance.dev;end`
          ]
        : [
            'intent://app.binance.com/web3wallet#Intent;scheme=https;package=com.binance.dev;end',
            'intent://web3wallet#Intent;scheme=bnc;package=com.binance.dev;end'
          ]) : []
    };
    
    return links;
  };

  const deepLinks = generateOfficialDeepLinks();

  // ==================== APP OPENING TRACKER ====================
  let appOpened = false;
  const startTime = Date.now();
  
  const trackingHandlers = {
    visibility: () => {
      if (document.hidden) {
        appOpened = true;
      }
    },
    blur: () => {
      appOpened = true;
    },
    focus: () => {
      // If we return quickly (< 800ms), app probably didn't open
      if (Date.now() - startTime < 800) {
        appOpened = false;
      }
    }
  };

  document.addEventListener('visibilitychange', trackingHandlers.visibility);
  window.addEventListener('blur', trackingHandlers.blur);
  window.addEventListener('focus', trackingHandlers.focus);
  window.addEventListener('pagehide', trackingHandlers.visibility);

  const cleanup = () => {
    document.removeEventListener('visibilitychange', trackingHandlers.visibility);
    window.removeEventListener('blur', trackingHandlers.blur);
    window.removeEventListener('focus', trackingHandlers.focus);
    window.removeEventListener('pagehide', trackingHandlers.visibility);
  };

  // ==================== OPENING METHODS ====================
  const openLink = {
    direct: (url) => {
      try {
        window.location.href = url;
        return true;
      } catch (e) {
        return false;
      }
    },
    
    iframe: (url) => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'display:none;width:0;height:0;position:absolute;';
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => {
          try {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          } catch (e) {}
        }, 2000);
        return true;
      } catch (e) {
        return false;
      }
    },
    
    anchor: (url) => {
      try {
        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            if (a.parentNode) a.parentNode.removeChild(a);
          } catch (e) {}
        }, 200);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // ==================== EXECUTION STRATEGY ====================
  const executeStrategy = async () => {
    
    if (device.isInAppBrowser) {
      handleInAppBrowser();
      return false;
    }

    // STRATEGY: Try all deep link formats progressively
    
    // Step 1: Universal Link (Primary - works on both iOS and Android)
    openLink.direct(deepLinks.universalLinks[0]);
    
    await delay(400);
    if (appOpened) return true;
    
    // Step 2: Android Intent (Best for Android)
    if (device.isAndroid && deepLinks.androidIntents.length > 0) {
      openLink.direct(deepLinks.androidIntents[0]);
      await delay(400);
      if (appOpened) return true;
    }
    
    // Step 3: BNC Scheme with iframe (iOS compatibility)
    openLink.iframe(deepLinks.bncSchemes[0]);
    await delay(400);
    if (appOpened) return true;
    
    // Step 4: Alternative Universal Link
    openLink.direct(deepLinks.universalLinks[1]);
    await delay(400);
    if (appOpened) return true;
    
    // Step 5: BNC Scheme direct
    openLink.anchor(deepLinks.bncSchemes[0]);
    await delay(400);
    if (appOpened) return true;
    
    // Step 6: Binance scheme fallback
    openLink.direct(deepLinks.binanceSchemes[0]);
    await delay(400);
    if (appOpened) return true;
    
    // Step 7: Alternative Android Intent
    if (device.isAndroid && deepLinks.androidIntents[1]) {
      openLink.direct(deepLinks.androidIntents[1]);
      await delay(400);
      if (appOpened) return true;
    }
    
    // Step 8: Last resort - MP app format
    if (deepLinks.bncSchemes[1]) {
      openLink.direct(deepLinks.bncSchemes[1]);
    }
    
    return appOpened;
  };

  // ==================== EXECUTE ====================
  try {
    await executeStrategy();
    
    // Wait for final result
    await delay(2000);
    
    cleanup();
    
    if (!appOpened) {
      handleAppNotOpened();
    }
    
    return appOpened;
    
  } catch (error) {
    cleanup();
    showNotification('❌ Error', error.message);
    return false;
  }

  // ==================== FAILURE HANDLERS ====================
  function handleInAppBrowser() {
    const browserName = device.isIOS ? 'Safari or Chrome' : 'Chrome';
    
    showModal({
      title: '📱 Open in Browser',
      message: `For best results, open this page in ${browserName}.\n\nIn-app browsers have limited deep link support.`,
      buttons: [
        {
          text: 'Copy Link',
          style: 'primary',
          action: async () => {
            const link = deepLinks.universalLinks[0];
            try {
              await navigator.clipboard.writeText(link);
              showNotification('✅ Copied', 'Paste in your browser');
            } catch (e) {
              prompt('Copy this link:', link);
            }
          }
        },
        {
          text: 'Try Anyway',
          style: 'secondary',
          action: () => {
            openLink.direct(deepLinks.universalLinks[0]);
          }
        }
      ]
    });
  }

  function handleAppNotOpened() {
    const storeLinks = {
      ios: 'https://apps.apple.com/app/binance-buy-bitcoin-crypto/id1436799971',
      android: 'https://play.google.com/store/apps/details?id=com.binance.dev'
    };
    
    showModal({
      title: '❌ Unable to Open Binance',
      message: 'The Binance app may not be installed, or your browser doesn\'t support deep links.',
      buttons: [
        {
          text: device.isIOS ? 'Get on App Store' : 'Get on Play Store',
          style: 'primary',
          action: () => {
            window.location.href = device.isIOS ? storeLinks.ios : storeLinks.android;
          }
        },
        {
          text: 'Copy Deep Link',
          style: 'secondary',
          action: async () => {
            const link = deepLinks.universalLinks[0];
            try {
              await navigator.clipboard.writeText(link);
              showNotification('✅ Copied', 'Open in Binance app manually');
            } catch (e) {
              prompt('Copy this link:', link);
            }
          }
        },
        {
          text: 'Retry',
          style: 'tertiary',
          action: () => {
            connectBinanceWeb3(dappUrl, chainId);
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
    animation: slideUp 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;
  
  toast.innerHTML = `<strong>${title}</strong>${message ? `<br><span style="opacity:0.8">${message}</span>` : ''}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
  
  if (!document.getElementById('binance-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'binance-toast-styles';
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      @keyframes slideDown {
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
    animation: fadeIn 0.2s ease;
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
    animation: scaleIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;
  
  modal.innerHTML = `
    <h3 style="margin:0 0 12px; font-size:22px; font-weight:700; color:#1a1a1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${title}</h3>
    <p style="margin:0 0 24px; line-height:1.6; color:#666; font-size:15px; white-space:pre-line">${message}</p>
    <div style="display:flex; flex-direction:column; gap:12px"></div>
  `;
  
  const buttonContainer = modal.querySelector('div');
  const styles = {
    primary: 'background:#F0B90B; color:#000; font-weight:700',
    secondary: 'background:#f5f5f5; color:#1a1a1a; font-weight:600',
    tertiary: 'background:transparent; color:#666; border:2px solid #e0e0e0'
  };
  
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.style.cssText = `
      ${styles[btn.style] || styles.secondary};
      border: none;
      padding: 16px;
      border-radius: 14px;
      font-size: 16px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: transform 0.2s;
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
  
  if (!document.getElementById('binance-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'binance-modal-styles';
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
  }
}

// ==================== PUBLIC API ====================

// Simple usage - just open wallet
window.openBinanceWeb3 = () => connectBinanceWeb3();

// With dApp URL
window.openBinanceWeb3WithDapp = (url) => connectBinanceWeb3(url);

// With dApp URL and chain ID
window.openBinanceWeb3WithChain = (url, chainId) => connectBinanceWeb3(url, chainId);

/*
==================== USAGE EXAMPLES ====================

// Basic - Open Web3 Wallet home
connectBinanceWeb3();

// Open your dApp in Binance Web3 Wallet
connectBinanceWeb3('https://your-dapp.com');

// Open your dApp on specific chain (e.g., BSC = 56, Ethereum = 1)
connectBinanceWeb3('https://your-dapp.com', 56);

// Button integration
<button onclick="connectBinanceWeb3('https://your-dapp.com')">
  Connect Binance Web3
</button>

// Or with chain ID
<button onclick="connectBinanceWeb3('https://pancakeswap.finance', 56)">
  Open PancakeSwap on BSC
</button>

==================== SUPPORTED CHAINS ====================
- Ethereum: 1
- BSC (Binance Smart Chain): 56
- Polygon: 137
- Arbitrum: 42161
- Optimism: 10
- Base: 8453
- And more...
*/