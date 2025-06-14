import express from "express";
import { register, login, getTherapists } from "../controllers/usercontroller.js"; // Import getUserProfile


const router = express.Router();

router.post("/register", register);
router.post("/login", login);



export default router;
