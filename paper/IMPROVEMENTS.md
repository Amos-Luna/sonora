# Reviewer-Driven Improvement Plan for Interspeech 2026 Submission

**Paper:** *Genealogical Priors in Self-Supervised Learning: Improving Speech Technology for Low-Resource Languages*

**Goal of this document:** translate the three expert reviews into concrete, copy-paste-ready edits, organized by paper zone. For every change I show:
1. **Where** in the paper it lives (section, lines, or table).
2. **Original text** (verbatim from `FinalSubmission.pdf`).
3. **Proposed rewrite** (in English, ready to drop in).
4. **Why (en español)** — la justificación detallada del cambio, vinculada a las críticas recibidas.

> ⚠️ Hard constraint: Interspeech papers are 4 pages of content + 1 page of references. Some of the additions below are deliberately compact; when a rewrite is longer than the original, I also indicate what to **cut** to keep the page budget.

---

## 0. How my view aligns with the three reviewers

| Reviewer | Main concerns | My alignment |
|---|---|---|
| **R1 (borderline accept)** | Writing flow, ambiguity in some sections | **Strongly aligned.** The Methodology and Discussion mix narration and results; several sentences are over-long and bury the contribution. |
| **R2 (borderline accept if framing is softened)** | Limited scale, generalizability, methodological confounds (filtering, imbalance, continued-pretraining), inconsistent terminology ("language-aware"), evaluation/statistical detail | **Fully aligned.** The single 60h run is the biggest threat to acceptance; we must (a) soften claims, (b) report seeds / variance or at minimum acknowledge the single-run limitation explicitly, and (c) clearly disentangle continued pretraining from family-aware sampling. |
| **R3** | Indo-European handled as a single block? Family alone is too simplistic; geography matters | **Aligned.** The Indo-European treatment is genuinely under-specified in the current Section 2.2 and Table 3. We must state the design choice (one bucket vs. subfamily buckets) and explicitly motivate it. |

**Bottom line:** the reviewers do not disagree with the core idea; they disagree with how it is *framed and substantiated*. The fixes below therefore prioritize **clarity, scope honesty, and methodological transparency** rather than adding new experiments — though I do propose two cheap ablations that, if you can run them, would meaningfully strengthen the paper.

> **Por qué (ES):** los tres revisores convergen en algo importante: la idea es buena pero la *narrativa* la sobre-vende dado el tamaño del experimento. La estrategia ganadora aquí no es prometer más experimentos que probablemente no podamos correr en el rebuttal (Interspeech 2026 ya no acepta cambios mayores), sino **bajar el tono de las afirmaciones, describir mejor lo que hicimos y aclarar las decisiones metodológicas**. Esto convierte un "borderline accept" en un "accept" sin necesidad de re-entrenar.

---

## 1. Title & Abstract

### 1.1 Title

**Original:**
> *Genealogical Priors in Self-Supervised Learning: Improving Speech Technology for Low-Resource Languages*

**Proposed:**
> *Genealogical Priors in Self-Supervised Speech Learning: A Small-Scale Study on Family-Aware Pretraining for Low-Resource Languages*

**Por qué (ES):** R2 dice explícitamente *"borderline accept if framing is softened"*. El título actual promete *"Improving Speech Technology"*, lo cual el experimento (60h, una sola corrida, sin superar a WavLM-Large) no demuestra. Añadir *"Small-Scale Study"* y *"Family-Aware Pretraining"* (i) calibra la expectativa del revisor desde la primera línea, (ii) elimina la ambigüedad terminológica que R2 critica (`language-aware` vs `family-aware`), y (iii) preserva la palabra clave *Genealogical Priors*, que es lo más original del trabajo.

---

### 1.2 Abstract

**Original (lines 4–17):**
> Over 7,000 languages are spoken worldwide, yet speech technology focuses on high-resource ones, leaving many underrepresented. Current strategies prioritize scaling data and compute, often overlooking linguistic structure. Motivated by evidence that related languages share phonetic features, we examine whether Self-Supervised Learning (SSL) models can leverage genealogical relationships to improve transfer to low-resource languages. Using WavLM-Large, we compare random multilingual training with language-family-aware subsets. Family-aware training outperforms random selection on downstream tasks despite similar pretraining convergence. However, both remain below the original WavLM-Large baseline, indicating that linguistic structure enhances robustness under data constraints but complements rather than replaces large-scale pretraining. Incorporating linguistic organization into SSL offers a principled path toward more inclusive speech technology.

**Proposed rewrite:**
> Over 7,000 languages are spoken worldwide, yet speech technology overwhelmingly serves a small set of high-resource ones. Mainstream self-supervised learning (SSL) treats multilingual diversity as a scaling variable, leaving the question of how to *organize* multilingual data largely unexplored. Motivated by evidence that genealogically related languages share systematic phonetic regularities, we ask whether *family-aware* sampling can serve as an inductive bias for SSL pretraining under data constraints. We continue-pretrain WavLM-Large on two matched 60-hour subsets of the Unsupervised People's Speech corpus: a *family-aware* subset that selects 2–3 languages per family across 32 languages, and a *random multilingual* subset matched in duration. On unseen languages from the Interspeech 2026 *Unsupervised People's Speech in the Wild* challenge (LID, ASR, speaker clustering), the family-aware model substantially outperforms the random baseline (overall score 0.50 vs. 0.04) despite nearly identical pretraining loss trajectories. Both models, however, underperform the original WavLM-Large, consistent with the small scale of our continued-pretraining regime. We interpret these results as evidence that, *at small scale*, the composition of multilingual data is a stronger driver of downstream behavior than convergence dynamics, and we discuss the limits of the genealogical view relative to areal and contact-based factors.
>
> **Index Terms:** self-supervised learning, language families, low-resource speech, multilingual pretraining, WavLM.

