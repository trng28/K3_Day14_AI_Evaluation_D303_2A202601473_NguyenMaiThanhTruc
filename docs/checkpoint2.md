# Checkpoint 2: Core Coding

## 1. Mục tiêu

Checkpoint 2 hoàn thiện evaluation core trong `template.py` theo đúng contract
của lab. Phạm vi gồm năm nhóm chức năng: data models, RAGAS style evaluator,
LLM Judge, benchmark runner và failure analyzer.

Kết quả nghiệm thu cuối cùng:

* Targeted tests của cả năm Task đều đạt kết quả kỳ vọng.
* Full test suite đạt `41 passed, 1 skipped`.
* Test được skip thuộc bài reranking bonus và không nằm trong phạm vi bắt buộc.
* Manual demo chạy thành công với mock agent, không gọi API bên ngoài.
* `template.py` biên dịch thành công.

## 2. Nội dung đã triển khai

### Task 1: Data Models

`QAPair` đã được định nghĩa với các field:

* `question`
* `expected_answer`
* `context`
* `metadata`
* `retrieved_contexts`

Các field có giá trị mặc định sử dụng `default_factory` khi chứa cấu trúc mutable,
nhờ đó các instance không dùng chung dictionary hoặc list.

`EvalResult` lưu đầy đủ:

* Ba answer side scores gồm faithfulness, relevance và completeness
* Trạng thái `passed`
* `failure_type`
* Hai retrieval side scores tùy chọn gồm Context Precision và Context Recall

`overall_score()` trả về trung bình cộng của ba answer side scores. Retrieval
scores chỉ phục vụ chẩn đoán retriever và không tham gia overall score.

### Task 2: RAGAS Style Evaluator

Ba answer side metrics được triển khai đúng heuristic trong docstring:

* Faithfulness đo tỷ lệ token của answer được hỗ trợ bởi context.
* Relevance đo tỷ lệ token của question xuất hiện trong answer.
* Completeness đo mức độ answer bao phủ expected answer.

Hai retrieval side metrics gồm:

* Context Recall tính coverage trên union token của toàn bộ retrieved chunks.
* Context Precision tính Average Precision theo thứ tự xếp hạng của retriever.

Tất cả metric đều dùng `_tokenize()`, xử lý mẫu số bằng không và giới hạn kết
quả trong khoảng từ `0.0` đến `1.0`.

`run_full_eval()` luôn chạy ba answer side metrics. Khi `contexts` được cung cấp,
hàm tính thêm Context Recall và Context Precision. Khi `contexts` là `None`, hai
field retrieval giữ nguyên giá trị `None`.

Quy tắc pass và failure type chỉ dựa trên ba answer side scores, đúng yêu cầu
của core gốc.

### Task 3: LLM Judge

`LLMJudge` nhận judge callable qua constructor để hỗ trợ dependency injection.
Unit test vì vậy sử dụng mock response và không cần API key.

`score_response()` thực hiện các bước:

1. Tạo prompt chứa question, answer và từng tiêu chí rubric.
2. Gọi judge callable đúng một lần.
3. Parse JSON response.
4. Chuẩn hóa score về khoảng từ `0.0` đến `1.0`.
5. Dùng giá trị `0.5` nếu response hoặc một criterion không hợp lệ.
6. Trả về `scores` cùng raw response trong `reasoning`.

`detect_bias()` tổng hợp score batch và trả về ba cờ:

* `positional_bias`
* `leniency_bias`
* `severity_bias`

### Task 4: Benchmark Runner

`run()` giữ nguyên thứ tự QA đầu vào, gọi agent cho từng question và chuyển
`retrieved_contexts` vào tham số `contexts` của evaluator. Kết quả evaluation
được liên kết lại với chính `QAPair` ban đầu để giữ metadata và retrieval trace.

`generate_report()` tổng hợp:

* Tổng số case
* Số case pass
* Pass rate
* Trung bình ba answer side metrics
* Trung bình Context Recall và Context Precision trên các result có score
* Phân bố failure type

Missing retrieval score không bị quy đổi thành `0`. Nếu toàn bộ result không có
retrieval score, giá trị trung bình tương ứng là `None`.

`run_regression()` so sánh trung bình faithfulness, relevance và completeness
giữa lần chạy mới với baseline. Metric được đánh dấu regression khi mức giảm lớn
hơn `0.05`.

`identify_failures()` trả về các result có ít nhất một answer side score thấp hơn
threshold.

