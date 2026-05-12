# NotebookLM Pitch Pack - SpecHeal

Folder ini berisi source pack untuk membuat pitch deck SpecHeal di NotebookLM.

Upload semua file `.md` di folder ini ke NotebookLM, lalu gunakan prompt utama di bagian bawah README atau di `00_notebooklm_instructions.md`.

## Recommended Upload Order

1. `00_notebooklm_instructions.md`
2. `01_pitchdeck_brief.md`
3. `08_slide_blueprint.md`
4. `02_master_project_context.md`
5. `03_problem_evidence_why_now.md`
6. `04_solution_mechanism_openspec.md`
7. `05_product_demo_story.md`
8. `06_architecture_technical_proof.md`
9. `07_design_system_visual_direction.md`
10. `09_claims_limitations_judge_qna.md`
11. `10_evidence_appendix.md`
12. `11_visual_consistency_prompt.md`

## What This Pack Is For

Pack ini dibuat agar NotebookLM menghasilkan pitch deck yang:

- problem-first, bukan langsung demo fitur;
- kuat secara data, tapi tetap mudah dipahami dalam 5-6 menit;
- natural dalam bahasa Indonesia;
- cocok untuk judge hackathon, mentor, developer, dan stakeholder;
- menampilkan SpecHeal sebagai product yang nyata, bukan sekadar ide AI;
- menonjolkan OpenSpec sebagai source of truth;
- memakai visual style Spec-First Technical Manual: OpenSpec document artifact, annotation lines, proof seal, evidence dossier cards, selector tags, dan decision matrix yang rapi.

## Important Guardrails

- Jangan membuat klaim bahwa SpecHeal memperbaiki product code.
- Jangan menyebut SpecHeal sebagai blind self-healing.
- Jangan mengklaim test selalu benar setelah AI memberi jawaban.
- Jangan menghilangkan bagian problem. Problem harus terasa urgent sebelum solution muncul.
- Jangan membuat deployment URL, Jira issue key, atau API status final kecuali data final sudah diberikan.
- Jangan mengubah istilah teknis yang lebih natural dalam English, seperti automation testing, flaky test, locator drift, self-healing, false green, source of truth, evidence, verdict, rerun proof, dan recovery cockpit.

## Best Prompt To Use In NotebookLM

Gunakan prompt ini setelah semua file di-upload:

```text
Buat pitch deck 12 slide yang polished, Canva-ready, dan siap dipakai untuk pitch SpecHeal di Refactory Hackathon.

Audience: judge hackathon, mentor, developer, dan stakeholder non-technical yang perlu paham value produk.
Language: Bahasa Indonesia natural. Gunakan istilah teknis English jika lebih natural, seperti automation testing, flaky test, locator drift, self-healing, false green, source of truth, evidence, verdict, rerun proof, recovery cockpit.
Pitch length: 5-6 menit untuk deck, sisanya dipakai live demo.
Tone: senior, jelas, tajam, tidak lebay, tidak buzzword-heavy, dan demo-ready.

Prioritas narasi:
1. Tekankan problem dulu. Judge harus paham kenapa problem ini urgent.
2. Tampilkan data pendukung problem langsung di slide, bukan hanya di speaker notes.
3. Jelaskan automation testing sudah menjadi fondasi engineering modern.
4. Jelaskan trust crisis: CI merah tidak selalu berarti product bug karena flaky test dan test maintenance.
5. Jelaskan locator drift dengan contoh konkret selector `#pay-now` berubah menjadi `data-testid="complete-payment"`.
6. Jelaskan kenapa blind self-healing berbahaya karena bisa menghasilkan false green.
7. Baru masuk ke solution: SpecHeal sebagai evidence-backed test recovery cockpit.
8. Jelaskan OpenSpec sebagai source of truth untuk membedakan locator drift, product bug, dan spec outdated.
9. Showcase demo MVP: Healthy Flow, Locator Drift, Product Bug, OpenAI verdict, proof, PostgreSQL report, dan Jira handoff.
10. Tampilkan technical proof secara ringkas: Playwright, OpenAI gpt-4o-mini, OpenSpec, PostgreSQL, Jira, Kubernetes.

Gunakan visual style dari source pack:
- Spec-First Technical Manual + Evidence Dossier, bukan generic SaaS dashboard;
- light mode modern tech startup sebagai base: white/off-white, soft ash cards, slate text, banyak whitespace;
- visual utama berupa OpenSpec document artifact dengan annotation lines, source-of-truth stamp, dan proof seals;
- gunakan technical manual panel borders yang tipis dan rapi, bukan komik ramai;
- gunakan proof seal, verdict chip, selector tag, evidence dossier card, decision matrix, dan Jira note sebagai komponen berulang;
- Amber untuk broken/needs attention, Emerald untuk healed/proof passed, Blue untuk primary action/system, Red untuk product bug, Gold untuk OpenSpec source-of-truth;
- dark slide boleh dipakai maksimal 1-2 kali untuk CI failure atau false green, bukan sebagai dasar semua slide;
- jangan pakai karakter anime, chibi, robot, neon cyberpunk, AI brain, background fantasy, atau AI gradient generik.

Untuk setiap slide, berikan:
1. Slide number
2. Slide title
3. Main headline
4. On-slide copy yang singkat tetapi kuat
5. Data point yang harus tampil di slide jika relevan
6. Visual direction untuk Canva
7. Speaker notes untuk pitch 5-6 menit
8. Design notes

Ikuti slide blueprint dari source files. Jangan ubah deck menjadi PRD summary atau code walkthrough. Buat deck terasa seperti product pitch yang kuat, bukan dokumentasi internal.
```
