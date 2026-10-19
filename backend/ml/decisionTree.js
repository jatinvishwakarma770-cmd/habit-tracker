
"use strict";

const {
  FEATURES,
  CLASSIFICATION_THRESHOLD,
  MIN_POSITIVE_TEST_SAMPLES,
  MIN_NEGATIVE_TEST_SAMPLES,
  dateKey,
  addDays,
  isScheduled,
  getOutcomeSets,
  getFeatures,
  buildTrainingData,
  countLabels,
  splitChronologically,
  majorityBaseline,
  calculateMetrics,
  getEvaluationWarning,
  insufficientPredictionData,
} = require("./sharedData");

const MAX_DEPTH = 5;
const MIN_LEAF_SAMPLES = 4;
const EPSILON = 1e-9;

// Prediction reliability thresholds.
// These describe support for the prediction, not a guarantee of accuracy.
const MIN_RELIABLE_TOTAL = 50;
const MIN_RELIABLE_CLASS_SAMPLES = 10;
const MAX_CLASS_IMBALANCE_RATIO = 4;

// --------------------------------------------------
// 1. Label helpers
// --------------------------------------------------

function isCompletedLabel(label) {
  return (
    label === 1 ||
    label === true ||
    label === "1" ||
    label === "completed"
  );
}

function normalizeLabel(label) {
  return isCompletedLabel(label) ? 1 : 0;
}

function getFeatureValue(row, feature) {
  const value = row.featureObject?.[feature];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const converted = Number(value);
  return Number.isFinite(converted) ? converted : 0;
}

// --------------------------------------------------
// 2. Gini impurity
// --------------------------------------------------

function gini(rows) {
  if (!rows || rows.length === 0) {
    return 0;
  }

  let completed = 0;

  for (const row of rows) {
    if (normalizeLabel(row.label) === 1) {
      completed++;
    }
  }

  const pCompleted = completed / rows.length;
  const pMissed = 1 - pCompleted;

  return 1 - pCompleted ** 2 - pMissed ** 2;
}

// --------------------------------------------------
// 3. Majority class
// --------------------------------------------------

function majorityLabel(rows) {
  let completed = 0;
  let missed = 0;

  for (const row of rows) {
    if (normalizeLabel(row.label) === 1) {
      completed++;
    } else {
      missed++;
    }
  }

  // Predict missed when both classes have equal counts.
  return completed > missed ? 1 : 0;
}

// --------------------------------------------------
// 4. Create a leaf node
// --------------------------------------------------

function makeLeaf(rows) {
  let completed = 0;

  for (const row of rows) {
    if (normalizeLabel(row.label) === 1) {
      completed++;
    }
  }

  const missed = rows.length - completed;

  // Laplace smoothing avoids probabilities of exactly 0 or 1.
  const probabilityCompleted =
    (completed + 1) / (rows.length + 2);

  return {
    type: "leaf",
    prediction: majorityLabel(rows),
    probabilityCompleted,
    samples: rows.length,
    classCounts: {
      completed,
      missed,
    },
  };
}

// --------------------------------------------------
// 5. Find the best CART split
// --------------------------------------------------

function findBestSplit(rows) {
  if (!rows || rows.length < MIN_LEAF_SAMPLES * 2) {
    return null;
  }

  const parentGini = gini(rows);

  if (parentGini <= EPSILON) {
    return null;
  }

  let bestSplit = null;
  let bestImpurity = Infinity;

  for (const feature of FEATURES) {
    const values = [
      ...new Set(
        rows.map((row) => getFeatureValue(row, feature))
      ),
    ].sort((a, b) => a - b);

    if (values.length < 2) {
      continue;
    }

    // Candidate thresholds are midpoints between unique values.
    for (let i = 0; i < values.length - 1; i++) {
      const threshold = (values[i] + values[i + 1]) / 2;

      const left = [];
      const right = [];

      for (const row of rows) {
        if (getFeatureValue(row, feature) <= threshold) {
          left.push(row);
        } else {
          right.push(row);
        }
      }

      if (
        left.length < MIN_LEAF_SAMPLES ||
        right.length < MIN_LEAF_SAMPLES
      ) {
        continue;
      }

      const weightedImpurity =
        (left.length / rows.length) * gini(left) +
        (right.length / rows.length) * gini(right);

      if (weightedImpurity < bestImpurity) {
        bestImpurity = weightedImpurity;

        bestSplit = {
          feature,
          threshold,
          left,
          right,
          impurity: weightedImpurity,
          impurityReduction: parentGini - weightedImpurity,
        };
      }
    }
  }

  // Do not split when there is no meaningful improvement.
  if (
    !bestSplit ||
    bestSplit.impurityReduction <= EPSILON
  ) {
    return null;
  }

  return bestSplit;
}

