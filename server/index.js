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

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());//json ka data yh smjhega ab

//Routes
app.use("/api/auth", authRoutes);//isme user login sign up hoga
app.use("/api/events", EvntRoutes);//isme event dekhega create krega delete krega
app.use("/api/bookings", BkngRoutes);//idhr booking krega 

mongoose.connect(process.env.MONGO_URI, {
})
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});