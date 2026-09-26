    const express = require("express");

    const router = express.Router();

    const {
        submitUTR,
    } = require("../controllers/paymentController");

    const authMiddleware = require("../middleware/auth");

    router.post(
        "/utr",
        authMiddleware,
        submitUTR
    );
    router.post("/submit-utr", authMiddleware, submitUTR);
    module.exports = router;