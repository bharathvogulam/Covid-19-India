const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
const convertStateDbToResponse = (dbobject) => {
  return {
    stateId: dbobject.state_id,
    stateName: dbobject.state_name,
    population: dbobject.population,
  };
};

const convertDistrictDbToResponse = (dbobject) => {
  return {
    districtId: dbobject.district_id,
    districtName: dbobject.district_name,
    stateId: dbobject.state_id,
    cases: dbobject.cases,
    cured: dbobject.cured,
    active: dbobject.active,
    deaths: dbobject.deaths,
  };
};
app.get("/states/", async (request, response) => {
  const getMovieQuery = `
        SELECT 
            *
        FROM 
            state;`;
  const stateArray = await database.all(getMovieQuery);
  response.send(
    stateArray.map((eachstate) => convertStateDbToResponse(eachstate))
  );
});
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getMovieQuery = `
        SELECT 
            *
        FROM 
            state
        WHERE 
            state_id=${stateId};`;
  const stateArray = await database.get(getMovieQuery);
  response.send(convertStateDbToResponse(stateArray));
});
app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const postQuery = `
    INSERT INTO 
        district (state_id, district_name, cases, cured, active, deaths)
    VALUES 
        (${stateId}, '${districtName}', ${cases}, ${cured}, ${active}, ${deaths});`;
  await database.run(postQuery);
  response.send("District Successfully Added");
});
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getdistrict = `
        SELECT 
            *
        FROM 
            district
        WHERE 
            district_id=${districtId};`;
  const district = await database.get(getdistrict);
  response.send(convertDistrictDbToResponse(district));
});
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deletedQuery = `
        DELETE FROM
            district
        WHERE 
            district_id= ${districtId};`;
  await database.run(deletedQuery);
  response.send("District Removed");
});
app.put("/districts/:districtId/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const postQuery = `
    UPDATE 
        district
    SET 
        state_id = ${stateId},
        district_name = '${districtName}',
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
    where district_id = ${districtId};`;
  await database.run(postQuery);
  response.send("District Details Updated");
});
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `SELECT SUM(cases), SUM(cured), SUM(active), SUM(deaths)
  FROM district WHERE state_id=${stateId};`;
  const stats = await database.get(getStateStatsQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getdistrictQuery = `SELECT state_name FROM district NATURAL JOIN state
  WHERE district_id=${districtId};`;
  const statname = await database.get(getdistrictQuery);
  response.send({ stateName: statname.state_name });
});
module.exports = app;
