const express = require("express");
const cors = require("cors");
const dns = require("dns");

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const EvntRoutes = require("./routes/events");
const BkngRoutes = require("./routes/booking.js");
const passRoutes = require("./routes/passRoutes.js");
const promoRoutes = require("./routes/promoRoutes.js");
const paymentRoutes = require('./routes/payment');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());//json ka data yh smjhega ab

//Routes
app.use("/api/auth", authRoutes);//isme user login sign up hoga
app.use("/api/events", EvntRoutes);//isme event dekhega create krega delete krega
app.use("/api/bookings", BkngRoutes);//idhr booking krega 
app.use('/api/passes', passRoutes); // Routes for managing passes
app.use('/api/promos', promoRoutes); // Routes for managing promo codes
app.use('/api/rights', require('./routes/rights'));
app.use('/customers', express.static(require('path').join(__dirname, 'public/customers')));
app.use('/api/user-master', require('./routes/userMaster'));
app.use('/api/payment', paymentRoutes);
// app.use('/api/rights', require('./routes/rights'));

mongoose.connect(process.env.MONGO_URI, {
})
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//for mobile
// app.listen(5000, "0.0.0.0", () => {
//     console.log("Server running on port 5000");
// });