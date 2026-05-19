import { CONFIG } from './config.js';

import {
  loadKMLLayer,
  loadShapefileLayer
} from './layers.js';

// ====================
// CREATE MAP
// ====================

const map = L.map('map', {
  zoomControl: false,
  zoomAnimation: true,
  fadeAnimation: true,
  markerZoomAnimation: true
}).setView(
  [13.7563, 100.5018],
  6
);

// ====================
// FIX MAP SIZE
// ====================

window.addEventListener('load', function () {

  map.invalidateSize();

  setTimeout(function () {

    map.invalidateSize();

  }, 300);

});

// ====================
// ZOOM CONTROL
// ====================

L.control.zoom({
  position: 'bottomleft'
}).addTo(map);

// ====================
// BASEMAP
// ====================

const osm = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '&copy; OpenStreetMap'
  }
);

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
    maxNativeZoom: 17,
    tileSize: 256
  }
).addTo(map);

// ====================
// LAYER CONTROL
// ====================

const baseMaps = {
  OpenStreetMap: osm,
  Satellite: satellite
};

const overlayMaps = {};

const layerControl = L.control.layers(
  baseMaps,
  overlayMaps,
  {
    position: 'bottomright',
    collapsed: false
  }
).addTo(map);

// ====================
// SEARCHABLE LAYERS
// ====================

const searchableLayers = [];

// ====================
// LOAD KML
// ====================

for (const kmlFile of CONFIG.kmlFiles) {

  loadKMLLayer(
    map,
    layerControl,
    searchableLayers,
    kmlFile.path,
    kmlFile.name
  );

}

// ====================
// LOAD SHAPEFILE
// ====================

for (const shpFile of CONFIG.shpFiles) {

  loadShapefileLayer(
    map,
    layerControl,
    searchableLayers,
    shpFile.path,
    shpFile.name
  );

}

// ====================
// AREA FORMAT
// ====================

function formatThaiArea(squareMeters) {

  const totalWa =
    squareMeters / 4;

  const rai =
    Math.floor(totalWa / 400);

  const ngan =
    Math.floor(
      (totalWa % 400) / 100
    );

  const wa =
    totalWa % 100;

  return {

    squareMeters:
      squareMeters.toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      ),

    thaiArea:
      rai +
      ' ไร่ - ' +
      ngan +
      ' งาน - ' +
      wa.toFixed(2) +
      ' วา'

  };

}

// ====================
// DISTANCE FORMAT
// ====================

function formatDistance(meters) {

  if (meters >= 1000) {

    return (
      meters / 1000
    ).toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ) + ' กิโลเมตร';

  }

  return meters.toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ) + ' เมตร';

}

function calculatePolylineDistance(latlngs) {

  let distance = 0;

  for (
    let i = 0;
    i < latlngs.length - 1;
    i++
  ) {

    distance +=
      latlngs[i].distanceTo(
        latlngs[i + 1]
      );

  }

  return distance;

}

// ====================
// DRAW AREA / MEASURE TOOL
// ====================

const drawnItems =
  new L.FeatureGroup();

map.addLayer(
  drawnItems
);

layerControl.addOverlay(
  drawnItems,
  'เครื่องมือวัด / พื้นที่ที่วาด'
);

const drawControl =
  new L.Control.Draw({

    position: 'topleft',

    draw: {

      polygon: {
        shapeOptions: {
          color: '#00bcd4',
          weight: 3,
          opacity: 1,
          fillColor: '#00bcd4',
          fillOpacity: 0.18
        }
      },

      rectangle: {
        shapeOptions: {
          color: '#4caf50',
          weight: 3,
          opacity: 1,
          fillColor: '#4caf50',
          fillOpacity: 0.18
        }
      },

      polyline: {
        shapeOptions: {
          color: '#ff9800',
          weight: 5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }
      },

      circle: false,
      marker: true,
      circlemarker: false

    },

    edit: {
      featureGroup: drawnItems,
      remove: true
    }

  });

map.addControl(drawControl);

// ====================
// DRAW EVENT
// ====================

map.on(
  L.Draw.Event.CREATED,
  function (event) {

    const layer =
      event.layer;

    drawnItems.addLayer(
      layer
    );

    // ====================
    // MARKER
    // ====================

    if (
      event.layerType === 'marker'
    ) {

      const latlng =
        layer.getLatLng();

      const lat =
        latlng.lat.toFixed(6);

      const lng =
        latlng.lng.toFixed(6);

      layer.bindPopup(

        '<b>พิกัดตำแหน่ง</b><br>' +
        'Latitude: ' + lat +
        '<br>' +
        'Longitude: ' + lng

      ).openPopup();

      return;

    }

    // ====================
    // DISTANCE
    // ====================

    if (
      event.layerType === 'polyline'
    ) {

      const latlngs =
        layer.getLatLngs();

      const distance =
        calculatePolylineDistance(
          latlngs
        );

      layer.bindPopup(

        '<b>ระยะทางที่วัด</b><br>' +
        formatDistance(
          distance
        )

      ).openPopup();

      return;

    }

    // ====================
    // AREA
    // ====================

    if (
      layer instanceof L.Polygon
    ) {

      const latlngs =
        layer.getLatLngs()[0];

      const area =
        L.GeometryUtil
          .geodesicArea(
            latlngs
          );

      const areaText =
        formatThaiArea(
          area
        );

      layer.bindPopup(

        '<b>พื้นที่ที่วาด</b><br>' +

        areaText.squareMeters +
        ' ตารางเมตร<br>' +

        areaText.thaiArea

      ).openPopup();

    }

  }
);

// ====================
// SEARCH
// ====================

let searchMarker = null;

document
  .getElementById(
    'searchInput'
  )
  .addEventListener(
    'keydown',
    async function (e) {

      if (
        e.key !== 'Enter'
      ) return;

      const keyword =
        e.target.value.trim();

      if (!keyword) return;

      let foundLayer =
        null;

      for (
        const layer of searchableLayers
      ) {

        if (
          !layer.feature ||
          !layer.feature.properties
        ) continue;

        const props =
          layer.feature.properties;

        for (
          const key in props
        ) {

          const value =
            String(
              props[key]
            ).toLowerCase();

          if (
            value.includes(
              keyword.toLowerCase()
            )
          ) {

            foundLayer =
              layer;

            break;

          }

        }

        if (
          foundLayer
        ) break;

      }

      if (
        foundLayer
      ) {

        if (
          foundLayer.getLatLng
        ) {

          map.setView(
            foundLayer.getLatLng(),
            18
          );

        } else if (
          foundLayer.getBounds
        ) {

          map.fitBounds(
            foundLayer.getBounds()
          );

        }

        foundLayer.openPopup();

        return;

      }

      const response =
        await fetch(

          'https://nominatim.openstreetmap.org/search?format=json&q=' +

          encodeURIComponent(
            keyword
          )

        );

      const results =
        await response.json();

      if (
        results.length === 0
      ) {

        alert(
          'ไม่พบข้อมูล'
        );

        return;

      }

      const place =
        results[0];

      const lat =
        parseFloat(
          place.lat
        );

      const lon =
        parseFloat(
          place.lon
        );

      map.setView(
        [lat, lon],
        16
      );

      if (
        searchMarker
      ) {

        map.removeLayer(
          searchMarker
        );

      }

      searchMarker =
        L.marker(
          [lat, lon]
        ).addTo(map);

      searchMarker
        .bindPopup(
          place.display_name
        )
        .openPopup();

    }
  );

console.log(
  'WEB GIS READY'
);