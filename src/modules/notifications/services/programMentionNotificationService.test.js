import { describe, it, expect } from "vitest";
import { parseMentions } from "../../cohort-chat/services/cohortMentionService.js";

describe("program mention parsing", () => {
  const members = [
    { userId: "user-1", name: "Alice Smith", email: "alice@example.com" },
    { userId: "user-2", name: "Bob Jones", email: "bob@example.com" },
  ];

  it("matches @name mentions against program members", () => {
    const ids = parseMentions("Hey @Alice Smith welcome!", members, "sender-1");
    expect(ids).toEqual(["user-1"]);
  });

  it("matches @email mentions against program members", () => {
    const ids = parseMentions("Ping @bob@example.com please", members, "sender-1");
    expect(ids).toEqual(["user-2"]);
  });

  it("does not mention the sender", () => {
    const ids = parseMentions("@Alice Smith", members, "user-1");
    expect(ids).toEqual([]);
  });
});