// --------------------------------------------------
// 6. Train the Decision Tree
// --------------------------------------------------

function trainTree(rows, depth = 0) {
  if (!rows || rows.length === 0) {
    return makeLeaf([]);
  }

  if (
    depth >= MAX_DEPTH ||
    rows.length < MIN_LEAF_SAMPLES * 2 ||
    gini(rows) <= EPSILON
  ) {
    return makeLeaf(rows);
  }

  const split = findBestSplit(rows);

  if (!split) {
    return makeLeaf(rows);
  }

  return {
    type: "node",
    feature: split.feature,
    threshold: split.threshold,
    samples: rows.length,
    impurityReduction: split.impurityReduction,
    left: trainTree(split.left, depth + 1),
    right: trainTree(split.right, depth + 1),
  };
}

// --------------------------------------------------
// 7. Predict completion probability
// --------------------------------------------------

function predictTreeProbability(tree, featureObject) {
  if (!tree) {
    return 0.5;
  }

  if (tree.type === "leaf") {
    return tree.probabilityCompleted;
  }

  const rawValue = featureObject?.[tree.feature];
  const converted = Number(rawValue);

  const value = Number.isFinite(converted) ? converted : 0;

  if (value <= tree.threshold) {
    return predictTreeProbability(tree.left, featureObject);
  }

  return predictTreeProbability(tree.right, featureObject);
}

// --------------------------------------------------
// 8. Assess prediction reliability
// --------------------------------------------------

function assessPredictionReliability(rows) {
  const counts = countLabels(rows || []);
  const completed = counts.completed ?? 0;
  const missed = counts.missed ?? 0;
  const total = completed + missed;

  const warnings = [];

  const enoughTotalSamples = total >= MIN_RELIABLE_TOTAL;
  const enoughCompletedSamples =
    completed >= MIN_RELIABLE_CLASS_SAMPLES;
  const enoughMissedSamples =
    missed >= MIN_RELIABLE_CLASS_SAMPLES;

  const hasBothClasses = completed > 0 && missed > 0;

  const imbalanceRatio =
    completed === 0 || missed === 0
      ? null
      : Math.max(completed, missed) /
        Math.min(completed, missed);

  const classesImbalanced =
    imbalanceRatio !== null &&
    imbalanceRatio >= MAX_CLASS_IMBALANCE_RATIO;

  if (!enoughTotalSamples) {
    warnings.push(
      `Only ${total} recorded outcomes are available. ` +
      `At least ${MIN_RELIABLE_TOTAL} are recommended for stronger support.`
    );
  }

  if (!hasBothClasses) {
    warnings.push(
      "Training data contains only one outcome class. " +
      "The model cannot learn the difference between completed and missed outcomes."
    );
  } else {
    if (!enoughCompletedSamples) {
      warnings.push(
        `Only ${completed} completed outcomes are available. ` +
        `At least ${MIN_RELIABLE_CLASS_SAMPLES} are recommended.`
      );
    }

    if (!enoughMissedSamples) {
      warnings.push(
        `Only ${missed} missed outcomes are available. ` +
        `At least ${MIN_RELIABLE_CLASS_SAMPLES} are recommended.`
      );
    }
  }

  if (classesImbalanced) {
    warnings.push(
      "Completed and missed outcomes are imbalanced, which may bias predictions."
    );
  }

  const reliable =
    enoughTotalSamples &&
    enoughCompletedSamples &&
    enoughMissedSamples &&
    hasBothClasses &&
    !classesImbalanced;

  return {
    status: reliable ? "better_supported" : "limited",
    reliable,
    totalSamples: total,
    classDistribution: {
      completed,
      missed,
    },
    completedPercent:
      total > 0
        ? Number(((completed / total) * 100).toFixed(2))
        : 0,
    missedPercent:
      total > 0
        ? Number(((missed / total) * 100).toFixed(2))
        : 0,
    imbalanceRatio:
      imbalanceRatio === null
        ? null
        : Number(imbalanceRatio.toFixed(2)),
    thresholds: {
      minimumTotalSamples: MIN_RELIABLE_TOTAL,
      minimumSamplesPerClass: MIN_RELIABLE_CLASS_SAMPLES,
      maximumRecommendedImbalanceRatio: MAX_CLASS_IMBALANCE_RATIO,
    },
    warnings,
    note: reliable
      ? "The dataset meets the configured minimum reliability checks. Predictions are still estimates, not guarantees."
      : "Treat the predicted probability as uncertain. More balanced, recorded outcomes may improve model support.",
  };
}

