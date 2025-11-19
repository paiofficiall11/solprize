/**
 * 🔥 BINANCE WEB3 WALLET CONNECTOR - Mobile Optimized
 * 
 * REQUIREMENTS:
 * 1. Include WalletConnect SignClient library in your HTML:
 *    <script src="https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2.11.0/dist/index.umd.js"></script>
 * 
 * 2. This creates a global `WalletConnectSignClient` object
 * 
 * USAGE:
 * <button onclick="connectBinanceWallet()">Connect Binance Wallet</button>
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const WALLET_CONFIG = {
  projectId: "ec8dd86047facf2fb8471641db3e5f0c", // Your WalletConnect Project ID
  metadata: {
    name: "SolPrize",
    description: "Connect via Binance Web3 Wallet",
    url: "https://paiofficial11.github.io/solprize",
    icons: ["https://paiofficial11.github.io/solprize/icon.png"]
  },
  requiredNamespaces: {
    solana: {
      methods: ["solana_signTransaction", "solana_signMessage"],
      chains: ["solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"], // Solana mainnet chain ID
      events: ["accountsChanged", "chainChanged"]
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Detect if user is on a mobile device
 * @returns {boolean} True if mobile device detected
 */
function isMobile() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|opera mini|iemobile|mobile|webos|blackberry|windows phone/i.test(userAgent);
}

/**
 * Detect if user is on iOS device specifically
 * @returns {boolean} True if iOS device
 */
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
}

/**
 * Show user-friendly loading indicator
 * @param {string} message - Message to display
 */
function showLoading(message) {
  // Remove existing loading indicator if present
  const existing = document.getElementById('wc-loading');
  if (existing) existing.remove();

  const loader = document.createElement('div');
  loader.id = 'wc-loading';
  loader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  `;
  
  loader.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 16px;
      text-align: center;
      max-width: 300px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    ">
      <div style="
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #FCD535;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      "></div>
      <p style="margin: 0; color: #333; font-size: 16px; font-weight: 500;">${message}</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.appendChild(loader);
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  const loader = document.getElementById('wc-loading');
  if (loader) loader.remove();
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
  hideLoading();
  alert(`❌ ${message}`);
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccess(message) {
  hideLoading();
  alert(`✅ ${message}`);
}

// ============================================================================
// WALLET CONNECTION LOGIC
// ============================================================================

/**
 * Main function to connect Binance Web3 Wallet
 * Opens Binance app on mobile and establishes WalletConnect session
 * 
 * @returns {Promise<Object|null>} WalletConnect session object or null on failure
 */
async function connectBinanceWallet() {
  alert("🚀 Starting Binance Wallet connection...");
  
  // ====================================
  // STEP 1: Mobile Device Check
  // ====================================
  if (!isMobile()) {
    showError("Mobile device required!\n\nPlease open this page on your phone to connect Binance Wallet.");
    return null;
  }

  // ====================================
  // STEP 2: Check WalletConnect Library
  // ====================================
  if (typeof WalletConnectSignClient === 'undefined') {
    showError("WalletConnect library not loaded!\n\nMake sure to include the script:\n<script src='https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2.11.0/dist/index.umd.js'></script>");
    console.error("❌ WalletConnectSignClient is not defined. Include the library in your HTML.");
    return null;
  }

  alert("Initializing WalletConnect...");

  try {
    // ====================================
    // STEP 3: Initialize WalletConnect Client
    // ====================================
    alert("📱 Initializing WalletConnect SignClient...");
    const client = await WalletConnectSignClient.SignClient.init({
      projectId: WALLET_CONFIG.projectId,
      metadata: WALLET_CONFIG.metadata
    });

    alert("✅ WalletConnect client initialized:", client);

    // ====================================
    // STEP 4: Create Connection Request
    // ====================================
    alert("Preparing connection...");
    alert("🔗 Requesting WalletConnect session...");
    
    const { uri, approval } = await client.connect({
      requiredNamespaces: WALLET_CONFIG.requiredNamespaces
    });

    // Validate URI generation
    if (!uri) {
      throw new Error("Failed to generate WalletConnect URI");
    }

    alert("🔑 WalletConnect URI generated:", uri);

    // ====================================
    // STEP 5: Build Binance Deep Link
    // ====================================
    // This URL opens the Binance app directly on mobile
    const deepLink = `https://app.binance.com/en/web3/walletlink?uri=${encodeURIComponent(uri)}`;
    alert("🔗 Binance deep link:", deepLink);

    // ====================================
    // STEP 6: Open Binance App
    // ====================================
    showLoading("Opening Binance Wallet...\n\nIf the app doesn't open, make sure Binance is installed.");
    
    // iOS requires a slight delay before redirect
    if (isIOS()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force redirect to Binance app
    window.location.href = deepLink;

    // ====================================
    // STEP 7: Wait for User Approval
    // ====================================
    alert("⏳ Waiting for wallet approval...");
    showLoading("Approve connection in Binance Wallet...");

    // Set timeout for approval (30 seconds)
    const approvalTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout - user did not approve")), 30000)
    );

    // Wait for either approval or timeout
    const session = await Promise.race([approval(), approvalTimeout]);

    // ====================================
    // STEP 8: Connection Success
    // ====================================
    alert("✅ Wallet connected successfully!");
    alert("Session details:", session);

    // Extract wallet address from session
    const walletAddress = session?.namespaces?.solana?.accounts?.[0]?.split(':')?.[2];
    
    if (walletAddress) {
      showSuccess(`Connected!\n\nAddress: ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`);
      alert("💼 Wallet Address:", walletAddress);
    } else {
      showSuccess("Wallet connected successfully!");
    }

    // Store session for future use
    window.walletConnectSession = session;
    
    return session;

  } catch (err) {
    // ====================================
    // ERROR HANDLING
    // ====================================
    console.error("❌ Connection failed:", err);
    
    let errorMessage = "Failed to connect to Binance Wallet";
    
    // Provide specific error messages
    if (err.message.includes("timeout")) {
      errorMessage = "Connection timeout!\n\nPlease try again and approve the connection in Binance Wallet.";
    } else if (err.message.includes("rejected")) {
      errorMessage = "Connection rejected in Binance Wallet.";
    } else if (err.message.includes("URI")) {
      errorMessage = "Failed to generate connection link.\n\nPlease check your internet connection.";
    } else {
      errorMessage = `Connection error:\n${err.message}`;
    }
    
    showError(errorMessage);
    return null;
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Disconnect current WalletConnect session
 */
async function disconnectWallet() {
  if (window.walletConnectSession) {
    alert("🔌 Disconnecting wallet...");
    // Add disconnect logic here if needed
    window.walletConnectSession = null;
    showSuccess("Wallet disconnected!");
  }
}

/**
 * Get current connected wallet address
 * @returns {string|null} Wallet address or null if not connected
 */
function getConnectedAddress() {
  if (!window.walletConnectSession) {
    alert("❌ No active session");
    return null;
  }
  
  const address = window.walletConnectSession?.namespaces?.solana?.accounts?.[0]?.split(':')?.[2];
  return address || null;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

alert("✅ Binance Wallet Connect module loaded");
alert("📱 Usage: Call connectBinanceWallet() to start connection");

// Make functions available globally
window.connectBinanceWallet = connectBinanceWallet;
window.disconnectWallet = disconnectWallet;
window.getConnectedAddress = getConnectedAddress;