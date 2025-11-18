/**
 * Opens the Binance mobile app on mobile devices
 * Falls back to Binance website if app is not installed
 */
function openBinanceApp() {
  // Deep link scheme for Binance app
  // Try the more specific Binance deep link
  const binanceAppUrl = 'bnc://app.binance.com/en/trade';
  
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
  
  // Attempt to open the app
  window.location.href = binanceAppUrl;
  
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

// Example usage with a button
// HTML: <button id="openBinanceBtn">Open Binance App</button>
document.getElementById('openBinanceBtn')?.addEventListener('click', openBinanceApp);