### Semantic Search Results

1. CodeContests+: High-Quality Test Case Generation for Competitive Programming
   Competitive programming, due to its high reasoning difficulty and precise
correctness feedback, has become a key task for both training and evaluating
the reasoning capabilities of large language models (LLMs). However, while a
large amount of public problem data, such as problem statements and solutions,
is available, the test cases of these problems are often difficult to obtain.
Therefore, test case generation is a necessary task for building large-scale
datasets, and the quality of the test cases directly determines the accuracy of
the evaluation. In this paper, we introduce an LLM-based agent system that
creates high-quality test cases for competitive programming problems. We apply
this system to the CodeContests dataset and propose a new version with improved
test cases, named CodeContests+. We evaluated the quality of test cases in
CodeContestsPlus. First, we used 1.72 million submissions with pass/fail labels
to examine the accuracy of these test cases in evaluation. The result...

2. Unleashing the Reasoning Potential of Pre-trained LLMs by Critique Fine-Tuning on One Problem
   We have witnessed that strong LLMs like Qwen-Math, MiMo, and Phi-4 possess
immense reasoning potential inherited from the pre-training stage. With
reinforcement learning (RL), these models can improve dramatically on reasoning
tasks. Recent studies have shown that even RL on a single problem can unleash
these models' reasoning capabilities. However, RL is not only expensive but
also unstable. Even one-shot RL requires hundreds of GPU hours. This raises a
critical question: Is there a more efficient way to unleash the reasoning
potential of these powerful base LLMs? In this work, we demonstrate that
Critique Fine-Tuning (CFT) on only one problem can effectively unleash the
reasoning potential of LLMs. Our method constructs critique data by collecting
diverse model-generated solutions to a single problem and using teacher LLMs to
provide detailed critiques. We fine-tune Qwen and Llama family models, ranging
from 1.5B to 14B parameters, on the CFT data and observe significant
performance ...

3. Can LLMs Generate Novel Research Ideas? A Large-Scale Human Study with 100+ NLP Researchers
   Recent advancements in large language models (LLMs) have sparked optimism
about their potential to accelerate scientific discovery, with a growing number
of works proposing research agents that autonomously generate and validate new
ideas. Despite this, no evaluations have shown that LLM systems can take the
very first step of producing novel, expert-level ideas, let alone perform the
entire research process. We address this by establishing an experimental design
that evaluates research idea generation while controlling for confounders and
performs the first head-to-head comparison between expert NLP researchers and
an LLM ideation agent. By recruiting over 100 NLP researchers to write novel
ideas and blind reviews of both LLM and human ideas, we obtain the first
statistically significant conclusion on current LLM capabilities for research
ideation: we find LLM-generated ideas are judged as more novel (p < 0.05) than
human expert ideas while being judged slightly weaker on feasibility....

4. Agentless: Demystifying LLM-based Software Engineering Agents
   Recent advancements in large language models (LLMs) have significantly
advanced the automation of software development tasks, including code
synthesis, program repair, and test generation. More recently, researchers and
industry practitioners have developed various autonomous LLM agents to perform
end-to-end software development tasks. These agents are equipped with the
ability to use tools, run commands, observe feedback from the environment, and
plan for future actions. However, the complexity of these agent-based
approaches, together with the limited abilities of current LLMs, raises the
following question: Do we really have to employ complex autonomous software
agents? To attempt to answer this question, we build Agentless -- an agentless
approach to automatically solve software development problems. Compared to the
verbose and complex setup of agent-based approaches, Agentless employs a
simplistic three-phase process of localization, repair, and patch validation,
without letting t...

5. Is Your LLM Secretly a World Model of the Internet? Model-Based Planning for Web Agents
   Language agents based on large language models (LLMs) have demonstrated great
promise in automating web-based tasks. Recent work has shown that incorporating
advanced planning algorithms, e.g., tree search, is advantageous over reactive
planning for web agents. However, unlike simulated sandbox environments,
real-world environments such as the web are rife with irreversible actions.
This undermines the feasibility of backtracking, a cornerstone of (tree)
search. Overly relying on test-time search also hurts efficiency. We advocate
model-based planning for web agents that employs a world model to simulate and
deliberate over the outcome of each candidate action before committing to one.
We systematically explore this paradigm by (1) Proposing a model-based planning
framework, WebDreamer, which employs LLMs to serve as both world models and
value functions; (2) Training specialized LLMs as world models with a scalable
data synthesis pipeline. Empirical results demonstrate that WebDreamer...

6. Agent Laboratory: Using LLM Agents as Research Assistants
   Historically, scientific discovery has been a lengthy and costly process,
