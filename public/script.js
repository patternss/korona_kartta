//
var geoJSON;
var mapData;
var info;
var prevClickedLayer;


function getColor(d) {
  return d > 600 ? '#67000d' :
  d > 300 ? '#a50f15' :
  d > 150 ? '#cb181d' :
  d > 80  ? '#ef3b2c' :
  d > 40  ? '#fb6a4a' :
  d > 20  ? '#fc9272' :
  d > 10  ? '#fcbba1' :
  d > 5   ? '#fee0d2' :
            '#fff5f0';

  /*
  #fff5f0
  #fee0d2
  #fcbba1
  #fc9272
  #fb6a4a
  #ef3b2c
  #cb181d
  #a50f15
  #67000d
  */

}

function style(feature) {
  return {
    fillColor: getColor(feature.properties.appearenceNbr),
    weight: 1.8,
    opacity: 1,
    color: 'white',
    dashArray: '1',
    fillOpacity: 0.65
  };
}

function highlightFeature(e){
  let layer = e.target;
  L.DomEvent.stopPropagation(e);

  if(L.Browser.mobile && !L.Browser.android) //for IOS bug
  {
    //reset style for previous active layer
    geoJSON.resetStyle(prevClickedLayer);
    prevClickedLayer = e.target;
  }

  //prevClickedLayer = layer;
  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
  info.update(layer.feature.properties);
}

function resetHighlight(e) {
  geoJSON.resetStyle(e.target);
  info.update();
}


function onEachFeature(feature, layer) {
  //check if feature is an area with appearence number:

  if (feature.properties && !(isNaN(feature.properties.appearenceNbr))) {
    let num = Math.round(feature.properties.appearenceNbr);
    num = num.toString();
    let tooltipDirection;

    //adding appearence number
    if (feature.properties.sairaanhoitopiiri === 'Pohjois-Pohjanmaan SHP'
    || feature.properties.sairaanhoitopiiri === 'Keski-Pohjanmaan SHP'
    || feature.properties.sairaanhoitopiiri === 'Satakunnan SHP')
    {
      tooltipDirection = 'right';
    }
    else if(feature.properties.sairaanhoitopiiri ==="Varsinais-Suomen SHP")
    {
      tooltipDirection = 'top';
    }
    else {
      tooltipDirection = 'center';
    }
    layer.bindTooltip( num,
      {
        permanent:true,
        direction: tooltipDirection,
        className: 'appearenceNumber'
      });
    //event listeners for mouseover and mouseleave:

    if(L.Browser.mobile)
    {
      layer.on({
        click: highlightFeature,
        mouseout: resetHighlight
      });
    }
    else { //not touch device
      layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,

      });
    }
  }
}

function onMapClick(e) {
  if(L.Browser.mobile && !L.Browser.android) //for IOS bug
  {
    geoJSON.resetStyle(prevClickedLayer);
    info.update();
  }
}

  function mapInitialization() {
    const mymap = L.map('koronakartta').setView([64.8, 23.5], 5);
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox/light-v9',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: 'pk.eyJ1IjoicGF0dDNybnMiLCJhIjoiY2tnb3UyanJuMXEycTMwbmF6dnlpM3FyNCJ9.ffboWeFg0KkI7uC0K4k87g'
    }).addTo(mymap);
    //map movement interaction settings:
    mymap.zoomControl.remove();
    mymap.doubleClickZoom.disable();
    mymap.scrollWheelZoom.enable();
    mymap.boxZoom.disable();
    mymap.keyboard.disable();
    if(L.Browser.mobile)
    {
      mymap.dragging.disable();
      mymap.touchZoom.disable();
    }

    mymap.on('click', onMapClick);

    // add info
    info = L.control({
     position:'topleft'
    });
    //area initialization

    fetch('/mapdata')
    .then(response => response.json())
    .then(data => {
      mapData = data;
      console.log('mapData entries fetchputkessa jälkeen', Object.entries(mapData));
      geoJSON = L.geoJson(mapData,
        {style: style, onEachFeature: onEachFeature}).addTo(mymap);


        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };


        info.update = function (props) {
            this._div.innerHTML = '<h4>Uudet tartunnat </h4>'
            + (props ? '<b>' + props.sairaanhoitopiiri + '</b><br />'
            + 'Ilmaantuvuusluku: ' + Math.round(props.appearenceNbr) + '<br />'
            + 'Tartunnat: ' + props.cases + '<br />'
            : '<b>Koko maa </b><br />'
            + 'Ilmaantuvuusluku: ' + mapData.totalAppNum  + '<br />'
            + 'Tartunnat: ' + mapData.allCases + '<br />'
          ) + '<i>'+ mapData.firstDate +' - '+ mapData.lastDate + '</i> <br />';

        };
        info.addTo(mymap);
      })
      .catch(err => {
        console.log(err);

      });
}

window.onload = mapInitialization;
