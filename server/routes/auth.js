import { Router } from "express";
import User from "../models/User.js";

const router = Router();

// POST /api/asian-paint/register { uuid, name }
router.post("/register", async (req, res) => {
  try {
    const { uuid, name } = req.body || {};
    if (!uuid || !name)
      return res.status(400).json({ message: "mobile and name are required" });
    const up = await User.findOneAndUpdate(
      { uuid },
      { $setOnInsert: { name } },
      { upsert: true, new: true }
    );
    return res.status(201).json({ user: up });
  } catch (e) {
    return res
      .status(500)
      .json({ message: "register failed", error: String(e) });
  }
});

// POST /api/asian-paint/login { uuid }
router.post("/login", async (req, res) => {
  try {
    const { uuid } = req.body || {};
    if (!uuid)
      return res.status(400).json({ message: "Mobile no. is required" });
    const user = await User.findOne({ uuid });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ message: "login failed", error: String(e) });
  }
});

export default router;
