/**
 * Opens the Binance Web3 Wallet and loads a dApp
 * Handles multiple deep link formats and provides detailed logging
 * @param {string} dappUrl - The URL of the dApp to load (optional)
 */
function openBinanceApp(dappUrl = '') {
  alert('🚀 [Binance Opener] Function called');
  alert('📱 [Binance Opener] User Agent:', navigator.userAgent);
  alert('🌐 [Binance Opener] dApp URL provided:', dappUrl || 'None');
  
  // Detect platform
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;
  
  alert('📲 [Binance Opener] Platform Detection:', {
    isIOS,
    isAndroid,
    isMobile
  });
  
  if (!isMobile) {
    console.warn('⚠️ [Binance Opener] Not on mobile device - opening web version');
    window.open('https://www.binance.com/en/web3wallet', '_blank');
    return;
  }
  
  // Multiple deep link attempts for Binance Web3
  const deepLinks = [];
  
  if (dappUrl) {
    const encodedUrl = encodeURIComponent(dappUrl);
    alert('🔗 [Binance Opener] Encoded dApp URL:', encodedUrl);
    
    // Various Binance Web3 deep link formats
    deepLinks.push(
      `bnc://app.binance.com/en/web3wallet/dapp?url=${encodedUrl}`,
      `https://app.binance.com/en/web3wallet/dapp?url=${encodedUrl}`,
      `binance://app.binance.com/en/web3wallet/dapp?url=${encodedUrl}`,
      `bnc://web3wallet/dapp?url=${encodedUrl}`,
      // WalletConnect style
      `wc://app.binance.com/wc?uri=${encodedUrl}`
    );
  } else {
    // Open Web3 wallet home
    deepLinks.push(
      'bnc://app.binance.com/en/web3wallet',
      'https://app.binance.com/en/web3wallet',
      'binance://web3wallet',
      'bnc://web3wallet'
    );
  }
  
  alert('🔗 [Binance Opener] Deep links to try:', deepLinks);
  
  // Fallback URL
  const fallbackUrl = dappUrl 
    ? `https://www.binance.com/en/web3wallet/dapp?url=${encodeURIComponent(dappUrl)}`
    : 'https://www.binance.com/en/web3wallet';
  
  alert('🔄 [Binance Opener] Fallback URL:', fallbackUrl);
  
  // Track app opening
  let appOpened = false;
  let attemptIndex = 0;
  
  // Visibility change handler
  const handleVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
      alert('✅ [Binance Opener] App opened - page hidden');
    }
  };
  
  // Blur handler
  const handleBlur = () => {
    appOpened = true;
    alert('✅ [Binance Opener] App opened - window blurred');
  };
  
  // Pagehide handler (iOS Safari)
  const handlePagehide = () => {
    appOpened = true;
    alert('✅ [Binance Opener] App opened - pagehide event');
  };
  
  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('pagehide', handlePagehide);
  
  alert('👂 [Binance Opener] Event listeners attached');
  
  // Try opening with iframe (more reliable on some devices)
  function tryDeepLink(url, index) {
    alert(`🔄 [Binance Opener] Attempt ${index + 1}/${deepLinks.length}: ${url}`);
    
    try {
      // Method 1: Direct location change
      if (index === 0) {
        alert('📍 [Binance Opener] Using window.location.href');
        window.location.href = url;
      }
      // Method 2: Hidden iframe (works better on some Android devices)
      else if (index === 1 && isAndroid) {
        alert('🖼️ [Binance Opener] Using hidden iframe (Android)');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => {
          document.body.removeChild(iframe);
          alert('🗑️ [Binance Opener] Iframe removed');
        }, 1000);
      }
      // Method 3: window.open with _blank
      else if (index === 2) {
        alert('🪟 [Binance Opener] Using window.open');
        const opened = window.open(url, '_blank');
        if (!opened) {
          console.warn('⚠️ [Binance Opener] window.open returned null (popup blocked?)');
        }
      }
      // Method 4: Create and click anchor tag
      else {
        alert('🔗 [Binance Opener] Using anchor tag click');
        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          alert('🗑️ [Binance Opener] Anchor removed');
        }, 100);
      }
    } catch (error) {
      console.error(`❌ [Binance Opener] Error with attempt ${index + 1}:`, error);
    }
  }
  
  // Try first deep link immediately
  tryDeepLink(deepLinks[0], 0);
  
  // Set timeout to check if app opened
  const checkTimeout = setTimeout(() => {
    alert('⏰ [Binance Opener] Timeout reached');
    alert('📊 [Binance Opener] App opened status:', appOpened);
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('pagehide', handlePagehide);
    alert('👂 [Binance Opener] Event listeners removed');
    
    if (!appOpened) {
      console.warn('⚠️ [Binance Opener] App did not open, trying fallback');
      alert('🌐 [Binance Opener] Opening fallback URL:', fallbackUrl);
      
      // Try fallback
      try {
        window.location.href = fallbackUrl;
      } catch (error) {
        console.error('❌ [Binance Opener] Fallback failed:', error);
        // Last resort - try to open in new tab
        window.open(fallbackUrl, '_blank');
      }
    } else {
      alert('✅ [Binance Opener] Successfully opened Binance app');
    }
  }, 2500);
  
  // Also try alternative deep links at intervals
  if (deepLinks.length > 1) {
    setTimeout(() => {
      if (!appOpened && deepLinks[1]) {
        tryDeepLink(deepLinks[1], 1);
      }
    }, 300);
    
    setTimeout(() => {
      if (!appOpened && deepLinks[2]) {
        tryDeepLink(deepLinks[2], 2);
      }
    }, 600);
  }
  
  alert('⏳ [Binance Opener] Waiting for app to open...');
}

// Example usage with button
document.addEventListener('DOMContentLoaded', () => {
  alert('📄 [Binance Opener] DOM loaded, setting up button');
  
  const btn = document.getElementById('openBinanceBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      alert('🖱️ [Binance Opener] Button clicked');
      e.preventDefault();
      
      // Replace with your actual dApp URL
      const yourDappUrl = 'https://paiofficiall11.github.io/solprize/';
      
      // Option 1: Open with your dApp URL
      openBinanceApp(yourDappUrl);
      
      // Option 2: Open Web3 Wallet home
      // openBinanceApp();
    });
    alert('✅ [Binance Opener] Button listener attached');
  } else {
    console.error('❌ [Binance Opener] Button with id "openBinanceBtn" not found');
  }
});

// Export for use in modules (optional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openBinanceApp };
}