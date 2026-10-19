"use strict";

const {
  FEATURES,
  CLASSIFICATION_THRESHOLD,
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

const LEARNING_RATE = 0.03;
const EPOCHS = 1500;
const L2_REGULARIZATION = 0.001;
const EPSILON = 1e-9;
const MIN_RELIABLE_TOTAL = 50;
const MIN_RELIABLE_CLASS_SAMPLES = 10;
const MAX_CLASS_IMBALANCE_RATIO = 4;

// --------------------------------------------------
// 1. Numerical helpers
// --------------------------------------------------

function sigmoid(value) {
  // Prevent overflow in Math.exp().
  const clipped = Math.max(-35, Math.min(35, value));
  return 1 / (1 + Math.exp(-clipped));
}

function getFeatureValue(row, feature) {
  const value = Number(row.featureObject?.[feature]);
  return Number.isFinite(value) ? value : 0;
}

// --------------------------------------------------
// 2. Assess prediction-data reliability
// --------------------------------------------------

function assessPredictionReliability(rows) {
  const distribution = countLabels(rows || []);

  const completed = distribution.completed || 0;
  const missed = distribution.missed || 0;
  const total = completed + missed;

  const warnings = [];

  if (total < MIN_RELIABLE_TOTAL) {
    warnings.push(
      `The training dataset has fewer than ${MIN_RELIABLE_TOTAL} recorded outcomes.`
    );
  }

  if (completed < MIN_RELIABLE_CLASS_SAMPLES) {
    warnings.push(
      `There are fewer than ${MIN_RELIABLE_CLASS_SAMPLES} completed examples.`
    );
  }

  if (missed < MIN_RELIABLE_CLASS_SAMPLES) {
    warnings.push(
      `There are fewer than ${MIN_RELIABLE_CLASS_SAMPLES} missed examples.`
    );
  }

  const imbalanceRatio =
    completed > 0 && missed > 0
      ? Math.max(completed, missed) / Math.min(completed, missed)
      : null;

  if (completed === 0 || missed === 0) {
    warnings.push(
      "Both completed and missed outcomes must be represented to assess both classes."
    );
  } else if (imbalanceRatio >= MAX_CLASS_IMBALANCE_RATIO) {
    warnings.push(
      "Completed and missed outcomes are imbalanced, which may bias predictions."
    );
  }

  const status =
    total >= MIN_RELIABLE_TOTAL &&
    completed >= MIN_RELIABLE_CLASS_SAMPLES &&
    missed >= MIN_RELIABLE_CLASS_SAMPLES &&
    imbalanceRatio !== null &&
    imbalanceRatio < MAX_CLASS_IMBALANCE_RATIO
      ? "better_supported"
      : "limited";

  return {
    status,
    trainingSamples: total,
    completedSamples: completed,
    missedSamples: missed,
    imbalanceRatio:
      imbalanceRatio === null
        ? null
        : Number(imbalanceRatio.toFixed(2)),
    warnings,
    note:
      "These checks describe data limitations. They do not prove that " +
      "predicted probabilities are accurate or calibrated.",
  };
}

// --------------------------------------------------
// 3. Standardize features using training data only
// --------------------------------------------------

function fitStandardizer(rows) {
  const means = {};
  const scales = {};

  for (const feature of FEATURES) {
    const values = rows.map((row) =>
      getFeatureValue(row, feature)
    );

    const mean =
      values.reduce((sum, value) => sum + value, 0) /
      Math.max(values.length, 1);

    const variance =
      values.reduce(
        (sum, value) => sum + (value - mean) ** 2,
        0
      ) / Math.max(values.length, 1);

    const standardDeviation = Math.sqrt(variance);

    means[feature] = mean;
    scales[feature] =
      standardDeviation > EPSILON ? standardDeviation : 1;
  }

  return { means, scales };
}

function transformFeatures(featureObject, standardizer) {
  return FEATURES.map((feature) => {
    const rawValue = Number(featureObject?.[feature]);
    const value = Number.isFinite(rawValue) ? rawValue : 0;

    return (
      (value - standardizer.means[feature]) /
      standardizer.scales[feature]
    );
  });
}

// --------------------------------------------------
// 4. Train Logistic Regression using gradient descent
// --------------------------------------------------

function trainLogisticRegression(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Training data is empty.");
  }

  const completedCount = rows.filter(
    (row) => row.label === 1
  ).length;

  const missedCount = rows.length - completedCount;

  if (completedCount === 0 || missedCount === 0) {
    throw new Error(
      "Logistic Regression requires both completed and missed examples."
    );
  }

  const standardizer = fitStandardizer(rows);

  const trainingVectors = rows.map((row) => ({
    x: transformFeatures(row.featureObject, standardizer),
    y: row.label === 1 ? 1 : 0,
  }));

  const featureCount = FEATURES.length;

  let weights = new Array(featureCount).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const weightGradients = new Array(featureCount).fill(0);
    let biasGradient = 0;

    for (const sample of trainingVectors) {
      let linearValue = bias;

      for (let i = 0; i < featureCount; i++) {
        linearValue += weights[i] * sample.x[i];
      }

      const probability = sigmoid(linearValue);
      const error = probability - sample.y;

      for (let i = 0; i < featureCount; i++) {
        weightGradients[i] += error * sample.x[i];
      }

      biasGradient += error;
    }

    const sampleCount = trainingVectors.length;

    for (let i = 0; i < featureCount; i++) {
      const gradient =
        weightGradients[i] / sampleCount +
        L2_REGULARIZATION * weights[i];

      weights[i] -= LEARNING_RATE * gradient;
    }

    bias -= LEARNING_RATE * (biasGradient / sampleCount);
  }

  return {
    weights,
    bias,
    standardizer,
    trainingSamples: rows.length,
    trainingClassDistribution: countLabels(rows),
    features: FEATURES,
    epochs: EPOCHS,
    learningRate: LEARNING_RATE,
    regularization: L2_REGULARIZATION,
  };
}