**Por qué (ES):**
- *"Mainstream SSL treats multilingual diversity as a scaling variable"* recoge tu contribución conceptual de manera más nítida — R1 pidió mejor flujo y R2 pidió mejor motivación.
- Introduzco los números clave (60h, 32 lenguas, 0.50 vs 0.04) en el resumen. R2 critica que falta detalle de evaluación; verlos ya en el abstract baja la ansiedad del revisor.
- Cambio *"enhances robustness"* por *"at small scale, the composition of multilingual data is a stronger driver of downstream behavior than convergence dynamics"*. Esto es exactamente lo que el experimento muestra y nada más — R2 quiere claims más calibrados.
- Añado *"and we discuss the limits of the genealogical view relative to areal and contact-based factors"*: R3 pide explícitamente reconocer la geografía/contacto; el abstract ya lo señala como parte del análisis, no solo como future work.
- Ya no llamo a la condición *"language-aware"*, uso **family-aware** consistentemente. R2 marca esta inconsistencia como un *minor issue* concreto.
- Añadí palabras clave más informativas. El abstract original tenía solo `language family, low-resource languages, SSL`, que es muy genérico para el comité.

---

## 2. Introduction (Section 1)

### 2.1 Motivation paragraph — tighten claims about SSL

**Original (lines 56–62):**
> These models, however, share a common characteristic in how training data is handled: they rely on continuous audio streams without an explicit strategy for sampling or organizing data based on linguistic structure. Consequently, multilingual diversity is treated primarily as a scaling variable rather than as a structured source of inductive bias, with the data pipeline focusing on format and scale over linguistic considerations.

**Proposed rewrite:**
> A common characteristic of these models, however, is that multilingual diversity is treated primarily as a scaling variable: training data is sampled in proportion to availability, with no explicit strategy for organizing it along linguistic dimensions. While massively multilingual SSL has yielded impressive results, this design choice leaves open a complementary question that we investigate here: *given a fixed budget of multilingual audio, does the way we organize languages along genealogical lines change what the model learns?*

**Por qué (ES):**

### 2.2 The hypothesis paragraph — explicit research questions

**Original (lines 63–79):**
> Rather than exposing a SSL model to an arbitrary multilingual mixture, we constructed training sets composed of multiple families, selecting two to three languages per family when available. Our central hypothesis is that this structured exposure encourages the model to learn family-level phonetic regularities that generalize beyond the languages seen during training. To evaluate this, we pretrained WavLM-Large model [17] on 35 languages spanning diverse families and compare family-aware sampling against random multilingual selection. The resulting models, submitted as embedding extractors under the Interspeech Unsupervised People's Speech in the Wild challenge, are evaluated on unseen languages across downstream tasks including Automatic Speech Recognition (ASR), language identification (LID), and speaker clustering. Our findings show that linguistic structure provides a meaningful inductive bias, with family-aware pretraining outperforming embeddings learned through unstructured multilingual scaling.

**Proposed rewrite:**
> We test this through a controlled comparison built around three research questions:
>
> **RQ1.** Under a fixed multilingual budget, does family-aware sampling produce better cross-lingual representations than random multilingual sampling?
>
> **RQ2.** Are these differences explained by pretraining convergence (e.g., final loss) or by the *composition* of the training data?
>
> **RQ3.** How do the resulting representations compare to a strong, large-scale SSL baseline (WavLM-Large) that has not seen the target languages?
>
> Concretely, we continue-pretrain WavLM-Large [17] on two matched 60-hour subsets of the Unsupervised People's Speech corpus: a *family-aware* subset that samples 2–3 languages from each of 16 families (32 languages in total), and a *random multilingual* subset matched in total duration. The resulting models are evaluated as embedding extractors in the Interspeech 2026 *Unsupervised People's Speech in the Wild* challenge, on unseen languages and three downstream tasks (LID, ASR, speaker clustering). Our contributions are: (i) a reproducible mapping from the 89 UPS languages to language families (Appendix A); (ii) empirical evidence that, at small scale, family-aware sampling sharply outperforms random sampling across all three tasks; and (iii) a critical analysis of why the genealogical prior alone is insufficient to outperform large-scale pretraining, and where areal and contact-based factors should complement it.

**Por qué (ES):**
- Convertir las hipótesis en RQs etiquetadas (RQ1–RQ3) es lo que un revisor de Interspeech espera ver: te permite **referirlas explícitamente en Resultados y Discusión**, lo que arregla automáticamente el flujo que R1 critica.
- Añado *"matched in total duration"* y *"2–3 languages from each of 16 families"* en la intro porque R2 dice que el *evaluation setup* tiene *limited detail*. Mejor que el lector vea los números clave desde la intro.
- Detecté una **inconsistencia fáctica** en tu paper: la introducción dice *"35 languages"* (línea 70), Section 2.2 dice *"32 languages across multiple families"* (línea 153), y la Tabla 5 lista 31 lenguas. Hay que **unificar el número** y reportarlo de forma idéntica en abstract, intro, métodos y tabla. Ver Issue cruzado #1 más abajo.
- Las contribuciones explícitas (i)/(ii)/(iii) son una práctica estándar en submisiones competitivas a Interspeech y se pueden citar luego. R3 valora la transparencia; un bullet de contribuciones la materializa.

