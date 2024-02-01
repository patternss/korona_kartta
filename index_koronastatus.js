//index.js

//External modules
const express = require("express");
const path = require("path");
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const helmet = require('helmet');
const fetch = require('node-fetch');
const mapData = require('./mapdata.js');
const caseData = require('./casedata.js');

//App variables
const app = express();
const port = process.env.PORT || "8000";
//code from https://www.npmjs.com/package/winston tutorial


const UPDATEHOURS = 13 ;
const UPDATEINTERVAL = 1; //update interval in hours
const INTERVAL = 13; //13 --> 14 day period
//dates for 2 week interval:
let lastDate = new Date();
lastDate.setDate(lastDate.getDate() -3);
let firstDate = new Date();
firstDate.setDate(lastDate.getDate() - INTERVAL);
//variable for map data retrieved from
//external sources (ie. another server):
var mapDataExt;

//App configuration
const myFormat = printf(({level, message, timestamp}) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(
    timestamp(),
    myFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'combined.log' })
  ]
});
logger.info('logger luotu index.js');

app.set("views", path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
/*
app.use(helmet({
    contentSecurityPolicy: false,
  })
);
*/

//Database management:
  //helper functions

function getMsToUpdate(){
  let now = new Date();
  let msToUpdate = new Date(now.getFullYear(), now.getMonth(),
  now.getDate(), UPDATEHOURS, 0, 0, 0 ) - now;
  if (msToUpdate < 0) //if clock is over UPDATEHOURS
  {
    msToUpdate += 86400000;  //add 24 hours
  }
  return msToUpdate;
}

function updateData(){
  logger.info('updating data...');
  fetch('https://gentle-badlands-46568.herokuapp.com/mapdata')
    .then(res => {
      return res.json();
    })
    .then(json => {
      const tempMapDataExt = json;
      //add check for data here before assigning new mapdata to mapDataExt
      mapDataExt = json;
      logger.info('Map data updated succesfully!');
    })
    .catch(err => {
      logger.info('Map data update failed!');
      logger.info(err);
    });

  }

function pokeAndUpdate() {
  //poke the server to wake it up
  fetch('https://gentle-badlands-46568.herokuapp.com/mapdata')
    .then(res => {
      return res.json();
    })
    .catch(err => {
      logger.info('poke completed with error which is normal');
    });

    //attempt map data update after poke has awakened the server:
    setTimeout(updateData, 10000);

}
pokeAndUpdate();
setInterval(pokeAndUpdate, UPDATEINTERVAL * 3600000);




  /*
  const testDate = new Date();
  logger.info(testDate.toISOString(), '- Updating data...');
  testDate.setDate(testDate.getDate() - 2); // becausenot today because
                                          //THL newest data is from yesterday
      //check if database has been updated:
  caseData.refreshDatabase(testDate)
    .then(res => {
        //update interval dates
      lastDate = testDate;
      firstDate.setDate(lastDate.getDate() - INTERVAL);
      //check again tomorrow at 8 am
      setTimeout(updateData, getMsToUpdate());
      logger.info(
            'index.js - Case data updated! Next update at',
              UPDATEHOURS, 'AM.');
    }).catch(res => {
      logger.info(
        'index.js - Failed to update case data - trying again in 1 hour');
        logger.info('index.js - ', res.message );
      setTimeout(updateData, 3600000);
    });
}


  //get THL data at server startup:
  caseData.refreshDatabase()
    .then(res => {
      //updateData();
      logger.info('refresh success');

  }).catch(res => {
      logger.error('refresh failed');
  });

*/
//Route definitions
app.get('/', (req,res) => {
  logger.info('haetaan index.pug');
  /*
  let keissit = caseData.getCasesInFinland(firstDate, lastDate);
  logger.info(firstDate.toISOString());
  logger.info(lastDate.toISOString());
  for (let i of keissit)
  {
    logger.info(i);
  }
  */
  res.render('index.pug');
});

//controller for retrieving mapdata, date to be added as querystrings later
app.get('/mapdata', (req, res) => {
  //send the map data in json form
  logger.info('haetaan mapdataa');
  let dataPackage = mapDataExt;
  logger.info(dataPackage.type);
  /*
  let dataPackage = mapData.getMapData
                          (caseData.getCasesInFinland(firstDate, lastDate));
  dataPackage.firstDate = firstDate.getDate()+'.'+ firstDate.getMonth()+'.'
                        + firstDate.getFullYear();
  dataPackage.lastDate = lastDate.getDate()+'.'+ lastDate.getMonth()+'.'
                        + lastDate.getFullYear();
  */
  res.header("Content-Type", 'application/json');

  //logger.error(JSON.stringify(dataPackage));
  res.send(JSON.stringify(dataPackage));
});

//Server activation
app.listen(port, () =>{
  logger.info(`listening to requests on http://localhost:${port}`);
});
