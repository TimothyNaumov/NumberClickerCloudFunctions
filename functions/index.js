const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ maxInstances: 10 });

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require("firebase-admin");
const { onValueCreated } = require("firebase-functions/v2/database");

admin.initializeApp();

exports.getFrequencyDistribution = onRequest(async (request, response) => {
  const db = admin.database();
  const statsRef = db.ref("stats/frequencyDistribution");

  statsRef
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      const freqList = Object.entries(data).map(([score, frequency]) => ({
        score: parseInt(score, 10),
        frequency: frequency,
      }));
      response.status(200).json({ freqList });
    })
    .catch((error) => {
      console.error("Error retrieving data:", error);
      response.status(500).send("Error retrieving data");
    });
});

exports.updateUsersStats = onValueCreated(
  "users/{uid}/scores/{scoresID}",
  async (event) => {
    const db = admin.database();

    //get the incoming score
    const gameResult = event.data.val();
    const score = gameResult.score;
    const user_uid = event.params.uid;

    //Update Frequency Distribution for this user
    const fdRef = db.ref(`users/${user_uid}/stats/frequencyDistribution`);
    const fdSnapshot = await fdRef.child(score).once("value");
    let currentFrequency = fdSnapshot.val() || 0; // Use 0 as default frequency if score doesn't exist
    // Increment the frequency for this score
    currentFrequency++;
    await fdRef.child(score).set(currentFrequency);

    //Get a reference to the rest of the stats
    const playerStatsRef = db.ref(`users/${user_uid}/stats`);

    //Update the number of games played
    const gamedPlayedSnapshot = await playerStatsRef
      .child("gamesPlayed")
      .once("value");
    let currentGamesPlayed = gamedPlayedSnapshot.val() || 0;

    //Calculate the new average score
    const averageScoreSnapshot = await playerStatsRef
      .child("averageScore")
      .once("value");
    let currentAverage = averageScoreSnapshot.val() || 0;
    const newScoreSum = currentAverage * currentGamesPlayed + score;

    //Set the new average score
    const newAverageScore = newScoreSum / (currentGamesPlayed + 1);
    await playerStatsRef.child("averageScore").set(newAverageScore);

    //PLAYER: Increment the number of games played and set the new value
    currentGamesPlayed++;
    await playerStatsRef.child("gamesPlayed").set(currentGamesPlayed);
  }
);

exports.updateGlobalStats = onValueCreated(
  "users/{uid}/scores/{scoresID}",
  async (event) => {
    const db = admin.database();

    //get the incoming score
    const gameResult = event.data.val();
    const score = gameResult.score;

    // Get the current frequency for this score from the 'stats' node
    const fdRef = db.ref("stats/frequencyDistribution");
    const freqSnapshot = await fdRef.child(score).once("value");

    let currentFreq = freqSnapshot.val() || 0; // Use 0 as default frequency if score doesn't exist

    // Increment the frequency for this score
    currentFreq++;
    await fdRef.child(score).set(currentFreq);

    //GLOBAL: Get a reference to the rest of the stats
    const statsRef = db.ref("stats");
    const gamesPlayedSnapshot = await statsRef
      .child("gamesPlayed")
      .once("value");
    let currentGamesPlayed = gamesPlayedSnapshot.val() || 0;

    //GLOBAL: Calculate the new average score
    const averageScoreSnapshot = await statsRef
      .child("averageScore")
      .once("value");
    let currentAverage = averageScoreSnapshot.val() || 0;
    const newScoreSum = currentAverage * currentGamesPlayed + score;

    //GLOBAL: Set the new average score
    const newAverage = newScoreSum / (currentGamesPlayed + 1);
    await statsRef.child("averageScore").set(newAverage);

    //GLOBAL: Increment the number of games played and set the new value
    currentGamesPlayed++;
    await statsRef.child("gamesPlayed").set(currentGamesPlayed);
  }
);
