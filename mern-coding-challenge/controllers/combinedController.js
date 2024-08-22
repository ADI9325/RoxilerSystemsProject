const axios = require('axios');
const moment = require('moment'); // for easier date manipulation

const baseUrl = 'http://localhost:5000/api/transactions'; // Base URL for your API

const getCombinedData = async (req, res) => {
    try {
        const { month } = req.query;

        // Validate month parameter
        if (!month || !moment(month, 'MMMM', true).isValid()) {
            return res.status(400).json({ error: 'Invalid month parameter. Please provide a valid month name.' });
        }

        // Convert month to title case (e.g., January, February)
        const monthFormatted = moment(month, 'MMMM').format('MMMM');

        // Call Statistics API
        const statisticsResponse = await axios.get(`${baseUrl}/statistics`, { params: { month: monthFormatted } });
        const statistics = statisticsResponse.data;

        // Call Bar Chart API
        const barChartResponse = await axios.get(`${baseUrl}/bar-chart`, { params: { month: monthFormatted } });
        const barChartData = barChartResponse.data;

        // Call Pie Chart API
        const pieChartResponse = await axios.get(`${baseUrl}/pie-chart`, { params: { month: monthFormatted } });
        const pieChartData = pieChartResponse.data;

        // Combine results
        const combinedResult = {
            statistics,
            barChartData,
            pieChartData
        };

        res.status(200).json(combinedResult);
    } catch (error) {
        console.error('Error fetching combined data:', error);
        res.status(500).json({ error: 'Failed to fetch combined data. Please try again later.' });
    }
};

module.exports = {
    getCombinedData
};
