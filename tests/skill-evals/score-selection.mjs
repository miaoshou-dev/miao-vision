#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const evalDir = resolve(import.meta.dirname)
const corpus = JSON.parse(readFileSync(resolve(evalDir, 'miao-vision-trigger-cases.json'), 'utf8'))

function score(resultName) {
  const result = JSON.parse(readFileSync(resolve(evalDir, resultName), 'utf8'))
  const counts = { truePositives: 0, trueNegatives: 0, falsePositives: 0, falseNegatives: 0 }
  const failures = []

  for (const testCase of corpus.cases) {
    const actual = result.decisions[testCase.id]
    if (typeof actual !== 'boolean') {
      throw new Error(`${resultName}: missing boolean decision for ${testCase.id}`)
    }

    if (testCase.expectedTrigger && actual) counts.truePositives += 1
    if (!testCase.expectedTrigger && !actual) counts.trueNegatives += 1
    if (!testCase.expectedTrigger && actual) counts.falsePositives += 1
    if (testCase.expectedTrigger && !actual) counts.falseNegatives += 1
    if (testCase.expectedTrigger !== actual) failures.push(testCase.id)
  }

  const precision = counts.truePositives / (counts.truePositives + counts.falsePositives)
  const recall = counts.truePositives / (counts.truePositives + counts.falseNegatives)
  const accuracy = (counts.truePositives + counts.trueNegatives) / corpus.cases.length
  const explicitPositiveCases = corpus.cases.filter(({ suite }) => suite === 'selection-positive')
  const explicitPositiveRecall = explicitPositiveCases.filter(({ id }) => result.decisions[id]).length / explicitPositiveCases.length
  const highRiskNegativeCases = corpus.cases.filter(({ suite }) => suite === 'selection-negative')
  const highRiskNegativeAccuracy = highRiskNegativeCases.filter(({ id }) => !result.decisions[id]).length / highRiskNegativeCases.length

  return {
    result: resultName,
    ...counts,
    precision,
    recall,
    accuracy,
    explicitPositiveRecall,
    highRiskNegativeAccuracy,
    failures
  }
}

const baseline = score('miao-vision-baseline-results.json')
const candidate = score('miao-vision-candidate-results.json')
const output = { baseline, candidate }

console.log(JSON.stringify(output, null, 2))

if (candidate.highRiskNegativeAccuracy !== 1 || candidate.explicitPositiveRecall < 0.9 || candidate.recall < 0.9) {
  process.exitCode = 1
}
