// Picks the show the end to end flow follows (CRI-69, ADR 0008).
//
// Live TVmaze data changes daily, so a single hard-coded show would
// eventually stop having upcoming episodes and the flow would fail for
// reasons that have nothing to do with the app. Instead this takes the
// first show in the list below that is running and has an upcoming
// regular episode, and fails with a clear message if none does.
//
// Exposes `output.show.name` and `output.show.id` to the flow.

var CANDIDATES = [
  "Slow Horses",
  "The Simpsons",
  "South Park",
  "Tracker",
  "Abbott Elementary",
  "The Diplomat",
];

var picked = null;

for (var i = 0; i < CANDIDATES.length && picked === null; i++) {
  var response = http.get(
    "https://api.tvmaze.com/singlesearch/shows?q=" +
      encodeURIComponent(CANDIDATES[i]) +
      "&embed=nextepisode",
  );
  if (!response.ok) {
    continue;
  }

  var show = json(response.body);
  var next = show._embedded && show._embedded.nextepisode;
  if (show.status === "Running" && next && next.type === "regular") {
    picked = { name: show.name, id: show.id };
  }
}

if (picked === null) {
  throw new Error(
    "No candidate show has an upcoming regular episode on TVmaze. " +
      "Update CANDIDATES in .maestro/scripts/pick-show.js.",
  );
}

output.show = picked;
