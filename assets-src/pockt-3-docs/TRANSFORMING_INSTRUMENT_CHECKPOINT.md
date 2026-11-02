# POCKT 3.0 — Transforming instrument checkpoint

Created before the complete transforming-instrument product pass.
Owner: Gregg. Implementation: Cursor. Inspected: 2026-09-21.

This commit and tag freeze the repository evidence used as the start of that pass.
Nothing in this file changes product behavior.

## Ground truth at checkpoint

| | |
|---|---|
| Worktree | `C:\Apps\POCKT\.tmp-pockt-3` |
| Branch | `pockt-3` |
| HEAD | `e864276c65b952a09cddae33abdf8b92ae6b4363` |
| Subject | `pockt-3: RC1 report for internal TestFlight 128` |
| Working tree | clean |

## Preserved references

| Item | Evidence |
|---|---|
| Build 128 RC1 | `e864276` + `assets-src/pockt-3-docs/POCKT_3_RC1_REPORT.md` |
| Build 122 visual baseline | tag `pockt3-baseline-A` = `260725c390cdd09f09cfcc9f5eecf5c20d94f918` |
| Dial Master 1 | worktree `C:\Apps\POCKT\.tmp-dial-master-1` @ `cc39343`; tag `dial-master-1-final` |
| Machine workspace | `C:\Apps\POCKT` on `m3-scrub` @ `2418f42` — **not modified** |
| Recovery ledger | `assets-src/pockt-3-docs/RECOVERY_LEDGER.md` |

## Worktrees (not reset, cleaned, or discarded)

| Path | HEAD | Branch |
|---|---|---|
| `C:\Apps\POCKT` | `2418f42` | `m3-scrub` (dirty Machine leftovers left intact) |
| `C:\Apps\POCKT\.tmp-dial-master-1` | `cc39343` | `dial-master-1` |
| `C:\Apps\POCKT\.tmp-pockt-3` | `e864276` | `pockt-3` |

## Remotes

None. No remote is created by this checkpoint.

## Device baseline Gregg tested

TestFlight build **128**. Approved dial appearance (build 122 assets). Interaction, beat dots, and the lack of a single transforming instrument are the reasons for this pass.