### Task 5: Failure Analyzer

`categorize_failures()` đếm failure theo taxonomy. Failure chưa có nhãn được gom
vào nhóm `unknown`.

`find_root_cause()` xác định nguyên nhân dựa trên metric thấp nhất:

* Faithfulness thấp gợi ý vấn đề context hoặc retrieval.
* Relevance thấp gợi ý answer chưa giải quyết đúng question.
* Completeness thấp gợi ý answer thiếu thông tin.
* Nhiều metric cùng thấp nhất gợi ý cần kiểm tra toàn pipeline.

`generate_improvement_suggestions()` tạo danh sách hành động dựa trên tần suất
failure và bổ sung regression, metric isolation, dataset augmentation khi cần.

`generate_improvement_log()` sinh Markdown log với mã failure, loại lỗi, root
cause, hướng xử lý và trạng thái `Open`.

## 3. Commands kiểm thử

Các command dưới đây được chạy tại thư mục gốc của lab bằng Python trong virtual
environment của repo.

### Kiểm tra Task 1

Mục đích: xác nhận công thức `overall_score()` và data model có thể khởi tạo đúng.

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_solution.py::TestEvalResultOverallScore -v
```

Kết quả: `3 passed`.

### Kiểm tra Task 2

Mục đích: xác nhận năm metrics, edge cases, rank aware precision và retrieval
wiring trong `run_full_eval()`.

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_solution.py::TestRAGASEvaluator tests/test_solution.py::TestContextMetrics tests/test_solution.py::TestRetrievalMetricWiring::test_run_full_eval_connects_optional_retrieval_metrics -v
```

Kết quả: `14 passed, 1 skipped`.

Test được skip là reranking bonus.

### Kiểm tra Task 3

Mục đích: xác nhận judge response schema và ba bias flags.

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_solution.py::TestLLMJudge -v
```

Kết quả: `4 passed`.

### Kiểm tra Task 4

Mục đích: xác nhận benchmark execution, report, regression detection và việc
chuyển retrieved contexts đến evaluator.

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_solution.py::TestBenchmarkRunner tests/test_solution.py::TestRunRegression tests/test_solution.py::TestRetrievalMetricWiring::test_runner_forwards_retrieved_contexts tests/test_solution.py::TestRetrievalMetricWiring::test_report_includes_retrieval_averages -v
```

Kết quả: `11 passed`.

### Kiểm tra Task 5

Mục đích: xác nhận failure taxonomy, suggestions và Markdown improvement log.

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_solution.py::TestFailureAnalyzer tests/test_solution.py::TestGenerateImprovementLog -v
```

Kết quả: `9 passed`.

### Kiểm tra toàn bộ Checkpoint 2

Mục đích: xác nhận các Task hoạt động đồng thời và không gây regression chéo.

```powershell
.\.venv\Scripts\python.exe -m pytest tests\ -v
```

Kết quả: `41 passed, 1 skipped` trên tổng số 42 test.

### Chạy manual demo

Mục đích: kiểm tra luồng benchmark và failure analysis với năm sample QA và
mock agent. Command này không gọi API và không thay thế full test suite.

```powershell
.\.venv\Scripts\python.exe template.py
```

Kết quả: command hoàn tất với exit code `0`, in benchmark report, failure
categories, root causes, suggestions và improvement log.

### Kiểm tra cú pháp

Mục đích: xác nhận module có thể compile độc lập.

```powershell
.\.venv\Scripts\python.exe -m py_compile template.py
```

Kết quả: command hoàn tất với exit code `0`.

## 4. Lưu ý kiểm thử

Pytest hiển thị một `PytestCacheWarning` vì môi trường hiện tại không thể tạo lại
một cache path đã tồn tại trong `.pytest_cache`. Cảnh báo không làm test fail,
không liên quan đến implementation và không ảnh hưởng kết quả nghiệm thu.

`rerank_by_overlap()` vẫn giữ trạng thái chưa triển khai vì đây là Exercise 3.5
bonus. Trạng thái này tạo ra đúng một skipped test theo yêu cầu CP2.

## 5. Kết luận

Checkpoint CP2 đã hoàn thành. Cả năm Task bắt buộc đều được xác nhận bằng đúng
targeted test tương ứng. Full suite đạt mức nghiệm thu `41 passed, 1 skipped`.
Evaluation core hiện sẵn sàng cho bước xây dựng golden dataset và chạy benchmark
thật ở phần tiếp theo của lab.
