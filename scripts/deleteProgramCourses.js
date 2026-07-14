/**
 * One-off cleanup: delete all courses and course-owned data for selected programs.
 *
 * Dry run:
 *   npm run delete-program-courses
 *
 * Confirmed delete:
 *   npm run delete-program-courses -- --confirm
 *
 * Optional:
 *   npm run delete-program-courses -- --program "AI Masterclass" --confirm
 *   npm run delete-program-courses -- --allow-missing-programs
 */
import { pathToFileURL } from "node:url";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Program } from "../src/modules/programs/models/Program.js";
import { Course } from "../src/modules/courses/models/Course.js";
import { Section } from "../src/modules/courses/models/Section.js";
import { Lesson } from "../src/modules/courses/models/Lesson.js";
import { LessonProgress } from "../src/modules/courses/models/LessonProgress.js";
import { Enrollment } from "../src/modules/enrollments/models/Enrollment.js";
import { Task } from "../src/modules/tasks/models/Task.js";
import { TaskSubmission } from "../src/modules/tasks/models/TaskSubmission.js";
import { CourseMaterial } from "../src/modules/courses/models/CourseMaterial.js";
import { Announcement } from "../src/modules/announcements/models/Announcement.js";

export const DEFAULT_PROGRAM_NAMES = ["AI Masterclass", "Purpose Discovery"];

function unique(values) {
  return [...new Set(values)];
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    confirm: false,
    allowMissingPrograms: false,
    programNames: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--confirm") {
      options.confirm = true;
      continue;
    }

    if (arg === "--allow-missing-programs") {
      options.allowMissingPrograms = true;
      continue;
    }

    if (arg === "--program") {
      const name = argv[i + 1]?.trim();
      if (!name || name.startsWith("--")) {
        throw new Error("--program requires a program name");
      }
      options.programNames.push(name);
      i += 1;
      continue;
    }

    if (arg.startsWith("--program=")) {
      const name = arg.slice("--program=".length).trim();
      if (!name) {
        throw new Error("--program requires a program name");
      }
      options.programNames.push(name);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  options.programNames = unique(
    options.programNames.length ? options.programNames : DEFAULT_PROGRAM_NAMES
  );

  return options;
}

function idsFrom(docs) {
  return docs.map((doc) => doc._id);
}

function buildCourseFilters(courseIds, lessonIds, taskIds) {
  return {
    courses: { _id: { $in: courseIds } },
    sections: { courseId: { $in: courseIds } },
    lessons: { courseId: { $in: courseIds } },
    lessonProgress: { courseId: { $in: courseIds } },
    enrollments: { courseId: { $in: courseIds } },
    tasks: { courseId: { $in: courseIds } },
    taskSubmissions: { courseId: { $in: courseIds } },
    courseMaterials: {
      $or: [{ course: { $in: courseIds } }, { lesson: { $in: lessonIds } }],
    },
    announcements: { "targetAudience.courseId": { $in: courseIds } },
    prerequisiteReferences: { prerequisites: { $in: courseIds } },
    taskSubmissionsByTask: { taskId: { $in: taskIds } },
  };
}

async function countImpacted(filters) {
  const [
    courses,
    sections,
    lessons,
    lessonProgress,
    enrollments,
    tasks,
    taskSubmissions,
    taskSubmissionsByTask,
    courseMaterials,
    announcements,
    prerequisiteReferences,
  ] = await Promise.all([
    Course.countDocuments(filters.courses),
    Section.countDocuments(filters.sections),
    Lesson.countDocuments(filters.lessons),
    LessonProgress.countDocuments(filters.lessonProgress),
    Enrollment.countDocuments(filters.enrollments),
    Task.countDocuments(filters.tasks),
    TaskSubmission.countDocuments(filters.taskSubmissions),
    TaskSubmission.countDocuments(filters.taskSubmissionsByTask),
    CourseMaterial.countDocuments(filters.courseMaterials),
    Announcement.countDocuments(filters.announcements),
    Course.countDocuments(filters.prerequisiteReferences),
  ]);

  return {
    courses,
    sections,
    lessons,
    lessonProgress,
    enrollments,
    tasks,
    taskSubmissions: Math.max(taskSubmissions, taskSubmissionsByTask),
    courseMaterials,
    announcements,
    prerequisiteReferences,
  };
}

