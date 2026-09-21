# Spikes

A spike is a short, time-boxed investigation that answers a question before
we build. The code is thrown away; the findings are kept here and feed into
ADRs.

| Spike | Question | Needed before | Status |
| ----- | -------- | ------------- | ------ |
| `0001-tvmaze-data-quality.md` | Is TVmaze good enough for the PoC? | PoC | Done |
| `0002-territory-availability.md` | Can we get availability per season in Sweden for free? | MVP | Planned |

The framework choice (Expo or Flutter) is a decision, not a spike. It is
recorded as an ADR in `decisions/`.

## Test set
The shows the first user actually follows. Every spike runs against this
list, so the results reflect real use.

| Show | Why it is interesting |
| ---- | --------------------- |
| MobLand | Territory gap: season 2 airs in the US, Swedish services carry season 1 |
| Dark Matter | Weekly season airing now, finale known |
| Slow Horses | Long running, yearly seasons |
| Lanterns | New show |
| Silo | Between or during seasons |
| Widow's Bay | New show |
| Killing Eve | Ended show |
| Legends | New show |
| The Agency | Licensed in Sweden through another service than in the US |
| Neagley | Spin-off, new show |
| Ludwig | British show |
| Only Murders in the Building | Long running |
| The Bear | Whole season released at once |
| Foundation | Between or during seasons |
| Paradise | Between or during seasons |
| The Pitt | Weekly airing |
| A Knight of the Seven Kingdoms | New show |
| Pluribus | New show |
| The Diplomat | Whole season released at once |

The "why" column is a hypothesis to confirm, not a fact.
