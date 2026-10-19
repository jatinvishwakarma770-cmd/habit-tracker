
"use strict";

const FEATURES = [
  "completionRate",
  "currentStreak",
  "daysSinceCreated",
  "weekday",
  "previousDayCompleted",
  "scheduleType",
];

const SCHEDULE_TYPES = {
  daily: 0,
  weekdays: 1,
  weekends: 2,
  custom: 3,
};

const MIN_TRAINING_SAMPLES = 20;
const MIN_POSITIVE_TRAINING_SAMPLES = 5;
const MIN_POSITIVE_TEST_SAMPLES = 10;
const MIN_NEGATIVE_TEST_SAMPLES = 10;

const TEST_RATIO = 0.2;
const CLASSIFICATION_THRESHOLD = 0.5;
const EPSILON = 1e-15;

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// -----------------------------------------------------
// DATE HELPERS — CONSISTENT UTC CALENDAR DATES
// -----------------------------------------------------

function dateKey(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;

    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, "0"),
      String(value.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) {
      return parseDay(match[1]) ? match[1] : null;
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return null;

  return dateKey(parsed);
}

function parseDay(value) {
  const key =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : dateKey(value);

  if (!key) return null;

  const [year, month, day] = key.split("-").map(Number);

  const result = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0, 0)
  );

  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  ) {
    return null;
  }

  return result;
}

function addDays(value, amount) {
  const result = parseDay(value);

  if (!result || !Number.isFinite(amount)) return null;

  result.setUTCDate(result.getUTCDate() + Math.trunc(amount));

  return dateKey(result);
}

function daysBetween(start, end) {
  const first = parseDay(start);
  const second = parseDay(end);

  if (!first || !second) return 0;

  const a = Date.UTC(
    first.getUTCFullYear(),
    first.getUTCMonth(),
    first.getUTCDate()
  );

  const b = Date.UTC(
    second.getUTCFullYear(),
    second.getUTCMonth(),
    second.getUTCDate()
  );

  return Math.max(0, Math.floor((b - a) / 86400000));
}

function weekdayOf(value) {
  const date = parseDay(value);

  return date ? date.getUTCDay() : 0;
}

// -----------------------------------------------------
// SCHEDULE HELPERS
// -----------------------------------------------------

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isScheduled(habit, targetDate) {
  const day = weekdayOf(targetDate);
  const frequency = normalizeText(habit.frequency);

  if (["daily", "everyday", "every day"].includes(frequency)) {
    return true;
  }

  if (["weekdays", "weekdays only"].includes(frequency)) {
    return day >= 1 && day <= 5;
  }

  if (["weekends", "weekend"].includes(frequency)) {
    return day === 0 || day === 6;
  }

  if (frequency === "custom") {
    const customDays = Array.isArray(habit.customDays)
      ? habit.customDays
      : [];

    return customDays.some((value) => {
      if (typeof value === "number") return value === day;

      const name = normalizeText(value);

      return (
        name === DAY_NAMES[day] ||
        name === DAY_NAMES[day].slice(0, 3) ||
        name === String(day)
      );
    });
  }

  return false;
}

function getScheduleType(habit) {
  const frequency = normalizeText(habit.frequency);

  if (["weekdays", "weekdays only"].includes(frequency)) {
    return SCHEDULE_TYPES.weekdays;
  }

  if (["weekends", "weekend"].includes(frequency)) {
    return SCHEDULE_TYPES.weekends;
  }

  if (frequency === "custom") {
    return SCHEDULE_TYPES.custom;
  }

  return SCHEDULE_TYPES.daily;
}

// -----------------------------------------------------
// RECORDED OUTCOMES
// completed = 1, missed = 0, unknown = null
// -----------------------------------------------------

function toDateSet(values) {
  const result = new Set();

  if (!Array.isArray(values)) return result;

  for (const value of values) {
    const key = dateKey(value);

    if (key) result.add(key);
  }

  return result;
}

function getOutcomeSets(habit) {
  const completed = toDateSet(habit.completedDates);
  const missed = toDateSet(habit.missedDates);

  // Completion wins if a date appears in both lists.
  for (const date of completed) {
    missed.delete(date);
  }

  return { completed, missed };
}

function getLabel(habit, targetDate) {
  const { completed, missed } = getOutcomeSets(habit);

  if (completed.has(targetDate)) return 1;
  if (missed.has(targetDate)) return 0;

  return null;
}

// -----------------------------------------------------
// SHARED FEATURE ENGINEERING
// Uses only outcomes before targetDate.
// -----------------------------------------------------