// --------------------------------------------------
// 9. Check evaluation reliability
// --------------------------------------------------

function assessEvaluationReliability(training, testing) {
  const trainingCounts = countLabels(training);
  const testingCounts = countLabels(testing);

  const minimumPositiveTestSamples =
    MIN_POSITIVE_TEST_SAMPLES ?? 10;

  const minimumNegativeTestSamples =
    MIN_NEGATIVE_TEST_SAMPLES ?? 10;

  const enoughTrainingPositives =
    (trainingCounts.completed ?? 0) >= 5;

  const enoughTestingPositives =
    (testingCounts.completed ?? 0) >=
    minimumPositiveTestSamples;

  const enoughTestingNegatives =
    (testingCounts.missed ?? 0) >=
    minimumNegativeTestSamples;

  const reliable =
    enoughTrainingPositives &&
    enoughTestingPositives &&
    enoughTestingNegatives;

  const reasons = [];

  if (!enoughTrainingPositives) {
    reasons.push(
      `Training data has only ${
        trainingCounts.completed ?? 0
      } completed examples. At least 5 are recommended.`
    );
  }

  if (!enoughTestingPositives) {
    reasons.push(
      `Test data has only ${
        testingCounts.completed ?? 0
      } completed examples. At least ${minimumPositiveTestSamples} are recommended.`
    );
  }

  if (!enoughTestingNegatives) {
    reasons.push(
      `Test data has only ${
        testingCounts.missed ?? 0
      } missed examples. At least ${minimumNegativeTestSamples} are recommended.`
    );
  }

  return {
    status: reliable
      ? "sufficient_test_class_samples"
      : "insufficient_test_class_samples",
    reliableForClassComparison: reliable,
    minimumRecommendedTestSamples: {
      completed: minimumPositiveTestSamples,
      missed: minimumNegativeTestSamples,
    },
    actualTrainingSamples: training.length,
    actualTestSamples: testing.length,
    trainingClassDistribution: trainingCounts,
    testClassDistribution: testingCounts,
    reasons,
  };
}

// --------------------------------------------------
// 10. Evaluate model using chronological test data
// --------------------------------------------------

