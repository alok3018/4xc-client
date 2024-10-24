import React, { useEffect, useState } from "react";
import io from 'socket.io-client';
import './App.css';
import TransactionHistoryModal from "./components/TransactionHistoryModal";

const socket = io("http://localhost:5000/");

function App() {
  const [assetToTrack, setAssetToTrack] = useState('RDBEAR'); // Default asset
  const [userInfo, setUserInfo] = useState({
    loginid: 'VRTC11473788',
    token: 'a1-BoyrCrBDu0GiZW7ke6L4LjrR3YFP7'
  });
  const [candleData, setCandleData] = useState({});
  const [callProposal, setCallProposal] = useState(null);
  const [putProposal, setPutProposal] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false); // Loading state for wallet actions
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [purchaseTrade, setPurchaseTrade] = useState()
  useEffect(() => {
    if (!assetToTrack) return;
    // Fetch initial balance
    socket.emit('fetchBalance', userInfo);
    // Listen for wallet updates
    socket.on('walletUpdate', (wallet) => {
      console.log('walletUpdate', wallet);

      setBalance(wallet.balance.balance);
      setLoading(false);
    });

    // Join asset room
    socket.emit('joinAssetRoom', assetToTrack);

    // Listen for asset data updates
    socket.on('assetData', (data) => {
      setCandleData({
        time: data.epoch,
        open: data.quote * (1 - Math.random() * 0.01),
        high: data.quote + (Math.random() * 0.02),
        low: data.quote - (Math.random() * 0.02),
        close: data.quote,
      });
    });

    // Listen for proposal responses
    socket.on('proposal', (data) => {
      if (data.type === "CALL") {
        setCallProposal(data.data);
      } else if (data.type === "PUT") {
        setPutProposal(data.data);
      }
    });

    // Listen for purchase confirmation
    socket.on('purchaseConfirmation', (data) => {
      if (data.error) {
        alert(`Purchase failed: ${data.error.message}`);
      } else {
        setBalance(data.data.buy.balance_after);
        alert(`Purchase successful: ${data.message}`);
      }
    });

    socket.on('tradeUpdate', (data) => {
      // alert(`Transaction Update: ${data.message}`);
      console.log('tradeUpdate details:', data);
    });
    return () => {
      socket.emit('leaveAssetRoom', assetToTrack);
      socket.off('assetData');
      socket.off('proposal');
      socket.off('walletUpdate');
      socket.off('purchaseConfirmation');
      socket.off('transactionUpdate');
    };
  }, [assetToTrack, userInfo]);

  const handlePurchase = (type) => {
    const amount = type === 'CALL' ? callProposal.ask_price : putProposal.ask_price;
    if (!amount) return;
    setPurchaseTrade({
      proposal: 1,
      amount: 100, // Hardcoded amount; consider allowing user input
      barrier: "+0.1", // Adjust barrier as needed
      basis: "stake",
      contract_type: type,
      currency: "USD",
      duration: 60,
      duration_unit: "s",
      symbol: assetToTrack, // Use the current asset
      loginid: userInfo.loginid,
      token: userInfo.token,
    })
    // setPurchaseFromUser()

    socket.emit('purchaseTrade', {
      proposal: 1,
      amount: 100, // Hardcoded amount; consider allowing user input
      barrier: "+0.1", // Adjust barrier as needed
      basis: "stake",
      contract_type: type,
      currency: "USD",
      duration: 60,
      duration_unit: "s",
      symbol: assetToTrack, // Use the current asset
      loginid: userInfo.loginid,
      token: userInfo.token,
    });
  };

  const topUpWallet = () => {
    setLoading(true); // Set loading state
    socket.emit('topUpWallet', userInfo);
  };
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };
  return (
    <div className="trading-page">
      <div className="header">
        <h1>4XC</h1>
        <div className="wallet">
          <strong>Balance:</strong> ${balance.toFixed(2)}
          <button onClick={topUpWallet} className="wallet-button" disabled={loading}>
            {loading ? 'Topping Up...' : 'Top Up'}
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="candle-data">
          <h2>Candle Data</h2>
          {candleData.time && (
            <div>
              <p><strong>Time:</strong> {new Date(candleData.time * 1000).toLocaleTimeString()}</p>
              <p><strong>Open:</strong> ${candleData.open.toFixed(2)}</p>
              <p><strong>High:</strong> ${candleData.high.toFixed(2)}</p>
              <p><strong>Low:</strong> ${candleData.low.toFixed(2)}</p>
              <p><strong>Close:</strong> ${candleData.close.toFixed(2)}</p>
            </div>
          )}
        </div>

        <div className="proposal-container">
          <h2>Real-Time Proposals</h2>
          <div className="proposal-section">
            {callProposal ? (
              <div className="call-proposal proposal">
                <h4>Call Proposal</h4>
                <p><strong>Ask Price:</strong> ${callProposal.ask_price ?? "N/A"}</p>
                <p><strong>Trade Duration:</strong> 60 seconds</p>
                <p><strong>Payout:</strong> ${callProposal.payout !== undefined ? callProposal.payout.toFixed(2) : "N/A"}</p>
                <p><strong>Profit %:</strong> {callProposal.payout !== undefined && callProposal.ask_price !== undefined
                  ? (((callProposal.payout - callProposal.ask_price) / callProposal.ask_price) * 100).toFixed(2)
                  : "N/A"}%</p>
                <p><strong>Time to Expiry:</strong> {new Date(callProposal.date_expiry * 1000).toLocaleTimeString()}</p>
                <button onClick={() => handlePurchase('CALL')}>Buy Call</button>
              </div>
            ) : (
              <p>No Call Proposal Available</p>
            )}

            {putProposal ? (
              <div className="put-proposal proposal">
                <h4>Put Proposal</h4>
                <p><strong>Ask Price:</strong> ${putProposal.ask_price ?? "N/A"}</p>
                <p><strong>Trade Duration:</strong> 60 seconds</p>
                <p><strong>Payout:</strong> ${putProposal.payout !== undefined ? putProposal.payout.toFixed(2) : "N/A"}</p>
                <p><strong>Profit %:</strong> {putProposal.payout !== undefined && putProposal.ask_price !== undefined
                  ? (((putProposal.payout - putProposal.ask_price) / putProposal.ask_price) * 100).toFixed(2)
                  : "N/A"}%</p>
                <p><strong>Time to Expiry:</strong> {new Date(putProposal.date_expiry * 1000).toLocaleTimeString()}</p>
                <button onClick={() => handlePurchase('PUT')}>Buy Put</button>
              </div>
            ) : (
              <p>No Put Proposal Available</p>
            )}
          </div>
        </div>
      </div>
      <button onClick={toggleModal} className="history-button">View Transaction History</button> {/* Button to open modal */}
      <TransactionHistoryModal
        isOpen={isModalOpen}
        onClose={toggleModal}
        socket={socket}
        userInfo={userInfo}
      />
    </div>
  );
}

export default App;