function getFeatures(habit, targetDate) {
  const target = parseDay(targetDate);

  if (!target) {
    throw new Error(`Invalid target date: ${targetDate}`);
  }

  const normalizedTargetDate = dateKey(targetDate);

  const createdDate =
    dateKey(habit.createdAt) ||
    dateKey(habit.startDate) ||
    normalizedTargetDate;

  const { completed, missed } = getOutcomeSets(habit);

  let knownDays = 0;
  let completedDays = 0;

  for (
    let cursor = createdDate;
    cursor && cursor < normalizedTargetDate;
    cursor = addDays(cursor, 1)
  ) {
    if (!isScheduled(habit, cursor)) continue;

    if (completed.has(cursor)) {
      knownDays++;
      completedDays++;
    } else if (missed.has(cursor)) {
      knownDays++;
    }
  }

  let currentStreak = 0;
  let previousDayCompleted = 0;

  let cursor = addDays(normalizedTargetDate, -1);
  let checkedPreviousScheduledDay = false;

  for (let i = 0; cursor && i < 3660; i++) {
    if (cursor < createdDate) break;

    if (!isScheduled(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (!checkedPreviousScheduledDay) {
      previousDayCompleted = completed.has(cursor) ? 1 : 0;
      checkedPreviousScheduledDay = true;
    }

    if (completed.has(cursor)) {
      currentStreak++;
      cursor = addDays(cursor, -1);
    } else {
      // Unknown or missed scheduled days stop the streak.
      break;
    }
  }

  return {
    completionRate:
      knownDays > 0 ? completedDays / knownDays : 0,

    currentStreak,

    daysSinceCreated: daysBetween(
      createdDate,
      normalizedTargetDate
    ),

    weekday: target.getUTCDay(),

    previousDayCompleted,

    scheduleType: getScheduleType(habit),
  };
}

// -----------------------------------------------------
// BUILD COMMON DATASET
// Excludes today/future and unknown outcomes.
// -----------------------------------------------------

function buildTrainingData(habits, now = new Date()) {
  const rows = [];
  const today = dateKey(now);

  if (!today) {
    throw new Error("Invalid evaluation date.");
  }

  for (const habit of habits || []) {
    if (!habit || !habit.createdAt) continue;

    const createdDate = dateKey(habit.createdAt);

    if (!createdDate || createdDate >= today) continue;

    const { completed, missed } = getOutcomeSets(habit);
    const knownDates = new Set([...completed, ...missed]);

    for (const targetDate of knownDates) {
      if (targetDate >= today) continue;
      if (targetDate < createdDate) continue;
      if (!isScheduled(habit, targetDate)) continue;

      const label = getLabel(habit, targetDate);

      if (label === null) continue;

      const featureObject = getFeatures(habit, targetDate);

      rows.push({
        targetDate,
        habitId: String(habit._id || ""),
        featureObject,
        features: FEATURES.map(
          (feature) => featureObject[feature]
        ),
        label,
      });
    }
  }

  rows.sort(
    (a, b) =>
      a.targetDate.localeCompare(b.targetDate) ||
      a.habitId.localeCompare(b.habitId)
  );

  return rows;
}

// -----------------------------------------------------
// COUNTS AND CHRONOLOGICAL SPLIT
// -----------------------------------------------------

function countLabels(rows) {
  return rows.reduce(
    (counts, row) => {
      if (row.label === 1) counts.completed++;
      else if (row.label === 0) counts.missed++;

      return counts;
    },
    { completed: 0, missed: 0 }
  );
}

function splitChronologically(rows) {
  const dates = [
    ...new Set(rows.map((row) => row.targetDate)),
  ].sort();

  if (dates.length < 2) {
    return {
      status: "insufficient_data",
      message: "Outcomes must span at least two different dates.",
      totalSamples: rows.length,
      classDistribution: countLabels(rows),
    };
  }

  const splitIndex = Math.max(
    1,
    Math.min(
      dates.length - 1,
      Math.floor(dates.length * (1 - TEST_RATIO))
    )
  );

  const cutoffDate = dates[splitIndex];

  const training = rows.filter(
    (row) => row.targetDate < cutoffDate
  );

  const testing = rows.filter(
    (row) => row.targetDate >= cutoffDate
  );

  const allCounts = countLabels(rows);
  const trainingCounts = countLabels(training);
  const testingCounts = countLabels(testing);

  if (
    rows.length < MIN_TRAINING_SAMPLES ||
    training.length < MIN_TRAINING_SAMPLES ||
    testing.length === 0 ||
    trainingCounts.completed === 0 ||
    trainingCounts.missed === 0
  ) {
    return {
      status: "insufficient_data",
      message:
        "Need at least 20 total and training samples, a non-empty test set, and both classes in training.",
      splitMethod: "chronological_by_distinct_date",
      totalSamples: rows.length,
      cutoffDate,
      trainingSamples: training.length,
      testSamples: testing.length,
      classDistribution: {
        all: allCounts,
        training: trainingCounts,
        testing: testingCounts,
      },
    };
  }

  return {
    status: "success",
    splitMethod: "chronological_by_distinct_date",
    cutoffDate,
    rows,
    training,
    testing,
    totalSamples: rows.length,
    trainingSamples: training.length,
    testSamples: testing.length,
    trainingPeriod: {
      start: training[0].targetDate,
      end: training[training.length - 1].targetDate,
    },
    testPeriod: {
      start: testing[0].targetDate,
      end: testing[testing.length - 1].targetDate,
    },
    classDistribution: {
      all: allCounts,
      training: trainingCounts,
      testing: testingCounts,
    },
  };
}

// -----------------------------------------------------
// MAJORITY-CLASS BASELINE
// -----------------------------------------------------

function majorityBaseline(training, testing) {
  if (!training.length || !testing.length) {
    return {
      strategy: "majority_class",
      predictedClass: null,
      accuracy: null,
    };
  }

  const counts = countLabels(training);
  const predictedClass =
    counts.completed > counts.missed ? 1 : 0;

  const correct = testing.filter(
    (row) => row.label === predictedClass
  ).length;

  return {
    strategy: "majority_class",
    predictedClass:
      predictedClass === 1 ? "completed" : "missed",
    accuracy: correct / testing.length,
  };
}

// -----------------------------------------------------
// PR-AUC — AVERAGE PRECISION
// -----------------------------------------------------

function calculateAveragePrecision(actual, probabilities) {
  const positives = actual.filter(
    (value) => value === 1
  ).length;

  if (!actual.length || positives === 0) return null;

  const ranked = actual.map((label, index) => ({
    label,
    probability: probabilities[index],
    index,
  }));

  ranked.sort(
    (a, b) =>
      b.probability - a.probability || a.index - b.index
  );

  let truePositives = 0;
  let falsePositives = 0;
  let previousRecall = 0;
  let averagePrecision = 0;

  let index = 0;

  while (index < ranked.length) {
    const score = ranked[index].probability;
    let end = index;

    while (
      end < ranked.length &&
      ranked[end].probability === score
    ) {
      if (ranked[end].label === 1) truePositives++;
      else falsePositives++;

      end++;
    }

    const recall = truePositives / positives;
    const precision =
      truePositives / (truePositives + falsePositives);

    averagePrecision +=
      (recall - previousRecall) * precision;

    previousRecall = recall;
    index = end;
  }

  return averagePrecision;
}

// -----------------------------------------------------
// SHARED CLASSIFICATION AND PROBABILITY METRICS
// probabilities must be P(completed).
// -----------------------------------------------------

function calculateMetrics(actual, probabilities) {
  if (
    !Array.isArray(actual) ||
    !Array.isArray(probabilities) ||
    actual.length !== probabilities.length
  ) {
    throw new Error(
      "Actual labels and predicted probabilities must be arrays of equal length."
    );
  }

  if (actual.length === 0) {
    return {
      samples: 0,
      accuracy: null,
      balancedAccuracy: null,
      precision: null,
      recall: null,
      sensitivity: null,
      specificity: null,
      f1Score: null,
      logLoss: null,
      brierScore: null,
      prAuc: null,
      classificationThreshold: CLASSIFICATION_THRESHOLD,
      confusionMatrix: null,
    };
  }

  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  let totalLogLoss = 0;
  let totalBrierScore = 0;

  for (let i = 0; i < actual.length; i++) {
    const y = actual[i];
    const rawProbability = probabilities[i];

    if (
      (y !== 0 && y !== 1) ||
      !Number.isFinite(rawProbability) ||
      rawProbability < 0 ||
      rawProbability > 1
    ) {
      throw new Error(
        "Invalid label or predicted probability. Probabilities must be between 0 and 1."
      );
    }

    const p = Math.max(
      EPSILON,
      Math.min(1 - EPSILON, rawProbability)
    );

    const prediction =
      p >= CLASSIFICATION_THRESHOLD ? 1 : 0;

    totalLogLoss -=
      y * Math.log(p) + (1 - y) * Math.log(1 - p);

    totalBrierScore += (p - y) ** 2;

    if (y === 1 && prediction === 1) tp++;
    else if (y === 0 && prediction === 0) tn++;
    else if (y === 0 && prediction === 1) fp++;
    else fn++;
  }

  const safeDivide = (a, b) =>
    b === 0 ? null : a / b;

  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const specificity = safeDivide(tn, tn + fp);

  const f1Score =
    precision === null ||
    recall === null ||
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  const balancedAccuracy =
    recall === null || specificity === null
      ? null
      : (recall + specificity) / 2;

  return {
    samples: actual.length,
    accuracy: (tp + tn) / actual.length,
    balancedAccuracy,
    precision,
    recall,
    sensitivity: recall,
    specificity,
    f1Score,
    logLoss: totalLogLoss / actual.length,
    brierScore: totalBrierScore / actual.length,
    prAuc: calculateAveragePrecision(actual, probabilities),
    classificationThreshold: CLASSIFICATION_THRESHOLD,
    confusionMatrix: {
      labels: ["completed", "missed"],
      rows: {
        actualCompleted: {
          predictedCompleted: tp,
          predictedMissed: fn,
        },
        actualMissed: {
          predictedCompleted: fp,
          predictedMissed: tn,
        },
      },
    },
  };
}

// -----------------------------------------------------
// EVALUATION WARNINGS
// -----------------------------------------------------

function getEvaluationWarning(testing, training = []) {
  const testCounts = countLabels(testing);
  const trainingCounts = countLabels(training);
  const warnings = [];

  if (
    testCounts.completed === 0 ||
    testCounts.missed === 0
  ) {
    warnings.push(
      "The test period contains only one outcome class. Some metrics cannot be estimated reliably."
    );
  }

  if (testCounts.completed < MIN_POSITIVE_TEST_SAMPLES) {
    warnings.push(
      `The test set has only ${testCounts.completed} completed examples; at least ${MIN_POSITIVE_TEST_SAMPLES} are recommended for a more informative evaluation.`
    );
  }

  if (testCounts.missed < MIN_NEGATIVE_TEST_SAMPLES) {
    warnings.push(
      `The test set has only ${testCounts.missed} missed examples; at least ${MIN_NEGATIVE_TEST_SAMPLES} are recommended.`
    );
  }

  if (
    training.length > 0 &&
    trainingCounts.completed < MIN_POSITIVE_TRAINING_SAMPLES
  ) {
    warnings.push(
      `Training has only ${trainingCounts.completed} completed examples; at least ${MIN_POSITIVE_TRAINING_SAMPLES} are recommended.`
    );
  }

  const total = testCounts.completed + testCounts.missed;

  if (total > 0 && testCounts.completed / total < 0.1) {
    warnings.push(
      "Completed outcomes are under 10% of the test set. Accuracy alone may be misleading; inspect balanced accuracy, recall, PR-AUC, and the confusion matrix."
    );
  }

  return warnings.length ? warnings : null;
}

// -----------------------------------------------------
// PREDICTION DATA CHECK
// -----------------------------------------------------

function insufficientPredictionData(rows) {
  const counts = countLabels(rows);
  const reasons = [];

  if (rows.length < MIN_TRAINING_SAMPLES) {
    reasons.push(
      `At least ${MIN_TRAINING_SAMPLES} confirmed samples are required; currently there are ${rows.length}.`
    );
  }

  if (counts.completed === 0) {
    reasons.push("No completed outcomes are available.");
  }

  if (counts.missed === 0) {
    reasons.push("No missed outcomes are available.");
  }

  if (
    counts.completed < MIN_POSITIVE_TRAINING_SAMPLES
  ) {
    reasons.push(
      `Only ${counts.completed} completed outcomes are available; predictions may be unreliable.`
    );
  }

  if (reasons.length === 0) return null;

  return {
    status: "insufficient_data",
    message: reasons.join(" "),
    trainingSamples: rows.length,
    classDistribution: counts,
    minimumRequired: MIN_TRAINING_SAMPLES,
  };
}

// -----------------------------------------------------
// EXPORTS
// IMPORTANT: getOutcomeSets MUST be exported.
// -----------------------------------------------------

module.exports = {
  FEATURES,
  MIN_TRAINING_SAMPLES,
  MIN_POSITIVE_TRAINING_SAMPLES,
  MIN_POSITIVE_TEST_SAMPLES,
  MIN_NEGATIVE_TEST_SAMPLES,
  TEST_RATIO,
  CLASSIFICATION_THRESHOLD,

  dateKey,
  parseDay,
  addDays,
  daysBetween,
  weekdayOf,

  isScheduled,
  getScheduleType,

  getOutcomeSets,
  getLabel,
  getFeatures,

  buildTrainingData,
  countLabels,
  splitChronologically,
  majorityBaseline,

  calculateAveragePrecision,
  calculateMetrics,
  getEvaluationWarning,
  insufficientPredictionData,
};
