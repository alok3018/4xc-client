import React, { useEffect, useState } from "react";

const TransactionHistoryModal = ({ isOpen, onClose, socket, userInfo }) => {
    const [transactions, setTransactions] = useState([]);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const limit = 25; // Number of transactions to fetch per request

    const fetchTransactions = () => {
        setLoading(true);
        socket.emit('transcationHistoryRequest', {
            profit_table: 1,
            description: 1,
            limit: limit,
            offset: offset,
            sort: "DESC",
            loginid: userInfo.loginid,
            token: userInfo.token
        });
    };

    useEffect(() => {
        // Set up socket listener once when the component mounts
        socket.on('transcationHistory', (data) => {
            console.log('transcationHistory',data);
            
            if (data.profit_table && Array.isArray(data.profit_table.transactions)) {
                const newTransactions = data.profit_table.transactions.map(transaction => {
                    const profit = transaction.sell_price ? (transaction.sell_price - transaction.buy_price) : 0;

                    return {
                        transactionId: transaction.transaction_id, // Ensure this is unique
                        contractType: transaction.contract_type,
                        buyPrice: transaction.buy_price,
                        sellPrice: transaction.sell_price,
                        profit: profit,
                        purchaseTime: new Date(transaction.purchase_time * 1000).toLocaleString(),
                        sellTime: transaction.sell_time ? new Date(transaction.sell_time * 1000).toLocaleString() : 'Not Sold'
                    };
                });

                // Append new transactions to existing ones
                setTransactions(prevTransactions => [...prevTransactions, ...newTransactions]);
            } else {
                console.warn("Received unexpected data format:", data);
            }
            setLoading(false);
        });

        // Clean up the event listener when the component unmounts
        return () => {
            socket.off('transcationHistory');
        };
    }, [socket]); // Only run this effect when the socket instance changes

    // Fetch transactions only when the modal is opened
    useEffect(() => {
        if (isOpen) {
            fetchTransactions();
        }
    }, [isOpen, offset, socket, userInfo]); // Fetch transactions when modal opens or offset changes

    const handleLoadMore = () => {
        setOffset(prevOffset => prevOffset + limit);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Transaction History</h2>
                <button className="close-button" onClick={onClose}>Close</button>
                {transactions.length === 0 ? (
                    <p>No transactions found.</p>
                ) : (
                    <div className="scrollable-table-container">
                        <table className="transaction-table">
                            <thead>
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Contract Type</th>
                                    <th>Buy Price</th>
                                    <th>Sell Price</th>
                                    <th>Profit</th>
                                    <th>Purchase Time</th>
                                    <th>Sell Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((transaction, index) => (
                                    <tr key={`${index}`}>
                                        <td>{transaction.transactionId}</td>
                                        <td>{transaction.contractType}</td>
                                        <td>${transaction.buyPrice.toFixed(2)}</td>
                                        <td>${transaction.sellPrice ? transaction.sellPrice.toFixed(2) : 'N/A'}</td>
                                        <td>${transaction.profit.toFixed(2)}</td>
                                        <td>{transaction.purchaseTime}</td>
                                        <td>{transaction.sellTime}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    transactions.length > 0 && (
                        <button className="load-more-button" onClick={handleLoadMore} disabled={loading}>
                            Load More
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default TransactionHistoryModal;
