# ModelRiskRadar for GenLayer

ModelRiskRadar is a GenLayer-native project for reviewing AI model, API, and safety-policy changes. A user registers a risk signal with four evidence URLs, then GenLayer validators fetch those sources, bind rendered snapshots with SHA-256 commitments, and store a durable consensus verdict.

## Why it exists

AI products now change quickly: model releases, tool permissions, deprecations, abuse mitigations, safety policies, and incident notes can all affect downstream agents. A local frontend score is not enough when the question is whether a change is real, scoped, and risky. ModelRiskRadar turns those checks into verifiable receipts:

- subject, primary evidence, archive, and independent context URLs are normalized and preserved;
- validators fetch every source and bind each rendered snapshot with SHA-256 commitments;
- every accepted risk report is tied to a persistent `mrs_*` signal and `mrv_*` verdict ID;
- the contract stores the source manifest, baseline hash, evidence bundle hash, assessment context hash, and consensus result;
- the frontend calls the deployed GenLayer contract directly and reads accepted records back from chain.

## Contract

`contracts/model_risk_radar.py`

Important methods:

- `register_signal(...)` registers a subject URL, claim, primary evidence, archive, and context source. Validators recompute the same source commitments before a `mrs_*` signal is stored.
- `assess_signal(...)` asks validators to assess the registered signal. Validators fetch the evidence again, compare commitments, and store a `mrv_*` verdict.
- `get_signal(...)`, `get_verdict(...)`, `list_signal_ids()`, and `list_verdict_ids()` expose the persistent audit trail.

## Application

The web app has three user flows:

- `/case` creates a source-bound model risk signal and reads the accepted `mrs_*` record.
- `/assess` submits a registered signal for consensus assessment and reads the accepted `mrv_*` verdict.
- `/records` reads signal and verdict records from the deployed contract.

The application does not present a local mock verdict as a consensus result. The UI only displays records returned by the GenLayer contract.

## Example evidence

The `examples/` directory includes simple source pages for reviewers:

- `subject-profile.md`
- `primary-evidence.md`
- `model-risk-archive.md`
- `context-note.md`

These files provide canonical HTTPS GitHub URLs that can be used in Studio and in the live frontend.

## Checks

```bash
npm run contract:check
npm run contract:test
npm run flow:check
npm run build
```

`contract:check` verifies that the contract uses cryptographic commitments and exposes the required methods. `contract:test` models the register-assess lifecycle, duplicate prevention, evidence diversity checks, and persistent receipt IDs. `flow:check` checks that the frontend defaults and contract flow stay aligned.
