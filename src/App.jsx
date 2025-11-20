import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Wallet, CheckCircle, XCircle, Loader2, Shield, ExternalLink } from 'lucide-react';

export default function SecureSolanaRewardsApp() {
  // State Management
  const [walletAddress, setWalletAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(null);
  const [rewardAmount] = useState(5.50);
  const [claimStatus, setClaimStatus] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [phantomInstalled, setPhantomInstalled] = useState(false);

  // Check for Phantom wallet on mount
  useEffect(() => {
    const checkPhantom = () => {
      const isInstalled = window.solana?.isPhantom || window.phantom?.solana;
      setPhantomInstalled(!!isInstalled);
    };
    
    checkPhantom();
    window.addEventListener('load', checkPhantom);
    
    return () => window.removeEventListener('load', checkPhantom);
  }, []);

  // Connect to Phantom wallet
  const connectWallet = useCallback(async () => {
    if (!phantomInstalled) {
      window.open('https://phantom.app/download', '_blank');
      return;
    }

    setConnecting(true);
    setClaimStatus(null);

    try {
      const provider = window.solana || window.phantom?.solana;
      
      if (!provider) {
        throw new Error('Phantom wallet not found');
      }

      const response = await provider.connect();
      const pubKey = response.publicKey.toString();
      
      setWalletAddress(pubKey);
      
      // Fetch balance (simulated - in production, use actual RPC call)
      setTimeout(() => {
        const mockBalance = (Math.random() * 10 + 1).toFixed(4);
        setBalance(parseFloat(mockBalance));
      }, 1000);

      setClaimStatus({
        type: 'success',
        message: 'Wallet connected successfully!'
      });

    } catch (error) {
      console.error('Connection error:', error);
      setClaimStatus({
        type: 'error',
        message: error.message || 'Failed to connect wallet'
      });
    } finally {
      setConnecting(false);
    }
  }, [phantomInstalled]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      const provider = window.solana || window.phantom?.solana;
      if (provider) {
        await provider.disconnect();
      }
      
      setWalletAddress(null);
      setBalance(null);
      setClaimStatus(null);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  // Claim rewards (simulated - replace with actual backend integration)
  const claimRewards = useCallback(async () => {
    if (!walletAddress) {
      setClaimStatus({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }

    setClaiming(true);
    setClaimStatus({
      type: 'info',
      message: 'Processing your reward claim...'
    });

    try {
      // Simulate API call to backend
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real app, you would:
      // 1. Verify user eligibility on backend
      // 2. Create a transaction on backend
      // 3. Send transaction to user's wallet for signing
      // 4. Process signed transaction
      // 5. Update user's balance

      setClaimStatus({
        type: 'success',
        message: `Successfully claimed ${rewardAmount} SOL! Check your wallet.`
      });

      // Update balance
      if (balance !== null) {
        setBalance(prev => prev + rewardAmount);
      }

    } catch (error) {
      console.error('Claim error:', error);
      setClaimStatus({
        type: 'error',
        message: 'Failed to claim rewards. Please try again.'
      });
    } finally {
      setClaiming(false);
    }
  }, [walletAddress, rewardAmount, balance]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Badge */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-semibold border border-white/30">
            <Shield className="w-4 h-4" />
            Secure Rewards Platform
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Title */}
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            SolPrize Rewards
          </h1>
          
          <p className="text-gray-600 text-center mb-6">
            Connect your Phantom wallet to claim your referral rewards
          </p>

          {/* Reward Display */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 mb-6 text-white text-center">
            <div className="text-sm opacity-90 mb-2">Your Reward</div>
            <div className="text-5xl font-bold mb-2">{rewardAmount} SOL</div>
            <div className="text-sm opacity-80">≈ ${(rewardAmount * 150).toFixed(2)} USD</div>
            
            {balance !== null && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="text-xs opacity-90 mb-1">Current Balance</div>
                <div className="text-2xl font-semibold">{balance.toFixed(4)} SOL</div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {claimStatus && (
            <div className={`rounded-xl p-4 mb-6 flex items-start gap-3 ${
              claimStatus.type === 'success' ? 'bg-green-50 border-2 border-green-200' :
              claimStatus.type === 'error' ? 'bg-red-50 border-2 border-red-200' :
              'bg-blue-50 border-2 border-blue-200'
            }`}>
              {claimStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
              {claimStatus.type === 'error' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
              {claimStatus.type === 'info' && <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />}
              <p className={`text-sm font-medium ${
                claimStatus.type === 'success' ? 'text-green-800' :
                claimStatus.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {claimStatus.message}
              </p>
            </div>
          )}

          {/* Connected Wallet Display */}
          {walletAddress && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-green-700 font-semibold mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Connected Wallet
                  </div>
                  <div className="text-sm font-mono text-green-900 truncate">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                  </div>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="ml-3 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!walletAddress ? (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : phantomInstalled ? (
                <>
                  <Wallet className="w-5 h-5" />
                  Connect Phantom Wallet
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  Install Phantom Wallet
                </>
              )}
            </button>
          ) : (
            <button
              onClick={claimRewards}
              disabled={claiming}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Claim {rewardAmount} SOL
                </>
              )}
            </button>
          )}

          {/* Security Notice */}
          <div className="mt-6 flex items-start gap-2 text-xs text-gray-500">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Secured connection. We will never ask for your private keys or seed phrase.
              Always verify transaction details before signing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white/80 text-sm">
          <p>🔒 Powered by Phantom • Solana Blockchain</p>
          <p className="mt-1 text-xs opacity-75">
            {phantomInstalled ? '✓ Phantom Detected' : '⚠ Phantom Not Detected'}
          </p>
        </div>

        {/* Warning Banner for Non-Phantom Environments */}
        {!phantomInstalled && (
          <div className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Phantom Wallet Required</p>
              <p>Please install the Phantom browser extension or mobile app to continue.</p>
              <a 
                href="https://phantom.app/download" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-purple-600 hover:text-purple-700 font-semibold"
              >
                Download Phantom
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
