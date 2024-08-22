const express = require('express');

const { initializeDatabase, listTransactions, getStatistics, getPieChartData, getBarChartData } = require('../controllers/transactionController');
const { getCombinedData } = require('../controllers/combinedController');

const router = express.Router();

// Route to initialize database
router.get('/initialize-db', initializeDatabase);
router.get('/', listTransactions);
router.get('/statistics', getStatistics);
router.get('/bar-chart', getBarChartData);
router.get('/pie-chart', getPieChartData);

router.get('/combined-data', getCombinedData);


module.exports = router;
