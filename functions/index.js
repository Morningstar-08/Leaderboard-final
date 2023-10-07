const express = require("express");
const serverless = require("serverless-http");
const router = express.Router();

const { google } = require("googleapis");

const app = express();
const port = 8080;
const cors = require("cors");

const id = "1ZCa-xovZx1UMVpIGrUCGdUvYSGmw3QtvCL-6LRk7Le0"

//This allows us to parse the incoming request body as JSON
app.use(express.json());
app.use(cors())
app.use("/", router); // path must route to lambda

// With this, we'll listen for the server on port 8080
app.listen(port, () => console.log(`Listening on port ${port}`));


async function authSheets() {
    //Function for authentication object
    const auth = new google.auth.GoogleAuth({
      keyFile: "keys.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  
    //Create client instance for auth
    const authClient = await auth.getClient();
  
    //Instance of the Sheets API
    const sheets = google.sheets({ version: "v4", auth: authClient });
  
    return {
      auth,
      authClient,
      sheets,
    };
}

router.get("/", async (req, res) => {
    const { sheets } = await authSheets();
  
    // Read rows from spreadsheet
    const getRows = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: "Sheet1",
    });
  
    res.send(getRows.data);
})

router.post("/leaderboard", async (req, res) => {
  try {

    
      const { sheets } = await authSheets();

      // Specify the columns you want to retrieve (A, B, G, H, I, J, and K)
      const range = "Sheet1";

      // Read rows from the specified range
      const getRows = await sheets.spreadsheets.values.get({
          spreadsheetId: id,
          range: range,
      });

      // Process the data and transform it into the desired format
      const transformedData = getRows.data.values.slice(1).map((row) => {
          const [
              name,
              email,
              institution,
              enrolDate,
              enrolStatus,
              skillboostLink,
              coursesCompleted,
              skillBadgesCompleted,
              genAIGameCompleted,
              totalCompletion,
              redemptionStatus,
              group,
          ] = row;

          // Calculate the score
          const score =
              parseInt(coursesCompleted) +
              parseInt(skillBadgesCompleted) +
              parseInt(genAIGameCompleted);

          // Determine if the person is finished and has redeemed
          const isFinished = totalCompletion === "Yes";
          const hasRedeemed = redemptionStatus === "Yes";

          return {
              name,
              email,
              score,
              isFinished,
              hasRedeemed,
              group,
          };
      });

      // Sort the transformedData based on score in descending order
      transformedData.sort((a, b) => b.score - a.score);

      res.json(transformedData);
  } catch (error) {
      console.error("Error in transforming data:", error);
      res.status(500).send("Internal Server Error");
  }
});

router.post("/group-scores", async (req, res) => {
  try {
      // // Check if the secret key is provided in the request body
      // const { secret } = req.body;
      // if (secret !== process.env.API_SECRET) {
      //     // If the provided secret key doesn't match, return an unauthorized response
      //     return res.status(401).json({ error: "Unauthorized" });
      // }
      
      const { sheets } = await authSheets();

      // Specify the columns you want to retrieve, including the "Group" column
      const range = "Sheet1";

      // Read rows from the specified range
      const getRows = await sheets.spreadsheets.values.get({
          spreadsheetId: id,
          range: range,
      });

      // Process the data and calculate group scores
      const groupScores = {};

      getRows.data.values.slice(1).forEach((row) => {
          const [
              name,
              email,
              institution,
              enrolDate,
              enrolStatus,
              skillboostLink,
              coursesCompleted,
              skillBadgesCompleted,
              genAIGameCompleted,
              totalCompletion,
              redemptionStatus,
              group,
          ] = row;

          // Calculate the score for this row
          const score =
              parseInt(coursesCompleted) +
              parseInt(skillBadgesCompleted) +
              parseInt(genAIGameCompleted);

          // Create or update the group score
          if (!groupScores[group]) {
              groupScores[group] = 0;
          }
          groupScores[group] += score;
      });

      const sortedGroupScores = Object.keys(groupScores).map((group) => ({
          group,
          score: groupScores[group],
      }));

      // Sort the array by score in descending order
      sortedGroupScores.sort((a, b) => b.score - a.score);
      res.json(sortedGroupScores);
  } catch (error) {
      console.error("Error in calculating group scores:", error);
      res.status(500).send("Internal Server Error");
  }
});

module.exports.handler = serverless(app)