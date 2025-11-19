import SignClient from "https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2/dist/lite/index.min.js";

// 🔥 Utility: detect if user is on a real mobile device
function isMobile() {
  return /android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(
    navigator.userAgent.toLowerCase()
  );
}

// 🔥 Main function
async function connectBinanceWallet() {
  alert("Connecting to Binance Wallet...");
  // 1. Mobile check
  if (!isMobile()) {
    alert("Mobile device required. Open this page on your phone to connect.");
    return;
  }

  try {
    // 2. Init WC client
    const client = await SignClient.init({
      projectId: "ec8dd86047facf2fb8471641db3e5f0c",
      metadata: {
        name: "My Solana Dapp",
        description: "Connect via Binance Web3 Wallet",
        url: "https://paiofficial11.github.io/solprize",
        icons: ["https://example.com/icon.png"]
      }
    });

    // 3. Request session + generate WC URI
    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        solana: {
          methods: ["solana_signTransaction", "solana_signMessage"],
          chains: ["solana:mainnet"],
          events: []
        }
      }
    });

    if (!uri) {
      alert("Could not generate WalletConnect URI.");
      return;
    }

    console.log("WalletConnect URI:", uri);

    // 4. Build Binance deep link (THIS opens Web3 Wallet instantly)
    const deepLink =
      "https://app.binance.com/en/web3/walletlink?uri=" +
      encodeURIComponent(uri);

    // 5. FORCE navigation into Binance Web3 Wallet (mobile ONLY)
    window.location.href = deepLink;

    // 6. Wait for wallet approval
    const session = await approval();
    console.log("Connected Session:", session);

    alert("Wallet connected successfully!");
    return session;

  } catch (err) {
    console.error("Connection Error:", err);
    alert("Failed to connect: " + err.message);
  }
}

// 🔥 Bind click
document.getElementById("connectBtn").onclick = connectBinanceWallet;
