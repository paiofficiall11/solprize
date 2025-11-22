/**
 * SolanaWallet - A vanilla JavaScript library for Solana blockchain interactions
 * Supports Phantom wallet connection, SOL transfers, balance queries, and more
 */

class SolanaWallet {
  constructor(config = {}) {
    this.config = {
      rpcEndpoint: config.rpcEndpoint || 'https://api.mainnet-beta.solana.com',
      commitment: config.commitment || 'confirmed',
      timeout: config.timeout || 30000,
      ...config
    };
    
    this.connection = null;
    this.wallet = null;
    this.publicKey = null;
    this.isConnected = false;
    
    // Constants
    this.LAMPORTS_PER_SOL = 1000000000;
  }

  // ============================================
  // CONNECTION METHODS
  // ============================================

  /**
   * Initialize RPC connection
   */
  async initConnection() {
    try {
      // Test the RPC endpoint
      const response = await this._rpcRequest('getHealth');
      if (response.result === 'ok') {
        this.connection = true;
        return { success: true, message: 'RPC connection established' };
      }
      throw new Error('RPC health check failed');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect available wallet providers
   */
  detectWalletProviders() {
    const providers = {
      phantom: !!window.phantom?.solana,
      solflare: !!window.solflare,
      solana: !!window.solana,
      isPhantomBrowser: /phantom/i.test(navigator.userAgent),
      isMobile: /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
    };
    
    providers.hasAnyProvider = providers.phantom || providers.solflare || providers.solana;
    providers.preferredProvider = providers.phantom ? 'phantom' : 
                                   providers.solflare ? 'solflare' : 
                                   providers.solana ? 'solana' : null;
    
    return providers;
  }

  /**
   * Get wallet provider instance
   */
  getProvider(preferredProvider = null) {
    if (preferredProvider === 'phantom' && window.phantom?.solana) {
      return window.phantom.solana;
    }
    if (preferredProvider === 'solflare' && window.solflare) {
      return window.solflare;
    }
    // Auto-detect
    return window.phantom?.solana || window.solflare || window.solana || null;
  }

  /**
   * Connect to Phantom or compatible wallet
   */
  async connect(options = {}) {
    const { onlyIfTrusted = false, provider: preferredProvider = null } = options;
    
    try {
      const provider = this.getProvider(preferredProvider);
      
      if (!provider) {
        return {
          success: false,
          error: 'No wallet provider found. Please install Phantom wallet.',
          installUrl: 'https://phantom.app/download'
        };
      }

      // Check if already connected
      if (provider.isConnected && provider.publicKey) {
        this.wallet = provider;
        this.publicKey = provider.publicKey.toString();
        this.isConnected = true;
        
        return {
          success: true,
          publicKey: this.publicKey,
          message: 'Already connected'
        };
      }

      // Attempt connection
      const response = await provider.connect({ onlyIfTrusted });
      
      if (response?.publicKey) {
        this.wallet = provider;
        this.publicKey = response.publicKey.toString();
        this.isConnected = true;
        
        // Setup disconnect listener
        provider.on?.('disconnect', () => this._handleDisconnect());
        provider.on?.('accountChanged', (pk) => this._handleAccountChange(pk));
        
        return {
          success: true,
          publicKey: this.publicKey,
          message: 'Wallet connected successfully'
        };
      }
      
      throw new Error('Connection response missing public key');
    } catch (error) {
      const errorMsg = error.code === 4001 
        ? 'Connection rejected by user' 
        : error.message;
      
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect() {
    try {
      if (this.wallet?.disconnect) {
        await this.wallet.disconnect();
      }
      this._handleDisconnect();
      return { success: true, message: 'Wallet disconnected' };
    } catch (error) {
      this._handleDisconnect();
      return { success: true, message: 'Wallet disconnected with errors', error: error.message };
    }
  }

  _handleDisconnect() {
    this.wallet = null;
    this.publicKey = null;
    this.isConnected = false;
  }

  _handleAccountChange(newPublicKey) {
    if (newPublicKey) {
      this.publicKey = newPublicKey.toString();
    } else {
      this._handleDisconnect();
    }
  }

  // ============================================
  // BALANCE METHODS
  // ============================================

  /**
   * Get SOL balance for an address
   */
  async getBalance(address = null) {
    const pubkey = address || this.publicKey;
    
    if (!pubkey) {
      return { success: false, error: 'No address provided and wallet not connected' };
    }

    try {
      const response = await this._rpcRequest('getBalance', [pubkey, { commitment: this.config.commitment }]);
      
      if (response.result?.value !== undefined) {
        const lamports = response.result.value;
        const sol = lamports / this.LAMPORTS_PER_SOL;
        
        return {
          success: true,
          lamports,
          sol,
          formatted: `${sol.toFixed(9)} SOL`
        };
      }
      
      throw new Error('Invalid balance response');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get token accounts for an address (SPL tokens)
   */
  async getTokenAccounts(address = null, mint = null) {
    const pubkey = address || this.publicKey;
    
    if (!pubkey) {
      return { success: false, error: 'No address provided' };
    }

    try {
      const params = [pubkey, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }];
      const response = await this._rpcRequest('getTokenAccountsByOwner', params);
      
      let accounts = response.result?.value || [];
      
      if (mint) {
        accounts = accounts.filter(acc => acc.account.data.parsed.info.mint === mint);
      }
      
      return {
        success: true,
        accounts: accounts.map(acc => ({
          pubkey: acc.pubkey,
          mint: acc.account.data.parsed.info.mint,
          balance: acc.account.data.parsed.info.tokenAmount.uiAmount,
          decimals: acc.account.data.parsed.info.tokenAmount.decimals
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // RENT EXEMPTION
  // ============================================

  /**
   * Get minimum balance for rent exemption
   */
  async getMinimumBalanceForRentExemption(dataLength = 0) {
    try {
      const response = await this._rpcRequest('getMinimumBalanceForRentExemption', [dataLength]);
      
      if (response.result !== undefined) {
        return {
          success: true,
          lamports: response.result,
          sol: response.result / this.LAMPORTS_PER_SOL
        };
      }
      
      throw new Error('Invalid response');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if an account is rent exempt
   */
  async isRentExempt(address) {
    try {
      const [accountInfo, rentExemption] = await Promise.all([
        this._rpcRequest('getAccountInfo', [address, { encoding: 'base64' }]),
        this.getMinimumBalanceForRentExemption(0)
      ]);

      if (!accountInfo.result?.value) {
        return { success: false, error: 'Account not found' };
      }

      const balance = accountInfo.result.value.lamports;
      const dataLength = accountInfo.result.value.data?.[0]?.length || 0;
      const requiredRent = await this.getMinimumBalanceForRentExemption(dataLength);

      return {
        success: true,
        isExempt: balance >= requiredRent.lamports,
        balance,
        requiredRent: requiredRent.lamports
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // TRANSFER METHODS
  // ============================================

  /**
   * Transfer SOL to another address
   */
  async transferSOL(toAddress, amountInSOL, options = {}) {
    if (!this.isConnected || !this.wallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const lamports = Math.floor(amountInSOL * this.LAMPORTS_PER_SOL);
      
      // Get recent blockhash
      const blockhashResponse = await this._rpcRequest('getLatestBlockhash', [{ commitment: 'finalized' }]);
      
      if (!blockhashResponse.result?.value?.blockhash) {
        throw new Error('Failed to get recent blockhash');
      }
      
      const { blockhash, lastValidBlockHeight } = blockhashResponse.result.value;

      // Create transaction
      const transaction = {
        feePayer: this.publicKey,
        recentBlockhash: blockhash,
        instructions: [{
          programId: '11111111111111111111111111111111', // System Program
          keys: [
            { pubkey: this.publicKey, isSigner: true, isWritable: true },
            { pubkey: toAddress, isSigner: false, isWritable: true }
          ],
          data: this._encodeTransferInstruction(lamports)
        }]
      };

      // Sign and send using wallet
      const { signature } = await this._signAndSendTransaction(transaction, options);

      // Confirm transaction
      if (options.confirm !== false) {
        const confirmed = await this.confirmTransaction(signature, lastValidBlockHeight);
        if (!confirmed.success) {
          return { success: false, error: 'Transaction confirmation failed', signature };
        }
      }

      return {
        success: true,
        signature,
        amount: amountInSOL,
        to: toAddress,
        explorerUrl: `https://solscan.io/tx/${signature}`
      };
    } catch (error) {
      const errorMsg = error.code === 4001 ? 'Transaction rejected by user' : error.message;
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Sign and send transaction using connected wallet
   */
  async _signAndSendTransaction(transaction, options = {}) {
    // For Phantom and compatible wallets, we need to use their transaction signing
    // This is a simplified version - in production you'd use @solana/web3.js Transaction class
    
    if (!this.wallet?.signAndSendTransaction && !this.wallet?.signTransaction) {
      throw new Error('Wallet does not support transaction signing');
    }

    // Get serialized transaction
    const serializedTx = await this._serializeTransaction(transaction);
    
    if (this.wallet.signAndSendTransaction) {
      const result = await this.wallet.signAndSendTransaction(serializedTx, options);
      return { signature: result.signature };
    }
    
    // Fallback: sign then send separately
    const signedTx = await this.wallet.signTransaction(serializedTx);
    const signature = await this._sendRawTransaction(signedTx);
    return { signature };
  }

  /**
   * Confirm a transaction
   */
  async confirmTransaction(signature, lastValidBlockHeight = null, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await this._rpcRequest('getSignatureStatuses', [[signature]]);
        const status = response.result?.value?.[0];
        
        if (status) {
          if (status.err) {
            return { success: false, error: 'Transaction failed', details: status.err };
          }
          if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
            return { success: true, status: status.confirmationStatus };
          }
        }
        
        // Check if blockhash expired
        if (lastValidBlockHeight) {
          const blockHeight = await this._rpcRequest('getBlockHeight');
          if (blockHeight.result > lastValidBlockHeight) {
            return { success: false, error: 'Transaction expired' };
          }
        }
        
        await this._sleep(2000);
      } catch (error) {
        // Continue polling on network errors
      }
    }
    
    return { success: false, error: 'Confirmation timeout' };
  }

  // ============================================
  // MESSAGE SIGNING
  // ============================================

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message) {
    if (!this.isConnected || !this.wallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const encodedMessage = typeof message === 'string' 
        ? new TextEncoder().encode(message) 
        : message;

      if (!this.wallet.signMessage) {
        return { success: false, error: 'Wallet does not support message signing' };
      }

      const signature = await this.wallet.signMessage(encodedMessage, 'utf8');
      
      return {
        success: true,
        signature: this._bytesToHex(signature.signature || signature),
        message: typeof message === 'string' ? message : 'Binary message'
      };
    } catch (error) {
      const errorMsg = error.code === 4001 ? 'Signing rejected by user' : error.message;
      return { success: false, error: errorMsg };
    }
  }

  // ============================================
  // ACCOUNT INFO
  // ============================================

  /**
   * Get account info for an address
   */
  async getAccountInfo(address) {
    try {
      const response = await this._rpcRequest('getAccountInfo', [
        address,
        { encoding: 'jsonParsed', commitment: this.config.commitment }
      ]);

      if (!response.result?.value) {
        return { success: true, exists: false, data: null };
      }

      const info = response.result.value;
      return {
        success: true,
        exists: true,
        data: {
          lamports: info.lamports,
          sol: info.lamports / this.LAMPORTS_PER_SOL,
          owner: info.owner,
          executable: info.executable,
          rentEpoch: info.rentEpoch,
          dataSize: info.data?.length || 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent transactions for an address
   */
  async getTransactionHistory(address = null, limit = 10) {
    const pubkey = address || this.publicKey;
    
    if (!pubkey) {
      return { success: false, error: 'No address provided' };
    }

    try {
      const response = await this._rpcRequest('getSignaturesForAddress', [
        pubkey,
        { limit, commitment: this.config.commitment }
      ]);

      return {
        success: true,
        transactions: response.result?.map(tx => ({
          signature: tx.signature,
          slot: tx.slot,
          blockTime: tx.blockTime,
          err: tx.err,
          memo: tx.memo
        })) || []
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature) {
    try {
      const response = await this._rpcRequest('getTransaction', [
        signature,
        { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
      ]);

      if (!response.result) {
        return { success: false, error: 'Transaction not found' };
      }

      return { success: true, transaction: response.result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // NETWORK INFO
  // ============================================

  /**
   * Get current slot
   */
  async getSlot() {
    try {
      const response = await this._rpcRequest('getSlot');
      return { success: true, slot: response.result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current block height
   */
  async getBlockHeight() {
    try {
      const response = await this._rpcRequest('getBlockHeight');
      return { success: true, blockHeight: response.result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cluster nodes info
   */
  async getClusterInfo() {
    try {
      const [version, health, slot] = await Promise.all([
        this._rpcRequest('getVersion'),
        this._rpcRequest('getHealth').catch(() => ({ result: 'unknown' })),
        this._rpcRequest('getSlot')
      ]);

      return {
        success: true,
        version: version.result?.['solana-core'],
        health: health.result,
        currentSlot: slot.result
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current epoch info
   */
  async getEpochInfo() {
    try {
      const response = await this._rpcRequest('getEpochInfo');
      return { success: true, ...response.result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Validate a Solana address
   */
  isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    // Base58 check: 32-44 characters, valid base58 alphabet
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  }

  /**
   * Convert lamports to SOL
   */
  lamportsToSol(lamports) {
    return lamports / this.LAMPORTS_PER_SOL;
  }

  /**
   * Convert SOL to lamports
   */
  solToLamports(sol) {
    return Math.floor(sol * this.LAMPORTS_PER_SOL);
  }

  /**
   * Format address for display
   */
  formatAddress(address, chars = 4) {
    if (!address) return '';
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }

  /**
   * Get explorer URL for address or transaction
   */
  getExplorerUrl(value, type = 'address', cluster = 'mainnet') {
    const base = cluster === 'mainnet' 
      ? 'https://solscan.io'
      : `https://solscan.io?cluster=${cluster}`;
    
    return type === 'tx' || type === 'transaction'
      ? `${base}/tx/${value}`
      : `${base}/account/${value}`;
  }

  // ============================================
  // INTERNAL METHODS
  // ============================================

  async _rpcRequest(method, params = []) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  _encodeTransferInstruction(lamports) {
    // SystemProgram Transfer instruction index is 2
    // Format: 4 bytes instruction index + 8 bytes lamports (little endian)
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setUint32(0, 2, true); // instruction index
    view.setBigUint64(4, BigInt(lamports), true); // lamports
    return Buffer.from(buffer);
  }

  async _serializeTransaction(transaction) {
    // In production, use @solana/web3.js Transaction class
    // This is a placeholder - actual implementation requires proper serialization
    throw new Error('Use @solana/web3.js for full transaction support');
  }

  _bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Initialize
const wallet = new SolanaWallet({
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  commitment: 'confirmed',
  timeout: 30000
});

// Connect wallet
const connectResult = await wallet.connect();
console.log(connectResult);
// { success: true, publicKey: '...', message: 'Wallet connected successfully' }

// Get balance
const balance = await wallet.getBalance();
console.log(balance);
// { success: true, lamports: 1000000000, sol: 1, formatted: '1.000000000 SOL' }

// Get rent exemption
const rent = await wallet.getMinimumBalanceForRentExemption(0);
console.log(rent);
// { success: true, lamports: 890880, sol: 0.00089088 }

// Transfer SOL (requires @solana/web3.js for full implementation)
const transfer = await wallet.transferSOL('recipient_address', 0.1);
console.log(transfer);

// Sign message
const signed = await wallet.signMessage('Hello Solana!');
console.log(signed);
// { success: true, signature: '...', message: 'Hello Solana!' }

// Get transaction history
const history = await wallet.getTransactionHistory(null, 5);
console.log(history);

// Disconnect
await wallet.disconnect();
*/

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SolanaWallet;
}
if (typeof window !== 'undefined') {
  window.SolanaWallet = SolanaWallet;
}