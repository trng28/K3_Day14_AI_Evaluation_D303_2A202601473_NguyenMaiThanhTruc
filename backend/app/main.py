from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


DATA_DIR = Path(os.getenv("LAB_DATA_DIR", Path(__file__).resolve().parents[2]))


def _load_json(relative_path: str) -> dict[str, Any]:
    path = DATA_DIR / relative_path
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Missing artifact: {relative_path}") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=503, detail=f"Invalid JSON artifact: {relative_path}") from exc


@lru_cache(maxsize=1)
def _dataset() -> dict[str, Any]:
    return _load_json("golden_dataset.json")


@lru_cache(maxsize=1)
def _benchmark() -> dict[str, Any]:
    return _load_json("artifacts/benchmark_results.json")


@lru_cache(maxsize=1)
def _actual_answers() -> dict[str, Any]:
    return _load_json("artifacts/actual_answers.json")


def _joined_cases() -> list[dict[str, Any]]:
    gold = {item["id"]: item for item in _dataset()["qa_pairs"]}
    actual = {item["id"]: item for item in _actual_answers()["answers"]}
    cases: list[dict[str, Any]] = []
    for result in _benchmark()["results"]:
        case_id = result["id"]
        cases.append(
            {
                **result,
                "expected_answer": gold[case_id]["expected_answer"],
                "gold_contexts": gold[case_id]["contexts"],
                "retrieved_contexts": actual[case_id]["retrieved_contexts"],
            }
        )
    return cases


app = FastAPI(
    title="Lab 14 Evaluation API",
    description="Read-only API for the AI Evaluation and Benchmarking demo.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/summary")
def summary() -> dict[str, Any]:
    benchmark = _benchmark()
    actual = _actual_answers()
    return {
        **benchmark["summary"],
        "generated_at": actual["generated_at"],
        "agent": actual["agent"],
    }


@app.get("/api/cases")
def cases(
    difficulty: str | None = Query(default=None),
    status: str | None = Query(default=None, pattern="^(all|passed|failed)$"),
) -> list[dict[str, Any]]:
    items = _joined_cases()
    if difficulty and difficulty != "all":
        items = [item for item in items if item["difficulty"] == difficulty]
    if status == "passed":
        items = [item for item in items if item["passed"]]
    elif status == "failed":
        items = [item for item in items if not item["passed"]]
    return items


@app.get("/api/cases/{case_id}")
def case_detail(case_id: str) -> dict[str, Any]:
    for item in _joined_cases():
        if item["id"].casefold() == case_id.casefold():
            return item
    raise HTTPException(status_code=404, detail="Evaluation case not found")