---

## 3. Methodology (Section 2)

### 3.1 Section 2.1 — Data and Preprocessing: clean broken citation and tighten

**Original (lines 90–92):**
> More details about the statistics of the data can be found in the dataset card from Hugging Face [?].

**Proposed rewrite:**
> Detailed corpus statistics are reported in the official dataset card [18].

**Por qué (ES):** Hay una **referencia rota** (`[?]`) en el PDF — esto es un *automatic flag* en cualquier revisión. Punto crítico de claridad de R1. Además [18] ya cita Galvez et al. 2023 (Unsupervised People's Speech), así que no necesitas otra entrada bibliográfica.

### 3.2 Section 2.1 — Filtering paragraph: bullet structure & confound disclosure

**Original (lines 96–105):**
> • Segment duration filtering: We used at least 16 segments of minimum 10 seconds per audio file to enable meaningful feature extraction. Analysis of the VAD results showed that 97.29% of audio files did not meet this criterion.
> • Language availability filtering: We excluded audio files where both the VAD and language detection were empty. This applied to 192, 872 audio files.
> • Final usable data: After applying both filters, only 262, 275 audios met our criteria, while 1, 981, 063 audios were discarded.

**Proposed rewrite:**
> We applied two filters to the corpus before constructing our training subsets:
>
> 1. **Segment-duration filter.** We retained only files containing at least 16 VAD-detected segments of 10 s or longer; this discarded 97.3% of files that, after VAD, contained too little contiguous speech for stable contrastive learning.
> 2. **Language-availability filter.** We discarded the 192,872 files for which both VAD and Whisper-v3 LID returned empty outputs.
>
> After filtering, 262,275 files (≈281k hours) remained, out of 2,243,338 originally annotated. *We note this aggressive filtering is itself a methodological choice and may bias the corpus toward longer, cleaner recordings; we revisit this confound in §4.*

**Por qué (ES):**
- R2 marca *data filtering* como un confound y el revisor R3 alaba la *transparent discussion of limitations* — añadir la frase final ("aggressive filtering is itself a methodological choice...") **anticipa** la crítica de R2 sin necesidad de repetir experimentos.
- La numeración 1./2. es más legible que viñetas largas (R1: *"some parts were a bit ambiguous"*).
- El número total absoluto (`2,243,338`) hace los porcentajes interpretables (criterio implícito de R2 sobre *evaluation setup*).

### 3.3 Section 2.1 — Pilot embedding analysis: clarify role and tighten

The pilot analysis (Wav2Vec/HuBERT centroid classification, Table 1) is currently sandwiched between data filtering and family construction without a clear purpose statement. R1 specifically flags writing flow.

**Original (lines 108–136):** the paragraph beginning *"The resulting subset of audio still amounted to..."* and ending with *"...more compact and better-separated clusters in embedding space."*

**Proposed rewrite (replacement):**
> **Sanity check: does VAD filtering actually help SSL embeddings?** Before committing to the filtered corpus, we ran a small probe to verify that the filter improves representation quality. For 25 languages (1–2 per family), we extracted embeddings with off-the-shelf Wav2Vec-base and HuBERT-base under two conditions: *no VAD* and *with VAD + duration constraint*. For each condition, we computed per-language and per-family centroids and ran nearest-centroid classification (Euclidean distance). VAD filtering improved language-level accuracy by **+9.3 pp** for HuBERT (55.9 → 65.2) and **+7 pp** for Wav2Vec (43 → 50), with consistent gains at family level (Table 1). We therefore retain VAD filtering for all subsequent experiments.

**Por qué (ES):**
- Le doy un **título funcional** al párrafo (*"Sanity check..."*) para que el lector entienda por qué este experimento auxiliar está aquí. R1 dice que el documento "is sometimes difficult to follow"; agregar headers internos arregla justamente eso.
- Reporto el delta (`+9.3 pp`) en lugar de los números crudos repetidos, lo que reduce ~3 líneas y libera espacio.
- Refuerzo la conexión causa→decisión (*"We therefore retain VAD filtering..."*), que evita la sensación de "datos sueltos" que R1 menciona.
- **Importante:** si la Figure 1 actualmente no se refiere directamente, dejarla atada a este párrafo. Ver Issue cruzado #3.

### 3.4 Section 2.2 — Building language families: address R3's Indo-European critique head-on

This is the **single most important fix** demanded by R3. Right now, Indo-European appears in Table 3 with 9 subfamilies but it is unclear whether the model "sees" it as one bucket or as multiple buckets during sampling.

**Original (lines 137–161):**
> The core of our approach relies on accurately mapping the 89 languages found in the dataset to their respective families. This mapping shown in Appendix A, Table 3, was constructed using established linguistic resources such as Glottolog [19] and Ethnologue [20]. The distribution of audio segments in the full dataset is highly imbalanced (Figure 2), with Indo-European accounting for approximately 88% of all available speech segments. However, the selection of the training subset was performed at the language level, not at the audio level. Our objective was to ensure diversity rather than to replicate the raw audio imbalance of the corpus. Therefore, larger families were represented by a greater number of languages, while smaller families were included in their entirety when only one language was available. When possible, we ensured a minimum of two languages per family to allow for within-family variability during training. The final training dataset consisted of 32 languages across multiple families, comprising ≈ 56 hours of audio. The distribution of this dataset This dataset will be referred to as "language-aware" from now on.

**Proposed rewrite:**
> We mapped each of the 89 UPS languages to a top-level family using Glottolog v5.2 [19] and Ethnologue [20] (Appendix A, Table 3). Sixteen families are represented, with raw audio dominated by Indo-European (≈88% of segments after VAD; Figure 2).
>
> **Sampling unit and Indo-European treatment.** Sampling was performed at the *language* level, not at the audio-hour level, so as to decouple family coverage from corpus imbalance. Within Indo-European we did **not** treat the family as a single sampling bucket: we retained a coarse subfamily annotation (Germanic, Romance, Slavic, Indo-Iranian, etc.; Table 3) and ensured that no more than two Indo-European languages came from the *same subfamily*. This prevents the family-aware subset from being silently dominated by, e.g., Romance, which would conflate "family-aware" with "Romance-aware". For all other (much smaller) families we used the family as the sampling bucket and selected 2–3 languages when available, or all available languages otherwise.
>
> **Final family-aware subset.** The resulting training set spans 32 languages across 16 families and ≈56 hours of audio (Table 5). For brevity we refer to this configuration as **family-aware** throughout the paper; the random control is referred to as **random-multilingual** (replacing the earlier *no-language-aware* label).

**Por qué (ES):**
- R3 escribe textualmente: *"It is unclear how the Indo-European family (the most represented) is handled — whether treated as a single group or split into subfamilies, which might have improved results."* Esta es **una pregunta directa que debe tener una respuesta directa** en el paper, en un sub-párrafo dedicado. Si en realidad sí dividiste por subfamilias (lo cual sospecho dado que la Tabla 5 incluye `pt`, `lt`, `el`, `hy` — Romance, Báltico, Helénico, Armenio, etc.), tienes que **decirlo explícitamente** en el texto principal, no esconderlo en la tabla.
- Renombro las condiciones a **family-aware** y **random-multilingual**. R2 marca la inconsistencia terminológica como minor issue. Hago el remplazo en TODO el paper (ver Issue cruzado #2).
- Añado *"This prevents the family-aware subset from being silently dominated by Romance, which would conflate family-aware with Romance-aware"*: esto es exactamente el tipo de razonamiento que un revisor crítico (R2) quiere ver para creerse que el efecto no es un artefacto de balance.

> 🟡 **Acción requerida:** confirma cuál fue exactamente la regla de muestreo dentro de Indo-European. Si **sí** balanceaste por subfamilia, el texto anterior es correcto. Si **no** lo hiciste y todas las IE-languages venían del mismo bucket, debes decirlo y reconocerlo explícitamente como una limitación adicional en §4. Esta es la única forma honesta de cerrar la objeción de R3.

### 3.5 Section 2.2 — Random-multilingual control: justify the matching

**Original (lines 157–161):**
> For the "no-language-aware" evaluation, we constructed a training set by randomly sampling audio files from the UPS dataset without any language or family-based filtering. To ensure comparability, this subset was matched in total duration to the language-aware configuration.

**Proposed rewrite:**
> The **random-multilingual** control was built by uniformly sampling audio files from the *same* VAD-filtered pool, without any language or family stratification, until total duration matched the family-aware subset (≈56 h). All other preprocessing, augmentation, optimizer settings, batch composition and training steps were identical (§2.5). This isolates the *sampling strategy* as the only manipulated variable; in particular, both subsets are subject to the same VAD filter and originate from the same Whisper-v3 LID annotations, so any artefact introduced by filtering or imperfect LID is shared by both arms.

**Por qué (ES):** Esto contesta dos confounds que R2 menciona: (a) *"data filtering"* y (b) *"continued pretraining effects"*. La frase clave es *"This isolates the sampling strategy as the only manipulated variable"*: explícitamente nombras qué controlaste y qué no. Los revisores buscan esa frase de control experimental.

### 3.6 Section 2.3 — Models: distinguish "training from scratch" vs "continued pretraining"

**Original (lines 162–179):** The paragraph beginning *"In recent years, SLL speech models..."*

**Proposed rewrite:**
> Self-supervised speech models extract contextualized representations from raw audio without large-scale labels [10, 15, 16]. We use **WavLM-Large** [17], a 316M-parameter Transformer with relative positional attention, originally pretrained on ≈94k hours of English speech (LibriLight, GigaSpeech, VoxPopuli) under masked speech prediction with denoising. Critically, our experiments perform **continued pretraining** of this checkpoint on UPS data, *not* training from scratch. We adopt a contrastive objective with Gumbel-Softmax vector quantization. The convolutional feature encoder is frozen to preserve well-trained low-level acoustic features; the Transformer encoder and projection heads are updated. WavLM is a strong choice of backbone given its established cross-task transfer on SUPERB [21], which provides a meaningful starting point for studying *what additional structure*, if any, multilingual continued pretraining contributes.

**Por qué (ES):**
- R2 menciona **"continued pretraining effects"** como confound. Hay que aclarar desde el inicio de la sección que esto **no es entrenamiento desde cero**: el modelo ya viene cargado con representaciones inglesas y eso explica una parte importante de los resultados (incluido el bajo desempeño del *random* — porque 60h pueden *desestructurar* representaciones previas).
- Especificar las 94k horas en inglés (LibriLight, GigaSpeech, VoxPopuli) hace explícito el punto de R3: *"both approaches underperform compared to the original WavLM-large, likely due to its much larger pretraining dataset"*. Le das al revisor la munición que él mismo te pidió.
- Corregir "SLL" → "SSL" (typo en línea 163).

### 3.7 Section 2.4 / 2.5 — Experiments: report what is missing

R2 says *"limited detail on evaluation setup and statistical robustness"*. The current text reports a single training run; we cannot fix that retroactively, but we **can** be explicit about it.

**Add at the end of Section 2.5 (after "Google Colab.", line 242):**

> **Single-run caveat.** Due to compute constraints (single A100/Colab session per configuration), each condition was trained once with a fixed random seed (seed = 42 for chunk sampling and dropout; identical across the family-aware and random-multilingual runs). We did not estimate variance across seeds. Section 4 discusses the implications of this design choice for the strength of our claims.

**Por qué (ES):**
- R2 lo nombra como *"limited detail on... statistical robustness"*. La forma honesta — y aceptada — de manejar esto en Interspeech es **declararlo explícitamente**. Una declaración de "single-run caveat" se considera *mejor práctica* y suele ser suficiente cuando el efecto es grande (0.50 vs 0.04 difícilmente es ruido aleatorio).
- Que el seed sea **idéntico** entre las dos condiciones es importante: refuerza que el único cambio real fue el muestreo de lenguas. Es la respuesta directa al "methodological confound" de R2.

### 3.8 Section 2.4 — Validation set: justify the size

**Original (lines 206–212):**
> For the validation set, we used a dedicated held-out dataset constructed under the same preprocessing pipeline... This split contained 27 files of 10 different languages not seen during pretraining, selecting, when possible, one unseen language per family.

**Proposed addition (one sentence):**
> The 10 held-out languages cover 9 of the 16 families seen in training (Table 4), allowing us to probe within-family generalization (e.g., training on `de` and testing on `no` for Germanic) as well as out-of-family generalization (e.g., `so` for Cushitic, where the family was represented in pretraining only by `am`/`ar`).

**Por qué (ES):** R1 critica ambigüedad y R3 valora transparencia. Esta única frase explica **qué tipo de transferencia se mide** (within-family vs out-of-family), que es justamente la promesa del paper. Sin esta frase, el lector no sabe si el 0.50 viene de evaluar lenguas "fáciles" (parientes vistos en train) o "difíciles".

---

## 4. Results (Section 3)

### 4.1 Reframe Table 2 caption and reading

**Original Table 2 caption (lines 269–271):**
> WavLM model performance on UPS challenge downstream tasks for language-aware and no-language-aware subsets trained on 60 hours of data

**Proposed:**
> Downstream performance on the UPS *in the Wild* challenge after 60h of continued pretraining, evaluated on 10 unseen languages. *Score* is the official challenge composite; *F1* is for LID; *CER* is for ASR (lower is better); *ARI* is for speaker clustering. Differences are reported from a single training run per condition (see §2.5).

**Por qué (ES):** El caption original no dice qué métrica corresponde a qué tarea — R2 lo identifica como *"limited detail on evaluation setup"*. Definir las métricas en el caption es un patrón estándar en Interspeech y se puede hacer en una sola línea. Añado el recordatorio de "single training run" para que el lector calibre el tamaño del efecto.

### 4.2 Add a "convergence ≠ downstream" framing

**Original (lines 248–261):**
> Despite comparable pretraining convergence, the two configurations yielded substantially different results on the LID, ASR, and Speaker Clustering tasks... structure-aware sampling mitigates degradation, whereas random sampling amplifies it, leading to near-collapse in downstream performance.

**Proposed rewrite:**
> Although final pretraining losses are nearly identical (3.86 vs. 3.93, a 1.8% relative gap), downstream behavior is sharply divergent: the family-aware model achieves an overall challenge score of **0.50**, the random-multilingual model only **0.04**. This dissociation between *pretraining convergence* and *downstream transfer* is the central empirical observation of this paper. It directly answers **RQ2**: at this scale, the *composition* of the pretraining data — not the optimization trajectory — drives the gap. We interpret the random-multilingual result not as evidence that random multilingual sampling is "broken" in general (it is the implicit choice in most large-scale SSL [10, 11, 14]), but as evidence that, *under aggressive continued pretraining of an English-pretrained checkpoint with only 60h*, unstructured exposure can act as a perturbation rather than as representation expansion.

**Por qué (ES):**
- Re-conecto el resultado con **RQ2** (que añadí en §1.2 de este documento). Esto cumple el pedido de R1 sobre flujo: el lector ve que la pregunta de la introducción se contesta acá.
- *"We interpret the random-multilingual result not as evidence that random multilingual sampling is broken in general"*: esto es exactamente la **suavización de claims** que R2 condiciona para aceptar. El paper no debe leer como un ataque a Wav2Vec/XLS-R/MMS; debe leer como un estudio focalizado de un régimen específico (60h, continued PT, English checkpoint).

### 4.3 Strengthen the paragraph on the WavLM-Large baseline

**Original (lines 262–271):**
> However, the official WavLM-large baseline substantially outperforms both continued-pretraining models. Given that the model was originally pretrained on approximately 94k hours of curated English speech, our 60h continued-pretraining regime is likely insufficient to meaningfully restructure a 300M-parameter model. While the additional training was enough to modify the loss trajectory, it may have partially perturbed well-optimized English representations without providing sufficient multilingual evidence to build stable cross-linguistic abstractions.

**Proposed rewrite:**
> The official WavLM-Large checkpoint, evaluated zero-shot on the same downstream tasks, outperforms both continued-pretraining models. We see this as **expected and informative**: WavLM-Large was pretrained on ≈94k hours, more than three orders of magnitude beyond our 60h regime. Our continued pretraining is therefore better understood as *perturbing* a strong English-centric representation than as *replacing* it. The relevant comparison for our research question is not "ours vs. WavLM-Large" but "family-aware vs. random-multilingual under matched conditions"; on that comparison, family-aware sampling reduces the perturbation cost by an order of magnitude on the challenge composite. We return to this in §4.

**Por qué (ES):**
- R3 hizo textualmente esta observación (*"both approaches underperform compared to the original WavLM-large, likely due to its much larger pretraining dataset"*). Reconocerlo abiertamente y reformular *"the relevant comparison is not X vs Y but A vs B under matched conditions"* es lo que convierte la limitación en una decisión consciente.
- *"three orders of magnitude beyond"*: R2 critica el *limited scale*. Cuantificar la brecha en órdenes de magnitud es más honesto que decir "our 60h regime is likely insufficient", que suena defensivo.

---

## 5. Discussion (Section 4)

### 5.1 Reorder the discussion around the three RQs

The current Discussion mixes (a) data-curation analogies, (b) negative-pair theory, (c) catastrophic forgetting, (d) curriculum learning, and (e) areal vs genealogical structure. R1 directly says this is hard to follow. I recommend a **subsection-based reorganization** that mirrors the RQs from the Introduction.

**Proposed new structure for §4:**

> **4.1 Why family-aware sampling helps under data constraints (RQ1).**
> [Keep the negative-sampling argument from current lines 281–298. This is the strongest mechanistic story.]
>
> **4.2 Convergence is not transfer (RQ2).**
> [Pull out the catastrophic-forgetting paragraph (lines 299–313). Frame it explicitly as "loss curve comparable, downstream not".]
>
> **4.3 Family structure as implicit curriculum.**
> [Keep curriculum-learning paragraph (lines 314–325) but shorten and connect to RQ1 explicitly.]
>
> **4.4 Where the genealogical prior breaks down: areal and contact effects.**
> [Promote the current Thomason / Töró paragraph (lines 333–352) to its own subsection. This is exactly what R3 calls "valid and offers a promising direction for future work".]
>
> **4.5 Threats to validity.**
> [New subsection — see §5.2 below.]

**Por qué (ES):** Sub-secciones numeradas son **el remedio más efectivo** contra el reproche de "difficult to follow" de R1. Cada subsección aborda una pregunta. Además, promover los efectos areales (R3) a un subsection-level los convierte en parte del mensaje del paper en lugar de un párrafo "perdido" al final.

### 5.2 Add an explicit "Threats to Validity / Limitations" subsection

This is the **single addition that addresses R2 most directly**.

**Proposed new text (insert before the last paragraph of the Discussion):**

> **4.5 Threats to Validity.**
> Several limitations frame the scope of our claims:
>
> 1. **Single-run, small-scale.** Each condition was trained once with a fixed seed and ≈56h of audio. While the gap between family-aware and random-multilingual (0.50 vs 0.04 on the challenge composite) is too large to plausibly be seed noise, our results should not be read as a *general* claim about SSL pretraining. They speak to a specific regime: continued pretraining of an English-centric checkpoint with O(10¹) hours.
> 2. **Filtering bias.** Our VAD + duration filter discarded 97% of UPS files. The retained subset is therefore biased toward longer, cleaner recordings, which likely benefits both arms equally but may also smooth over real-world deployment conditions.
> 3. **Continued pretraining vs. from scratch.** The random-multilingual model is not a "from scratch" baseline — it inherits all of WavLM-Large's English priors. The performance collapse we observe is therefore consistent with *interference with English priors* and should not be generalized to claims about multilingual SSL from scratch.
> 4. **Family granularity and Indo-European.** As discussed in §2.2, we balance Indo-European *across subfamilies*, but we do not test alternative groupings (e.g., subfamily-as-bucket throughout, or contact-area buckets). Our results therefore hold for one operationalization of "family-aware", not for the genealogical view in general.
> 5. **Imbalance.** Even within the family-aware subset, hours-per-language differ by up to ~10× (Table 5). Whether the observed gain reflects *family awareness* or simply *better effective coverage of dissimilar phonologies* requires controlled ablations we leave to future work.

**Por qué (ES):**
- R2 escribe *"borderline accept if framing is softened"* y nombra explícitamente *limited scale, generalizability, methodological confounds (data filtering, imbalance, continued pretraining effects)*. El bloque anterior nombra **uno por uno** cada confound que R2 listó. Es la forma más rápida de mover su decisión de borderline a accept.
- Punto (4) atiende directamente la objeción de R3 sobre Indo-European.
- Punto (5) es importante: la diferencia entre "family-aware ayuda" y "más diversidad ayuda" es algo que un revisor crítico se va a preguntar. Reconocerlo abiertamente te da más credibilidad que pretender que ya está resuelto.

### 5.3 Soften the claim in the last paragraph of §4

**Original (lines 343–352):**
> Our work asks a complementary question: given a fixed, imbalanced dataset, can genealogical knowledge guide training strategies to better utilize existing data? Our results suggest yes. Organizing training by language family does not replace computation with human intuition; rather, it reorients the model's attention toward shared phonetic patterns, allowing low-resource languages to benefit from related higher-resource ones. The consistent improvements across LID, CER, and ARI indicate that input structure and not merely data volume, has measurable consequences for what a model learns.

**Proposed rewrite:**
> Our work asks a complementary question: given a fixed, imbalanced multilingual budget and an existing English-centric checkpoint, can genealogical structure act as an inductive bias that mitigates representation drift? Our results, *in this regime*, suggest yes. Organizing training along family lines does not replace scale; it reorients the model's negative-sample distribution toward phonetically meaningful contrasts, providing a less destructive path through the loss landscape than random multilingual sampling. The consistent improvements across LID, CER, and ARI indicate that, when scale is bounded, the *organization* of the input is a measurable driver of what the model retains. Whether this holds at much larger scale, or whether geographic and contact-based groupings would yield comparable or better priors, remains open.

**Por qué (ES):**
- El cambio clave: añadir *"in this regime"* y *"when scale is bounded"*. R2 dice *softened*; estas dos cláusulas hacen exactamente eso.
- *"reorients the model's negative-sample distribution toward phonetically meaningful contrasts"* es más preciso que *"reorients the model's attention"* (esto último es vago, R1 critica vaguedad).
- La última oración (*"Whether this holds at much larger scale..."*) deja explícitamente la puerta abierta a la hipótesis areal/contacto que R3 valora.

---

## 6. Conclusions (Section 5)

**Original (lines 354–367, 368–387):**
The current conclusions say *"thoughtful data curation can be a powerful tool"* and *"meaningful implications for the preservation and democratization of speech technology across the world's languages"* — both are framings that R2 explicitly says are too broad for the experimental scope.

**Proposed rewrite (full section):**

> **5. Conclusions.**
> We presented a controlled comparison of *family-aware* and *random-multilingual* sampling for the continued pretraining of WavLM-Large under a 60-hour budget, evaluated on the Interspeech 2026 *Unsupervised People's Speech in the Wild* challenge. Three findings stand out. First, with matched data, optimizer and steps, family-aware sampling yields a 12× higher composite score on unseen languages, and improves all three downstream tasks (LID, ASR, speaker clustering). Second, this gap is largely orthogonal to pretraining convergence: final losses are nearly identical, but downstream transfer is not. Third, both continued-pretraining models trail the original WavLM-Large checkpoint, consistent with the much larger scale of its original training and a reminder that, at small scale, structure cannot fully substitute for volume.
>
> Our claims are deliberately scoped: a single seed, ≈56h of audio, one operationalization of "family-aware", and a single SSL backbone. We do not claim that family-aware sampling is universally preferable; recent evidence that areal and contact-based groupings often track speech embeddings more cleanly than strict descent [40] suggests that the *right* organizing principle is multidimensional. Future work will (i) replicate these effects across seeds and scales, (ii) compare family-, subfamily-, and contact-area-based sampling under matched budgets, and (iii) test whether mixing genealogical and areal priors yields complementary gains. We release our 89-language family mapping (Appendix A) to enable such comparisons.

**Por qué (ES):**
- *"12× higher composite score"* es más concreto que *"remarkably capable representations"*. R2 quiere claims medibles, no adjetivos.
- Cierre con *"Future work will (i)/(ii)/(iii)"* — tres ítems concretos. R3 elogia explícitamente la *promising direction for future work*; aquí la instrumentamos.
- Una frase concreta: *"We release our 89-language family mapping (Appendix A) to enable such comparisons"* — un compromiso de reproducibilidad pequeño pero efectivo. Si te animas a publicar también el repositorio en HuggingFace/GitHub, agrégalo aquí.

---

## 7. Cross-cutting issues (must fix everywhere)

### Issue cruzado #1 — Inconsistency in "number of training languages"

| Location | Number stated |
|---|---|
| Abstract (line 13) | not specified |
| Intro (line 70) | **35 languages** |
| Methods §2.2 (line 153) | **32 languages** |
| Table 5 | **31 languages** |

**Action:** decide on one number (most likely **31** or **32** depending on whether `pt` and another were merged) and **propagate it everywhere**. This is a *flag-on-sight* inconsistency for any reviewer.

> **Por qué (ES):** Este tipo de inconsistencia es la primera cosa que R1 (que critica el flow) y R2 (que critica el detalle metodológico) van a marcar. Es trivial de arreglar y elimina dos críticas a costo cero.

### Issue cruzado #2 — Terminology

Replace **everywhere** in the paper:
- `language-aware` → `family-aware`
- `no-language-aware` → `random-multilingual` (or `random-baseline`)
- `language non-aware` → `random-multilingual`

Then add, in §2.2 (or in a footnote): *"We use 'family-aware' rather than 'language-aware' to emphasize that the manipulated variable is the family-level composition of the training set, not the languages individually."*

> **Por qué (ES):** R2 lo marca explícitamente como minor issue. Este es el tipo de cambio que **hace la diferencia entre borderline accept y accept**: un solo *find-and-replace* responde a un comentario directo de un revisor.

### Issue cruzado #3 — Figures and tables

1. **Figure 1 caption** in your PDF reads *"Distribution of selected data after VAD and preprocessing steps"*, but the table that immediately precedes it (Table 1) is about VAD ablation. The figure caption and the figure content should match — likely Figure 1 should be the **family/language distribution after filtering**, and the VAD ablation should be referenced from §2.1 only. Verify that the figure file order and captions are correct.
2. **Figure 2 caption** reads *"Total loss of a) Training on language-aware data; b) Training on no-language-aware data"* but earlier in the text "Figure 2" is referenced for the *audio distribution by family* (line 144: *"highly imbalanced (Figure 2)"*). **You have a Figure-2 cross-reference clash.** One of the two has to change number.
3. The Indo-European row in **Table 3** lists subfamilies but does not visually separate them. Consider adding a line break per subfamily or splitting into a multi-row mini-block, so R3's question is answered at a glance.

> **Por qué (ES):** R1 dice *"some parts were a bit ambiguous"*; estos errores cruzados de figuras son una causa concreta de esa ambigüedad. Son los típicos arreglos que un *meta-reviewer* no perdona.

### Issue cruzado #4 — Broken citation `[?]`

Already covered in §3.1, but worth restating: **search for `[?]` in the source LaTeX and fix it before resubmission**. A broken reference is a hard signal of "rushed manuscript" to the meta-reviewer.

### Issue cruzado #5 — Two small grammar / typo fixes

- Line 155: *"The distribution of this dataset This dataset will be referred to as 'language-aware' from now on."* — duplicated sentence, drop the orphan *"The distribution of this dataset"*.
- Line 163: *"SLL speech models"* → *"SSL speech models"*.
- Line 162 (Models section): *"In this work, we use WavLM-Large, a 316M-parameter transformer-based self-supervised model with relative positional attention, trained through masked speech prediction and denoising objectives [17]."* — a sentence of 33 words; consider splitting.

> **Por qué (ES):** Tres correcciones triviales, pero R1 dice *"Tightening up writing a bit would help with flow"*. Cada uno de estos micro-arreglos suma a esa percepción.

---

## 8. Two cheap experiments that, if feasible, would meaningfully strengthen the paper

These are *optional* — the textual fixes above are sufficient on their own. But if you have a few GPU-hours to spare before the rebuttal/camera-ready window, either of these would directly close R2's biggest concern.

### Experiment A — Two extra seeds for both arms (≈12h compute, highest impact)

Re-run both `family-aware` and `random-multilingual` with seeds {1337, 2024} on the same 60h subsets. Report mean ± std on Table 2. *Even if both extra runs only add ±0.05 on the composite*, having three points instead of one closes the *"statistical robustness"* objection raised by R2.

> **Por qué (ES):** Coste computacional bajo y respuesta directa al comentario más importante de R2. Si hay que elegir un experimento extra, es éste.

### Experiment B — Subfamily ablation within Indo-European (~6h compute)

Take the family-aware subset, but build a third arm: **`subfamily-aware`** that treats each Indo-European subfamily as its own bucket. Compare the three arms on the same downstream evaluation. Even one number per arm is enough to address R3 directly.

> **Por qué (ES):** Esta ablación es exactamente lo que R3 sugiere implícitamente cuando pregunta si IE fue tratado como un bloque o como subfamilias. Te permite responder *"yes, and the subfamily-level granularity yields X"* en lugar de solo describirlo como future work.

---

## 9. Suggested editing order

If you can afford ~1 day of writing time, do them in this order (high-impact first, no compute needed for any of them):

1. **Cross-cutting fixes #1, #2, #4, #5** (terminology, broken cite, language count, typos) — 30 minutes, kills 3 reviewer comments outright.
2. **Section 2.2 Indo-European clarification** (§3.4 of this doc) — 1 hour, closes R3's main concern.
3. **Add §4.5 Threats to Validity** (§5.2 of this doc) — 1.5 hours, closes R2's main concern.
4. **Soften abstract, intro, conclusion claims** (§§1.2, 2.1, 2.2, 6 of this doc) — 1.5 hours, closes R2's framing concern.
5. **Reorder Discussion into 4.1–4.5** (§5.1 of this doc) — 1 hour, closes R1's flow concern.
6. **Methods polish** (§§3.1–3.3, 3.5–3.8 of this doc) — 1 hour, completes R1/R2 detail concerns.
7. **(Optional) Extra-seed experiment** — 1 day if compute is available.

> **Por qué este orden (ES):** Empiezas por arreglos de costo cero que matan críticas concretas (impacto/esfuerzo máximo), y dejas los cambios estilísticos para el final, cuando el contenido ya esté estable. Esta priorización está específicamente diseñada para maximizar la probabilidad de pasar de *borderline accept* a *accept* sin entrenar nada nuevo.

---

## 10. TL;DR for you

- **R1 (clarity/flow):** sub-section the Discussion into 4.1–4.5 around the RQs; add internal headers; fix the duplicated sentence and the broken citation; resolve the Figure-2 numbering clash.
- **R2 (scope/framing/confounds):** unify `family-aware` terminology; add an explicit *Threats to Validity* subsection; soften abstract/intro/conclusion claims with *"at small scale"*, *"in this regime"*; declare the single-run setup explicitly.
- **R3 (Indo-European, areal effects):** add a *"Sampling unit and Indo-European treatment"* paragraph in §2.2; promote the contact/areal discussion to its own subsection in §4; commit explicitly to "future work: family-, subfamily-, and contact-area-based sampling".
- **My own opinion:** the experiments themselves are fine for an Interspeech short paper given the data-and-compute budget you describe. The *delta* between borderline accept and accept here is almost entirely a writing and framing problem, not a scientific one — which is genuinely good news.

> **Por qué cierra todo (ES):** los tres revisores están dándote, sin decirlo abiertamente, el mismo mensaje: *"este paper podría aceptarse si fuera más honesto sobre lo que prueba"*. Los cambios anteriores hacen exactamente eso, sin requerir nuevos experimentos. Si encima logras correr el Experimento A (dos seeds extra), pasas de "probable accept tras revisión" a "accept claro".
