import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { User } from "../modules/users/models/User.js";

export async function authenticateSocket(handshake) {
  const token = handshake.auth?.token;

  if (!token) {
    throw new Error("Authentication token required");
  }

  const decoded = jwt.verify(token, config.jwt.secret);

  if (decoded.tokenType && decoded.tokenType !== "access") {
    throw new Error("Invalid token");
  }

  const user = await User.findById(decoded.userId).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Account is suspended");
  }

  return user;
}
