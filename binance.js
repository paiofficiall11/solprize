/**
 * Robust function to open Binance Web3 Wallet with dApp
 * @param {string} dappUrl - The URL of the dApp to load (optional)
 * @param {boolean} showAlerts - Whether to show alert messages (default: true)
 */
function openBinanceWeb3(dappUrl = '', showAlerts = true) {
  const log = (message) => {
    console.log(message);
    if (showAlerts) alert(message);
  };
  
  try {
    log('🚀 Starting Binance Web3 connection...');
    
    // Platform detection
    const userAgent = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isMobile = isIOS || isAndroid;
    
    log(`📱 Device: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}`);
    
    if (!isMobile) {
      log('⚠️ Desktop detected. Opening web version...');
      window.open('https://www.binance.com/en/web3wallet', '_blank');
      return;
    }
    
    // Generate deep link
    let deepLink;
    if (dappUrl && dappUrl.trim()) {
      const cleanUrl = dappUrl.trim();
      const encodedUrl = encodeURIComponent(cleanUrl);
      deepLink = `https://app.binance.com/en/web3wallet/dapp?url=${encodedUrl}`;
      log(`🔗 Opening dApp: ${cleanUrl}`);
    } else {
      deepLink = 'https://app.binance.com/en/web3wallet';
      log('🔗 Opening Binance Web3 Wallet home');
    }
    
    log(`📍 Deep Link: ${deepLink}`);
    
    // Track if app opened
    let appOpened = false;
    let redirectTimer = null;
    
    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
        log('✅ Binance app opened successfully!');
        if (redirectTimer) clearTimeout(redirectTimer);
      }
    };
    
    // Page blur handler
    const handleBlur = () => {
      appOpened = true;
      log('✅ App opened - window blurred');
      if (redirectTimer) clearTimeout(redirectTimer);
    };
    
    // Add listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handleVisibilityChange);
    
    // Primary method: Direct redirect
    log('⏳ Attempting to open Binance...');
    window.location.href = deepLink;
    
    // Alternative method for Android (iframe injection)
    if (isAndroid) {
      setTimeout(() => {
        if (!appOpened) {
          try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = deepLink;
            document.body.appendChild(iframe);
            
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 2000);
            
            log('🖼️ Android: Trying iframe method...');
          } catch (e) {
            log(`❌ Iframe method failed: ${e.message}`);
          }
        }
      }, 500);
    }
    
    // Fallback check after delay
    redirectTimer = setTimeout(() => {
      // Cleanup listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handleVisibilityChange);
      
      if (!appOpened) {
        log('⚠️ App did not open automatically');
        
        // Show manual copy option
        const shouldCopy = confirm(
          '❌ Binance app did not open automatically.\n\n' +
          '📋 Would you like to COPY the link to open manually?\n\n' +
          'Click OK to copy, then paste in your browser.'
        );
        
        if (shouldCopy) {
          copyLinkToClipboard(deepLink);
        } else {
          // Try one more time with window.open
          log('🔄 Trying alternative method...');
          const newWindow = window.open(deepLink, '_blank');
          
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            log('❌ Popup blocked. Please allow popups and try again.');
          }
        }
      }
    }, 3000);
    
  } catch (error) {
    log(`❌ Error: ${error.message}`);
    log('🔧 Stack: ' + error.stack);
  }
}

/**
 * Helper function to copy link to clipboard
 */
function copyLinkToClipboard(link) {
  try {
    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link)
        .then(() => {
          alert('✅ Link copied to clipboard!\n\n📱 Now paste it in your browser address bar.');
        })
        .catch(err => {
          alert(`❌ Failed to copy: ${err.message}`);
          showLinkForManualCopy(link);
        });
    } else {
      // Fallback method
      fallbackCopyToClipboard(link);
    }
  } catch (error) {
    alert(`❌ Copy error: ${error.message}`);
    showLinkForManualCopy(link);
  }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      alert('✅ Link copied!\n\n📱 Paste it in your browser.');
    } else {
      showLinkForManualCopy(text);
    }
  } catch (err) {
    document.body.removeChild(textArea);
    alert(`❌ Copy failed: ${err.message}`);
    showLinkForManualCopy(text);
  }
}

/**
 * Show link in a prompt for manual copying
 */
function showLinkForManualCopy(link) {
  prompt(
    '📋 Copy this link manually:\n\n' +
    'Press and hold the text below, then select "Copy"',
    link
  );
}

/**
 * Alternative: Open with custom deep link schemes
 * Use this if universal links don't work
 */
function openBinanceWeb3WithCustomScheme(dappUrl = '') {
  alert('🚀 Trying custom deep link scheme...');
  
  const schemes = [];
  
  if (dappUrl && dappUrl.trim()) {
    const encoded = encodeURIComponent(dappUrl.trim());
    schemes.push(
      `bnc://app.binance.com/en/web3wallet/dapp?url=${encoded}`,
      `binance://app.binance.com/en/web3wallet/dapp?url=${encoded}`
    );
  } else {
    schemes.push(
      'bnc://app.binance.com/en/web3wallet',
      'binance://web3wallet',
      'bnc://web3wallet'
    );
  }
  
  alert(`🔗 Trying ${schemes.length} deep link formats...`);
  
  let index = 0;
  const tryNextScheme = () => {
    if (index < schemes.length) {
      alert(`Attempt ${index + 1}: ${schemes[index]}`);
      window.location.href = schemes[index];
      index++;
      setTimeout(tryNextScheme, 1000);
    } else {
      alert('❌ All schemes failed. Try the universal link method instead.');
    }
  };
  
  tryNextScheme();
}

// Example usage:
// openBinanceWeb3('https://your-dapp.com');
// openBinanceWeb3(); // Opens Web3 wallet home
// openBinanceWeb3('https://your-dapp.com', false); // No alerts, console only