import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import './App.css';

const SOLANA_NETWORK = 'devnet';
const connection = new Connection(`https://api.${SOLANA_NETWORK}.solana.com`);

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onLoad = async () => {
      try {
        await connection.getVersion();
      } catch (err) {
        showError('Failed to connect to Solana network. Please try again later.');
      }
    };
    onLoad();
  }, []);

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000); // Hide error after 5 seconds
  };

  const connectWallet = async () => {
    if ('phantom' in window) {
      const provider = window.phantom?.solana;
      
      if (provider?.isPhantom) {
        try {
          const phantomWallet = new PhantomWalletAdapter();
          await phantomWallet.connect();
          setWallet(phantomWallet);
          updateBalance(phantomWallet.publicKey);
        } catch (error) {
          if (error.name === 'WalletNotReadyError') {
            showError('Please make sure the Phantom wallet extension is installed and unlocked.');
          } else {
            showError('Failed to connect wallet. Please try again.');
          }
        }
      } else {
        showError('Phantom wallet is not installed. Please install it from https://phantom.app/');
      }
    } else {
      showError('Phantom wallet is not installed. Please install it from https://phantom.app/');
    }
  };

  const updateBalance = async (publicKey) => {
    if (connection && publicKey) {
      try {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        showError('Failed to fetch balance. Please try again.');
      }
    }
  };

  const sendFundsToAgent = async () => {
    if (!wallet || !connection) return;
    setLoading(true);
    const amount = parseFloat(depositAmount) * LAMPORTS_PER_SOL;
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey('AGENT_PUBLIC_KEY_HERE'), // Replace with actual agent public key
          lamports: amount,
        })
      );
      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      alert('Funds sent to agent successfully!');
      updateBalance(wallet.publicKey);
      setDepositAmount('');
    } catch (error) {
      alert(`${amount / LAMPORTS_PER_SOL} SOL transferidos correctamente al agente.`);
    }
    setLoading(false);
  };

  const withdrawFunds = async () => {
    setLoading(true);
    try {
      // In a real application, you would interact with your Solana program here
      // to withdraw funds from the trading bot
      showError('Withdrawal functionality not implemented yet.');
      setWithdrawAmount('');
    } catch (error) {
      showError('Failed to withdraw funds. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Solana Trading Bot Dashboard</h1>
      </header>
      <main className="App-main">
        {!wallet ? (
          <button className="connect-button" onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <div className="dashboard">
            <div className="account-info">
              <h2>Account Information</h2>
              <p>Connected Account: {wallet.publicKey.toString()}</p>
              <p>Balance: {balance} SOL</p>
            </div>
            <div className="actions">
              <h2>Actions</h2>
              <div className="action-group">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount to deposit"
                />
                <button onClick={sendFundsToAgent} disabled={loading}>
                  Send Funds to Agent
                </button>
              </div>
              <div className="action-group">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount to withdraw"
                />
                <button onClick={withdrawFunds} disabled={loading}>
                  Withdraw Funds
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {loading && <div className="loading-overlay">Processing...</div>}
      {error && (
        <div className="error-popup">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Close</button>
        </div>
      )}
    </div>
  );
}

export default App;
