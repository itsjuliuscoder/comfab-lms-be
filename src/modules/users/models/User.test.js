import { describe, expect, it } from "vitest";
import { User } from "./User.js";

describe("User model email validation", () => {
  it("accepts valid plus-alias email addresses", async () => {
    const user = new User({
      name: "Codex Admin Test User",
      email: "codex.admin.test+123@example.com",
      inviteToken: "invite-token",
      inviteTokenExpires: new Date(Date.now() + 60_000),
    });

    await expect(user.validate()).resolves.toBeUndefined();
  });

  it("rejects invalid email addresses", async () => {
    const user = new User({
      name: "Codex Admin Test User",
      email: "not-an-email",
      inviteToken: "invite-token",
      inviteTokenExpires: new Date(Date.now() + 60_000),
    });

    await expect(user.validate()).rejects.toThrow("Please enter a valid email");
  });
});
