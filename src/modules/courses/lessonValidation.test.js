import { describe, expect, it } from "vitest";
import { z } from "zod";

const interactiveConfigSchema = z.object({
  introduction: z.string().max(2000).optional(),
  steps: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        order: z.number().int().min(0),
      })
    )
    .min(1),
});

function stripHtmlContent(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function refineLessonPayload(data, ctx) {
  if (data.type === "TEXT") {
    const text = stripHtmlContent(data.content);
    if (!text || text.length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text lessons require at least 20 characters of content",
        path: ["content"],
      });
    }
  }

  if (data.type === "INTERACTIVE") {
    if (!data.interactiveConfig?.steps?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Interactive lessons require at least one step",
        path: ["interactiveConfig"],
      });
    }
  }

  if (data.type === "VIDEO" && !String(data.youtubeVideoId || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "YouTube video ID is required for video lessons",
      path: ["youtubeVideoId"],
    });
  }
}

const createLessonSchema = z
  .object({
    title: z.string().min(3).max(200),
    type: z.enum(["TEXT", "VIDEO", "INTERACTIVE"]),
    content: z.string().max(50000).optional(),
    interactiveConfig: interactiveConfigSchema.optional(),
    youtubeVideoId: z.string().optional(),
    durationSec: z.number().min(1).optional(),
    isPublished: z.boolean().optional(),
  })
  .superRefine(refineLessonPayload);

describe("lesson validation schemas", () => {
  it("rejects TEXT lessons without enough content", () => {
    const result = createLessonSchema.safeParse({
      title: "Short text lesson",
      type: "TEXT",
      content: "<p>Too short</p>",
      durationSec: 600,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["content"]);
  });

  it("accepts TEXT lessons with sufficient content", () => {
    const result = createLessonSchema.safeParse({
      title: "Study notes",
      type: "TEXT",
      content:
        "<p>This lesson explains the foundations of purpose discovery and how to apply them in daily work.</p>",
      durationSec: 600,
    });

    expect(result.success).toBe(true);
  });

  it("rejects INTERACTIVE lessons without steps", () => {
    const result = createLessonSchema.safeParse({
      title: "Practice lab",
      type: "INTERACTIVE",
      durationSec: 600,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["interactiveConfig"]);
  });

  it("accepts INTERACTIVE lessons with at least one step", () => {
    const result = createLessonSchema.safeParse({
      title: "Practice lab",
      type: "INTERACTIVE",
      durationSec: 600,
      interactiveConfig: {
        steps: [
          {
            id: "step-1",
            title: "Complete the reflection",
            order: 0,
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  });
});