function evaluateHabitModel(habits, now = new Date()) {
  const rows = buildTrainingData(habits, now);
  const split = splitChronologically(rows);

  if (split.status !== "success") {
    return {
      ...split,
      model: "Decision Tree",
    };
  }

  const tree = trainTree(split.training);

  const actual = split.testing.map((row) =>
    normalizeLabel(row.label)
  );

  const probabilities = split.testing.map((row) =>
    predictTreeProbability(tree, row.featureObject)
  );

  const baseline = majorityBaseline(
    split.training,
    split.testing
  );

  const metrics = calculateMetrics(actual, probabilities);

  const evaluationReliability = assessEvaluationReliability(
    split.training,
    split.testing
  );

  let evaluationWarning = null;

  try {
    evaluationWarning = getEvaluationWarning(
      split.testing,
      split.training
    );
  } catch (error) {
    evaluationWarning = null;
  }

  if (
    !evaluationReliability.reliableForClassComparison &&
    !evaluationWarning
  ) {
    evaluationWarning = evaluationReliability.reasons;
  }

  const predictionReliability = assessPredictionReliability(
    split.training
  );

  const baselineAccuracy =
    typeof baseline?.accuracy === "number"
      ? baseline.accuracy
      : null;

  const modelAccuracy =
    typeof metrics?.accuracy === "number"
      ? metrics.accuracy
      : null;

  return {
    status: "success",
    model: "Decision Tree",
    splitMethod: split.splitMethod,
    trainingDataType: "confirmed_user_recorded_outcomes",
    positiveClass: "completed",

    cutoffDate: split.cutoffDate,
    totalSamples: split.totalSamples,
    trainingSamples: split.trainingSamples,
    testSamples: split.testSamples,

    trainingPeriod: split.trainingPeriod,
    testPeriod: split.testPeriod,

    classDistribution: split.classDistribution,

    baseline,
    metrics,

    evaluationStatus: evaluationReliability.status,
    evaluationReliability,
    evaluationWarning,

    predictionReliability,

    baselineComparison: {
      baselineAccuracy,
      modelAccuracy,
      modelOutperformsBaseline:
        baselineAccuracy !== null && modelAccuracy !== null
          ? modelAccuracy > baselineAccuracy
          : null,
      interpretation:
        "Compare class-specific metrics as well as accuracy. " +
        "A model that predicts the majority class can achieve high accuracy " +
        "without identifying completed habits. Reliability depends on having " +
        "enough examples of both classes.",
    },
  };
}

// --------------------------------------------------
// 11. Predict the next unknown scheduled habit outcome
// --------------------------------------------------

function predictHabit(habits, habitId, now = new Date()) {
  const habit = (habits || []).find(
    (item) => String(item._id) === String(habitId)
  );

  if (!habit) {
    return {
      status: "not_found",
      model: "Decision Tree",
      message: "Habit not found.",
    };
  }

  const rows = buildTrainingData(habits, now);
  const insufficient = insufficientPredictionData(rows);

  if (insufficient) {
    return {
      ...insufficient,
      model: "Decision Tree",
      predictionReliability: assessPredictionReliability(rows),
    };
  }

  const tree = trainTree(rows);

  const { completed, missed } = getOutcomeSets(habit);
  const today = dateKey(now);

  let targetDate = null;

  // Predict a future scheduled day, starting tomorrow.
  // Skip dates that already have a recorded outcome.
  for (let offset = 1; offset <= 14; offset++) {
    const candidate = addDays(today, offset);

    if (!candidate || !isScheduled(habit, candidate)) {
      continue;
    }

    if (completed.has(candidate) || missed.has(candidate)) {
      continue;
    }

    targetDate = candidate;
    break;
  }

  if (!targetDate) {
    return {
      status: "no_target_date",
      model: "Decision Tree",
      message:
        "No unknown scheduled date found in the next 14 days.",
      predictionReliability: assessPredictionReliability(rows),
    };
  }

  const featureObject = getFeatures(habit, targetDate);

  const probabilityCompleted = predictTreeProbability(
    tree,
    featureObject
  );

  const predictionReliability =
    assessPredictionReliability(rows);

  return {
    status: "success",
    model: "Decision Tree",
    habitId: String(habit._id),
    targetDate,

    prediction:
      probabilityCompleted >= CLASSIFICATION_THRESHOLD
        ? "completed"
        : "missed",

    probabilityCompleted,
    probabilityMissed: 1 - probabilityCompleted,

    probabilityCompletedPercent: Number(
      (probabilityCompleted * 100).toFixed(2)
    ),

    classificationThreshold: CLASSIFICATION_THRESHOLD,
    trainingSamples: rows.length,
    classDistribution: countLabels(rows),
    predictionReliability,
    featuresUsed: FEATURES,
    inputFeatures: featureObject,

    interpretation:
      "This is an estimate based on recorded history, not a guarantee " +
      "of future behavior. Treat it cautiously when recorded outcomes " +
      "are limited or heavily imbalanced.",
  };
}

module.exports = {
  predictHabit,
  evaluateHabitModel,
};
