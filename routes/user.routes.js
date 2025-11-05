const express = require("express");
const { getAllUserRatings } = require("../controllers/rating.controller");
const { authenticateUser } = require("../middleware/auth.middleware");

const router = express.Router();

// Get all ratings given by the authenticated user
router.get("/ratings", authenticateUser, getAllUserRatings);

module.exports = router;
