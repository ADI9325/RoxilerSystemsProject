const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    dateOfSale: { 
        type: Date, 
        required: true,
        validate: {
            validator: function(value) {
                // Check if the value is a valid date
                return !isNaN(Date.parse(value));
            },
            message: props => `${props.value} is not a valid date!`
        }
    },
    sold: { type: Boolean, required: true },
    image: { type: String, required: true } // New field for image URL
});

// Custom validation function for the date format
transactionSchema.pre('save', function(next) {
    if (this.dateOfSale) {
        // Ensure dateOfSale is in ISO format
        const date = new Date(this.dateOfSale);
        if (isNaN(date.getTime())) {
            return next(new Error('Invalid date format for dateOfSale'));
        }
    }
    next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
