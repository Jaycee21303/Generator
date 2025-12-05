
const bitcoin = window.bitcoinjs || window.bitcoin;

function showModal(){document.getElementById('modal-bg').classList.remove('hidden');}
function closeModal(){document.getElementById('modal-bg').classList.add('hidden');}

function copyText(id){
   navigator.clipboard.writeText(document.getElementById(id).innerText);
   alert("Copied!");
}

let currentMnemonic;

async function generateWallet(){
   currentMnemonic = bip39.generateMnemonic();
   document.getElementById('mnemonicText').innerText = currentMnemonic;
   await deriveWallet(currentMnemonic);
   document.getElementById('walletCard').classList.remove('hidden');
}

async function deriveWallet(seedPhrase){
   if(!bitcoin || !bitcoin.bip32){
      document.getElementById('addressText').innerText = 'Wallet library failed to load.';
      return;
   }

   let seed = await bip39.mnemonicToSeed(seedPhrase);
   let root = bitcoin.bip32.fromSeed(seed);
   let type = document.getElementById('addressType').value;
   let child, pay;

   if(type === 'p2wpkh'){
      child = root.derivePath("m/84'/0'/0'/0/0");
      pay = bitcoin.payments.p2wpkh({pubkey:child.publicKey, network:bitcoin.networks.bitcoin});
   }
   if(type === 'p2pkh'){
      child = root.derivePath("m/44'/0'/0'/0/0");
      pay = bitcoin.payments.p2pkh({pubkey:child.publicKey, network:bitcoin.networks.bitcoin});
   }
   if(type === 'p2tr'){
      child = root.derivePath("m/86'/0'/0'/0/0");
      pay = bitcoin.payments.p2tr({
         internalPubkey: child.publicKey.subarray(1,33),
         network: bitcoin.networks.bitcoin
      });
   }

   document.getElementById('addressText').innerText = pay.address;
   document.getElementById('privateKeyText').innerText = child.toWIF();

   let qrDiv = document.getElementById('qr');
   qrDiv.innerHTML = "";
   new QRCode(qrDiv, {text: pay.address, width:170, height:170});
}

function updateAddressType(){
   if(currentMnemonic){
      deriveWallet(currentMnemonic);
   }
}

async function checkBalance(){
   const addr = document.getElementById('addressText').innerText;
   document.getElementById('balance').innerText = 'Checking...';
   try{
       if(!addr){
           document.getElementById('balance').innerText = 'Generate or restore a wallet first.';
           return;
       }

       const endpoints = [
           `https://mempool.space/api/address/${addr}`,
           `https://blockstream.info/api/address/${addr}`
       ];

       let data;

       for(const url of endpoints){
           try {
               const res = await fetch(url);
               if(res.ok){
                   data = await res.json();
                   break;
               }
           } catch(err) {
               continue;
           }
       }

       if(!data){
           throw new Error('Unable to fetch balance');
       }

       let sats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
       document.getElementById('balance').innerText = `${sats/1e8} BTC (${sats} sats)`;
   } catch(e){
       document.getElementById('balance').innerText = 'Error fetching balance. Please try again later.';
   }
}

async function restoreWallet(){
   let seed = document.getElementById('restoreInput').value.trim();
   if(!bip39.validateMnemonic(seed)){ alert("Invalid seed"); return; }
   currentMnemonic = seed;
   document.getElementById('mnemonicText').innerText = seed;
   await deriveWallet(seed);
   document.getElementById('walletCard').classList.remove('hidden');
}
