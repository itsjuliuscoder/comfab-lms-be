import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  Notification: {
    create: vi.fn(),
    countDocuments: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
  },
  getIO: vi.fn(),
}));

vi.mock("../models/Notification.js", () => ({
  Notification: mocked.Notification,
}));

vi.mock("../../../socket/index.js", () => ({
  getIO: mocked.getIO,
}));

const {
  createNotification,
  getUnreadCount,
  serializeNotification,
} = await import("./notificationService.js");
const { parseMentions } = await import(
  "../../cohort-chat/services/cohortMentionService.js"
);

describe("notificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getIO.mockReturnValue(null);
  });

  it("creates a notification document", async () => {
    const createdDoc = {
      _id: "notif-1",
      userId: "user-1",
      type: "SYSTEM",
      title: "Test",
      message: "Hello",
      link: "/dashboard",
      data: {},
      priority: "LOW",
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      toObject: () => ({
        _id: "notif-1",
        userId: "user-1",
        type: "SYSTEM",
        title: "Test",
        message: "Hello",
        link: "/dashboard",
        data: {},
        priority: "LOW",
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    mocked.Notification.create.mockResolvedValue(createdDoc);

    const result = await createNotification({
      userId: "user-1",
      type: "SYSTEM",
      title: "Test",
      message: "Hello",
      link: "/dashboard",
    });

    expect(mocked.Notification.create).toHaveBeenCalled();
    expect(result).toBe(createdDoc);
    expect(serializeNotification(createdDoc)).toMatchObject({
      id: "notif-1",
      title: "Test",
      isRead: false,
    });
  });

  it("returns unread count for a user", async () => {
    mocked.Notification.countDocuments.mockResolvedValue(3);
    const count = await getUnreadCount("user-1");
    expect(count).toBe(3);
    expect(mocked.Notification.countDocuments).toHaveBeenCalledWith({
      userId: "user-1",
      readAt: null,
    });
  });
});

describe("parseMentions", () => {
  const members = [
    { userId: "user-1", name: "Julius Olajumoke", email: "julius@example.com" },
    { userId: "user-2", name: "Ada Lovelace", email: "ada@example.com" },
  ];

  it("matches email mentions", () => {
    const result = parseMentions(
      "Hey @ada@example.com please review this",
      members,
      "sender-1"
    );
    expect(result).toEqual(["user-2"]);
  });

  it("matches name mentions and excludes sender", () => {
    const result = parseMentions(
      "@Julius Olajumoke can you take a look?",
      members,
      "user-1"
    );
    expect(result).toEqual([]);
  });

  it("matches another user by name", () => {
    const result = parseMentions(
      "Thanks @Ada Lovelace",
      members,
      "user-1"
    );
    expect(result).toEqual(["user-2"]);
  });
});
