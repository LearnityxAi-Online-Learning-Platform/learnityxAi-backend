const mongoose = require('mongoose');

// Database Connection Function
const connectDatabase = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`learnityxAi Database connected successfully: , ${connection.connection.host}`);
    } catch (error) {
        console.error(`learnityxAi Database connection failed: , ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDatabase;