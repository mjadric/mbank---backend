const express = require('express');

const homeController = require('./controllers/homeController');
const accountController = require('./controllers/accountController');
const financeController = require('./controllers/financeController');

const router = express.Router();

router.get('/', homeController.showHomePage);
router.get('/account', accountController.authenticateToken, accountController.getAccount);
router.get('/card', accountController.authenticateToken, financeController.getUserCards);
router.get('/transactions/all', accountController.authenticateToken, financeController.getAllTransactions);
router.get('/transactions/recent', accountController.authenticateToken, financeController.getRecentTransactions);
router.get('/balance', accountController.authenticateToken, financeController.getUserBalance);


router.post('/register', accountController.registration);
router.post('/login', accountController.login);
router.post('/transaction', accountController.authenticateToken, financeController.makeTransactionWithPIN);
router.post('/transactions/internal-transfer',accountController.authenticateToken, financeController.internalTransaction);

router.patch('/update-phone-number',accountController.authenticateToken, accountController.updatePhoneNumber);

module.exports = router;
