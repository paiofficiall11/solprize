/**
 * Mobile-optimized Binance Web3 Wallet connector
 * Uses modern mobile APIs and platform-specific strategies
 * @param {string} dappUrl - Optional dApp URL to load
 */
async function connectBinanceWeb3(dappUrl = '') {
  // 1. ENHANCED MOBILE DETECTION
  const isMobile = (() => {
    const ua = navigator.userAgent || '';
    const touchScreen = 'ontouchstart' in window || 
                       (window.DocumentTouch && document instanceof DocumentTouch) ||
                       (navigator.maxTouchPoints > 1);
    const mobileUA = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return touchScreen && mobileUA;
  })();
  
  if (!isMobile) {
    showToast('📱 Mobile device required', 'Please open this page on your smartphone.');
    return;
  }

  // 2. PLATFORM-SPECIFIC DETECTION
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) && !/iPad Simulator|iPhone Simulator|iOS Simulator/i.test(ua);
  const isAndroid = /Android/i.test(ua) && !/Windows Phone/i.test(ua);
  const isTablet = /(iPad|Android.*(tablet|Tab))/i.test(ua);
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line|WeChat|Telegram|Snapchat|Pinterest|Discord|LinkedIn|Reddit|TikTok/i.test(ua);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                window.navigator.standalone === true;
  
  // 3. MODERN DEEP LINK GENERATION
  const generateDeepLinks = () => {
    const cleanUrl = dappUrl?.trim() || '';
    const encodedUrl = encodeURIComponent(cleanUrl);
    const links = { ios: [], android: [] };
    
    // iOS Universal Links (preferred)
    if (cleanUrl) {
      links.ios.push(`https://app.binance.com/en/web3wallet/dapp?url=${encodedUrl}`);
      links.ios.push(`https://app.binance.com/web3wallet/dapp?url=${encodedUrl}`);
      // iOS URI schemes (fallback)
      links.ios.push(`binance://web3wallet/dapp?url=${encodedUrl}`);
      links.ios.push(`bnc://web3wallet/dapp?url=${encodedUrl}`);
    } else {
      links.ios.push('https://app.binance.com/en/web3wallet');
      links.ios.push('binance://web3wallet');
      links.ios.push('bnc://web3wallet');
    }
    
    // Android Intent scheme (optimal for Android)
    if (cleanUrl) {
      links.android.push(`intent://web3wallet/dapp?url=${encodedUrl}#Intent;scheme=binance;package=com.binance.dev;S.browser_fallback_url=https://app.binance.com/en/web3wallet/dapp?url=${encodedUrl};end`);
      links.android.push(`https://app.binance.com/en/web3wallet/dapp?url=${encodedUrl}`);
      links.android.push(`binance://web3wallet/dapp?url=${encodedUrl}`);
    } else {
      links.android.push(`intent://web3wallet#Intent;scheme=binance;package=com.binance.dev;S.browser_fallback_url=https://app.binance.com/en/web3wallet;end`);
      links.android.push('https://app.binance.com/en/web3wallet');
      links.android.push('binance://web3wallet');
    }
    
    return isIOS ? links.ios : links.android;
  };

  const deepLinks = generateDeepLinks();
  
  // 4. MOBILE-OPTIMIZED TRACKING
  let appOpened = false;
  let visibilityChangeTimer = null;
  let blurTimer = null;
  
  const trackAppOpen = () => {
    // Modern page visibility API
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        appOpened = true;
        cleanupTracking();
      }
    }, { once: true });
    
    // Window blur for in-app browsers
    window.addEventListener('blur', () => {
      if (!appOpened) {
        blurTimer = setTimeout(() => {
          appOpened = true;
          cleanupTracking();
        }, 300);
      }
    }, { once: true });
    
    // Timeout fallback
    setTimeout(() => {
      if (!appOpened) {
        cleanupTracking();
        handleAppNotOpened(isIOS, isAndroid, isInAppBrowser, isPWA, isTablet);
      }
    }, 2000);
  };
  
  const cleanupTracking = () => {
    clearTimeout(visibilityChangeTimer);
    clearTimeout(blurTimer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
  };
  
  // 5. MOBILE-SPECIFIC OPENING STRATEGY
  const openMobileDeepLink = async () => {
    trackAppOpen();
    
    if (isInAppBrowser) {
      // In-app browsers need special handling
      await handleInAppBrowser(deepLinks[0]);
      return;
    }
    
    if (isIOS) {
      await openIOSLinks(deepLinks);
    } else if (isAndroid) {
      await openAndroidLinks(deepLinks);
    }
  };
  
  const openIOSLinks = async (links) => {
    // iOS strategy: Universal Links first, then URI schemes
    try {
      // Try Universal Link with user gesture requirement
      window.location.href = links[0];
      
      // Fallback URI scheme after short delay
      setTimeout(() => {
        if (!appOpened) {
          try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = links[2];
            document.body.appendChild(iframe);
            setTimeout(() => document.body.removeChild(iframe), 1000);
          } catch (e) {
            // Fallback to direct link
            window.location.href = links[2];
          }
        }
      }, 500);
    } catch (e) {
      // Direct fallback
      window.location.href = links[1];
    }
  };
  
  const openAndroidLinks = async (links) => {
    // Android strategy: Intent scheme first
    try {
      // Try Intent scheme
      window.location.href = links[0];
      
      // Fallback to web URL after delay
      setTimeout(() => {
        if (!appOpened) {
          window.location.href = links[1];
        }
      }, 800);
    } catch (e) {
      window.location.href = links[1];
    }
  };
  
  const handleInAppBrowser = async (primaryLink) => {
    // Show modal instead of alerts for better UX
    showInAppBrowserModal(isIOS, primaryLink);
  };
  
  // 6. MODERN MOBILE UI/UX HANDLING
  const handleAppNotOpened = (isIOS, isAndroid, isInAppBrowser, isPWA, isTablet) => {
    if (isInAppBrowser) {
      showInAppBrowserModal(isIOS, deepLinks[0]);
      return;
    }
    
    showAppNotOpenedModal({
      isIOS, 
      isAndroid, 
      isTablet,
      isPWA,
      appStoreUrl: 'https://apps.apple.com/app/binance/id1436799971',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.binance.dev',
      retryLink: deepLinks[0]
    });
  };
  
  // 7. EXECUTE MOBILE CONNECTION
  openMobileDeepLink();
}

