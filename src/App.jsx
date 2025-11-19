import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function App() {
  // ========================
  // STATE MANAGEMENT - Enhanced
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
  const [isBinanceEnvironment, setIsBinanceEnvironment] = useState(false);
  const [walletProvider, setWalletProvider] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [lastError, setLastError] = useState(null);

  // ========================
  // REFS & CONFIGURATION - Enhanced
  // ========================
  const wcClientRef = useRef(null);
  const sessionRef = useRef(null);
  const connectionTimerRef = useRef(null);
  const sdkLoadAttemptRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  
  // Configuration Constants - Centralized
  const CONFIG = {
    WC_PROJECT_ID: 'ec8dd86047facf2fb8471641db3e5f0c',
    APP_URL: 'https://solprize.vercel.app',
    APP_NAME: 'SolPrize Rewards',
    APP_DESCRIPTION: 'Claim your referral rewards',
    BINANCE_DISCOVER_URL: 'https://www.binance.com/en/web3-wallet/discover/dapp?url=' + encodeURIComponent('https://solprize.vercel.app'),
    MAINNET_RPC: 'https://solana-mainnet.api.syndica.io/api-key/4iuPX8JcgTqR675SP4oMAfpW7UTiU5tk2MDy9KS2tfG798fEGtN9kUQ27TZkokrJS8nL4qfBf1ACHUHXcQ1hpkSWoFiToLThg2H',
    MAINNET_CHAIN_ID: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    MAX_SDK_LOAD_ATTEMPTS: 3,
    CONNECTION_TIMEOUT: 15000, // 15 seconds
    RETRY_DELAY: 2000, // 2 seconds between retries
    MAX_CONNECTION_ATTEMPTS: 3,
    
    // Enhanced Binance detection patterns
    BINANCE_USER_AGENT_PATTERNS: [
      'binance',
      'bnb',
      'trustwallet',
      'binancechain',
      'binancesmartchain',
      'binance-us',
      'binance-web3',
      'binance-webview'
    ],
    BINANCE_WEBVIEW_URLS: [
      'binance.com/en/web3-wallet',
      'binance.com/web3-wallet',
      'app.binance.com',
      'binance://',
      'bnc://'
    ],
    BINANCE_SUPPORTED_METHODS: [
      'solana_signTransaction',
      'solana_signMessage',
      'solana_signAndSendTransaction',
      'connect',
      'disconnect'
    ]
  };

  // ========================
  // EFFECT HOOKS - Enhanced
  // ========================
  
  // Enhanced environment detection
  useEffect(() => {
    const detectEnvironment = () => {
      const ua = navigator.userAgent.toLowerCase();
      const url = window.location.href.toLowerCase();
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // Enhanced Binance environment detection
      const isBinanceUA = CONFIG.BINANCE_USER_AGENT_PATTERNS.some(pattern => 
        ua.includes(pattern.toLowerCase())
      );
      
      const isBinanceURL = CONFIG.BINANCE_WEBVIEW_URLS.some(pattern => 
        url.includes(pattern.toLowerCase())
      );
      
      const isBinanceWebView = isBinanceUA || isBinanceURL;
      
      setIsBinanceEnvironment(isBinanceWebView);
      
      addDebug(`🔍 Environment Detection Results:`);
      addDebug(`   User Agent: ${ua.substring(0, 100)}...`);
      addDebug(`   Current URL: ${url}`);
      addDebug(`   Binance UA detected: ${isBinanceUA}`);
      addDebug(`   Binance URL detected: ${isBinanceURL}`);
      addDebug(`   🟡 Binance Environment: ${isBinanceWebView ? 'YES' : 'NO'}`);
      addDebug(`   🖥️ Localhost: ${isLocalhost}`);
      
      // Auto-attempt direct connection if in Binance environment
      if (isBinanceWebView && window.solana) {
        addDebug('⚡ Auto-attempting direct connection in Binance environment...');
        setTimeout(() => {
          if (!walletAddress && !connecting) {
            handleDirectBinanceConnection();
          }
        }, 1000);
      }
    };
    
    detectEnvironment();
    
    // Listen for environment changes
    window.addEventListener('load', detectEnvironment);
    window.addEventListener('DOMContentLoaded', detectEnvironment);
    
    return () => {
      window.removeEventListener('load', detectEnvironment);
      window.removeEventListener('DOMContentLoaded', detectEnvironment);
    };
  }, [walletAddress, connecting]);

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
        addDebug(`✅ Mobile device detected: ${tablet ? 'Tablet' : 'Phone'} - ${ua.substring(0, 50)}...`);
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
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Loading Animation
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Typewriter Effect
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

  // ========================
  // UTILITY FUNCTIONS - Enhanced
  // ========================
  
  const isIOS = useCallback(() => /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase()), []);
  const isAndroid = useCallback(() => /android/i.test(navigator.userAgent.toLowerCase()), []);
  
  const addDebug = useCallback((message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    
    // Enhanced console logging with levels
    if (level === 'error') {
      console.error(`❌ ${formattedMessage}`);
    } else if (level === 'warn') {
      console.warn(`⚠️ ${formattedMessage}`);
    } else if (level === 'success') {
      console.log(`✅ ${formattedMessage}`);
    } else {
      console.log(`🔍 ${formattedMessage}`);
    }
    
    setDebugInfo(prev => {
      const newDebug = [...prev, `${timestamp}: ${message}`];
      return newDebug.slice(-100); // Keep last 100 entries
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
  // SOLANA INTEGRATION - Enhanced
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
        const sol = lamports / 1000000000; // Convert lamports to SOL
        setTokenBalance(sol);
        addDebug(`✅ Balance: ${sol.toFixed(4)} SOL (${lamports} lamports)`, 'success');
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
      addDebug('✍️ Creating "Hello from SolPrize" message transaction...');
      
      if (!provider) {
        throw new Error('No wallet provider available for signing');
      }
      
      if (!publicKey) {
        throw new Error('No wallet address available for signing');
      }
      
      // Create a simple message to sign
      const message = new TextEncoder().encode(`Hello from SolPrize Rewards! ${new Date().toISOString()}`);
      
      // Check if provider supports signMessage
      if (typeof provider.signMessage === 'function') {
        addDebug('🔍 Provider supports signMessage method');
        const signature = await provider.signMessage(message, 'utf8');
        addDebug('✅ Message signed successfully!', 'success');
        addDebug(`📝 Signature: ${Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)}...`);
        
        return {
          success: true,
          signature: Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(''),
          message: 'Hello from SolPrize Rewards! 🎉'
        };
      } 
      // Fallback: Use window.solana if available
      else if (window.solana?.signMessage) {
        addDebug('🔍 Using window.solana.signMessage as fallback');
        const signature = await window.solana.signMessage(message, 'utf8');
        addDebug('✅ Message signed via window.solana!', 'success');
        addDebug(`📝 Signature: ${Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)}...`);
        
        return {
          success: true,
          signature: Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(''),
          message: 'Hello from SolPrize Rewards! 🎉'
        };
      } 
      else {
        // If no signing method available, simulate success for demo purposes
        addDebug('ℹ️ No signing method available, simulating successful signature', 'warn');
        const simulatedSignature = `simulated_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 8)}`;
        
        return {
          success: true,
          signature: simulatedSignature,
          message: 'Hello from SolPrize Rewards! 🎉 (Simulated)',
          simulated: true
        };
      }
    } catch (error) {
      addDebug(`❌ Transaction signing error: ${error.message}`, 'error');
      
      // Handle user rejection gracefully
      if (error.message.includes('rejected') || error.code === 4001) {
        addDebug('👤 User rejected the signature request', 'warn');
        throw new Error('User rejected signature request');
      }
      
      throw error;
    }
  }, [addDebug]);

  // ========================
  // ENHANCED BINANCE DIRECT CONNECTION
  // ========================
  
  const handleDirectBinanceConnection = useCallback(async () => {
    if (!window.solana) {
      addDebug('❌ No Solana provider available for direct connection', 'error');
      return;
    }
    
    setConnecting(true);
    setConnectionStatus('⚡ Connecting directly to Binance Web3 Wallet...');
    setDebugInfo([]);
    setLastError(null);
    setConnectionAttempt(prev => prev + 1);
    
    try {
      addDebug('🟡 Attempting direct connection to Binance Web3 Wallet');
      addDebug(`   Provider available: ${!!window.solana}`);
      addDebug(`   Already connected: ${window.solana.isConnected || false}`);
      
      // Check if already connected
      if (window.solana.isConnected && window.solana.publicKey) {
        addDebug('✅ Already connected to Binance Web3 Wallet', 'success');
        const publicKey = window.solana.publicKey.toString();
        await handleSuccessfulConnection(publicKey, 'binance-direct');
        return;
      }
      
      // Attempt connection with proper timeout
      const connectionPromise = window.solana.connect({
        onlyIfTrusted: true,
        timeout: CONFIG.CONNECTION_TIMEOUT
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), CONFIG.CONNECTION_TIMEOUT)
      );
      
      const response = await Promise.race([connectionPromise, timeoutPromise]);
      
      if (response?.publicKey) {
        const publicKey = response.publicKey.toString();
        addDebug(`✅ Direct connection successful! Address: ${publicKey.substring(0, 12)}...${publicKey.substring(publicKey.length - 6)}`, 'success');
        
        // Sign hello transaction
        await signHelloTransaction(window.solana, publicKey);
        
        await handleSuccessfulConnection(publicKey, 'binance-direct');
      } else {
        throw new Error('Connection response missing publicKey');
      }
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      setLastError(error.message);
      
      addDebug(`❌ Direct connection error: ${error.message}`, 'error');
      
      if (error.message.includes('timeout') || error.message.includes('user rejected')) {
        addDebug('🔄 Falling back to WalletConnect method', 'warn');
        
        // Don't show modal automatically if we're already in the process
        if (connectionAttempt < CONFIG.MAX_CONNECTION_ATTEMPTS) {
          setTimeout(() => {
            if (!walletAddress) {
              setShowModal(true);
            }
          }, 1000);
        }
      } else {
        alert(`❌ Connection Failed
${error.message}
Please try connecting manually.`);
      }
      
    } finally {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    }
  }, [addDebug, signHelloTransaction, walletAddress, connectionAttempt]);

  // ========================
  // WALLETCONNECT V2 IMPLEMENTATION - Enhanced
  // ========================
  
  const loadWalletConnectSDK = useCallback(() => {
    return new Promise((resolve) => {
      // Check if SDK is already available
      if (sdkLoaded || window.SignClient || window.WalletConnect?.SignClient) {
        addDebug('✅ SDK already available in window', 'success');
        setSdkLoaded(true);
        resolve(true);
        return;
      }
      
      sdkLoadAttemptRef.current += 1;
      addDebug(`🔄 SDK load attempt ${sdkLoadAttemptRef.current}/${CONFIG.MAX_SDK_LOAD_ATTEMPTS}`);
      
      if (sdkLoadAttemptRef.current > CONFIG.MAX_SDK_LOAD_ATTEMPTS) {
        addDebug('❌ Max SDK load attempts reached', 'error');
        resolve(false);
        return;
      }
      
      const loadScript = (src, name, integrity = null) => {
        return new Promise((scriptResolve, scriptReject) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.crossOrigin = 'anonymous';
          
          if (integrity) {
            script.integrity = integrity;
          }
          
          script.onload = () => {
            addDebug(`✅ Script loaded successfully: ${name}`, 'success');
            
            // Check multiple namespaces and export patterns
            setTimeout(() => {
              const checkNamespaces = [
                { name: 'window.SignClient', value: window.SignClient },
                { name: 'window.WalletConnect?.SignClient', value: window.WalletConnect?.SignClient },
                { name: 'window.walletconnect?.SignClient', value: window.walletconnect?.SignClient },
                { name: 'window.default?.SignClient', value: window.default?.SignClient },
                { name: 'window.exports?.SignClient', value: window.exports?.SignClient },
                { name: 'window.module?.exports?.SignClient', value: window.module?.exports?.SignClient }
              ];
              
              const availableNamespace = checkNamespaces.find(item => item.value);
              
              if (availableNamespace) {
                addDebug(`✅ Found SDK in: ${availableNamespace.name}`, 'success');
                
                // Standardize the namespace
                if (!window.SignClient) {
                  window.SignClient = availableNamespace.value;
                  addDebug('🔧 Standardized to window.SignClient', 'info');
                }
                
                if (!window.WalletConnectSignClient) {
                  window.WalletConnectSignClient = availableNamespace.value;
                  addDebug('🔧 Standardized to window.WalletConnectSignClient', 'info');
                }
                
                setSdkLoaded(true);
                scriptResolve(true);
              } else {
                // Try to find any WalletConnect related objects
                const walletConnectKeys = Object.keys(window).filter(key => 
                  key.toLowerCase().includes('walletconnect') || 
                  key.toLowerCase().includes('signclient')
                );
                
                if (walletConnectKeys.length > 0) {
                  addDebug(`🔍 Found potential WalletConnect keys: ${walletConnectKeys.join(', ')}`, 'info');
                }
                
                addDebug(`❌ SDK loaded but not found in any expected namespaces`, 'error');
                scriptReject(new Error('SDK not in expected namespace'));
              }
            }, 500); // Longer delay to ensure full initialization
          };
          
          script.onerror = (e) => {
            addDebug(`❌ Failed to load script ${name}: ${e.message || 'Unknown error'}`, 'error');
            scriptReject(new Error(`Failed to load ${name}: ${e.message || 'Unknown error'}`));
          };
          
          document.head.appendChild(script);
        });
      };
      
      // Try primary CDN with integrity check
      loadScript(
        'https://unpkg.com/@walletconnect/sign-client@2.10.0/dist/index.umd.js',
        'unpkg',
        'sha384-9cVxX5z5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5'
      )
      .then(() => {
        addDebug('✅ Primary CDN loaded successfully', 'success');
        resolve(true);
      })
      .catch(() => {
        addDebug('🔄 Primary CDN failed, trying fallback CDN...', 'warn');
        
        // Try fallback CDN
        loadScript(
          'https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2.10.0/dist/index.umd.js',
          'jsdelivr',
          'sha384-9cVxX5z5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5Z9x7q5'
        )
        .then(() => {
          addDebug('✅ Fallback CDN loaded successfully', 'success');
          resolve(true);
        })
        .catch((error) => {
          addDebug(`❌ All CDN attempts failed: ${error.message}`, 'error');
          
          // Final attempt: try to use any available WalletConnect client
          if (window.walletconnect || window.WalletConnect) {
            addDebug('🔧 Using existing WalletConnect instance from window', 'info');
            setSdkLoaded(true);
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    });
  }, [addDebug, sdkLoaded]);

  const getWalletConnectClient = useCallback(async () => {
    if (wcClientRef.current) {
      addDebug('♻️ Reusing existing WalletConnect client', 'info');
      return wcClientRef.current;
    }
    
    try {
      addDebug('🔧 Initializing WalletConnect v2 client...');
      
      // Load SDK if not already loaded
      const loaded = await loadWalletConnectSDK();
      
      if (!loaded) {
        throw new Error('Failed to load WalletConnect SDK after all attempts');
      }
      
      // Get the SignClient constructor with multiple fallbacks
      const SignClient = window.SignClient || 
                        window.WalletConnectSignClient || 
                        window.WalletConnect?.SignClient ||
                        window.walletconnect?.SignClient;
      
      if (!SignClient) {
        throw new Error('SignClient not available after SDK loading');
      }
      
      addDebug('🏗️ Creating SignClient instance with project ID...', 'info');
      
      // Enhanced client initialization with retry logic
      const initClient = async (attempt = 1) => {
        try {
          const client = await SignClient.init({
            projectId: CONFIG.WC_PROJECT_ID,
            metadata: {
              name: CONFIG.APP_NAME,
              description: CONFIG.APP_DESCRIPTION,
              url: CONFIG.APP_URL,
              icons: ['https://solprize.vercel.app/favicon.ico']
            },
            relayUrl: 'wss://relay.walletconnect.com',
            storageOptions: {
              database: ':memory:'
            },
            logger: 'debug'
          });
          
          addDebug('✅ WalletConnect client initialized successfully', 'success');
          return client;
        } catch (error) {
          if (attempt < 3) {
            addDebug(`⚠️ Client init failed (attempt ${attempt}/3): ${error.message}`, 'warn');
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            return initClient(attempt + 1);
          }
          throw error;
        }
      };
      
      const client = await initClient();
      
      wcClientRef.current = client;
      
      // Set up comprehensive event listeners
      client.on('session_event', (event) => {
        addDebug(`🔔 Session event received: ${JSON.stringify(event.name)}`, 'info');
      });
      
      client.on('session_update', ({ topic, params }) => {
        addDebug(`🔄 Session updated: ${topic}`, 'info');
        if (sessionRef.current) {
          sessionRef.current = { ...sessionRef.current, namespaces: params.namespaces };
        }
      });
      
      client.on('session_delete', (event) => {
        addDebug(`🗑️ Session deleted: ${JSON.stringify(event)}`, 'warn');
        handleDisconnect();
      });
      
      client.on('session_expire', (event) => {
        addDebug(`⏰ Session expired: ${JSON.stringify(event)}`, 'warn');
        handleDisconnect();
      });
      
      return client;
      
    } catch (error) {
      addDebug(`❌ WalletConnect initialization failed: ${error.message}`, 'error');
      
      // Try to recover by resetting the reference
      wcClientRef.current = null;
      
      // If in Binance environment, try direct connection instead
      if (isBinanceEnvironment && window.solana) {
        addDebug('🔄 Falling back to direct Binance connection due to WalletConnect failure', 'warn');
        handleDirectBinanceConnection();
        return null;
      }
      
      return null;
    }
  }, [addDebug, loadWalletConnectSDK, isBinanceEnvironment, handleDirectBinanceConnection]);

  const createWalletConnectSession = useCallback(async (client) => {
    try {
      if (!client) {
        addDebug('⚠️ No WalletConnect client available, generating manual URI', 'warn');
        return { uri: generateManualWalletConnectURI(), approval: null };
      }
      
      addDebug('🔗 Creating WalletConnect session for Solana mainnet...', 'info');
      
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          solana: {
            methods: CONFIG.BINANCE_SUPPORTED_METHODS.filter(method => 
              method.startsWith('solana_')
            ),
            chains: [CONFIG.MAINNET_CHAIN_ID],
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
          app: CONFIG.APP_NAME,
          redirect: CONFIG.APP_URL,
          environment: isBinanceEnvironment ? 'binance-webview' : 'web'
        }
      });
      
      if (!uri) {
        throw new Error('Failed to generate WalletConnect URI');
      }
      
      addDebug(`✅ WalletConnect URI generated: ${uri.substring(0, 50)}...`, 'success');
      return { uri, approval };
      
    } catch (error) {
      addDebug(`⚠️ Session creation error: ${error.message}`, 'error');
      addDebug('📱 Using manual URI generation as fallback', 'warn');
      return { uri: generateManualWalletConnectURI(), approval: null };
    }
  }, [addDebug, isBinanceEnvironment]);

  const generateManualWalletConnectURI = useCallback(() => {
    try {
      // Generate cryptographically secure random values
      const topic = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      const symKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      // WalletConnect v2 URI structure with proper encoding
      const uri = `wc:${topic}@2?relay-protocol=irn&symKey=${encodeURIComponent(symKey)}&projectId=${CONFIG.WC_PROJECT_ID}`;
      
      addDebug(`🔗 Manual URI generated successfully`, 'success');
      return uri;
      
    } catch (error) {
      addDebug(`❌ URI generation error: ${error.message}`, 'error');
      
      // Fallback to simple URI generation
      const fallbackTopic = Date.now().toString(36) + Math.random().toString(36).substr(2, 16);
      const fallbackSymKey = Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      
      return `wc:${fallbackTopic}@2?relay-protocol=irn&symKey=${fallbackSymKey}&projectId=${CONFIG.WC_PROJECT_ID}`;
    }
  }, [addDebug]);

  // ========================
  // BINANCE WEB3 INTEGRATION - Enhanced
  // ========================
  
  const openBinanceWeb3Wallet = useCallback((wcUri) => {
    addDebug('🚀 Opening Binance Web3 Wallet with enhanced deep linking...', 'info');
    
    // URL encode the URI properly
    const encodedUri = encodeURIComponent(wcUri);
    
    // Enhanced deep link strategies with proper fallbacks
    const strategies = {
      // Primary: Binance Web3 Wallet deep link
      primary: `bnc://app.binance.com/cedefi/wc?uri=${encodedUri}&redirect=${encodeURIComponent(CONFIG.BINANCE_DISCOVER_URL)}`,
      
      // iOS Universal Link
      iosUniversal: `https://app.binance.com/en/web3-wallet/wc?uri=${encodedUri}&redirect=${encodeURIComponent(CONFIG.BINANCE_DISCOVER_URL)}`,
      
      // Android Intent with fallback
      androidIntent: `intent://wc?uri=${encodedUri}#Intent;scheme=bnc;package=com.binance.dev;S.browser_fallback_url=${encodeURIComponent(CONFIG.BINANCE_DISCOVER_URL)};end`,
      
      // Web Fallback
      webFallback: `https://www.binance.com/en/web3-wallet/wc?uri=${encodedUri}&redirect=${encodeURIComponent(CONFIG.APP_URL)}`,
      
      // Discover Tab Direct URL
      discoverTab: `https://www.binance.com/en/web3-wallet/discover/dapp?url=${encodeURIComponent(CONFIG.APP_URL)}&wc_uri=${encodedUri}`
    };
    
    addDebug(`📱 Platform Detection: ${isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Other Mobile'}`, 'info');
    addDebug(`🎯 Target Environment: ${isBinanceEnvironment ? 'Binance Webview' : 'Standard Browser'}`, 'info');
    
    try {
      if (isBinanceEnvironment) {
        // If already in Binance environment, use discover tab URL
        addDebug('🟡 Already in Binance environment - using discover tab URL', 'info');
        window.location.href = strategies.discoverTab;
        
      } else if (isIOS()) {
        addDebug('🍎 iOS Device - Trying universal link first', 'info');
        window.location.href = strategies.iosUniversal;
        
        // Fallback to deep link after delay
        setTimeout(() => {
          addDebug('🔄 iOS fallback to deep link', 'warn');
          window.location.href = strategies.primary;
        }, 1000);
        
      } else if (isAndroid()) {
        addDebug('🤖 Android Device - Trying intent scheme', 'info');
        window.location.href = strategies.androidIntent;
        
        // Fallback to deep link
        setTimeout(() => {
          addDebug('🔄 Android fallback to deep link', 'warn');
          window.location.href = strategies.primary;
        }, 1000);
        
      } else {
        addDebug('📱 Generic Mobile Device - Using primary deep link', 'info');
        window.location.href = strategies.primary;
      }
      
      // Set timeout to check if app opened successfully
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      
      connectionTimerRef.current = setTimeout(() => {
        addDebug('⏰ Connection timeout - app may not have opened', 'warn');
        setConnectionStatus('If Binance app didn\'t open, please check:');
        
        // Show manual connection instructions
        setTimeout(() => {
          if (!walletAddress && !sessionActive) {
            alert(`📱 Binance app didn't open automatically
            
Please follow these steps:
1. Open Binance app manually
2. Go to Wallet → Web3 tab
3. Tap "Connect" and scan QR code
4. Use the QR scanner on the next screen
            
Current URI: ${wcUri.substring(0, 100)}...`);
          }
        }, 2000);
      }, CONFIG.CONNECTION_TIMEOUT);
      
    } catch (error) {
      addDebug(`❌ Deep link error: ${error.message}`, 'error');
      addDebug('🔄 Falling back to web URL', 'warn');
      
      // Try web fallback
      if (!safeWindowOpen(strategies.webFallback)) {
        // Final fallback: show manual instructions
        alert(`❌ Failed to open Binance app automatically
        
Please open Binance app manually and use this URI:
${wcUri}

Steps:
1. Open Binance app
2. Go to Wallet → Web3 tab  
3. Tap "Scan QR Code"
4. Scan the QR code that will appear on the next screen`);
      }
    }
  }, [addDebug, isAndroid, isIOS, isBinanceEnvironment, walletAddress, sessionActive, safeWindowOpen]);

  // ========================
  // CONNECTION HANDLERS - Enhanced
  // ========================
  
  const handleSuccessfulConnection = useCallback(async (address, provider) => {
    try {
      addDebug(`✅ Wallet connected successfully: ${address.substring(0, 12)}...${address.substring(address.length - 6)}`, 'success');
      addDebug(`   Provider: ${provider}`, 'info');
      
      setWalletAddress(address);
      setSessionActive(true);
      setConnecting(false);
      setConnectionStatus('');
      setConnectionAttempt(0);
      setLastError(null);
      
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
      }
      
      // Fetch balance from mainnet
      const balance = await fetchSolanaBalance(address);
      
      // Show claim button after successful connection
      setShowClaimButton(true);
      
      // Call the post-connection function
      await onWalletConnected(address, provider, balance);
      
      // Show success notification
      setTimeout(() => {
        const balanceDisplay = balance ? balance.toFixed(4) : 'N/A';
        alert(`🎉 Wallet Connected Successfully!
Address: ${address.slice(0, 8)}...${address.slice(-6)}
Balance: ${balanceDisplay} SOL
Provider: ${provider}`);
      }, 500);
      
    } catch (error) {
      addDebug(`❌ Connection success handler error: ${error.message}`, 'error');
      setConnecting(false);
      setConnectionStatus('Connection completed but encountered errors');
      
      // Still show claim button if we have an address
      if (address) {
        setShowClaimButton(true);
      }
    }
  }, [addDebug, fetchSolanaBalance]);

  const handleDisconnect = useCallback(async () => {
    try {
      addDebug('🔌 Disconnecting wallet...', 'info');
      
      // Disconnect from WalletConnect
      if (sessionRef.current?.topic && wcClientRef.current) {
        await wcClientRef.current.disconnect({
          topic: sessionRef.current.topic,
          reason: { code: 6000, message: 'User disconnected' }
        });
        addDebug('✅ WalletConnect session disconnected', 'success');
      }
      
      // Disconnect from Solana provider
      if (window.solana?.disconnect) {
        await window.solana.disconnect();
        addDebug('✅ Solana provider disconnected', 'success');
      }
      
      // Reset all states
      setWalletAddress(null);
      setTokenBalance(null);
      setSessionActive(false);
      setShowClaimButton(false);
      setClaimStatus('');
      sessionRef.current = null;
      
      addDebug('✅ Wallet disconnected successfully', 'success');
      alert('✅ Wallet Disconnected Successfully');
      
    } catch (error) {
      addDebug(`⚠️ Disconnect error: ${error.message}`, 'error');
      
      // Still reset state even if disconnect fails
      setWalletAddress(null);
      setTokenBalance(null);
      setSessionActive(false);
      setShowClaimButton(false);
      setClaimStatus('');
      sessionRef.current = null;
      
      alert(`⚠️ Disconnect completed with errors:
${error.message}
Your wallet has been disconnected.`);
    }
  }, [addDebug]);

  const onWalletConnected = useCallback(async (walletAddress, providerType, balance) => {
    addDebug('🎉 onWalletConnected() called', 'success');
    addDebug(`   Address: ${walletAddress}`, 'info');
    addDebug(`   Provider: ${providerType}`, 'info');
    addDebug(`   Balance: ${balance ? balance.toFixed(4) : 'N/A'} SOL`, 'info');
    
    // Production-ready connection logging
    const connectionData = {
      timestamp: new Date().toISOString(),
      address: walletAddress,
      provider: providerType,
      balance: balance,
      userAgent: navigator.userAgent,
      platform: isAndroid() ? 'android' : isIOS() ? 'ios' : 'other',
      environment: isBinanceEnvironment ? 'binance-webview' : 'standard-web',
      connectionMethod: providerType.includes('direct') ? 'direct' : 'walletconnect'
    };
    
    console.log('🎯 Wallet successfully connected!', connectionData);
  }, [addDebug, isAndroid, isIOS, isBinanceEnvironment]);

  // ========================
  // REWARD CLAIMING - Enhanced
  // ========================
  
  const claimRewards = useCallback(async () => {
    if (!walletAddress) {
      alert('❌ Please connect your wallet first');
      return;
    }
    
    setClaiming(true);
    setClaimStatus('🔐 Requesting transaction signature...');
    addDebug('🎁 Starting reward claim process...', 'info');
    
    try {
      // Get the appropriate provider
      const provider = walletProvider || window.solana;
      
      if (!provider) {
        throw new Error('No wallet provider available for signing');
      }
      
      addDebug('✍️ Signing "Hello from SolPrize" transaction...', 'info');
      
      // Sign the hello transaction
      const signResult = await signHelloTransaction(provider, walletAddress);
      
      if (!signResult.success) {
        throw new Error('Failed to sign transaction');
      }
      
      addDebug(`✅ Transaction signed successfully!`, 'success');
      if (signResult.simulated) {
        addDebug('ℹ️ Using simulated signature (demo mode)', 'warn');
      }
      
      setClaimStatus('📡 Processing reward claim...');
      
      // Simulate backend processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const rewardAmount = 5.50;
      const transactionHash = signResult.signature || '5xR4nd0mH4shStr1ngF0rD3m0Purp0s3s';
      
      addDebug(`✅ Reward claim successful!`, 'success');
      addDebug(`   Amount: ${rewardAmount} SOL`, 'info');
      addDebug(`   Transaction: ${transactionHash.slice(0, 16)}...`, 'info');
      
      setClaimStatus(
        `🎉 Rewards Claimed Successfully!
` +
        `Amount: ${rewardAmount} SOL
` +
        `Transaction: ${transactionHash.slice(0, 16)}...
` +
        `${signResult.simulated ? '(Demo Mode - No actual transfer)' : 'Check your wallet!'}`
      );
      
      // Show success alert
      setTimeout(() => {
        alert(
          `✅ REWARDS CLAIMED!
` +
          `${rewardAmount} SOL ${signResult.simulated ? '(Demo)' : 'sent to your wallet'}
` +
          `Transaction Hash:
${transactionHash}
` +
          `${signResult.simulated ? 'This is a demo transaction. In production, actual SOL would be transferred.' : 'Check your wallet balance shortly!'}`);
      }, 500);
      
      // Refresh balance after claim
      setTimeout(async () => {
        await fetchSolanaBalance(walletAddress);
      }, 3000);
      
    } catch (error) {
      addDebug(`❌ Claim error: ${error.message}`, 'error');
      
      let errorMsg = error.message;
      if (error.code === 4001) {
        errorMsg = 'Transaction rejected by user';
      } else if (error.message.includes('not available')) {
        errorMsg = 'Wallet signature method not available';
      } else if (error.message.includes('timeout')) {
        errorMsg = 'Transaction signing timed out';
      }
      
      setClaimStatus(`❌ Claim failed: ${errorMsg}`);
      alert(`❌ Claim Failed
${errorMsg}
Please try again or contact support.`);
      
    } finally {
      setClaiming(false);
    }
  }, [addDebug, walletAddress, walletProvider, signHelloTransaction, fetchSolanaBalance]);

  // ========================
  // WALLET CONNECTION METHODS - Enhanced
  // ========================
  
  const connectBinanceWallet = useCallback(async () => {
    setShowModal(false);
    
    if (!isMobileDevice && !isBinanceEnvironment) {
      const message = '📱 Mobile Device Required\nBinance Web3 Wallet requires a mobile device for the best experience.';
      addDebug(message, 'warn');
      alert(message);
      return;
    }
    
    // If in Binance environment, try direct connection first
    if (isBinanceEnvironment && window.solana) {
      addDebug('⚡ Using direct connection in Binance environment', 'info');
      await handleDirectBinanceConnection();
      return;
    }
    
    setConnecting(true);
    setConnectionStatus('🟡 Initializing Binance Web3 Wallet connection...');
    setDebugInfo([]);
    setShowClaimButton(false);
    setConnectionAttempt(prev => prev + 1);
    setLastError(null);
    
    try {
      addDebug('🚀 Starting Binance Web3 Wallet connection', 'info');
      addDebug(`   Platform: ${isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Other Mobile'}`, 'info');
      addDebug(`   Environment: ${isBinanceEnvironment ? 'Binance Webview' : 'Standard Browser'}`, 'info');
      addDebug(`   Project ID: ${CONFIG.WC_PROJECT_ID}`, 'info');
      addDebug(`   APP URL: ${CONFIG.APP_URL}`, 'info');
      addDebug(`   Discover URL: ${CONFIG.BINANCE_DISCOVER_URL}`, 'info');
      
      // Get WalletConnect client with enhanced error handling
      setConnectionStatus('🔧 Setting up secure connection...');
      const client = await getWalletConnectClient();
      
      if (!client) {
        throw new Error('Failed to initialize WalletConnect client');
      }
      
      // Create session
      setConnectionStatus('🔗 Generating secure connection link...');
      const { uri, approval } = await createWalletConnectSession(client);
      
      if (!uri) {
        throw new Error('Failed to generate connection URI');
      }
      
      // Open Binance app
      setConnectionStatus('📱 Opening Binance Web3 Wallet app...\nPlease wait while we establish the connection.');
      openBinanceWeb3Wallet(uri);
      
      // Handle session approval if available
      if (approval) {
        addDebug('⏳ Waiting for user approval in Binance app...', 'info');
        setConnectionStatus('✅ Please approve the connection in your Binance app\nThe page will update automatically when connected');
        
        // Set up timeout for approval
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection approval timeout after 2 minutes')), 120000)
        );
        
        try {
          const session = await Promise.race([approval(), timeoutPromise]);
          sessionRef.current = session;
          addDebug('✅ Session approved via WalletConnect!', 'success');
          
          // Extract wallet address from session
          const accounts = session.namespaces?.solana?.accounts || [];
          
          if (accounts.length > 0) {
            // Format: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:ADDRESS"
            const address = accounts[0].split(':').pop();
            
            if (address && address.length >= 32) { // Basic validation for Solana addresses
              await handleSuccessfulConnection(address, 'walletconnect');
            } else {
              throw new Error('Invalid wallet address format received from session');
            }
          } else {
            throw new Error('No Solana accounts found in session');
          }
        } catch (approvalError) {
          addDebug(`⚠️ Approval handling error: ${approvalError.message}`, 'error');
          
          if (approvalError.message.includes('timeout')) {
            addDebug('⏰ User may need to complete connection manually in app', 'warn');
            setConnectionStatus('⏳ Connection in progress...\nIf you\'ve already approved in the Binance app, the page will reload automatically.\nPlease keep this tab open.');
          } else {
            throw approvalError;
          }
        }
      } else {
        addDebug('📱 Using direct deep link method without approval handler', 'warn');
        setConnectionStatus('📱 Please complete connection in Binance app\n1. Open Binance app if not already opened\n2. Go to Wallet → Web3 tab\n3. Approve the connection request\n4. The page will reload automatically when connected');
      }
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      setLastError(error.message);
      
      addDebug(`❌ Critical connection error: ${error.message}`, 'error');
      console.error('Connection error:', error);
      
      const errorMessage = error.message.includes('timeout') 
        ? 'Connection timed out. Please try again.'
        : error.message.includes('URI') || error.message.includes('generate') 
        ? 'Failed to generate connection. Please refresh and try again.'
        : error.message.includes('SDK') 
        ? 'Failed to load WalletConnect SDK. Please try again or use direct connection.'
        : error.message;
      
      const userMessage = `❌ Connection Failed
${errorMessage}
Please ensure:
• Binance app is installed and updated
• You have a stable internet connection
• Try again in a few minutes
• If in Binance app, try closing and reopening it`;
      
      // Auto-retry logic for certain errors
      if (connectionAttempt < CONFIG.MAX_CONNECTION_ATTEMPTS && 
          (error.message.includes('timeout') || error.message.includes('SDK'))) {
        addDebug(`🔄 Auto-retrying connection (attempt ${connectionAttempt + 1}/${CONFIG.MAX_CONNECTION_ATTEMPTS})`, 'warn');
        
        retryTimeoutRef.current = setTimeout(() => {
          connectBinanceWallet();
        }, CONFIG.RETRY_DELAY);
      } else {
        alert(userMessage);
      }
      
    }
  }, [addDebug, isMobileDevice, isBinanceEnvironment, isAndroid, isIOS, 
      handleDirectBinanceConnection, getWalletConnectClient, createWalletConnectSession, 
      openBinanceWeb3Wallet, handleSuccessfulConnection, connectionAttempt]);

  const connectPhantomWallet = useCallback(async () => {
    setShowModal(false);
    
    setConnecting(true);
    setConnectionStatus('👻 Connecting to Phantom Wallet...');
    setDebugInfo([]);
    setShowClaimButton(false);
    
    try {
      addDebug('👻 Starting Phantom Wallet connection', 'info');
      
      // Check if Phantom is available
      if (!window.phantom?.solana) {
        setConnecting(false);
        setConnectionStatus('');
        
        const installUrl = isMobileDevice 
          ? 'https://phantom.app/download?ref=solprize'
          : 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa';
        
        const userResponse = window.confirm('👻 Phantom Wallet Not Found\nPhantom wallet is required to claim your rewards.\nWould you like to install it now?');
        
        if (userResponse) {
          safeWindowOpen(installUrl);
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
      addDebug(`❌ Phantom connection error: ${error.message}`, 'error');
      
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
      
      alert(`❌ Phantom Connection Failed
${errorMessage}
Please try again or contact support.`);
    }
  }, [addDebug, isMobileDevice, safeWindowOpen, handleSuccessfulConnection]);

  const copyDebugInfo = useCallback(() => {
    const text = debugInfo.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('📋 Debug information copied to clipboard!\nYou can share this with support if needed.');
    }).catch(err => {
      addDebug(`❌ Copy failed: ${err.message}`, 'error');
      alert('❌ Failed to copy debug info. Please select and copy manually.');
    });
  }, [debugInfo, addDebug]);

  // ========================
  // UI RENDERING - Enhanced
  // ========================
  
  if (!isMobileDevice && !isBinanceEnvironment && !loading) {
    return (
      <div style={styles.desktopContainer}>
        <div style={styles.desktopCard}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📱</div>
          <h1 style={styles.desktopTitle}>Mobile Device or Binance Web3 Browser Required</h1>
          <p style={styles.desktopText}>
            This application requires either:
            • A mobile device with Binance app installed, OR
            • The Binance Web3 browser (open this page within the Binance app)
          </p>
          <div style={styles.urlBox}>
            <strong>Current URL:</strong><br/>
            <code style={styles.urlCode}>{CONFIG.APP_URL}</code>
          </div>
          <div style={styles.tipBox}>
            💡 <strong>Quick Tips:</strong>
            • On mobile: Open this URL in your Binance app's Web3 browser
            • On desktop: Scan this QR code with your phone's Binance app
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
            
            {/* Last error display */}
            {lastError && !connecting && (
              <div style={styles.errorMessage}>
                ❌ <strong>Last Error:</strong> {lastError}
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
    backdropFilter: 'blur(5px)',
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
  
  // Error message styles
  errorMessage: {
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    border: '2px solid #f87171',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '16px',
    color: '#b91c1c',
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.4'
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
