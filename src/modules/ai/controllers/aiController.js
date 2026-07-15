import { successResponse, errorResponse, forbiddenResponse } from "../../../utils/response.js";
import { logger } from "../../../utils/logger.js";
import { canAccessLessonProgress } from "../../courses/services/lessonProgressService.js";
import { retrieveLessonContext } from "../services/lessonContextBuilder.js";
import { askAiTutor } from "../services/aiProvider.js";
import { config } from "../../../config/env.js";

export const askTutor = async (req, res) => {
  try {
    const { courseId, lessonId, userQuestion, intent, messages = [] } = req.body;

    const allowed = await canAccessLessonProgress(req.user, courseId);
    if (!allowed) {
      return forbiddenResponse(res, "Access denied");
    }

    const contextResult = await retrieveLessonContext({
      courseId,
      lessonId,
      userId: req.user._id,
    });

    const aiResult = await askAiTutor({
      context: contextResult.context,
      userQuestion,
      intent,
      messages,
    });

    return successResponse(
      res,
      {
        ...aiResult,
        ...(config.server.nodeEnv !== "production"
          ? {
              contextSources: contextResult.sources,
              truncated: contextResult.truncated,
            }
          : {}),
      },
      "AI tutor response generated"
    );
  } catch (error) {
    logger.error("AI tutor error:", error);
    return errorResponse(res, error, error.statusCode || 500);
  }
};
