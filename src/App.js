import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import * as anchor from '@project-serum/anchor';
import idl from './/programs/trading_bot/src/tradingBot.idl'; 
import './App.css';

const SOLANA_NETWORK = 'devnet';
const connection = new Connection(`https://api.${SOLANA_NETWORK}.solana.com`);
const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'); 

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
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

  useEffect(() => {
    const fetchBalance = async () => {
      if (wallet) {
        try {
          const balance = await connection.getBalance(wallet.publicKey);
          setBalance(balance / LAMPORTS_PER_SOL);
        } catch (err) {
          console.error('Error fetching balance:', err);
          showError('Failed to fetch balance. Please try again.');
        }
      }
    };

    fetchBalance();
    const intervalId = setInterval(fetchBalance, 10000); // Update balance every 10 seconds

    return () => clearInterval(intervalId);
  }, [wallet]);

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

  const sendFundsToAgent = async () => {
    if (!wallet || !connection) return;
    setLoading(true);
    const amount = parseFloat(depositAmount);
    try {
      const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'processed' });
      const program = new anchor.Program(idl, PROGRAM_ID, provider);

      const [vaultPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        program.programId
      );

      const tx = await program.rpc.deposit(new anchor.BN(amount * LAMPORTS_PER_SOL), {
        accounts: {
          user: wallet.publicKey,
          vault: vaultPDA,
          systemProgram: SystemProgram.programId,
        },
      });

      await connection.confirmTransaction(tx, 'processed');
      const newBalance = await connection.getBalance(wallet.publicKey);
      setBalance(newBalance / LAMPORTS_PER_SOL);
      alert(`${amount} SOL transferidos correctamente al agente.`);
      setDepositAmount('');
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to send funds. Please try again.');
    }
    setLoading(false);
  };

  const withdrawAllFunds = async () => {
    setLoading(true);
    try {
      const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'processed' });
      const program = new anchor.Program(idl, PROGRAM_ID, provider);

      const [vaultPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        program.programId
      );

      const tx = await program.rpc.withdraw({
        accounts: {
          user: wallet.publicKey,
          vault: vaultPDA,
          systemProgram: SystemProgram.programId,
        },
      });

      await connection.confirmTransaction(tx, 'processed');
      const newBalance = await connection.getBalance(wallet.publicKey);
      setBalance(newBalance / LAMPORTS_PER_SOL);
      alert(`Fondos retirados correctamente.`);
    } catch (error) {
      console.error('Error:', error);
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
            <div className="dashboard-content">
              <div className="account-info">
                <h2>Account Information</h2>
                <p><strong>Connected Account:</strong> <br/>{wallet.publicKey.toString()}</p>
                <p><strong>Balance:</strong> {balance.toFixed(4)} SOL</p>
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
                  <button onClick={withdrawAllFunds} disabled={loading}>
                    Withdraw All Funds
                  </button>
                </div>
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
