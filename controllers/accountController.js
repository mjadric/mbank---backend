const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { User, Account, CreditCard, UserCreditCardRelation} = require('../model');
const jwt = require('jsonwebtoken');

const registration = async (req, res) => {
    try {
        
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email address already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userID = generateUserID();

        const pin = generatePIN();

        const newUser = new User({
            userID,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            pin,
        });

        await newUser.save();

        const firstAccount = new Account({
            accountNumber: generateAccountNumber(),
            userID,
            balance: 100,
            accountType: 'Current Account',
        });

        await firstAccount.save();

        const secondAccount = new Account({
            accountNumber: generateAccountNumber(),
            userID,
            balance: 100,
            accountType: 'Deposit Account',
        });

        await secondAccount.save();

        const creditCardNumber = generateCreditCardNumber(); 
        
        const newCreditCard = new CreditCard({
            creditCardNumber,
            userID,
            cardLimit: 1000,
            expiryDate:  new Date(new Date().getFullYear() + 5, 0, 1)
        });
        
        
        await newCreditCard.save();

        const userCreditCardRelation = new UserCreditCardRelation({
            userID,
            creditCardNumber,
            accountNumber: firstAccount.accountNumber
        });
        await userCreditCardRelation.save();

        res.status(201).json({ message: 'Registration successful.', pin });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error during registration.' });
    }
};


function generatePIN() {
    return Math.floor(1000 + Math.random() * 9000);
}

function generateUserID() {
    return uuidv4();
}

function generateAccountNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return timestamp + random;
}

function generateCreditCardNumber() {
    let creditCardNumber = '';

    for (let i = 0; i < 16; i++) {
        const digit = Math.floor(Math.random() * 10);
        creditCardNumber += digit.toString();
        
        if ((i + 1) % 4 === 0 && i !== 15) {
            creditCardNumber += '-';
        }
    }

    return creditCardNumber;
}


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }

        const token = jwt.sign({ userID: user.userID }, 'your-secret-key', { expiresIn: '1h' });

        res.status(200).json({ message: 'Successful login.', token });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in.' });
    }
};

const authenticateToken = async (req, res, next) => {
    const tokenHeader = req.headers['authorization'];
  
    if (!tokenHeader) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }
  
    const token = tokenHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, 'your-secret-key');
      const user = await User.findOne({ userID: decoded.userID }); 
      if (!user) {
        throw new Error('User not found');
      }
      req.user = user;
      next();
    } catch (err) {
      return res.status(403).json({ success: false, error: 'Forbidden: Invalid token' });
    }
  };

const updatePhoneNumber = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ success: false, error: 'Unauthorized: No user data available' });
        }

        const newPhoneNumber = req.body.phoneNumber;

        const existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
            console.error('User not found in the database');
            return res.status(404).json({ success: false, message: 'User not found in the database' });
        }

        existingUser.phoneNumber = newPhoneNumber;
        await existingUser.save();

        console.log('Phone number updated successfully');
        return res.json({ success: true, message: 'Phone number updated successfully' });
    } catch (error) {
        console.error('Error updating phone number:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
  
  const getAccount = async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: No user data available' });
    }

    try {
        const userData = await User.findOne({ userID: user.userID }, { firstName: 1, lastName: 1, email: 1, phoneNumber: 1 });
        if (!userData) {
            return res.status(404).json({
                success: false,
                error: 'User data not found',
            });
        }

        const userAccounts = await Account.find({ userID: user.userID });
        
        res.status(200).json({
            success: true,
            data: {
                user: userData,
                accounts: userAccounts
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};


module.exports = {
    registration,
    login,
    updatePhoneNumber,
    authenticateToken,
    getAccount
};
