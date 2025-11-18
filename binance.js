/**
 * Opens the Binance Web3 Wallet and loads a dApp
 * @param {string} dappUrl - The URL of the dApp to load (optional)
 */
function openBinanceApp(dappUrl = '') {
  // Deep link scheme for Binance Web3 Wallet
  // Format: https://app.binance.com/en/web3wallet/dapp?url=YOUR_DAPP_URL
  let binanceWeb3Url;
  
  if (dappUrl) {
    // Encode the dApp URL
    const encodedUrl = encodeURIComponent(dappUrl);
    binanceWeb3Url = `https://app.binance.com/en/web3wallet/dapp?url=${encodedUrl}`;
  } else {
    // Open Binance Web3 Wallet home
    binanceWeb3Url = 'https://app.binance.com/en/web3wallet';
  }
  
  // Fallback URL if app is not installed
  const binanceWebUrl = 'https://www.binance.com';
  
  // Timeout duration to detect if app didn't open
  const timeout = 2000;
  
  // Track if user left the page (app opened)
  let appOpened = false;
  
  // Listen for visibility change (user switched to app)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
    }
  };
  
  // Listen for blur event (page lost focus)
  const handleBlur = () => {
    appOpened = true;
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  
  // Attempt to open Binance Web3 Wallet
  window.location.href = binanceWeb3Url;
  
  // Set timeout to open web fallback if app didn't open
  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    
    if (!appOpened) {
      // App didn't open, redirect to website
      window.location.href = binanceWebUrl;
    }
  }, timeout);
}

// Example usage with a button and dApp URL
// HTML: <button id="openBinanceBtn">Open Binance Web3</button>
document.getElementById('openBinanceBtn')?.addEventListener('click', () => {
  // Example: Open your dApp in Binance Web3 Wallet
  const yourDappUrl = 'https://paiofficiall11.github.io/solprize/';
  openBinanceApp(yourDappUrl);
  
  // Or open Web3 Wallet home without a specific dApp:
  // openBinanceApp();
});