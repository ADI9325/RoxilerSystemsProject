const axios = require('axios');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

// Initialize Database
const initializeDatabase = async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;

        // Clear existing data
        await Transaction.deleteMany({});

        // Validate and correct date fields
        const transactionsWithValidation = transactions.map(transaction => {
            const dateOfSale = new Date(transaction.dateOfSale);
            const isValidDate = !isNaN(dateOfSale.getTime());

            return {
                ...transaction,
                dateOfSale: isValidDate ? dateOfSale : new Date(), // Use current date if invalid
                image: transaction.image || 'https://default-image-url.com/default.jpg' // Ensure image field is present
            };
        });

        // Insert new data
        await Transaction.insertMany(transactionsWithValidation);

        res.status(200).json({ message: 'Database initialized with seed data' });
    } catch (error) {
        console.error('Error initializing database:', error);
        res.status(500).json({ error: 'Failed to initialize database. Please try again later.' });
    }
};

// List Transactions
const listTransactions = async (req, res) => {
    try {
        const { month, search = '', page = 1, perPage = 10 } = req.query;

        // Validate pagination parameters
        const pageNumber = parseInt(page, 10);
        const itemsPerPage = parseInt(perPage, 10);

        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json({ error: 'Invalid page number. Page number must be a positive integer.' });
        }

        if (isNaN(itemsPerPage) || itemsPerPage < 1) {
            return res.status(400).json({ error: 'Invalid perPage value. Items per page must be a positive integer.' });
        }

        // Validate month parameter
        const monthDate = new Date(`${month} 1, 2020`);
        const monthNumber = monthDate.getMonth() + 1;

        if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
            return res.status(400).json({ error: 'Invalid month. Please provide a valid month name.' });
        }

        // Determine if the search term is a valid number
        const searchAsNumber = parseFloat(search);
        const isNumberSearch = !isNaN(searchAsNumber);

        // Create search criteria
        const searchCriteria = {
            $expr: {
                $eq: [{ $month: "$dateOfSale" }, monthNumber]
            },
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                ...(isNumberSearch ? [{ $expr: { $eq: ["$price", searchAsNumber] } }] : [])
            ]
        };

        // Pagination
        const skip = (pageNumber - 1) * itemsPerPage;

        const transactions = await Transaction.find(searchCriteria)
            .skip(skip)
            .limit(itemsPerPage);

        if (!transactions.length) {
            return res.status(404).json({ error: 'No transactions found for the given criteria.' });
        }

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error listing transactions:', error);
        res.status(500).json({ error: 'Failed to list transactions. Please try again later.' });
    }
};

// Statistics API
const getStatistics = async (req, res) => {
    try {
        const { month } = req.query;

        // Validate month parameter
        if (!month || !/^[a-zA-Z]+$/.test(month)) {
            return res.status(400).json({ error: 'Invalid month parameter. Please provide a valid month name.' });
        }

        const monthNumber = new Date(Date.parse(`01 ${month} 2022`)).getMonth();
        const startOfMonth = new Date(Date.UTC(2022, monthNumber, 1));
        const endOfMonth = new Date(Date.UTC(2022, monthNumber + 1, 0, 23, 59, 59, 999));

        const statistics = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: {
                _id: null,
                totalAmount: { $sum: "$price" },
                totalItems: { $sum: { $cond: [{ $eq: ["$sold", true] }, 1, 0] } },
                totalNotSold: { $sum: { $cond: [{ $eq: ["$sold", false] }, 1, 0] } }
            }}
        ]);

        const result = statistics.length > 0 
            ? statistics[0] 
            : { totalAmount: 0, totalItems: 0, totalNotSold: 0 };

        res.status(200).json(result);
    } catch (error) {
        console.error("Error retrieving statistics:", error);
        res.status(500).json({ error: 'Failed to retrieve statistics. Please try again later.' });
    }
};

// Bar Chart API
const getBarChartData = async (req, res) => {
    try {
        const { month } = req.query;

        // Validate month parameter
        if (!month || !/^[a-zA-Z]+$/.test(month)) {
            return res.status(400).json({ error: 'Invalid month parameter. Please provide a valid month name.' });
        }

        const monthNumber = new Date(Date.parse(`01 ${month} 2022`)).getMonth();
        const startOfMonth = new Date(Date.UTC(2022, monthNumber, 1));
        const endOfMonth = new Date(Date.UTC(2022, monthNumber + 1, 0, 23, 59, 59, 999));

        const priceRanges = [
            { range: '0 - 100', min: 0, max: 100 },
            { range: '101 - 200', min: 101, max: 200 },
            { range: '201 - 300', min: 201, max: 300 },
            { range: '301 - 400', min: 301, max: 400 },
            { range: '401 - 500', min: 401, max: 500 },
            { range: '501 - 600', min: 501, max: 600 },
            { range: '601 - 700', min: 601, max: 700 },
            { range: '701 - 800', min: 701, max: 800 },
            { range: '801 - 900', min: 801, max: 900 },
            { range: '901 - above', min: 901, max: Infinity }
        ];

        const barChartData = await Promise.all(priceRanges.map(async (range) => {
            const count = await Transaction.countDocuments({
                dateOfSale: { $gte: startOfMonth, $lte: endOfMonth },
                price: { $gte: range.min, $lte: range.max }
            });
            return { range: range.range, count };
        }));

        res.status(200).json(barChartData);
    } catch (error) {
        console.error("Error retrieving bar chart data:", error);
        res.status(500).json({ error: 'Failed to retrieve bar chart data. Please try again later.' });
    }
};

// Pie Chart API
const getPieChartData = async (req, res) => {
    try {
        const { month } = req.query;

        // Validate month parameter
        if (!month || !/^[a-zA-Z]+$/.test(month)) {
            return res.status(400).json({ error: 'Invalid month parameter. Please provide a valid month name.' });
        }

        const monthNumber = new Date(Date.parse(`01 ${month} 2022`)).getMonth();
        const startOfMonth = new Date(Date.UTC(2022, monthNumber, 1));
        const endOfMonth = new Date(Date.UTC(2022, monthNumber + 1, 0, 23, 59, 59, 999));

        const pieChartData = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $project: { _id: 0, category: "$_id", count: 1 } }
        ]);

        res.status(200).json(pieChartData);
    } catch (error) {
        console.error("Error retrieving pie chart data:", error);
        res.status(500).json({ error: 'Failed to retrieve pie chart data. Please try again later.' });
    }
};

module.exports = {
    initializeDatabase,
    listTransactions,
    getStatistics,
    getBarChartData,
    getPieChartData
};
