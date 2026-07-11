import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const send = vi.fn();
  const batchSend = vi.fn();
  return {
    send,
    batchSend,
    Resend: vi.fn(function Resend() {
      return { emails: { send }, batch: { send: batchSend } };
    }),
  };
});

vi.mock("resend", () => ({
  Resend: mocked.Resend,
}));

vi.mock("./env.js", () => ({
  config: {
    app: {
      name: "CONFAB LMS",
      clientUrl: "https://lms.theconfab.org",
    },
    email: {
      resend: {
        apiKey: "re_test_key",
        fromEmail: "CONFAB <noreply@theconfab.org>",
      },
    },
  },
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { createResendTemplates, sendEmailWithResend, sendBatchWithResend } = await import("./resend.js");

describe("resend config", () => {
  beforeEach(() => {
    mocked.send.mockReset();
    mocked.batchSend.mockReset();
  });

  it("returns plain template objects from createResendTemplates", () => {
    const template = createResendTemplates.welcomeEmail({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "PARTICIPANT",
    });

    expect(template).toEqual(
      expect.objectContaining({
        subject: expect.stringContaining("Welcome"),
        html: expect.stringContaining("Jane Doe"),
        text: expect.stringContaining("Jane Doe"),
      })
    );
    expect(template).not.toBeInstanceOf(Promise);
    expect(template.html).toContain("#6c5ce7");
    expect(template.html).toContain("https://lms.theconfab.org/confab-ft.png");
  });

  it("includes reset-password links in password reset templates", () => {
    const template = createResendTemplates.passwordResetEmail(
      { name: "Jane Doe", email: "jane@example.com" },
      "reset-token-123"
    );

    expect(template.html).toContain(
      "https://lms.theconfab.org/reset-password?token=reset-token-123"
    );
    expect(template.text).toContain(
      "https://lms.theconfab.org/reset-password?token=reset-token-123"
    );
    expect(template.html).toContain("Reset Password");
    expect(template.html).toContain("#6c5ce7");
  });

  it("invitation templates use branded layout and invite link", () => {
    const template = createResendTemplates.invitationEmail(
      { name: "Jane Doe", email: "jane@example.com", role: "ADMIN" },
      "invite-token-123",
      { name: "Julius Olajumoke" }
    );

    expect(template.html).toContain("You&#39;re invited!");
    expect(template.html).toContain("Julius Olajumoke");
    expect(template.html).toContain(
      "https://lms.theconfab.org/complete-invite?token=invite-token-123"
    );
    expect(template.html).toContain("confab-ft.png");
  });

  it("returns a consistent success shape when Resend sends successfully", async () => {
    mocked.send.mockResolvedValue({
      data: { id: "email_123" },
      error: null,
    });

    const result = await sendEmailWithResend({
      to: "jane@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result).toEqual({
      success: true,
      messageId: "email_123",
      provider: "resend",
    });
  });

  it("includes verify-email links in verification templates", () => {
    const template = createResendTemplates.verificationEmail(
      { name: "Jane Doe", email: "jane@example.com" },
      "verify-token-123"
    );

    expect(template.html).toContain(
      "https://lms.theconfab.org/verify-email?token=verify-token-123"
    );
    expect(template.subject).toContain("Verify your email");
  });

  it("returns course completion templates with course title", () => {
    const template = createResendTemplates.courseCompletionEmail(
      { name: "Jane Doe", email: "jane@example.com" },
      { title: "Leadership 101", _id: "course-1" }
    );

    expect(template.subject).toContain("Leadership 101");
    expect(template.html).toContain("Jane Doe");
  });

  it("returns announcement email templates", () => {
    const template = createResendTemplates.announcementEmail(
      { name: "Jane Doe", email: "jane@example.com" },
      { title: "New update", content: "Please review the latest module." },
      { name: "Admin User" }
    );

    expect(template.subject).toContain("New update");
    expect(template.html).toContain("Please review the latest module.");
  });

  it("throws when Resend returns an API error", async () => {
    mocked.send.mockResolvedValue({
      data: null,
      error: { message: "Domain not verified" },
    });

    await expect(
      sendEmailWithResend({
        to: "jane@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        text: "Hello",
      })
    ).rejects.toThrow("Resend email sending failed: Domain not verified");
  });

  it("sends batch emails in chunks of 100 with idempotency keys", async () => {
    mocked.batchSend.mockImplementation(async (chunk, options) => ({
      data: {
        data: chunk.map((email) => ({ id: `id-${email.to[0]}` })),
      },
      error: null,
      options,
    }));

    const recipients = Array.from({ length: 101 }, (_, index) => ({
      from: "CONFAB <noreply@theconfab.org>",
      to: [`user${index}@example.com`],
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    }));

    const result = await sendBatchWithResend(recipients, {
      idempotencyPrefix: "admin-email/test",
    });

    expect(mocked.batchSend).toHaveBeenCalledTimes(2);
    expect(mocked.batchSend.mock.calls[0][1]).toEqual({
      idempotencyKey: "admin-email/test/chunk-0",
    });
    expect(mocked.batchSend.mock.calls[1][1]).toEqual({
      idempotencyKey: "admin-email/test/chunk-1",
    });
    expect(result.sent).toBe(101);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(101);
  });

  it("supports legacy raw-array batch response data", async () => {
    mocked.batchSend.mockImplementation(async (chunk) => ({
      data: chunk.map((email) => ({ id: `id-${email.to[0]}` })),
      error: null,
    }));

    const recipients = [
      {
        from: "CONFAB <noreply@theconfab.org>",
        to: ["jane@example.com"],
        subject: "Hello",
        html: "<p>Hello</p>",
        text: "Hello",
      },
    ];

    const result = await sendBatchWithResend(recipients);

    expect(result).toEqual({
      success: true,
      sent: 1,
      failed: 0,
      results: [
        {
          success: true,
          email: "jane@example.com",
          messageId: "id-jane@example.com",
          provider: "resend",
        },
      ],
      provider: "resend",
    });
  });

  it("reports failures instead of crashing on unexpected batch response data", async () => {
    mocked.batchSend.mockResolvedValue({
      data: { id: "batch_without_items" },
      error: null,
    });

    const recipients = [
      {
        from: "CONFAB <noreply@theconfab.org>",
        to: ["jane@example.com"],
        subject: "Hello",
        html: "<p>Hello</p>",
        text: "Hello",
      },
      {
        from: "CONFAB <noreply@theconfab.org>",
        to: ["john@example.com"],
        subject: "Hello",
        html: "<p>Hello</p>",
        text: "Hello",
      },
    ];

    const result = await sendBatchWithResend(recipients);

    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.results).toEqual([
      {
        success: false,
        email: "jane@example.com",
        error: "Unexpected Resend batch response shape",
        provider: "resend",
      },
      {
        success: false,
        email: "john@example.com",
        error: "Unexpected Resend batch response shape",
        provider: "resend",
      },
    ]);
  });
});
