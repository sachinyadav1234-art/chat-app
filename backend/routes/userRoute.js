import express from "express";
import {
    getOtherUsers,
    login,
    logout,
    register,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    getFriendRequests,
    searchUsers
} from "../controllers/userController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/").get(isAuthenticated, getOtherUsers);
router.route("/search").get(isAuthenticated, searchUsers);
router.route("/friends").get(isAuthenticated, getFriends);
router.route("/friend-requests").get(isAuthenticated, getFriendRequests);
router.route("/friend-request/send/:id").post(isAuthenticated, sendFriendRequest);
router.route("/friend-request/accept/:id").post(isAuthenticated, acceptFriendRequest);
router.route("/friend-request/reject/:id").post(isAuthenticated, rejectFriendRequest);

export default router;