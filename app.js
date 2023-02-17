const express = require("express");
const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;
app.use(express.json());

const initialDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Db Error:${e.message}`);
    process.exit(1);
  }
};
initialDbAndServer();

//Returns a list of all the players in the player table
const convertToCamelCase = (player) => {
  return {
    playerId: player.player_id,
    playerName: player.player_name,
  };
};
app.get("/players/", async (request, response) => {
  const getPlayerRequest = `SELECT * FROM player_details;`;
  const getPlayerResponse = await db.all(getPlayerRequest);
  response.send(
    getPlayerResponse.map((eachPlayer) => convertToCamelCase(eachPlayer))
  );
});
//Returns a specific player based on the player ID
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerIdRequest = `SELECT * FROM player_details WHERE player_id=${playerId};`;
  const getPlayerIdResponse = await db.get(getPlayerIdRequest);
  response.send(convertToCamelCase(getPlayerIdResponse));
});
//Updates the details of a specific player based on the player ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerRequest = `UPDATE player_details SET player_name='${playerName}' WHERE player_id=${playerId};`;
  const updatePlayerResponse = await db.run(updatePlayerRequest);
  response.send("Player Details Updated");
});
//Returns the match details of a specific match
const matchCamelConverter = (match) => {
  return {
    matchId: match.match_id,
    match: match.match,
    year: match.year,
  };
};
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchRequest = `SELECT * FROM match_details WHERE match_id=${matchId};`;
  const getMatchResponse = await db.get(getMatchRequest);
  response.send(matchCamelConverter(getMatchResponse));
});
//Returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatches = `SELECT * FROM player_match_score WHERE player_id=${playerId};`;
  const getPlayerMatchesResponse = await db.all(getPlayerMatches);
  const getResult = getPlayerMatchesResponse.map((match) => {
    return match.match_id;
  });
  const getMatchRequest = `SELECT * FROM match_details WHERE match_id IN (${getResult});`;
  const matchResponse = await db.all(getMatchRequest);
  response.send(matchResponse.map((match) => matchCamelConverter(match)));
});
//Returns a list of players of a specific match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const playerMatchRequest = `SELECT * FROM player_match_score NATURAL JOIN player_details WHERE match_id=${matchId};`;
  const playerMatchResponse = await db.all(playerMatchRequest);
  response.send(
    playerMatchResponse.map((eachPlayer) => convertToCamelCase(eachPlayer))
  );
});
//Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
const statsCamelCase = (playerName, object) => {
  return {
    playerId: object.player_id,
    playerName: playerName,
    totalScore: object.totalScore,
    totalFours: object.totalFours,
    totalSixes: object.totalSixes,
  };
};
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
    SELECT player_name
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerNameResponse = await db.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
    SELECT 
        player_id,
        sum(score) AS totalScore,
        sum(fours) AS totalFours,
        sum(sixes) AS totalSixes
    FROM 
        player_match_score
    WHERE 
        player_id=${playerId};`;

  const getPlayerStatisticsResponse = await db.get(getPlayerStatisticsQuery);
  response.send(
    statsCamelCase(
      getPlayerNameResponse.player_name,
      getPlayerStatisticsResponse
    )
  );
});
module.exports = app;
