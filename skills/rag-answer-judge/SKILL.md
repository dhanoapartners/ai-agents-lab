---
name: rag-answer-judge
description: Judge a retrieval-augmented (RAG) answer for groundedness, relevance and completeness using the Practice Lab Eval Lab rubric, and return JSON. Use when evaluating chatbot or help-center answers against their sources.
---

# RAG answer judge

Input: question, answer, retrieved context passages, and optionally a reference answer.

## Rubric (score each 1 to 5)
- **Groundedness:** every claim in the answer is supported by the context. Any number, date or price not in the context makes that sentence unsupported.
- **Relevance:** the answer addresses the question that was asked.
- **Completeness:** the answer contains the key facts of the reference. A missing key number caps completeness at 2.
- If the reference is "I don't know based on the help center.", the only correct answer is a refusal.

**Pass rule:** groundedness ≥ 4, relevance ≥ 3, completeness ≥ 3.

## Also check (outside the rubric)
- Does the answer cite a retired or deprecated source? If so, fail it regardless of scores.
- Are citation markers like [1] present when sources were retrieved?

## Output (JSON only)
```json
{"groundedness": 1, "relevance": 1, "completeness": 1, "verdict": "pass|fail", "reasons": ["..."]}
```

## Calibrating yourself
Before trusting this judge on new data, run it on the Eval Lab's labeled set (`GET /api/v1/eval/labeled`) and compare with the human labels. Report agreement, false passes and false fails.