function printCounts(label, counts) {
  console.log(`\n${label}`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key}: ${value}`);
  }
}

async function resolvePrograms(programNames, allowMissingPrograms) {
  const programs = await Program.find({ name: { $in: programNames } })
    .select("_id name code status")
    .lean();
  const foundNames = new Set(programs.map((program) => program.name));
  const missingNames = programNames.filter((name) => !foundNames.has(name));

  if (missingNames.length && !allowMissingPrograms) {
    throw new Error(
      `Program(s) not found: ${missingNames.join(
        ", "
      )}. Pass --allow-missing-programs to continue.`
    );
  }

  if (!programs.length) {
    throw new Error("No target programs were found.");
  }

  return { programs, missingNames };
}

async function deleteImpacted(filters, courseIds) {
  const results = {};

  results.courseMaterials = await CourseMaterial.deleteMany(filters.courseMaterials);
  results.taskSubmissions = await TaskSubmission.deleteMany({
    $or: [filters.taskSubmissions, filters.taskSubmissionsByTask],
  });
  results.tasks = await Task.deleteMany(filters.tasks);
  results.lessonProgress = await LessonProgress.deleteMany(filters.lessonProgress);
  results.enrollments = await Enrollment.deleteMany(filters.enrollments);
  results.lessons = await Lesson.deleteMany(filters.lessons);
  results.sections = await Section.deleteMany(filters.sections);
  results.announcements = await Announcement.deleteMany(filters.announcements);
  results.prerequisiteReferences = await Course.updateMany(
    filters.prerequisiteReferences,
    { $pull: { prerequisites: { $in: courseIds } } }
  );
  results.courses = await Course.deleteMany(filters.courses);

  return Object.fromEntries(
    Object.entries(results).map(([key, result]) => [
      key,
      result.deletedCount ?? result.modifiedCount ?? 0,
    ])
  );
}

async function main() {
  const options = parseArgs();

  console.log("CONFAB LMS program course cleanup");
  console.log(`Mode: ${options.confirm ? "CONFIRMED DELETE" : "DRY RUN"}`);
  console.log(`Target programs: ${options.programNames.join(", ")}`);
  console.log("External Cloudinary/media assets will not be deleted.");

  await connectDatabase();

  try {
    const { programs, missingNames } = await resolvePrograms(
      options.programNames,
      options.allowMissingPrograms
    );
    const programIds = idsFrom(programs);
    const courses = await Course.find({ programId: { $in: programIds } })
      .select("_id title programId")
      .lean();

    if (!courses.length) {
      throw new Error("No matching courses found for the target program(s).");
    }

    const courseIds = idsFrom(courses);
    const lessons = await Lesson.find({ courseId: { $in: courseIds } })
      .select("_id")
      .lean();
    const tasks = await Task.find({ courseId: { $in: courseIds } })
      .select("_id")
      .lean();
    const filters = buildCourseFilters(courseIds, idsFrom(lessons), idsFrom(tasks));
    const beforeCounts = await countImpacted(filters);

    console.log("\nResolved programs:");
    for (const program of programs) {
      console.log(`  ${program.name} (${program.code || "no-code"}) - ${program._id}`);
    }
    if (missingNames.length) {
      console.log(`  Missing but allowed: ${missingNames.join(", ")}`);
    }

    console.log("\nCourses selected for deletion:");
    for (const course of courses) {
      console.log(`  ${course.title} - ${course._id}`);
    }

    printCounts("Impacted records before deletion:", beforeCounts);

    if (!options.confirm) {
      console.log(
        "\nDry run only. Re-run with --confirm to permanently delete these database records."
      );
      return;
    }

    const deletedCounts = await deleteImpacted(filters, courseIds);
    printCounts("Deleted/updated records:", deletedCounts);

    const afterCounts = await countImpacted(filters);
    printCounts("Remaining impacted records after deletion:", afterCounts);

    const remaining = Object.values(afterCounts).reduce((sum, count) => sum + count, 0);
    if (remaining > 0) {
      throw new Error("Cleanup finished with remaining impacted records.");
    }

    console.log("\nCourse cleanup completed successfully.");
  } finally {
    await disconnectDatabase();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("\nCourse cleanup failed:", error.message || error);
    process.exitCode = 1;
  });
}