// --------------------------------------------------
// 5. Predict completion probability
// --------------------------------------------------

function predictLogisticProbability(model, featureObject) {
  if (!model) {
    throw new Error(
      "A trained Logistic Regression model is required."
    );
  }

  const values = transformFeatures(
    featureObject,
    model.standardizer
  );

  let linearValue = model.bias;

  for (let i = 0; i < model.weights.length; i++) {
    linearValue += model.weights[i] * values[i];
  }

  return sigmoid(linearValue);
}

// --------------------------------------------------
// 6. Evaluate Logistic Regression
// --------------------------------------------------

function evaluateLogisticRegression(habits, now = new Date()) {
  const rows = buildTrainingData(habits, now);
  const split = splitChronologically(rows);

  if (split.status !== "success") {
    return {
      ...split,
      model: "Logistic Regression",
    };
  }

  const model = trainLogisticRegression(split.training);

  const actual = split.testing.map((row) => row.label);

  const probabilities = split.testing.map((row) =>
    predictLogisticProbability(model, row.featureObject)
  );

  const metrics = calculateMetrics(actual, probabilities);

  const baseline = majorityBaseline(
    split.training,
    split.testing
  );

  const evaluationWarning = getEvaluationWarning(
    split.testing,
    split.training
  );

  const testClassDistribution = countLabels(split.testing);

  const evaluationStatus =
    testClassDistribution.completed < 10 ||
    testClassDistribution.missed < 10
      ? "insufficient_test_class_samples"
      : "sufficient_test_class_samples";

  return {
    status: "success",
    model: "Logistic Regression",
    algorithm: "Binary Logistic Regression",
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

    modelConfiguration: {
      epochs: model.epochs,
      learningRate: model.learningRate,
      l2Regularization: model.regularization,
      features: FEATURES,
    },

    baseline,
    metrics,
    evaluationStatus,
    evaluationWarning,

    baselineComparison: {
      baselineAccuracy: baseline.accuracy,
      modelAccuracy: metrics.accuracy,
      modelOutperformsBaseline:
        typeof baseline.accuracy === "number" &&
        typeof metrics.accuracy === "number"
          ? metrics.accuracy > baseline.accuracy
          : null,
      interpretation:
        "Accuracy can be misleading when completed and missed outcomes " +
        "are imbalanced. Review precision, recall, balanced accuracy, " +
        "PR-AUC, and the confusion matrix. Evaluation quality also " +
        "depends on having enough examples of both classes.",
    },
  };
}

// --------------------------------------------------
// 7. Predict the next unknown scheduled outcome
// --------------------------------------------------

function predictHabitLogistic(
  habits,
  habitId,
  now = new Date()
) {
  const habit = (habits || []).find(
    (item) => String(item._id) === String(habitId)
  );

  if (!habit) {
    return {
      status: "not_found",
      model: "Logistic Regression",
      message: "Habit not found.",
    };
  }

  const rows = buildTrainingData(habits, now);
  const insufficient = insufficientPredictionData(rows);

  if (insufficient) {
    return {
      ...insufficient,
      model: "Logistic Regression",
    };
  }

  let model;

  try {
    model = trainLogisticRegression(rows);
  } catch (error) {
    return {
      status: "training_error",
      model: "Logistic Regression",
      message: error.message || "Unable to train the model.",
    };
  }

  const { completed, missed } = getOutcomeSets(habit);
  const today = dateKey(now);

  let targetDate = null;

  // Search future dates only, starting tomorrow.
  // Include offsets 1 through 14.
  for (let offset = 1; offset <= 14; offset++) {
    const candidate = addDays(today, offset);

    if (!candidate || !isScheduled(habit, candidate)) {
      continue;
    }

    // Skip dates that already have a recorded outcome.
    if (completed.has(candidate) || missed.has(candidate)) {
      continue;
    }

    targetDate = candidate;
    break;
  }

  if (!targetDate) {
    return {
      status: "no_target_date",
      model: "Logistic Regression",
      message:
        "No unknown scheduled future date was found in the next 14 days.",
    };
  }

  const featureObject = getFeatures(habit, targetDate);

  const probabilityCompleted = predictLogisticProbability(
    model,
    featureObject
  );

  const reliability = assessPredictionReliability(rows);

  return {
    status: "success",
    model: "Logistic Regression",
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
    predictionReliability: reliability,
    featuresUsed: FEATURES,
    inputFeatures: featureObject,

    interpretation:
      "This is a statistical estimate based on recorded history, " +
      "not a guarantee of future behavior. The reliability checks " +
      "identify data limitations but do not establish model accuracy.",
  };
}

module.exports = {
  predictHabitLogistic,
  evaluateLogisticRegression,
};