# Number Clicker Cloud Functions

## Purpose
I created these cloud functions to make it easier and faster to query my database for performance metrics from games played at [NumberClicker.com](NumberClicker.com)

## Documentation


### <u>HTTP Requests</u>
### <b>NumberClicker.com/api/getFrequencyDistribution</b>

[Try it out!](NumberClicker.com/api/getFrequencyDistribution)

This HTTP request calls the getFrequencyDistribution function that returns the Frequency Distribution list stored in the database. This list is constantly updated by triggers that listen for new values created in my list of scores

### <u>Triggers</u>

### <b>UpdateFrequencyDistribution</b>

This function is a trigger that is executed when new values are appended to the scores list in the database. Each time a new score is logged, the frequency distribution is updated, as well as the average score and the number of games played.