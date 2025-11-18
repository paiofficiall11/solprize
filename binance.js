/**
 * Mobile-optimized function to open Binance Web3 Wallet
 * Specifically designed for iOS and Android devices
 * @param {string} dappUrl - Optional dApp URL to load
 */
async function connectBinanceWeb3(dappUrl = '') {
  
  // 1. STRICT MOBILE DETECTION
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;
  
  // Block non-mobile devices
  if (!isMobile) {
    alert('⚠️ This feature is only available on mobile devices. Please open this page on your phone.');
    return;
  }
  
  // Detect if using in-app browser (might need special handling)
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line|WeChat|Telegram/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua);
  
  // 2. BUILD MOBILE-SPECIFIC DEEP LINKS
  const links = [];
  
  if (dappUrl) {
    const clean = dappUrl.trim();
    const encoded = encodeURIComponent(clean);
    
    if (isIOS) {
      // iOS Universal Links (preferred on iOS)
      links.push(`https://app.binance.com/en/web3wallet/dapp?url=${encoded}`);
      links.push(`https://app.binance.com/web3wallet/dapp?url=${encoded}`);
      // iOS URL Schemes
      links.push(`bnc://app.binance.com/en/web3wallet/dapp?url=${encoded}`);
      links.push(`binance://app.binance.com/en/web3wallet/dapp?url=${encoded}`);
    } else {
      // Android Intent-style deep links work better
      links.push(`intent://app.binance.com/en/web3wallet/dapp?url=${encoded}#Intent;scheme=https;package=com.binance.dev;end`);
      links.push(`https://app.binance.com/en/web3wallet/dapp?url=${encoded}`);
      links.push(`bnc://app.binance.com/en/web3wallet/dapp?url=${encoded}`);
      links.push(`binance://app.binance.com/en/web3wallet/dapp?url=${encoded}`);
    }
  } else {
    if (isIOS) {
      links.push('https://app.binance.com/en/web3wallet');
      links.push('bnc://app.binance.com/en/web3wallet');
      links.push('binance://app.binance.com/en/web3wallet');
    } else {
      links.push('intent://app.binance.com/en/web3wallet#Intent;scheme=https;package=com.binance.dev;end');
      links.push('https://app.binance.com/en/web3wallet');
      links.push('bnc://app.binance.com/en/web3wallet');
      links.push('binance://app.binance.com/en/web3wallet');
    }
  }
  
  // 3. MOBILE-SPECIFIC APP OPENING TRACKING
  let opened = false;
  let startTime = Date.now();
  
  const visibilityHandler = () => {
    if (document.hidden) {
      opened = true;
    }
  };
  
  const blurHandler = () => {
    opened = true;
  };
  
  const focusHandler = () => {
    // If we return quickly (< 1 second), app likely didn't open
    if (Date.now() - startTime < 1000) {
      opened = false;
    }
  };
  
  document.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('blur', blurHandler);
  window.addEventListener('focus', focusHandler);
  window.addEventListener('pagehide', visibilityHandler);
  
  // 4. MOBILE-OPTIMIZED OPENING METHODS
  const openLink = (url, method = 'location') => {
    try {
      switch (method) {
        case 'location':
          window.location.href = url;
          break;
          
        case 'assign':
          window.location.assign(url);
          break;
          
        case 'open-blank':
          window.open(url, '_blank');
          break;
          
        case 'open-self':
          window.open(url, '_self');
          break;
          
        case 'iframe':
          const iframe = document.createElement('iframe');
          iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;';
          iframe.src = url;
          document.body.appendChild(iframe);
          setTimeout(() => {
            try {
              if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
            } catch (e) {}
          }, 3000);
          break;
          
        case 'anchor':
          const a = document.createElement('a');
          a.href = url;
          a.style.cssText = 'display:none;position:absolute;';
          a.target = '_blank';
          document.body.appendChild(a);
          
          // Trigger click with mobile touch event simulation
          if (typeof a.click === 'function') {
            a.click();
          } else {
            const evt = document.createEvent('MouseEvents');
            evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(evt);
          }
          
          setTimeout(() => {
            try {
              if (a && a.parentNode) {
                a.parentNode.removeChild(a);
              }
            } catch (e) {}
          }, 200);
          break;
      }
    } catch (e) {
      // Silent fail, continue to next method
    }
  };
  
  // 5. PLATFORM-SPECIFIC OPENING STRATEGY
  
  if (isIOS) {
    // iOS STRATEGY
    
    // Universal Link first (works best in Safari)
    openLink(links[0], 'location');
    
    // Try custom scheme after delay
    setTimeout(() => {
      if (!opened) openLink(links[2], 'location');
    }, 600);
    
    // Alternative universal link method
    setTimeout(() => {
      if (!opened) openLink(links[0], 'anchor');
    }, 1200);
    
    // Last iOS attempt
    setTimeout(() => {
      if (!opened) openLink(links[1], 'open-blank');
    }, 1800);
    
  } else if (isAndroid) {
    // ANDROID STRATEGY
    
    // Android Intent (most reliable on Android)
    openLink(links[0], 'location');
    
    // Iframe method (works in some Android browsers)
    setTimeout(() => {
      if (!opened) openLink(links[1], 'iframe');
    }, 300);
    
    // Custom scheme
    setTimeout(() => {
      if (!opened) openLink(links[2], 'location');
    }, 700);
    
    // Anchor click method
    setTimeout(() => {
      if (!opened) openLink(links[1], 'anchor');
    }, 1100);
    
    // Alternative intent
    setTimeout(() => {
      if (!opened) openLink(links[3], 'location');
    }, 1500);
  }
  
  // 6. MOBILE-SPECIFIC FALLBACK HANDLING
  setTimeout(() => {
    // Cleanup listeners
    document.removeEventListener('visibilitychange', visibilityHandler);
    window.removeEventListener('blur', blurHandler);
    window.removeEventListener('focus', focusHandler);
    window.removeEventListener('pagehide', visibilityHandler);
    
    if (!opened) {
      // App didn't open - provide mobile user guidance
      
      if (isInAppBrowser) {
        alert('⚠️ Detected in-app browser\n\n' +
              '📱 Please open this page in:\n' +
              (isIOS ? '• Safari browser\n• Chrome browser' : '• Chrome browser\n• Default browser') +
              '\n\nThen try again.');
        return;
      }
      
      // Offer to go to app store
      const goToStore = confirm(
        '❌ Binance app did not open\n\n' +
        '📲 Would you like to:\n' +
        '• Install Binance app (if not installed)\n' +
        '• Or retry opening\n\n' +
        'Click OK to go to app store\n' +
        'Click Cancel to retry'
      );
      
      if (goToStore) {
        if (isIOS) {
          window.location.href = 'https://apps.apple.com/app/binance/id1436799971';
        } else {
          window.location.href = 'https://play.google.com/store/apps/details?id=com.binance.dev';
        }
      } else {
        // Retry with most reliable link
        openLink(links[0], 'location');
      }
    }
  }, 2500);
  
  // 7. MOBILE BROWSER HINT
  if (isInAppBrowser) {
    setTimeout(() => {
      if (!opened) {
        alert('💡 TIP: For best results, open this page in your mobile browser (Safari/Chrome) instead of within another app.');
      }
    }, 3500);
  }
}

// MOBILE DETECTION CHECK
function isMobileDevice() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

// SAFE WRAPPER - Checks mobile first
function connectBinanceWeb3Safe(dappUrl = '') {
  if (!isMobileDevice()) {
    alert('⚠️ Mobile device required\n\nPlease open this page on your smartphone.');
    return;
  }
  connectBinanceWeb3(dappUrl);
}

/*
MOBILE-OPTIMIZED USAGE:

// Basic button click
document.getElementById('connectBtn').addEventListener('click', () => {
  connectBinanceWeb3('https://your-dapp.com');
});

// With mobile check
document.getElementById('connectBtn').onclick = () => {
  connectBinanceWeb3Safe('https://your-dapp.com');
};

// Touch-optimized button
document.getElementById('connectBtn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  connectBinanceWeb3('https://your-dapp.com');
});

// Open wallet home (no dApp)
connectBinanceWeb3();
*/