demanding substantial time and resources from initial conception to final
results. To accelerate scientific discovery, reduce research costs, and improve
research quality, we introduce Agent Laboratory, an autonomous LLM-based
framework capable of completing the entire research process. This framework
accepts a human-provided research idea and progresses through three
stages--literature review, experimentation, and report writing to produce
comprehensive research outputs, including a code repository and a research
report, while enabling users to provide feedback and guidance at each stage. We
deploy Agent Laboratory with various state-of-the-art LLMs and invite multiple
researchers to assess its quality by participating in a survey, providing human
feedback to guide the research process, and then evaluate the final paper. We
found that: (1) Agent Laboratory driven by o1-preview generates the best
research outcome...

7. Mutual Reasoning Makes Smaller LLMs Stronger Problem-Solvers
   This paper introduces rStar, a self-play mutual reasoning approach that
significantly improves reasoning capabilities of small language models (SLMs)
without fine-tuning or superior models. rStar decouples reasoning into a
self-play mutual generation-discrimination process. First, a target SLM
augments the Monte Carlo Tree Search (MCTS) with a rich set of human-like
reasoning actions to construct higher quality reasoning trajectories. Next,
another SLM, with capabilities similar to the target SLM, acts as a
discriminator to verify each trajectory generated by the target SLM. The
mutually agreed reasoning trajectories are considered mutual consistent, thus
are more likely to be correct. Extensive experiments across five SLMs
demonstrate rStar can effectively solve diverse reasoning problems, including
GSM8K, GSM-Hard, MATH, SVAMP, and StrategyQA. Remarkably, rStar boosts GSM8K
accuracy from 12.51% to 63.91% for LLaMA2-7B, from 36.46% to 81.88% for
Mistral-7B, from 74.53% to 91.13% for L...

8. Can Compressed LLMs Truly Act? An Empirical Evaluation of Agentic Capabilities in LLM Compression
   Post-training compression reduces the computational and memory costs of large
language models (LLMs), enabling resource-efficient deployment. However,
existing compression benchmarks only focus on language modeling (e.g.,
perplexity) and natural language understanding tasks (e.g., GLUE accuracy),
ignoring the agentic capabilities - workflow, tool use/function call,
long-context understanding and real-world application. We introduce the Agent
Compression Benchmark (ACBench), the first comprehensive benchmark for
evaluating how compression impacts LLMs' agentic abilities. ACBench spans (1)
12 tasks across 4 capabilities (e.g., WorfBench for workflow generation,
Needle-in-Haystack for long-context retrieval), (2) quantization (GPTQ, AWQ)
and pruning (Wanda, SparseGPT), and (3) 15 models, including small (Gemma-2B),
standard (Qwen2.5 7B-32B), and distilled reasoning LLMs (DeepSeek-R1-Distill).
Our experiments reveal compression tradeoffs: 4-bit quantization preserves
workflow generation an...

9. Survey on Evaluation of LLM-based Agents
   The emergence of LLM-based agents represents a paradigm shift in AI, enabling
autonomous systems to plan, reason, use tools, and maintain memory while
interacting with dynamic environments. This paper provides the first
comprehensive survey of evaluation methodologies for these increasingly capable
agents. We systematically analyze evaluation benchmarks and frameworks across
four critical dimensions: (1) fundamental agent capabilities, including
planning, tool use, self-reflection, and memory; (2) application-specific
benchmarks for web, software engineering, scientific, and conversational
agents; (3) benchmarks for generalist agents; and (4) frameworks for evaluating
agents. Our analysis reveals emerging trends, including a shift toward more
realistic, challenging evaluations with continuously updated benchmarks. We
also identify critical gaps that future research must address-particularly in
assessing cost-efficiency, safety, and robustness, and in developing
fine-grained, and scalab...

10. Which Agent Causes Task Failures and When? On Automated Failure Attribution of LLM Multi-Agent Systems
   Failure attribution in LLM multi-agent systems-identifying the agent and step
responsible for task failures-provides crucial clues for systems debugging but
remains underexplored and labor-intensive. In this paper, we propose and
formulate a new research area: automated failure attribution for LLM
multi-agent systems. To support this initiative, we introduce the Who&When
dataset, comprising extensive failure logs from 127 LLM multi-agent systems
with fine-grained annotations linking failures to specific agents and decisive
error steps. Using the Who&When, we develop and evaluate three automated
failure attribution methods, summarizing their corresponding pros and cons. The
best method achieves 53.5% accuracy in identifying failure-responsible agents
but only 14.2% in pinpointing failure steps, with some methods performing below
random. Even SOTA reasoning models, such as OpenAI o1 and DeepSeek R1, fail to
achieve practical usability. These results highlight the task's complexity and
th...
