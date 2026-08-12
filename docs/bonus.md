# Bonus: Framework Comparison và Retrieval Reranking

## 1. Phạm vi

Bonus hoàn thành hai nội dung:

* Exercise 3.4 so sánh RAGAS và DeepEval trên cùng dataset/input
* Exercise 3.5 implement lexical reranker và đo trước, sau trên năm traces

Bonus không thay đổi dữ liệu golden, actual answers hoặc corpus.

## 2. Framework Comparison

So sánh sử dụng cùng 20 questions, expected answers, actual answers và retrieval
traces của CP3.

RAGAS-style baseline đã được chạy trong repo với kết quả:

* Pass rate 70.0%
* Context Recall 0.824
* Context Precision 0.940
* Faithfulness 0.648
* Relevance 0.627
* Completeness 0.629

DeepEval chưa được cài hoặc chạy vì package không nằm trong `requirements.txt`.
Phần DeepEval trong `exercises.md` là thiết kế đối chiếu minh bạch, sử dụng
`LLMTestCase`, Answer Relevancy, Faithfulness và G-Eval rubric trên cùng inputs.
Không có DeepEval score nào được giả lập.

Tài liệu chính thức được dùng để xác nhận dataset model, metrics và CI support:

* https://docs.ragas.io/en/stable/concepts/components/eval_dataset/
* https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/
* https://deepeval.com/docs/evaluation-introduction
* https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd

## 3. Reranker Implementation

`rerank_by_overlap()` tokenize question và từng context bằng helper `_tokenize()`
có sẵn, sau đó stable sort theo số token giao nhau giảm dần.

Implementation giữ các invariants:

* Không thêm chunk
* Không xóa chunk
* Không sửa nội dung chunk
* Giữ nguyên duplicate nếu có
* Chỉ thay đổi thứ tự

Vì Python sort ổn định, hai chunks cùng overlap score giữ nguyên relative order.

## 4. Measurement Method

Với mỗi trace:

1. Lấy nguyên `retrieved_contexts` từ `artifacts/actual_answers.json`.
2. Tính Context Recall và Context Precision với expected answer.
3. Rerank cùng list bằng question.
4. Xác nhận list sau rerank có cùng length và multiset.
5. Tính lại hai retrieval metrics.

Năm traces được báo cáo gồm E02, E03, M04, H02 và A03. Việc chọn có chủ đích
bao gồm một case cải thiện, ba case không đổi và một case regression để tránh
selection bias.

Kết quả trung bình:

* Recall giữ nguyên ở 0.827
* Precision tăng từ 0.978 lên 0.983
* Delta Precision là +0.006

E02 tăng 0.113, trong khi A03 giảm 0.083. Kết quả cho thấy lexical reranking có
thể cải thiện ranking nhưng không bảo đảm monotonic improvement. Question overlap
và expected-evidence relevance không phải lúc nào cũng đồng nhất.

## 5. Commands xác minh

Chạy toàn bộ test suite:

```powershell
.\.venv\Scripts\python.exe -m pytest tests\ -q
```

Kết quả sau khi hoàn thành reranker:

```text
42 passed
```

Kiểm tra bonus section không còn placeholder:

```powershell
rg -n "Framework 1: ____|Framework 2: ____|\*Câu trả lời:\*|\*Phân tích:\*" exercises.md
```

## 6. Kết luận

Exercise 3.4 và Exercise 3.5 đã hoàn thành. Framework comparison phân biệt rõ
kết quả đã chạy với thiết kế chưa chạy. Reranking được đo trên cùng tập chunks,
Recall giữ nguyên đúng lý thuyết, Precision trung bình tăng nhẹ và regression A03
được ghi nhận đầy đủ.
