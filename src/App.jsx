import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [particles, setParticles] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [walletProvider, setWalletProvider] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  
  const wcClientRef = useRef(null);
  const sessionRef = useRef(null);

  // WalletConnect Configuration
  const WC_PROJECT_ID = 'ec8dd86047facf2fb8471641db3e5f0c';
  const APP_URL = 'https://solprize.vercel.app';
  const APP_NAME = 'SolPrize Rewards';
  const APP_DESCRIPTION = 'Claim your referral rewards';

  // ============================================================================
  // MOBILE DETECTION & INITIALIZATION
  // ============================================================================
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /android|iphone|ipad|ipod|opera mini|iemobile|mobile|webos|blackberry|windows phone/i.test(
        navigator.userAgent.toLowerCase()
      );
      setIsMobileDevice(mobile);
      
      if (!mobile) {
        addDebug('⚠️ Desktop detected - mobile device recommended');
      } else {
        addDebug('✅ Mobile device detected');
      }
    };
    
    checkMobile();
    
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      const text = 'take Your Payout';
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          setTypewriterText(prev => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(timer);
        }
      }, 80);
      return () => clearInterval(timer);
    }
  }, [loading]);

  // Check for existing Solana provider on load
  useEffect(() => {
    const checkSolanaProvider = () => {
      if (window.solana) {
        addDebug('🟢 Solana provider detected');
        setWalletProvider(window.solana);
        
        // Check if already connected
        if (window.solana.isConnected && window.solana.publicKey) {
          addDebug('✅ Wallet already connected');
          handleSuccessfulConnection(window.solana.publicKey.toString(), 'solana');
        }
      } else {
        addDebug('🔍 Waiting for Solana provider...');
        
        // Listen for Solana provider injection
        const checkInterval = setInterval(() => {
          if (window.solana) {
            addDebug('🟢 Solana provider now available');
            setWalletProvider(window.solana);
            clearInterval(checkInterval);
          }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
      }
    };
    
    if (!loading) {
      checkSolanaProvider();
    }
  }, [loading]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isAndroid = () => /android/i.test(navigator.userAgent.toLowerCase());

  const addDebug = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔍 [${timestamp}] ${message}`);
    setDebugInfo(prev => [...prev, `${timestamp}: ${message}`]);
  };

  // ============================================================================
  // SOLANA BALANCE FETCHING (DEVNET)
  // ============================================================================
  
  const fetchSolanaBalance = async (publicKey) => {
    try {
      addDebug('💰 Fetching SOL balance from devnet...');
      
      const DEVNET_RPC = 'https://api.devnet.solana.com';
      
      const response = await fetch(DEVNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [publicKey]
        })
      });
      
      const data = await response.json();
      
      if (data.result) {
        const lamports = data.result.value;
        const sol = lamports / 1000000000; // Convert lamports to SOL
        setTokenBalance(sol);
        addDebug(`✅ Balance: ${sol} SOL (${lamports} lamports)`);
        return sol;
      } else {
        addDebug('⚠️ Could not fetch balance');
        return null;
      }
    } catch (error) {
      addDebug(`❌ Balance fetch error: ${error.message}`);
      return null;
    }
  };

  // ============================================================================
  // WALLETCONNECT V2 IMPLEMENTATION
  // ============================================================================
  
  const initializeWalletConnect = async () => {
    try {
      addDebug('🔧 Initializing WalletConnect v2...');
      
      // Import WalletConnect from CDN
      if (!window.SignClient && !window.WalletConnectClient) {
        addDebug('📦 Loading WalletConnect SDK...');
        await loadWalletConnectSDK();
      }
      
      // Try SignClient first (newer API)
      const ClientConstructor = window.SignClient || window.WalletConnectClient;
      
      if (!ClientConstructor) {
        addDebug('⚠️ WalletConnect SDK not available, using direct method');
        return null;
      }
      
      const client = await ClientConstructor.init({
        projectId: WC_PROJECT_ID,
        metadata: {
          name: APP_NAME,
          description: APP_DESCRIPTION,
          url: APP_URL,
          icons: ['https://solprize.vercel.app/icon.png']
        }
      });
      
      wcClientRef.current = client;
      addDebug('✅ WalletConnect client initialized');
      
      return client;
    } catch (error) {
      addDebug(`⚠️ WalletConnect init error: ${error.message}`);
      addDebug('📱 Falling back to direct deep link method');
      return null;
    }
  };

  const loadWalletConnectSDK = () => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.WalletConnectClient || window.SignClient) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@walletconnect/sign-client@2.10.0/dist/index.umd.js';
      script.onload = () => {
        addDebug('✅ WalletConnect SDK loaded');
        resolve();
      };
      script.onerror = () => {
        addDebug('❌ Failed to load WalletConnect SDK from unpkg');
        // Try alternative CDN
        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2.10.0/dist/index.umd.js';
        script2.onload = () => {
          addDebug('✅ WalletConnect SDK loaded from jsdelivr');
          resolve();
        };
        script2.onerror = () => {
          addDebug('❌ All CDNs failed, using direct deep link method');
          resolve(); // Don't reject, fallback to direct method
        };
        document.head.appendChild(script2);
      };
      document.head.appendChild(script);
    });
  };

  const createWalletConnectSession = async () => {
    try {
      const client = wcClientRef.current;
      
      if (!client) {
        addDebug('⚠️ No WalletConnect client, generating manual URI');
        return { uri: generateManualWalletConnectURI(), approval: null };
      }
      
      addDebug('🔗 Creating WalletConnect session...');
      
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          solana: {
            methods: ['solana_signTransaction', 'solana_signMessage'],
            chains: ['solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ'], // Devnet chain ID
            events: ['accountsChanged', 'chainChanged']
          }
        }
      });
      
      if (!uri) {
        throw new Error('Failed to generate WalletConnect URI');
      }
      
      addDebug(`✅ WalletConnect URI generated: ${uri.substring(0, 50)}...`);
      
      return { uri, approval };
    } catch (error) {
      addDebug(`⚠️ Session creation error: ${error.message}`);
      addDebug('📱 Using manual URI generation');
      return { uri: generateManualWalletConnectURI(), approval: null };
    }
  };

  const generateManualWalletConnectURI = () => {
    // Generate a proper WalletConnect v2 URI format
    const topic = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const symKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // WalletConnect v2 URI structure
    const uri = `wc:${topic}@2?relay-protocol=irn&symKey=${symKey}&projectId=${WC_PROJECT_ID}`;
    addDebug(`🔗 Manual URI generated: ${uri.substring(0, 50)}...`);
    return uri;
  };

  // ============================================================================
  // BINANCE WEB3 DEEP LINKING
  // ============================================================================
  
  const openBinanceWeb3WithWalletConnect = (wcUri) => {
    addDebug('🚀 Opening Binance Web3 Wallet...');
    
    const encodedUri = encodeURIComponent(wcUri);
    const encodedAppUrl = encodeURIComponent(APP_URL);
    
    // Strategy 1: Direct Web3 browser with app URL
    const deepLink = `bnc://app.binance.com/cedefi/wc?uri=${encodedUri}&redirect=${encodedAppUrl}`;
    
    // Strategy 2: Universal link for iOS
    const universalLink = `https://app.binance.com/en/web3-wallet/wc?uri=${encodedUri}`;
    
    // Strategy 3: Android intent
    const intentLink = `intent://cedefi/wc?uri=${encodedUri}#Intent;scheme=bnc;package=com.binance.dev;S.browser_fallback_url=${encodeURIComponent('https://www.binance.com/en/download')};end`;
    
    if (isIOS()) {
      addDebug('🍎 iOS: Using universal link');
      window.location.href = universalLink;
      
      setTimeout(() => {
        window.location.href = deepLink;
      }, 500);
    } else if (isAndroid()) {
      addDebug('🤖 Android: Using intent and deep link');
      window.location.href = intentLink;
      
      setTimeout(() => {
        window.location.href = deepLink;
      }, 500);
    } else {
      addDebug('📱 Generic mobile: Using deep link');
      window.location.href = deepLink;
    }
  };

  // ============================================================================
  // SUCCESSFUL CONNECTION HANDLER
  // ============================================================================
  
  const handleSuccessfulConnection = async (address, provider) => {
    addDebug(`✅ Wallet connected: ${address}`);
    setWalletAddress(address);
    setConnecting(false);
    setConnectionStatus('');
    
    // Fetch balance
    await fetchSolanaBalance(address);
    
    // Call the post-connection function
    await onWalletConnected(address, provider);
  };

  // ============================================================================
  // POST-CONNECTION FUNCTION (EMPTY - READY FOR YOUR LOGIC)
  // ============================================================================
  
  const onWalletConnected = async (walletAddress, providerType) => {
    addDebug('🎉 onWalletConnected() called');
    addDebug(`   Address: ${walletAddress}`);
    addDebug(`   Provider: ${providerType}`);
    addDebug(`   Balance: ${tokenBalance} SOL`);
    
    // ========================================================================
    // TODO: ADD YOUR POST-CONNECTION LOGIC HERE
    // ========================================================================
    // Examples:
    // - Send transaction
    // - Sign message
    // - Update backend with wallet address
    // - Claim rewards
    // - Load user data
    // ========================================================================
    
    console.log('🎯 Wallet successfully connected!', {
      address: walletAddress,
      provider: providerType,
      balance: tokenBalance
    });
  };

  // ============================================================================
  // MAIN WALLET CONNECTION FUNCTIONS
  // ============================================================================
  
  const connectBinanceWallet = async () => {
    setShowModal(false);
    
    if (!isMobileDevice) {
      alert('📱 Mobile Required\n\nBinance Web3 Wallet requires a mobile device.\n\nPlease open this page on your smartphone.');
      return;
    }

    setConnecting(true);
    setConnectionStatus('Initializing Binance Web3 Wallet connection...');
    setDebugInfo([]);

    try {
      addDebug('🚀 Starting Binance Web3 Wallet connection');
      addDebug(`Platform: ${isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Unknown'}`);
      addDebug(`Project ID: ${WC_PROJECT_ID}`);
      
      // Check if we're already inside Binance Web3 browser
      if (window.solana) {
        addDebug('✅ Already inside Binance Web3 browser!');
        setConnectionStatus('Detected Binance Web3 browser. Connecting...');
        
        try {
          const response = await window.solana.connect();
          await handleSuccessfulConnection(response.publicKey.toString(), 'binance-web3');
          return;
        } catch (solanaError) {
          addDebug(`⚠️ Solana connection error: ${solanaError.message}`);
        }
      }
      
      setConnectionStatus('Generating WalletConnect session...');
      
      // Initialize WalletConnect (may return null if SDK unavailable)
      await initializeWalletConnect();
      
      // Create session and get URI (will fallback to manual generation)
      const { uri, approval } = await createWalletConnectSession();
      
      setConnectionStatus('Opening Binance Web3 Wallet...\n\nPlease approve the connection in your Binance app.');
      
      // Open Binance Web3 with WalletConnect URI
      openBinanceWeb3WithWalletConnect(uri);
      
      addDebug('⏳ Waiting for user approval or app reload...');
      
      // If we have an approval promise, wait for it
      if (approval) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 120000) // 2 minutes
        );
        
        try {
          const session = await Promise.race([approval(), timeoutPromise]);
          
          sessionRef.current = session;
          
          addDebug('✅ Session approved via WalletConnect!');
          
          // Extract wallet address from session
          const accounts = session.namespaces.solana?.accounts || [];
          if (accounts.length > 0) {
            const address = accounts[0].split(':').pop();
            await handleSuccessfulConnection(address, 'walletconnect');
          } else {
            throw new Error('No accounts found in session');
          }
          
        } catch (approvalError) {
          if (approvalError.message === 'Connection timeout') {
            addDebug('⚠️ Approval timeout - user may need to complete in app');
          } else {
            addDebug(`⚠️ Approval error: ${approvalError.message}`);
          }
          // Don't throw - user might complete connection in reopened app
          setConnectionStatus('Waiting for connection in Binance app...\n\nThe app should reload automatically when connected.');
        }
      } else {
        // No approval promise - using direct method
        addDebug('📱 Using direct deep link - app will reload on connection');
        setConnectionStatus('Binance Web3 Wallet should open now.\n\nAfter approving, the app will reload automatically.\n\nIf nothing happens, ensure Binance app is installed and updated.');
      }
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      
      addDebug(`❌ Error: ${error.message}`);
      console.error('Connection error:', error);
      
      alert(`❌ Connection Failed\n\n${error.message}\n\nPlease ensure:\n• Binance app is installed and updated\n• You're using the latest version\n• Try again`);
    }
  };

  const connectPhantomWallet = async () => {
    setShowModal(false);
    setConnecting(true);
    setConnectionStatus('Connecting to Phantom...');
    setDebugInfo([]);

    try {
      addDebug('👻 Starting Phantom connection');
      
      if (!window.solana?.isPhantom) {
        setConnecting(false);
        setConnectionStatus('');
        
        const installUrl = isMobileDevice 
          ? 'https://phantom.app/download' 
          : 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa';
        
        if (window.confirm('👻 Phantom Not Found\n\nPhantom wallet is not installed.\n\nInstall now?')) {
          window.open(installUrl, '_blank');
        }
        return;
      }

      const response = await window.solana.connect();
      const publicKey = response.publicKey.toString();
      
      await handleSuccessfulConnection(publicKey, 'phantom');
      
      alert(`✅ Connected to Phantom!\n\nAddress: ${publicKey.slice(0, 8)}...${publicKey.slice(-6)}`);
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      
      addDebug(`❌ Error: ${error.message}`);
      
      if (error.code === 4001) {
        alert('❌ Connection Rejected\n\nYou rejected the connection.');
      } else if (error.code === -32002) {
        alert('⚠️ Pending Request\n\nCheck Phantom for pending request.');
      } else {
        alert(`❌ Connection Error\n\n${error.message || 'Unknown error'}`);
      }
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.solana?.isPhantom) {
        await window.solana.disconnect();
      }
      
      if (sessionRef.current && wcClientRef.current) {
        await wcClientRef.current.disconnect({
          topic: sessionRef.current.topic,
          reason: { code: 6000, message: 'User disconnected' }
        });
      }
      
      setWalletAddress(null);
      setTokenBalance(null);
      sessionRef.current = null;
      
      addDebug('✅ Wallet disconnected');
      alert('✅ Wallet Disconnected');
    } catch (error) {
      addDebug(`⚠️ Disconnect error: ${error.message}`);
      setWalletAddress(null);
      setTokenBalance(null);
    }
  };

  const copyDebugInfo = () => {
    const text = debugInfo.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('📋 Debug info copied!');
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (!isMobileDevice && !loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📱</div>
          <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#1f2937' }}>
            Mobile Device Required
          </h1>
          <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '24px' }}>
            This application is designed for mobile devices. Please open this page on your smartphone to connect your Binance Web3 Wallet.
          </p>
          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#374151',
            marginBottom: '20px'
          }}>
            <strong>Current URL:</strong><br/>
            <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{APP_URL}</code>
          </div>
          <div style={{
            background: '#fef3c7',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#92400e'
          }}>
            💡 Scan QR code or open this URL on mobile
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      
      <style>{`
        @keyframes gradientShift {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          from, to { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(45deg, rgba(255,0,150,0.3), rgba(0,204,255,0.3))',
        animation: 'gradientShift 10s ease infinite',
        zIndex: 1
      }} />

      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '50%',
            left: `${p.left}%`,
            animation: `float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            zIndex: 2
          }}
        />
      ))}

      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 10
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>
            LOADING...
          </div>
        </div>
      )}

      {!loading && (
        <div style={{
          position: 'relative',
          zIndex: 3,
          maxWidth: '500px',
          margin: '0 auto',
          padding: '40px 20px',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          
          <div style={{
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
            letterSpacing: '1px'
          }}>
            ✨ REFERRAL REWARDS
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '24px',
            padding: '40px 30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.5)',
            animation: 'slideUp 0.6s ease-out'
          }}>
            
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '20px',
              minHeight: '40px'
            }}>
              {typewriterText}
              <span style={{ 
                animation: 'blink 1s step-end infinite',
                WebkitTextFillColor: '#667eea'
              }}>|</span>
            </h1>

            <p style={{
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '30px'
            }}>
              Thank you for your cooperation! Connect your wallet and take your payout.
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '30px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '30px',
              boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)'
            }}>
              <div style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '14px',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Your Reward
              </div>
              <div style={{
                color: 'white',
                fontSize: '48px',
                fontWeight: 'bold',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>
                5.50 SOL
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                marginTop: '8px'
              }}>
                ≈ ${(5.50 * 150).toFixed(2)} USD
              </div>
              {tokenBalance !== null && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'white'
                }}>
                  💰 Current Balance: {tokenBalance.toFixed(4)} SOL
                </div>
              )}
            </div>

            {walletAddress && (
              <div style={{
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
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#065f46', 
                    marginBottom: '4px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    ✓ Connected Wallet
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    color: '#047857',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {walletAddress.slice(0, 12)}...{walletAddress.slice(-12)}
                  </div>
                </div>
                <button
                  onClick={disconnectWallet}
                  style={{
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
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                  onMouseOut={(e) => e.target.style.background = '#dc2626'}
                >
                  Disconnect
                </button>
              </div>
            )}

            {connecting && connectionStatus && (
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #fbbf24',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                color: '#92400e',
                fontSize: '13px',
                fontWeight: '600',
                lineHeight: '1.6',
                whiteSpace: 'pre-line',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)',
                animation: 'slideUp 0.3s ease-out'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '3px solid #92400e',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    flexShrink: 0,
                    marginTop: '2px'
                  }} />
                  <div style={{ flex: 1 }}>{connectionStatus}</div>
                </div>
              </div>
            )}

            {debugInfo.length > 0 && (
              <div style={{
                background: '#f3f4f6',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '20px',
                maxHeight: '180px',
                overflowY: 'auto',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#374151'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  position: 'sticky',
                  top: 0,
                  background: '#f3f4f6',
                  paddingBottom: '4px'
                }}>
                  <strong style={{ fontSize: '11px' }}>🔍 Debug Log:</strong>
                  <button
                    onClick={copyDebugInfo}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#4b5563'}
                    onMouseOut={(e) => e.target.style.background = '#6b7280'}
                  >
                    Copy
                  </button>
                </div>
                {debugInfo.map((info, i) => (
                  <div key={i} style={{ 
                    padding: '3px 0', 
                    borderBottom: i < debugInfo.length - 1 ? '1px solid #e5e7eb' : 'none',
                    fontSize: '9px',
                    lineHeight: '1.4'
                  }}>
                    {info}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowModal(true)}
              disabled={connecting || walletAddress}
              style={{
                width: '100%',
                background: walletAddress 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : connecting
                  ? '#9ca3af'
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
              }}
              onMouseOver={(e) => {
                if (!connecting && !walletAddress) {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.boxShadow = '0 12px 28px rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseOut={(e) => {
                if (!connecting && !walletAddress) {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
            >
              {connecting ? '⏳ Connecting...' : walletAddress ? '✅ Wallet Connected' : '🚀 Connect Wallet'}
            </button>

            {!walletAddress && !connecting && (
              <p style={{
                marginTop: '16px',
                fontSize: '12px',
                color: '#9ca3af',
                textAlign: 'center'
              }}>
                Secured connection • By connecting, you agree to our Terms
              </p>
            )}
          </div>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '12px'
          }}>
            <p>🔒 Powered by WalletConnect v2</p>
            <p style={{ marginTop: '4px', opacity: 0.7 }}>
              📱 {isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Mobile'} • Project ID: {WC_PROJECT_ID.substring(0, 8)}...
            </p>
          </div>
        </div>
      )}

      {showModal && (
        <div
          onClick={() => !connecting && setShowModal(false)}
          style={{
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
            animation: 'fadeIn 0.2s'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '30px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: 0
              }}>
                Select Wallet
              </h2>
              <button
                onClick={() => setShowModal(false)}
                disabled={connecting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  color: '#9ca3af',
                  cursor: connecting ? 'not-allowed' : 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!connecting) {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.color = '#1f2937';
                  }
                }}
                onMouseOut={(e) => {
                  if (!connecting) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#9ca3af';
                  }
                }}
              >
                ×
              </button>
            </div>

            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Choose your preferred wallet to connect and take your reward
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={connectBinanceWallet}
                disabled={connecting}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #f0b90b 0%, #f8d12f 100%)',
                  color: '#1e1e1e',
                  border: 'none',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: connecting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(240, 185, 11, 0.3)',
                  opacity: connecting ? 0.6 : 1
                }}
                onMouseOver={(e) => {
                  if (!connecting) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(240, 185, 11, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!connecting) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(240, 185, 11, 0.3)';
                  }
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'white',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  🟡
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Binance Web3 Wallet</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                    WalletConnect v2 • {isMobileDevice ? 'Mobile App' : 'Desktop'}
                  </div>
                </div>
              </button>

              <button
                onClick={connectPhantomWallet}
                disabled={connecting}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #ab9ff2 0%, #9281f5 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: connecting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(171, 159, 242, 0.3)',
                  opacity: connecting ? 0.6 : 1
                }}
                onMouseOver={(e) => {
                  if (!connecting) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(171, 159, 242, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!connecting) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(171, 159, 242, 0.3)';
                  }
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'white',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  👻
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Phantom Wallet</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Solana • Browser Extension
                  </div>
                </div>
              </button>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                🔐 Safe & Secure
              </div>
              <div>
                We never store your private keys. Your wallet credentials remain secure and under your control at all times.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}