// Shared BG Stats deep-link builder. Every game's end screen calls
// OBGBgStats.buildUrl(); the show templates load this file next to qrcode.js,
// only for users who opted in on their profile (bgStatsEnabled).

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OBGBgStats = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  // BG Stats wants "yyyy-MM-dd HH:mm:ss"; the reference implementation sends UTC.
  function playDateOf(ms) {
    return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
  }

  // opts: title, sourceGameId, sourcePlayId, playDate (epoch ms), noPoints?,
  //       bggId?, groups.
  // groups are the finishing order, best group first: players tied on a result
  // share one group, so everyone in the first group is a winner and tied ranks
  // match. A group is [{ name, score }, ...]; score is dropped for noPoints
  // games. Returns undefined when no human is left to log (solo vs bots).
  function buildUrl(opts) {
    var players = [];
    var rank = 1;
    for (var g = 0; g < opts.groups.length; g++) {
      var group = opts.groups[g];
      for (var i = 0; i < group.length; i++) {
        var player = group[i];
        var entry = {
          name: player.name,
          // Stable across plays, so BG Stats can re-match the player.
          sourcePlayerId: player.name,
          rank: rank,
          winner: g === 0,
          // OBG does not record who started.
          startPlayer: false
        };
        if (!opts.noPoints) entry.score = player.score;
        players.push(entry);
      }
      rank += group.length;
    }
    if (players.length === 0) return undefined;

    var play = {
      sourceName: "OnlineBoardGamers.com",
      sourcePlayId: String(opts.sourcePlayId),
      playDate: playDateOf(opts.playDate),
      game: {
        name: opts.title,
        sourceGameId: opts.sourceGameId,
        noPoints: !!opts.noPoints,
        // Matches the reference implementation: always set, even without points.
        highestWins: true
      },
      players: players
    };
    if (opts.bggId) play.game.bggId = opts.bggId;

    return "https://app.bgstatsapp.com/createPlay.html?data=" + encodeURIComponent(JSON.stringify(play));
  }

  return { buildUrl: buildUrl };
});
