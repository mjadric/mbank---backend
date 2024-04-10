const { User, CreditCard, UserCreditCardRelation, Transaction, Account  } = require('../model');
const uuid = require('uuid');

const getUserCards = async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: No user data available' });
    }

    try {
        const userCardRelations = await UserCreditCardRelation.find({ userID: user.userID });
        const creditCardNumbers = userCardRelations.map(relation => relation.creditCardNumber);
        const userCreditCards = await CreditCard.find({ creditCardNumber: { $in: creditCardNumbers } });
        
        for (const card of userCreditCards) {
            const userCardRelation = userCardRelations.find(relation => relation.creditCardNumber === card.creditCardNumber);
            if (userCardRelation) {
                const account = await Account.findOne({ accountNumber: userCardRelation.accountNumber });
                if (account) {
                    card.balance = account.balance;
                }
            }
        }

        const userData = await User.findOne({ userID: user.userID }, { firstName: 1, lastName: 1, email: 1, phoneNumber: 1 });

        if (!userData) {
            return res.status(404).json({
                success: false,
                error: 'User data not found',
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    phoneNumber: userData.phoneNumber,
                },
                creditCards: userCreditCards
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};


const makeTransactionWithPIN = async (req, res) => {
    const { accountFrom, accountTo, amount, pin, transactionType } = req.body;
    const userID = req.user.userID; 

    try {
        const user = await User.findOne({ userID });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (!accountFrom || !accountTo || !amount || !pin || !transactionType) {
            return res.status(400).json({ success: false, error: 'All fields must be filled' });
        }

        if (user.pin !== pin) {
            return res.status(401).json({ success: false, error: 'Incorrect PIN' });
        }

        if (accountFrom === accountTo) {
            return res.status(400).json({ success: false, error: 'Source and destination accounts cannot be the same' });
        }

        const fromAccount = await Account.findOne({ accountNumber: accountFrom });
        const toAccount = await Account.findOne({ accountNumber: accountTo });

        if (!fromAccount || !toAccount) {
            return res.status(404).json({ success: false, error: 'One or more accounts not found' });
        }

        if (fromAccount.balance < amount) {
            return res.status(400).json({ success: false, error: 'Insufficient funds' });
        }

        const userCreditCardRelation = await UserCreditCardRelation.findOne({ accountNumber: accountFrom });
        const creditCard = await CreditCard.findOne({ creditCardNumber: userCreditCardRelation.creditCardNumber });

        if (!creditCard) {
            return res.status(404).json({ success: false, error: 'Credit card not found' });
        }

        if (creditCard.cardLimit && amount > creditCard.cardLimit) {
            return res.status(400).json({ success: false, error: 'Transaction amount exceeds card limit' });
        }

        const transactionID = uuid.v4();

        const transaction = new Transaction({
            transactionID: transactionID, 
            accountFrom: accountFrom,
            accountTo: accountTo,
            amount: amount,
            transactionType: transactionType
        });

        fromAccount.balance -= amount;
        await fromAccount.save();

        toAccount.balance += amount;
        await toAccount.save();

        await transaction.save();

        res.status(200).json({ success: true, message: 'Transaction completed successfully'});
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};



const getAllTransactions = async (req, res) => {
    const userID = req.user.userID;
    const { filterType, filterTime, filterTransactionType } = req.query;

    try {
        const userAccount = await Account.findOne({ userID });
        if (!userAccount) {
            return res.status(404).json({ success: false, error: 'User account not found' });
        }

        const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const accountNumber = userAccount.accountNumber;
        let transactions = await Transaction.find({
            $or: [{ accountFrom: accountNumber }, { accountTo: accountNumber }],
            date: { $gte: fromDate }
        }).lean();

        if (filterType === 'time' && filterTime !== 'all') {
            const timeFilterOptions = {
                day: 24 * 60 * 60 * 1000, 
                week: 7 * 24 * 60 * 60 * 1000, 
            };

            const fromDate = new Date(Date.now() - timeFilterOptions[filterTime]);
            transactions = transactions.filter(transaction => new Date(transaction.date) >= fromDate);
        } else if (filterType === 'type' && filterTransactionType !== 'all') {
            transactions = transactions.filter(transaction => transaction.transactionType === filterTransactionType);
        }

        for (const transaction of transactions) {
            const fromAccount = await Account.findOne({ accountNumber: transaction.accountFrom });
            const toAccount = await Account.findOne({ accountNumber: transaction.accountTo });
            const fromUser = await User.findOne({ userID: fromAccount.userID });
            const toUser = await User.findOne({ userID: toAccount.userID });
            transaction.fromUserName = fromUser ? `${fromUser.firstName} ${fromUser.lastName}` : 'Unknown';
            transaction.toUserName = toUser ? `${toUser.firstName} ${toUser.lastName}` : 'Unknown';
            transaction.date = transaction.date.toISOString().split('T')[0];
        }

        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};


const getRecentTransactions = async (req, res) => {
    const userID = req.user.userID;

    try {
        const userAccount = await Account.findOne({ userID });
        if (!userAccount) {
            return res.status(404).json({ success: false, error: 'User account not found' });
        }

        const accountNumber = userAccount.accountNumber;
        let transactions = await Transaction.find({
            $or: [{ accountFrom: accountNumber }, { accountTo: accountNumber }]
        })
            .lean();
            
        transactions = transactions.slice(-3).reverse();

        for (const transaction of transactions) {
            const fromAccount = await Account.findOne({ accountNumber: transaction.accountFrom });
            const toAccount = await Account.findOne({ accountNumber: transaction.accountTo });
            const fromUser = await User.findOne({ userID: fromAccount.userID });
            const toUser = await User.findOne({ userID: toAccount.userID });
            transaction.fromUserName = fromUser ? `${fromUser.firstName} ${fromUser.lastName}` : 'Unknown';
            transaction.toUserName = toUser ? `${toUser.firstName} ${toUser.lastName}` : 'Unknown';
        }
        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};


const internalTransaction = async (req, res) => {
    const { accountFrom, accountTo, amount } = req.body;
    const userID = req.user.userID; 
    
    if (!accountFrom || !accountTo || !amount) {
        return res.status(400).json({ success: false, error: 'All fields must be filled' });
    }

    try {
        const userAccounts = await Account.find({ userID: userID });
        if (!userAccounts || userAccounts.length !== 2) {
            return res.status(404).json({ success: false, error: 'User accounts not found' });
        }

        const depositAccount = userAccounts.find(account => account.accountType === 'Deposit Account');
        const currentAccount = userAccounts.find(account => account.accountType === 'Current Account');


        if (!depositAccount || !currentAccount) {
            return res.status(404).json({ success: false, error: 'Deposit or current account not found' });
        }

        const depositAccountNumber = depositAccount.accountNumber;
        const currentAccountNumber = currentAccount.accountNumber;

        if (accountFrom === accountTo) {
            return res.status(400).json({ success: false, error: 'Source and destination accounts cannot be the same' });
        }

        if (accountFrom === depositAccountNumber && depositAccount.balance < amount) {
            return res.status(400).json({ success: false, error: 'Insufficient funds in deposit account' });
        }
        if (accountFrom === currentAccountNumber && currentAccount.balance < amount) {
            return res.status(400).json({ success: false, error: 'Insufficient funds in current account' });
        }

        if (accountFrom !== depositAccountNumber && accountFrom !== currentAccountNumber) {
            return res.status(400).json({ success: false, error: 'Invalid source account' });
        }
        if (accountTo !== depositAccountNumber && accountTo !== currentAccountNumber) {
            return res.status(400).json({ success: false, error: 'Invalid destination account' });
        }

        if (accountFrom === depositAccountNumber) {
            depositAccount.balance -= amount;
        } else {
            currentAccount.balance -= amount;
        }

        if (accountTo === depositAccountNumber) {
            depositAccount.balance += amount;
        } else {
            currentAccount.balance += amount;
        }

        await depositAccount.save();
        await currentAccount.save();

        const transactionID = uuid.v4();
        const transaction = new Transaction({
            transactionID: transactionID,
            accountFrom: accountFrom,
            accountTo: accountTo,
            amount: amount,
            transactionType: 'Transfer'
        });
        await transaction.save();

        res.status(200).json({ success: true, message: 'Transaction completed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};


const getUserBalance = async (req, res) => {
    const userID = req.user.userID; 

    try {
        const userAccounts = await Account.find({ userID });

        const accountBalances = userAccounts.map(account => {
            return { accountNumber: account.accountNumber, balance: account.balance, accountType: account.accountType};
        });

        res.status(200).json({ success: true, balances: accountBalances });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};


module.exports = {
    getUserCards,
    makeTransactionWithPIN,
    getAllTransactions,
    getRecentTransactions,
    internalTransaction,
    getUserBalance
};
