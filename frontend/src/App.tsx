import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type Summary = {
  total: number; passed: number; pass_rate: number; avg_faithfulness: number;
  avg_relevance: number; avg_completeness: number; avg_context_recall: number;
  avg_context_precision: number; failure_types: Record<string, number>;
  generated_at: string; agent: { model: string; top_k: number };
};

type Context = { source_doc: string; chunk_id?: string; text: string; score?: number };
type Case = {
  id: string; difficulty: string; question: string; actual_answer: string;
  expected_answer: string; passed: boolean; failure_type: string | null;
  faithfulness: number; relevance: number; completeness: number;
  context_recall: number; context_precision: number; overall: number;
  retrieved_contexts: Context[];
};

const metrics: [keyof Summary, string][] = [
  ["avg_context_recall", "Context recall"],
  ["avg_context_precision", "Context precision"],
  ["avg_faithfulness", "Faithfulness"],
  ["avg_relevance", "Relevance"],
  ["avg_completeness", "Completeness"],
];

function score(value: number) { return value.toFixed(3); }

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState<Case | null>(null);
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/summary").then((response) => {
        if (!response.ok) throw new Error("Summary is unavailable");
        return response.json();
      }),
      fetch("/api/cases").then((response) => {
        if (!response.ok) throw new Error("Cases are unavailable");
        return response.json();
      }),
    ]).then(([nextSummary, nextCases]) => {
      setSummary(nextSummary); setCases(nextCases); setSelected(nextCases[0]);
    }).catch((reason) => setError(reason.message));
  }, []);

  const filtered = useMemo(() => cases.filter((item) => {
    const statusMatch = status === "all" || (status === "passed" ? item.passed : !item.passed);
    const difficultyMatch = difficulty === "all" || item.difficulty === difficulty;
    const textMatch = `${item.id} ${item.question}`.toLowerCase().includes(query.toLowerCase());
    return statusMatch && difficultyMatch && textMatch;
  }), [cases, status, difficulty, query]);

  if (error) return <main className="center"><p className="eyebrow">API ERROR</p><h1>{error}</h1></main>;
  if (!summary) return <main className="center"><p className="eyebrow">LOADING EVALUATION TRACE</p></main>;

  return <main>
    <header className="hero">
      <div>
        <p className="eyebrow">NORTHSTAR UNIVERSITY · LAB 14</p>
        <h1>Evaluation <span>Workbench</span></h1>
        <p className="lede">Review benchmark quality and inspect individual evaluation traces.</p>
      </div>
      <div className="run-meta">
        <span className="pulse" /> LIVE ARTIFACT
        <strong>{summary.agent.model}</strong>
        <small>Top K {summary.agent.top_k} · {new Date(summary.generated_at).toLocaleDateString()}</small>
      </div>
    </header>

    <section className="scoreboard">
      <article className="pass-card"><span>Pass rate</span><strong>{Math.round(summary.pass_rate * 100)}%</strong><small>{summary.passed} of {summary.total} cases</small></article>
      <div className="metric-stack">
        {metrics.map(([key, label]) => <div className="metric" key={key}>
          <div><span>{label}</span><b>{score(summary[key] as number)}</b></div>
          <i><em style={{ width: `${(summary[key] as number) * 100}%` }} /></i>
        </div>)}
      </div>
      <article className="failure-card"><span>Failure clusters</span>{Object.entries(summary.failure_types).map(([name, count]) => <div key={name}><b>{count}</b> {name.replace("_", " ")}</div>)}</article>
    </section>

    <section className="workspace">
      <aside>
        <div className="filters">
          <input aria-label="Search cases" placeholder="Search ID or question" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div><select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All status</option><option value="passed">Passed</option><option value="failed">Failed</option></select>
          <select aria-label="Filter difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="all">All levels</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="adversarial">Adversarial</option></select></div>
        </div>
        <p className="case-count">{filtered.length} CASES</p>
        <div className="case-list">{filtered.map((item) => <button className={selected?.id === item.id ? "active" : ""} onClick={() => setSelected(item)} key={item.id}>
          <span className={item.passed ? "dot pass" : "dot fail"} /><b>{item.id}</b><p>{item.question}</p><em>{score(item.overall)}</em>
        </button>)}</div>
      </aside>

      {selected && <article className="detail">
        <div className="detail-head"><div><p className="eyebrow">{selected.difficulty} · {selected.id}</p><h2>{selected.question}</h2></div><span className={selected.passed ? "badge success" : "badge danger"}>{selected.passed ? "Passed" : selected.failure_type}</span></div>
        <div className="score-grid">{[["Recall", selected.context_recall], ["Precision", selected.context_precision], ["Faithful", selected.faithfulness], ["Relevant", selected.relevance], ["Complete", selected.completeness], ["Overall", selected.overall]].map(([label, value]) => <div key={label as string}><span>{label}</span><strong>{score(value as number)}</strong></div>)}</div>
        <section className="answer-grid">
          <div><p className="label">ACTUAL ANSWER</p><div className="markdown"><ReactMarkdown>{selected.actual_answer}</ReactMarkdown></div></div>
          <div><p className="label">EXPECTED ANSWER</p><div className="markdown"><ReactMarkdown>{selected.expected_answer}</ReactMarkdown></div></div>
        </section>
        <section className="trace"><div className="section-title"><p className="label">RETRIEVAL TRACE</p><span>{selected.retrieved_contexts.length} chunks</span></div>
          {selected.retrieved_contexts.map((context, index) => <details key={`${context.chunk_id}-${index}`} open={index === 0}><summary><b>#{index + 1}</b><span>{context.chunk_id || context.source_doc}</span><em>{context.score?.toFixed(3)}</em></summary><p>{context.text}</p></details>)}
        </section>
      </article>}
    </section>
  </main>;
}
