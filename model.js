const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
    userID: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true }, 
    password: { type: String, required: true },
    firstName: { type: String, required: true },  
    lastName: { type: String, required: true },   
    phoneNumber: { type: String },  
    registrationDate: { type: Date, default: Date.now },
    lastLoginDate: { type: Date },
    pin: { type: String, unique: true, required: true }
});

const User = mongoose.model('User', userSchema);

const accountSchema = new Schema({
    accountNumber: { type: String, unique: true, required: true },
    userID: { type: String, required: true },
    balance: { type: Number, default: 0 },
    accountType: { type: String },
});

const Account = mongoose.model('Account', accountSchema);

const transactionSchema = new Schema({
    transactionID: { type: String, unique: true, required: true },
    accountFrom: { type: String, required: true },
    accountTo: { type: String, required: true },
    amount: { type: Number, required: true },
    transactionType: { type: String },
    date: { type: Date, default: Date.now } 
});

const Transaction = mongoose.model('Transaction', transactionSchema);

const creditCardSchema = new Schema({
    creditCardNumber: { type: String, unique: true, required: true },
    userID: { type: String, required: true },
    cardLimit: { type: Number },
    expiryDate: { type: Date },
});

const CreditCard = mongoose.model('CreditCard', creditCardSchema);

const userCreditCardRelationSchema = new Schema({
    userID: { type: String, required: true },
    creditCardNumber: { type: String, required: true },
    accountNumber: { type: String, required: true },
});

const UserCreditCardRelation = mongoose.model('UserCreditCardRelation', userCreditCardRelationSchema);

module.exports = { User, Account, Transaction, CreditCard, UserCreditCardRelation };
