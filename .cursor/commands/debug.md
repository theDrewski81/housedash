Generate Debug Handoff Prompt

Purpose You are being asked to stop your current approach and generate a structured handoff prompt for a separate debugging agent. The current fix-test cycle has stalled — repeated attempts are not converging on a solution. Your job now is to compile everything that has happened into a clear, actionable prompt that a fresh debugging agent can use to diagnose and resolve the issue from scratch.

Instructions Review the full conversation context and produce a prompt using the exact structure below. Be specific and literal — include actual code snippets, actual error output, and actual return values. Do not summarize vaguely.

Output Format Generate the following prompt, filling in every section from conversation context:

Debugging Agent Handoff
1. Objective
State the original goal in precise technical terms.

What operation/feature/query is being implemented?
What are the inputs and expected outputs? Include concrete example values.
What file(s) and function(s) are involved?
2. Current State
What does the code look like RIGHT NOW (after the last attempted fix)?
Include the relevant code block(s) in full — do not abbreviate.
Note the file path(s) and line number(s).
3. Failure Timeline
For each fix-test cycle that occurred, document in order:

Attempt N
Change made: What was modified and why the agent believed it would work.
Test result: The exact output, error message, or return value observed.
Delta from expected: How the result differed from the objective.
(Repeat for every attempt in the conversation.)

4. Patterns & Observations
Based on the failure timeline:

Are results oscillating between failure modes (e.g., null ↔ too many results)?
Did any attempt partially succeed?
What has been RULED OUT by the attempts so far?
Are there signs of a root cause the previous agent may have overlooked (e.g., wrong table/join, filter logic inverted, parameter binding issue, caching, environment mismatch)?
5. Debugging Directives
Execute these steps IN ORDER before making any code changes:

Verify assumptions: Confirm the underlying data exists as expected. Run a raw/minimal query against the data source to validate baseline state.
Trace the data path: Add logging/print statements at each transformation step from input to output. Identify exactly where the result diverges from expectation.
Isolate the unit: Extract the failing logic into the smallest reproducible form. Test it independently of the surrounding code.
Check environmental factors: Confirm connection targets (DB name, host, schema), parameter binding/escaping, caching layers, and any middleware that could alter the query or result.
Diff against working state: If a prior version worked, diff the current code against that version and account for every change.
Do NOT skip ahead to writing a fix until steps 1-5 have been completed and their outputs are documented.

6. Success Criteria
Define exactly what "fixed" means:

 Query/operation returns: [expected result with concrete example values]
 Edge case A produces: [expected behavior]
 Edge case B produces: [expected behavior]
 No regressions in: [related functionality]
 Verified by running: [specific test command or validation step]
7. Constraints
Do not reintroduce any approach already documented as failed in section 3 unless you have a specific, articulable reason why it would succeed now with a different change.
Explain your diagnosis BEFORE proposing a fix.
After applying a fix, run the validation from section 6 and report results before considering the task complete.
Reminders

Pull REAL values from the conversation. Every section that says "include concrete example values" means literal copy-paste of actual data, queries, outputs, and error messages — not placeholders.

If you are uncertain about any detail, state what you know and flag what is ambiguous rather than guessing.

The debugging agent has NO access to this conversation. The handoff prompt must be fully self-contained.

