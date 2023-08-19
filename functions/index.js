const {onRequest} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");

const {setGlobalOptions} = require("firebase-functions/v2");
setGlobalOptions({maxInstances: 10});

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require("firebase-admin");
const { onValueCreated } = require("firebase-functions/v2/database");

admin.initializeApp();

exports.getFrequencyDistribution = onRequest(async (request, response) => {
  const db = admin.database();
  const statsRef = db.ref('stats/frequencyDistribution');

  statsRef.once('value')
    .then(snapshot => {
      const data = snapshot.val();
      const freqList = Object.entries(data).map(([score, frequency]) => ({
        score: parseInt(score, 10),
        frequency: frequency
      }));
      response.status(200).json({freqList});
    }).catch(error => {
      console.error('Error retrieving data:', error);
      response.status(500).send('Error retrieving data');
    });
})

exports.updateFrequencyDistribution = onValueCreated(
  'users/{uid}/scores/{scoresID}',
  async (event) => {
    const db = admin.database();

    //get the incoming score
    const gameResult = event.data.val();
    const score = gameResult.score;
    const user_uid = event.params.uid;

    // Get the current frequency for this score from the 'stats' node
    const fdRef = db.ref('stats/frequencyDistribution');
    const freqSnapshot = await fdRef.child(score).once('value');

    const playerFDRef = db.ref(`users/${user_uid}/stats/frequencyDistribution`);
    const playerFreqSnapshot = await playerFDRef.child(score).once('value');

    let currentFreq = freqSnapshot.val() || 0; // Use 0 as default frequency if score doesn't exist
    let playerCurrentFreq = playerFreqSnapshot.val() || 0; // Use 0 as default frequency if score doesn't exist

    // Increment the frequency for this score
    currentFreq++;
    playerCurrentFreq++;
    await fdRef.child(score).set(currentFreq);
    await playerFDRef.child(score).set(playerCurrentFreq);

    //GLOBAL: Get a reference to the rest of the stats
    const statsRef = db.ref('stats')
    const gamesPlayedSnapshot = await statsRef.child('gamesPlayed').once('value')
    let currentGamesPlayed = gamesPlayedSnapshot.val() || 0;

    //PLAYER: Get a reference to the rest of the stats
    const playerStatsRef = db.ref(`users/${user_uid}/stats`)
    const playerGamesPlayedSnapshot = await playerStatsRef.child('gamesPlayed').once('value')
    let playerCurrentGamesPlayed = playerGamesPlayedSnapshot.val() || 0;

    //GLOBAL: Calculate the new average score
    const averageScoreSnapshot = await statsRef.child('averageScore').once('value')
    let currentAverage = averageScoreSnapshot.val() || 0;
    const newScoreSum = (currentAverage * currentGamesPlayed) + score;

    //PLAYER: Calculate the new average score
    const playerAverageScoreSnapshot = await playerStatsRef.child('averageScore').once('value')
    let playerCurrentAverage = playerAverageScoreSnapshot.val() || 0;
    const playerNewScoreSum = (playerCurrentAverage * playerCurrentGamesPlayed) + score;

    //GLOBAL: Set the new average score
    const newAverage = newScoreSum / (currentGamesPlayed + 1);
    await statsRef.child('averageScore').set(newAverage);
    
    //PLAYER: Set the new average score
    const playerNewAverage = playerNewScoreSum / (playerCurrentGamesPlayed + 1);
    await playerStatsRef.child('averageScore').set(playerNewAverage);

    //GLOBAL: Increment the number of games played and set the new value
    currentGamesPlayed++;
    await statsRef.child('gamesPlayed').set(currentGamesPlayed);

    //PLAYER: Increment the number of games played and set the new value
    playerCurrentGamesPlayed++;
    await playerStatsRef.child('gamesPlayed').set(playerCurrentGamesPlayed);
  }
)
