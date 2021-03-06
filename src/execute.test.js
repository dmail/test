import { test } from "./createTest.js"
import { executeOne, executeMany } from "./execute.js"
import { test as testCheap } from "@dmail/test-cheap"
import { createAction, failed } from "@dmail/action"
import { createSpy } from "@dmail/spy"
import assert from "assert"
import { install } from "lolex"

testCheap("execute", ({ ensure }) => {
	ensure("executeOne basics", () => {
		const clock = install()

		const action = createAction()
		const theTest = test(() => action)
		const description = theTest.description
		const onReady = createSpy()
		const onEnd = createSpy()
		const nowMs = Date.now()

		const testExecution = executeOne(theTest, { onReady, onEnd, allocatedMs: 10 })

		clock.tick(9)
		action.pass("hello world")

		assert.deepEqual(onReady.getReport(0).argValues, [
			{
				description,
				focused: false,
				skipped: false,
				startMs: nowMs,
			},
		])
		assert.deepEqual(onEnd.getReport(0).argValues, [
			{
				description,
				focused: false,
				skipped: false,
				expired: false,
				startMs: nowMs,
				endMs: nowMs + 9,
				passed: true,
				value: "hello world",
			},
		])
		assert.equal(testExecution.getState(), "passed")
		assert.deepEqual(testExecution.getResult(), {
			description,
			focused: false,
			skipped: false,
			startMs: nowMs,
			endMs: nowMs + 9,
			expired: false,
			passed: true,
			value: "hello world",
		})

		clock.uninstall()
	})

	ensure("executeOne implementation failed", () => {
		const value = 1
		const theTest = test(() => failed(value))
		const testExecution = executeOne(theTest)

		assert.equal(testExecution.isFailed(), true)
		const result = testExecution.getResult()
		assert.deepEqual(result.passed, false)
		assert.deepEqual(result.value, value)
	})

	ensure("executeOne implementation taking too much time to pass", () => {
		const clock = install()

		const allocatedMs = 10
		const requiredMs = 100
		const theTest = test(() => {
			const action = createAction()
			setTimeout(action.pass, requiredMs)
			return action
		})

		const testExecution = executeOne(theTest, { allocatedMs })

		assert.equal(testExecution.getState(), "unknown")
		clock.tick(allocatedMs)
		assert.equal(testExecution.getState(), "failed")
		assert.deepEqual(testExecution.getResult().expired, true)
		assert.doesNotThrow(() => clock.tick(requiredMs))

		clock.uninstall()
	})

	ensure("executeMany run scenario in serie", () => {
		// const firstAction = createAction()
		// const secondAction = createAction()
		// const firstSpy = createSpy(() => firstAction)
		// const secondSpy = createSpy(() => secondAction)
		// const { run } = createSuite(createTest("first", firstSpy), createTest("second", secondSpy))
		// run()
		// assert.equal(firstSpy.getReport(0).called, true)
		// assert.equal(secondSpy.getReport(0).called, false)
		// firstAction.pass()
		// assert.equal(secondSpy.getReport(0).called, true)
	})

	ensure("executeMany collect failures", () => {
		const clock = install()

		const nowMs = Date.now()
		const firstValue = 1
		const secondValue = 2
		const firstTest = test(() => failed(firstValue))
		const secondTest = test(() => failed(secondValue))
		const execution = executeMany([firstTest, secondTest])

		assert.deepEqual(execution.getResult(), [
			{
				description: firstTest.description,
				focused: false,
				skipped: false,
				expired: false,
				startMs: nowMs,
				endMs: nowMs,
				passed: false,
				value: firstValue,
			},
			{
				description: secondTest.description,
				focused: false,
				skipped: false,
				expired: false,
				startMs: nowMs,
				endMs: nowMs,
				passed: false,
				value: secondValue,
			},
		])

		clock.uninstall()
	})
})
