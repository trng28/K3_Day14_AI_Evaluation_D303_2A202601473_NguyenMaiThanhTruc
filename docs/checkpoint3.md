# Checkpoint 3: Golden Dataset, RAG và Benchmark

## 1. Mục tiêu

Checkpoint 3 xây dựng golden dataset có evidence provenance, sinh 20 câu trả lời
bằng RAG, chạy evaluation và hoàn thiện Exercise 3.2 cùng rubric LLM Judge trong
Exercise 3.3.

Trạng thái hiện tại: hoàn thành đầy đủ. Golden dataset đã PASS, RAG đã sinh đủ
20 answers, benchmark đã chạy thành công, Exercise 3.2 và Exercise 3.3 đã được
điền từ kết quả thực tế.

## 2. Golden Dataset

Dataset được xây dựng theo phương pháp evidence first. Corpus trong
`data/student_services` là source of truth duy nhất. Mỗi case được tạo theo thứ
tự sau:

1. Chọn use case từ manifest.
2. Chọn đoạn evidence nguyên văn trong corpus.
3. Liệt kê date, amount, condition, exception và policy version cần giữ lại.
4. Viết expected answer chỉ từ các claim đã có evidence.
5. Viết question phù hợp với độ khó.
6. Kiểm tra trùng ý, coverage và provenance bằng validator.

Dataset đã có đủ:

* 5 case Easy
* 7 case Medium
* 5 case Hard
* 3 case Adversarial
* 20 ID đúng thứ tự từ E01 đến A03
* Coverage đủ 10 trên 10 source documents
* Evidence là substring nguyên văn của source document
* Question và expected answer viết bằng tiếng Anh

Các adversarial attack type được giữ nguyên theo contract:

* A01: `out_of_scope`
* A02: `prompt_injection`
* A03: `false_premise_or_ambiguous_trap`

## 3. Kết quả validation

Command:

```powershell
.\.venv\Scripts\python.exe validate_golden_dataset.py
```

Mục đích: kiểm tra schema, thứ tự ID, distribution, attack type, document
coverage và evidence provenance.

Kết quả:

```text
QA pairs: 20
Difficulty: easy=5, medium=7, hard=5, adversarial=3
Document coverage: 10/10

PASS: dataset structure and evidence provenance are valid.
```

JSON cũng được parse độc lập thành công bằng command:

```powershell
.\.venv\Scripts\python.exe -m json.tool golden_dataset.json
```

## 4. Semantic Review

Validator chỉ kiểm tra cấu trúc và provenance, vì vậy dataset đã được review thủ
công thêm theo các tiêu chí sau:

* Easy dùng factual lookup trực tiếp, chủ yếu từ một document.
* Medium kết hợp nhiều bước, nhiều đoạn hoặc tác động liên tài liệu.
* Hard yêu cầu xử lý policy version, triggering date, exception, ambiguity hoặc
  phép suy luận từ nhiều điều kiện.
* Adversarial kiểm tra scope, prompt injection và false premise.
* Mỗi expected answer giữ đủ condition quan trọng để không thay đổi outcome.
* Không thêm policy từ kiến thức thực tế bên ngoài synthetic corpus.

Exercise 3.1 trong `exercises.md` đã được điền với thống kê, ba case đại diện,
quyết định thiết kế và checklist xác nhận.

## 5. Rubric LLM Judge

Exercise 3.3 đã được hoàn thiện với sáu dimensions:

* Correctness
* Completeness
* Relevance
* Evidence and citation
* Safety and privacy
* Tone and clarity

Rubric định nghĩa cụ thể score từ 1 đến 5. Các nguyên tắc chính gồm:

* Missing critical condition hoặc exception giới hạn score tối đa ở mức 3.
* Áp dụng sai policy version, date hoặc amount giới hạn score ở mức 2.
* Unsupported extra claim bị phạt theo mức độ ảnh hưởng.
* Safety và privacy là hard gate.
* Yêu cầu password, one-time code hoặc unauthorized record nhận score 1.
* Answer dài không tự động được cộng điểm.

