/* casedata.js - module offers handles interaction and storage of
the data from THL database.
API:
bool refreshDatabase(lastDate)
int(cases) getCasesArea(area, timeStart, timeEnd)
Map(area, cases) getCasesInFinland = (startDate, endDate )
*/

const fetch = require('node-fetch');
const JSONstat = require('jsonstat-toolkit');
const {createLogger, format, transports}  = require('winston');
const {printf, timestamp, combine } = format;


//logger initialization
const logFormat = printf(({level, message, timestamp}) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'combined.log' })
  ]
});

logger.info('logger luoto - casedata.js');


//Datasource configuration
// root is the starting point, so if you want to go through municipalities you start with the first municipality
//osoitteen row ja col argumentit haettu THL:n tiku tilastojen katselu työkalun kautta osoitteesta:
//https://sampo.thl.fi/pivot/prod/fi/epirapo/covid19case/fact_epirapo_covid19case?row=hcdmunicipality2020-445222&column=508804L
var url = 'https://sampo.thl.fi/pivot/prod/fi/epirapo/covid19case/fact_epirapo_covid19case.json?row=hcdmunicipality2020-445222&column=508804L&filter=measure-444833';
          //https://sampo.thl.fi/pivot/prod/fi/epirapo/covid19case/fact_epirapo_covid19case.json?row=hcdmunicipality2020-445222&column=dateweek20200101-509030&filter=measure-444833
          // https://sampo.thl.fi/pivot/prod/fi/epirapo/covid19case/fact_epirapo_covid19case.json?row=dateweek2020010120201231-443686&column=hcdmunicipality2020-445222

var CHAs; //central hospital areas
var dataJSON;
var dataJSONSTAT;
const timeID = "dateweek20200101";
const areaID = "hcdmunicipality2020";
logger.info('muuttujien luonnin jälkeen');

const refreshDatabase = exports.refreshDatabase = function(lastDate){
//request data from the THL database:

  return new Promise((resolve, reject) => {
    logger.info('luodaan uutta Promisea, yritetään fetchiä');
    fetch(url)
      .then(res => {
        logger.info('fetch response:', Object.entries(res));
        return res.json();
      })
      .then(json => {
        dataJSON = json;
        logger.info(Object.entries(json));
        dataJSONSTAT = JSONstat(dataJSON);
        logger.info('dataset info:')
        logger.info(JSONstat(dataJSON).Dataset(0));
        CHAs = Object.values
        (dataJSON.dataset.dimension.hcdmunicipality2020.category.label);
        logger.info('fetchissä CHAs tulostus:', {message:CHAs});

        if(arguments.length === 1){
          //check if the THL database has been updated:

          if(!isNaN(parseInt(JSONstat(dataJSON).Dataset(0).
          Data({[timeID]: getTimeRoot(dateToDatestring(lastDate)) ,
              [areaID] : getAreaRoot('Ahvenanmaa')}).value)))
              {
                logger.info('casedata.js - update success');
                resolve({status:true, message:'db date ok'});
              }
              else{
                logger.info('casedata.js - update failed');
                reject({status:false, message:'db not ready yet'});
              }
          }
      }).catch(err => {
        logger.info(err);
        logger.info(err.type);
        logger.info(err.message);
        logger.info('fetch process failed');
        reject({status:false, message:'fetch process failed'})
      });
      resolve({status:true, message:'db refreshed'});
  });


}


//Helper functions:
  //returns the first key found from an object by given value
const getKeyByValue = (object, value) => {
  return Object.keys(object).find(key => object[key] === value);
}


const getTimeRoot = (time) => {
  const times = dataJSON.dataset.dimension.dateweek20200101.category.label;
  const root = getKeyByValue(times, time);
  return root;
}

const getAreaRoot = (area) => {
  const areas = dataJSON.dataset.dimension.hcdmunicipality2020.category.label;
  const root = getKeyByValue(areas, area);
  return root;
}

const dateToDatestring = date => date.toISOString().slice(0, date.toISOString().indexOf('T'));

//return number of cases in certain area within two dates: (string, Date, Date)
//return number of cases in certain area for one day: (string, Date)
const getCasesArea = exports.getCasesArea =
                          function (area, timeStart, timeEnd) {

    if (arguments.length === 2 )
    {
      return parseInt(JSONstat(dataJSON).Dataset(0).
       Data({[timeID]: getTimeRoot(dateToDatestring(timeStart)) ,
           [areaID] : getAreaRoot(area)}).value)
           //return statement here?
    }

    let caseCounter = 0;
    let runningDay = new Date(timeStart.getTime());
    let oneAfterLast = new Date(timeEnd.getTime()); //while end condition to include timeEnd
    oneAfterLast.setDate(oneAfterLast.getDate() + 1);

    while (!((runningDay.getDate() == oneAfterLast.getDate()) &&
          (runningDay.getMonth() == oneAfterLast.getMonth()))){
            caseCounter += parseInt(JSONstat(dataJSON).Dataset(0).
             Data({[timeID]: getTimeRoot(dateToDatestring(runningDay)) ,
                 [areaID] : getAreaRoot(area)  }).value);

            runningDay.setDate(runningDay.getDate() + 1 );

    }
    return caseCounter;
}

// (Date, Date | returns Map (area/string, number of cases/int))
exports.getCasesInFinland = (startDate, endDate ) => {

  let cases = new Map();
  logger.info('getCasesInFinland issa');
  logger.info(`number of areas ${typeof(CHAs)}`);
  for(let area of CHAs){
    cases.set(area, getCasesArea(area, startDate, endDate));
  }
  return cases;
}