// HELPER FUNCTIONS - MOBILE OPTIMIZED

/**
 * Shows toast notification (better than alerts for mobile)
 */
function showToast(message, detail = '') {
  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 9999;
    max-width: 90%;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
    animation: toast-slide 0.3s ease;
  `;
  
  toast.innerHTML = `<strong>${message}</strong>${detail ? `<br><small>${detail}</small>` : ''}`;
  document.body.appendChild(toast);
  
  // Animate and remove
  setTimeout(() => {
    toast.style.animation = 'toast-slide-out 0.3s ease forwards';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3000);
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toast-slide {
      from { transform: translateX(-50%) translateY(100px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes toast-slide-out {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(100px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Shows modal for in-app browser users
 */
function showInAppBrowserModal(isIOS, primaryLink) {
  const modal = createMobileModal({
    title: '📱 Open in Browser',
    message: `This feature works best in your device's main browser.${isIOS ? '\n\nOpen in Safari or Chrome' : '\n\nOpen in Chrome or your default browser'}`,
    primaryBtn: {
      text: 'Open in Browser',
      action: () => {
        window.location.href = primaryLink;
      }
    },
    secondaryBtn: {
      text: 'Copy Link',
      action: () => {
        navigator.clipboard.writeText(primaryLink).then(() => {
          showToast('✅ Link copied!', 'Paste it in your browser');
        });
        closeModal(modal);
      }
    }
  });
  
  document.body.appendChild(modal);
}

/**
 * Shows modal when app doesn't open
 */
function showAppNotOpenedModal({ isIOS, isAndroid, isTablet, isPWA, appStoreUrl, playStoreUrl, retryLink }) {
  const modal = createMobileModal({
    title: '❌ App Not Opened',
    message: isPWA ? 'Binance app not found. Please install the app or open this page in your browser.' : 
            (isTablet ? 'Tablet detected. Please ensure Binance app is installed.' : 'Binance app not found or not opening.'),
    primaryBtn: {
      text: isIOS ? 'App Store' : 'Play Store',
      action: () => {
        window.location.href = isIOS ? appStoreUrl : playStoreUrl;
      }
    },
    secondaryBtn: {
      text: 'Retry',
      action: () => {
        window.location.href = retryLink;
      }
    },
    tertiaryBtn: {
      text: 'Cancel',
      action: () => closeModal(modal)
    }
  });
  
  document.body.appendChild(modal);
}

