/**
 * Backfill legacy interactive lesson steps with step_type: "reflect".
 *
 * Dry run:
 *   node scripts/backfillInteractiveStepTypes.js
 *
 * Apply:
 *   node scripts/backfillInteractiveStepTypes.js --confirm
 */
import { pathToFileURL } from "node:url";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Lesson } from "../src/modules/courses/models/Lesson.js";

export function parseArgs(argv = process.argv.slice(2)) {
  return { confirm: argv.includes("--confirm") };
}

export async function backfillInteractiveStepTypes({ confirm = false } = {}) {
  const lessons = await Lesson.find({
    type: "INTERACTIVE",
    "interactiveConfig.steps": { $elemMatch: { step_type: { $exists: false } } },
  });

  let updated = 0;
  for (const lesson of lessons) {
    let changed = false;
    lesson.interactiveConfig.steps = (lesson.interactiveConfig?.steps || []).map((step) => {
      if (step.step_type) return step;
      changed = true;
      const rawStep = typeof step.toObject === "function" ? step.toObject() : step;
      return { ...rawStep, step_type: "reflect" };
    });

    if (changed) {
      updated += 1;
      if (confirm) {
        await lesson.save();
      }
    }
  }

  return { matched: lessons.length, updated, applied: confirm };
}

async function main() {
  const options = parseArgs();
  await connectDatabase();
  try {
    const result = await backfillInteractiveStepTypes(options);
    console.log(
      `${result.applied ? "Applied" : "Dry run"}: ${result.updated}/${result.matched} interactive lessons need step_type backfill.`
    );
  } finally {
    await disconnectDatabase();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