Ba edge case gồm missing exception, grounded but verbose và helpful answer có
privacy failure. Bias controls gồm ẩn danh model, randomize response order, đảo
thứ tự khi chấm lại, atomic requirement checklist, multiple judges và human
review khi chênh lệch lớn hơn một mức.

## 6. Core Regression Check

Command:

```powershell
.\.venv\Scripts\python.exe -m pytest tests\ -q
```

Mục đích: xác nhận việc thêm dataset và cập nhật worksheet không làm ảnh hưởng
evaluation core đã hoàn thành ở CP2.

Kết quả: `41 passed, 1 skipped`.

Skipped test vẫn là bài reranking bonus.

## 7. RAG Generation

Command:

```powershell
.\.venv\Scripts\python.exe domain_assistant.py
```

Mục đích: load 20 questions, index 52 corpus chunks, retrieve tối đa 5 chunks cho
mỗi question và gọi model được cấu hình trong `.env` để sinh actual answer.

Kết quả:

```text
Generated 20 actual answers: artifacts/actual_answers.json
```

Artifact đã được kiểm tra bằng chương trình:

* Có đúng 20 records.
* Không có actual answer rỗng.
* Không có record báo lỗi.
* Cả 20 records đều có retrieved contexts.
* Generation chỉ sử dụng ID và question, không đọc expected answer hoặc gold
  contexts.

## 8. Evaluation và Exercise 3.2

Command:

```powershell
.\.venv\Scripts\python.exe evaluate_answers.py
```

Mục đích: nối golden records với actual answers, tính năm metrics, xác định pass,
failure type, aggregate report và ba case có overall score thấp nhất.

Kết quả aggregate:

* Overall pass rate: 70.0%
* Average Context Recall: 0.824
* Average Context Precision: 0.940
* Average Faithfulness: 0.647
* Average Relevance: 0.628
* Average Completeness: 0.635
* Failure distribution: 3 hallucination, 2 off topic, 1 irrelevant

Ba case thấp nhất:

1. A02 có overall score 0.000 và được heuristic gắn nhãn hallucination.
2. A01 có overall score 0.211 và được heuristic gắn nhãn hallucination.
3. A03 có overall score 0.358 và được heuristic gắn nhãn irrelevant.

Exercise 3.2 đã được điền đủ bảng 20 case, aggregate report, ba case thấp nhất
và nhận xét retrieval so với generation.

Retrieval có kết quả tốt hơn answer generation, đặc biệt Context Precision đạt
0.940. Relevance là answer metric thấp nhất. Ba adversarial case cho thấy giới
hạn của lexical overlap: A01 và A02 từ chối an toàn nhưng vẫn nhận score rất thấp
do không lặp lại nhiều token của expected answer. Đây là lý do cần bổ sung rubric
LLM Judge thay vì kết luận chất lượng chỉ từ pass rate.

Benchmark artifact đã được lưu tại:

```text
artifacts/benchmark_results.json
```

## 9. Bảo mật và khả năng tái lập

API key chỉ được đọc từ `.env` cục bộ. Key không được in ra terminal, ghi vào
artifact, documentation hoặc source code. File `.env` đã nằm trong `.gitignore`.

Model và retrieval configuration được lưu trong actual answer artifact để hỗ trợ
đối chiếu lần chạy. Nếu golden dataset thay đổi, actual answers và benchmark phải
được sinh lại cùng nhau để tránh mismatch.

## 10. Kết luận

Checkpoint CP3 đã hoàn thành đầy đủ. Dataset có đúng distribution và provenance,
validator báo PASS, 20 actual answers không lỗi, benchmark có đủ năm metrics,
Exercise 3.2 có bảng kết quả và ba case thấp nhất, Exercise 3.3 có rubric 1 đến 5
cùng edge cases và bias controls. Core suite vẫn đạt `41 passed, 1 skipped`.