/**
 * Creates mobile-optimized modal
 */
function createMobileModal({ title, message, primaryBtn, secondaryBtn, tertiaryBtn }) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: modal-fade-in 0.3s ease;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 20px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    margin: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    transform: translateY(0);
    animation: modal-slide-up 0.4s ease;
  `;
  
  content.innerHTML = `
    <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #1a1a1a;">${title}</h3>
    <p style="margin: 0 0 24px 0; line-height: 1.5; color: #666;">${message.replace(/\n/g, '<br>')}</p>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${primaryBtn ? `<button style="background: #F0B90B; color: black; border: none; padding: 14px; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer;">${primaryBtn.text}</button>` : ''}
      ${secondaryBtn ? `<button style="background: #e9ecef; color: #1a1a1a; border: none; padding: 14px; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer;">${secondaryBtn.text}</button>` : ''}
      ${tertiaryBtn ? `<button style="background: transparent; color: #666; border: 1px solid #ddd; padding: 14px; border-radius: 12px; font-size: 16px; cursor: pointer;">${tertiaryBtn.text}</button>` : ''}
    </div>
  `;
  
  // Add event listeners
  const buttons = content.querySelectorAll('button');
  if (primaryBtn && buttons[0]) buttons[0].onclick = primaryBtn.action;
  if (secondaryBtn && buttons[1]) buttons[1].onclick = secondaryBtn.action;
  if (tertiaryBtn && buttons[2]) buttons[2].onclick = tertiaryBtn.action;
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) closeModal(modal);
  };
  
  modal.appendChild(content);
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modal-slide-up { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `;
  document.head.appendChild(style);
  
  return modal;
}

/**
 * Closes modal with animation
 */
function closeModal(modal) {
  if (!modal) return;
  
  modal.style.animation = 'modal-fade-out 0.3s ease forwards';
  setTimeout(() => {
    if (modal.parentNode) modal.parentNode.removeChild(modal);
  }, 300);
  
  const style = document.createElement('style');
  style.textContent = `@keyframes modal-fade-out { from { opacity: 1; } to { opacity: 0; } }`;
  document.head.appendChild(style);
}

// SAFE WRAPPER WITH TOUCH OPTIMIZATION
function connectBinanceWeb3Safe(dappUrl = '') {
  // Prevent default touch behaviors for better UX
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show loading state
    const target = e.currentTarget;
    const originalText = target.innerHTML;
    target.innerHTML = '🚀 Opening Binance...';
    target.disabled = true;
    
    // Execute connection
    const executeConnection = () => {
      connectBinanceWeb3(dappUrl);
      
      // Restore button state after delay
      setTimeout(() => {
        target.innerHTML = originalText;
        target.disabled = false;
      }, 3000);
    };
    
    // Small delay to allow UI update
    setTimeout(executeConnection, 50);
  };
  
  return handleClick;
}

// MOBILE TOUCH OPTIMIZATION
document.addEventListener('DOMContentLoaded', () => {
  // Add touch feedback to all connect buttons
  document.querySelectorAll('[data-connect-binance]').forEach(button => {
    button.addEventListener('touchstart', (e) => {
      e.currentTarget.style.transform = 'scale(0.98)';
      e.currentTarget.style.opacity = '0.9';
    });
    
    button.addEventListener('touchend', (e) => {
      e.currentTarget.style.transform = '';
      e.currentTarget.style.opacity = '';
    });
    
    button.addEventListener('click', connectBinanceWeb3Safe(
      button.dataset.dappUrl || ''
    ));
  });
});

/*
MOBILE-OPTIMIZED USAGE:

<!-- HTML Button -->
<button data-connect-binance 
        data-dapp-url="https://your-dapp.com"
        style="padding: 16px; background: #F0B90B; color: black; border: none; border-radius: 16px; font-weight: bold; width: 100%; max-width: 300px;">
  Connect Binance Wallet
</button>

<!-- Or programmatically -->
document.getElementById('myButton').addEventListener('click', connectBinanceWeb3Safe('https://your-dapp.com'));

// For PWA/desktop detection
if (!isMobileDevice()) {
  document.getElementById('mobileOnlyContent').style.display = 'none';
}
*/