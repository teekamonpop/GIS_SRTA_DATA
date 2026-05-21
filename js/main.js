import { CONFIG } from './config.js';

import {
  loadKMLLayer,
  loadShapefileLayer
} from './layers.js';
// ====================
// SUPABASE
// ====================

const SUPABASE_URL =
  'https://fuvnqxiwiniigabzaejg.supabase.co';

const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dm5xeGl3aW5paWdhYnphZWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjMxNjEsImV4cCI6MjA5NDg5OTE2MX0.7AECH9EkMjGHFZYh6SIrpVo1ulWrf_SK5Ui-AYpCdNg';

const supabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

// ====================
// LOGIN CHECK
// ====================

async function requireLogin() {

  const { data } =
    await supabase.auth.getSession();

  if (!data.session) {

    window.location.href =
      './login.html';

  }

}

requireLogin();

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
  position: 'topleft'
}).addTo(map);

// ====================
// BASEMAP
// ====================

const osm = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 22
  }
);

const googleMap = L.tileLayer(
  'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  {
    attribution: 'Google Map',
    maxZoom: 22
  }
);

const googleSatellite = L.tileLayer(
  'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  {
    attribution: 'Google Satellite',
    maxZoom: 22
  }
).addTo(map);

const googleHybrid = L.tileLayer(
  'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  {
    attribution: 'Google Hybrid',
    maxZoom: 22
  }
);

const esriSatellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Esri',
    maxZoom: 22
  }
);

// ====================
// LAYER CONTROL
// ====================

const baseMaps = {
  OpenStreetMap: osm,
  'Google Map': googleMap,
  'Google Satellite': googleSatellite,
  'Google Hybrid': googleHybrid,
  'Esri Satellite': esriSatellite
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
  const totalWa = squareMeters / 4;

  const rai = Math.floor(totalWa / 400);

  const ngan = Math.floor((totalWa % 400) / 100);

  const wa = totalWa % 100;

  return {
    squareMeters: squareMeters.toLocaleString(
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

  for (let i = 0; i < latlngs.length - 1; i++) {
    distance += latlngs[i].distanceTo(
      latlngs[i + 1]
    );
  }

  return distance;
}

// ====================
// DRAW GROUPS
// ====================

const drawnItems = new L.FeatureGroup();

const snapGuideLayers = new L.FeatureGroup();

map.addLayer(drawnItems);

map.addLayer(snapGuideLayers);

layerControl.addOverlay(
  drawnItems,
  'เครื่องมือวัด / พื้นที่ที่วาด'
);

// ====================
// AUTO SAVE
// ====================

async function saveDrawings() {

  try {

    const deleteResult =
      await supabase
        .from('parcels')
        .delete()
        .not('id', 'is', null);

    if (deleteResult.error) {
      console.error('DELETE SUPABASE ERROR:', deleteResult.error);
      return;
    }

    const features = [];

    drawnItems.eachLayer(function (layer) {

  if (
    !(layer instanceof L.Polygon) &&
    !(layer instanceof L.Rectangle)
  ) {
    return;
  }

      const geojson =
        layer.toGeoJSON();

      const props =
        layer.feature && layer.feature.properties
          ? layer.feature.properties
          : {};

      const area =
        turf.area(geojson);

      features.push({
        name: props.name || '',
        owner: props.owner || '',
        note: props.note || '',
        docno: props.docno || '',
        area_sqm: area,
        geojson: geojson
      });

    });

    if (features.length === 0) {

  console.warn(
    'ไม่มี polygon สำหรับ save'
  );

  return;

}

    const insertResult =
      await supabase
        .from('parcels')
        .insert(features);

    if (insertResult.error) {
      console.error('INSERT SUPABASE ERROR:', insertResult.error);
    }

  } catch (error) {

    console.error('SAVE DRAWINGS ERROR:', error);

  }

}

// ====================
// LOAD DRAWINGS
// ====================

async function loadDrawings() {

  try {

    const {
      data,
      error
    } = await supabase
      .from('parcels')
      .select('*');

    if (error) {
      console.error(
        'LOAD DRAWINGS ERROR:',
        error
      );
      return;
    }

    drawnItems.clearLayers();

    snapGuideLayers.clearLayers();

    data.forEach(function (item) {

      const geojsonLayer =
        L.geoJSON(
          item.geojson,
          {

            onEachFeature: function (
              feature,
              layer
            ) {

              layer.feature = {
                type: 'Feature',
                properties: {
                  name: item.name || '',
                  owner: item.owner || '',
                  note: item.note || '',
                  docno: item.docno || ''
                },
                geometry: feature.geometry
              };

              drawnItems.addLayer(layer);

              snapGuideLayers.addLayer(layer);

              if (
                layer instanceof L.Polygon
              ) {

                bindAreaPopup(layer);

                layer.on(
                  'click',
                  function () {

                    bindAreaPopup(layer);

                    setTimeout(function () {
                      layer.openPopup();
                    }, 100);

                  }
                );

              }

            }

          }
        );

      geojsonLayer.addTo(map);

    });

    updateAttributeTable();

    console.log(
      'LOAD DRAWINGS SUCCESS'
    );

  } catch (error) {

    console.error(
      'LOAD DRAWINGS CATCH ERROR:',
      error
    );

  }

}

// ====================
// PARCEL INFO
// ====================

function openParcelForm(layer) {

  return new Promise(function (resolve) {

    const modal =
      document.getElementById('parcel-form-modal');

    const nameInput =
      document.getElementById('parcel-name');

    const ownerInput =
      document.getElementById('parcel-owner');

    const docnoInput =
      document.getElementById('parcel-docno');

    const noteInput =
      document.getElementById('parcel-note');

    const saveButton =
      document.getElementById('parcel-save');

    const cancelButton =
      document.getElementById('parcel-cancel');

    const oldProps =
      layer.feature && layer.feature.properties
        ? layer.feature.properties
        : {};

    nameInput.value =
      oldProps.name || '';

    ownerInput.value =
      oldProps.owner || '';

    docnoInput.value =
      oldProps.docno || '';

    noteInput.value =
      oldProps.note || '';

    modal.style.display =
      'flex';

    function closeForm(result) {

      modal.style.display =
        'none';

      saveButton.onclick = null;
      cancelButton.onclick = null;

      resolve(result);

    }

    saveButton.onclick = function () {

      layer.feature = {
        type: 'Feature',
        properties: {
          name: nameInput.value || 'parcel',
          owner: ownerInput.value || '',
          docno: docnoInput.value || '',
          note: noteInput.value || ''
        },
        geometry: null
      };

      closeForm(true);

    };

    cancelButton.onclick = function () {

      closeForm(false);

    };

  });

}

// ====================
// POPUP AREA
// ====================

function buildParcelPopupContent(
  layer
) {

  const geojson =
    layer.toGeoJSON();

  const area =
    turf.area(geojson);

  const areaText =
    formatThaiArea(area);

  const props =
    layer.feature &&
    layer.feature.properties
      ? layer.feature.properties
      : {};

  return (

    '<div class="parcel-popup">' +

      '<h3>' +
      (props.name || 'พื้นที่แปลง') +
      '</h3>' +

      '<table>' +

        '<tr>' +
          '<td><b>เจ้าของ</b></td>' +
          '<td>' +
          (props.owner || '-') +
          '</td>' +
        '</tr>' +

        '<tr>' +
          '<td><b>เลขเอกสาร</b></td>' +
          '<td>' +
          (props.docno || '-') +
          '</td>' +
        '</tr>' +

        '<tr>' +
          '<td><b>พื้นที่</b></td>' +
          '<td>' +
          areaText.thaiArea +
          '</td>' +
        '</tr>' +

        '<tr>' +
          '<td><b>ตารางเมตร</b></td>' +
          '<td>' +
          areaText.squareMeters +
          '</td>' +
        '</tr>' +

      '</table>' +

      '<div style="margin-top:8px;">' +
      (props.note || '-') +
      '</div>' +

    '</div>'

  );

}


// ====================
// BIND POPUP
// ====================

function bindAreaPopup(
  layer
) {

  const popupContent =
    buildParcelPopupContent(
      layer
    );

  layer.bindPopup(
    popupContent,
    {
      maxWidth: 320
    }
  );

}

// ====================
// DRAW CONTROL
// ====================

const drawControl = new L.Control.Draw({
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

loadDrawings();

// ====================
// SNAP FINISHED POLYGON
// ====================

function snapLayerToExisting(layer, snapDistancePx = 40) {
  if (!(layer instanceof L.Polygon)) return;

  const currentLatLngs =
    layer.getLatLngs()[0];

  const guidePoints = [];

  drawnItems.eachLayer(function (guideLayer) {
    if (
      guideLayer === layer ||
      !(guideLayer instanceof L.Polygon)
    ) return;

    const guideLatLngs =
      guideLayer.getLatLngs()[0];

    guideLatLngs.forEach(function (latlng) {
      guidePoints.push(latlng);
    });
  });

  if (guidePoints.length === 0) return;

  const snappedLatLngs =
    currentLatLngs.map(function (latlng) {
      let nearestPoint = null;
      let nearestDistance = Infinity;

      const point =
        map.latLngToLayerPoint(latlng);

      guidePoints.forEach(function (guideLatLng) {
        const guidePoint =
          map.latLngToLayerPoint(guideLatLng);

        const distance =
          point.distanceTo(guidePoint);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPoint = guideLatLng;
        }
      });

      if (
        nearestDistance <= snapDistancePx &&
        nearestPoint
      ) {
        return nearestPoint;
      }

      return latlng;
    });

  layer.setLatLngs([snappedLatLngs]);
  layer.redraw();
}

// ====================
// DRAW EVENT
// ====================

map.on(
  L.Draw.Event.CREATED,
  async function (event) {

    const layer =
      event.layer;

    const layerType =
      event.layerType;


    // ====================
    // ADD TO MAP
    // ====================

    drawnItems.addLayer(layer);

    snapGuideLayers.addLayer(layer);


    // ====================
    // SNAP POLYGON
    // ====================

    if (layerType === 'polygon') {

      snapLayerToExisting(
        layer,
        100
      );

    }


    // ====================
    // PARCEL FORM
    // ====================

    if (
      layerType === 'polygon' ||
      layerType === 'rectangle'
    ) {

      const saved =
        await openParcelForm(layer);

      if (!saved) {

        drawnItems.removeLayer(layer);

        snapGuideLayers.removeLayer(layer);

        return;

      }

    }

    // ====================
    // MARKER POPUP
    // ====================

    if (layerType === 'marker') {

      const latlng =
        layer.getLatLng();

      layer.bindPopup(
        '<b>พิกัดตำแหน่ง</b><br>' +
        'Latitude: ' +
        latlng.lat.toFixed(6) +
        '<br>' +
        'Longitude: ' +
        latlng.lng.toFixed(6)
      );

      setTimeout(function () {

        layer.openPopup();

      }, 200);

    }


    // ====================
    // POLYLINE POPUP
    // ====================

    if (layerType === 'polyline') {

      const distance =
        calculatePolylineDistance(
          layer.getLatLngs()
        );

      layer.bindPopup(
        '<b>ระยะทางที่วัด</b><br>' +
        formatDistance(distance)
      );

      setTimeout(function () {

        layer.openPopup();

      }, 200);

    }


    // ====================
    // POLYGON POPUP
    // ====================

    if (
      layer instanceof L.Polygon
    ) {

      bindAreaPopup(layer);

      layer.on(
        'click',
        function () {

          bindAreaPopup(layer);

          setTimeout(function () {

            layer.openPopup();

          }, 100);

        }
      );

      setTimeout(function () {

        layer.openPopup();

      }, 300);

    }


    // ====================
    // SAVE + UPDATE
    // ====================

    await saveDrawings();

    updateAttributeTable();

  }
);

// ====================
// DRAW EDIT / DELETE SAVE
// ====================

map.on(
  'draw:edited',
  async function (event) {

    event.layers.eachLayer(
      function (layer) {

        if (layer instanceof L.Polygon) {
          bindAreaPopup(layer);
        }

      }
    );

    await saveDrawings();

    updateAttributeTable();

  }
);

map.on(
  'draw:deleted',
  async function () {

    snapGuideLayers.clearLayers();

    drawnItems.eachLayer(function (layer) {

      snapGuideLayers.addLayer(layer);

    });

    await saveDrawings();

    updateAttributeTable();

  }
);

// ====================
// POPUP REFRESH WHEN CLICK
// ====================

drawnItems.on(
  'click',
  function (event) {
    const layer = event.layer;

    if (layer instanceof L.Polygon) {
      bindAreaPopup(layer);
      layer.openPopup();
    }
  }
);

// ====================
// ENABLE MAP INTERACTION
// ====================

function enableMapInteraction() {

  map.dragging.enable();

  map.doubleClickZoom.enable();

  map.scrollWheelZoom.enable();

  map.boxZoom.enable();

  map.keyboard.enable();

}

// ====================
// FIX MAP STUCK
// ====================

document.addEventListener(
  'keydown',
  function (event) {

    if (event.key === 'Escape') {

      enableMapInteraction();

    }

  }
);


map.on(
  'draw:drawstop',
  enableMapInteraction
);

map.on(
  'draw:editstop',
  enableMapInteraction
);

map.on(
  'draw:deletestop',
  enableMapInteraction
);

// ====================
// SEARCH
// ====================

let searchMarker = null;

const searchInput =
  document.getElementById(
    'searchInput'
  );

if (searchInput) {

  searchInput.addEventListener(
    'keydown',
    async function (event) {

      if (event.key !== 'Enter') {
        return;
      }

      const keyword =
        event.target.value
          .trim()
          .toLowerCase();

      if (!keyword) {
        return;
      }


      // ====================
      // SEARCH IN MAP LAYERS
      // ====================

      let foundLayer = null;

      for (const layer of searchableLayers) {

        if (
          !layer.feature ||
          !layer.feature.properties
        ) {
          continue;
        }

        const props =
          layer.feature.properties;

        for (const key in props) {

          const value =
            String(props[key])
              .toLowerCase();

          if (
            value.includes(keyword)
          ) {

            foundLayer = layer;

            break;

          }

        }

        if (foundLayer) {
          break;
        }

      }


      // ====================
      // FOUND IN MAP
      // ====================

      if (foundLayer) {

        if (
          foundLayer.getLatLng
        ) {

          map.setView(
            foundLayer.getLatLng(),
            18
          );

        }

        else if (
          foundLayer.getBounds
        ) {

          map.fitBounds(
            foundLayer.getBounds()
          );

        }

        setTimeout(function () {

          foundLayer.openPopup();

        }, 200);

        return;

      }

      // ====================
      // SEARCH FROM NOMINATIM
      // ====================

      try {

        const response =
          await fetch(
            'https://nominatim.openstreetmap.org/search?format=json&q=' +
            encodeURIComponent(keyword)
          );

        const results =
          await response.json();

        if (
          !results ||
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
          parseFloat(place.lat);

        const lon =
          parseFloat(place.lon);

        map.setView(
          [lat, lon],
          16
        );

        if (searchMarker) {

          map.removeLayer(
            searchMarker
          );

        }

        searchMarker =
          L.marker(
            [lat, lon]
          ).addTo(map);

        searchMarker.bindPopup(
          place.display_name
        );

        setTimeout(function () {

          searchMarker.openPopup();

        }, 200);

      }

      catch (error) {

        console.error(
          'SEARCH ERROR:',
          error
        );

      }

    }
  );

}

// ====================
// DOWNLOAD HELPER
// ====================

function downloadBlob(
  blob,
  filename
) {

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href =
    url;

  link.download =
    filename;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );

}


// ====================
// GET DRAWN POLYGON GEOJSON
// ====================

function getDrawnPolygonGeoJSON() {

  const geojson =
    drawnItems.toGeoJSON();

  if (
    !geojson.features ||
    geojson.features.length === 0
  ) {

    alert(
      'กรุณาวาดแปลงก่อน Export'
    );

    return null;

  }

  const polygonFeatures =
    geojson.features.filter(
      function (feature) {

        return (
          feature.geometry &&
          (
            feature.geometry.type === 'Polygon' ||
            feature.geometry.type === 'MultiPolygon'
          )
        );

      }
    );

  if (
    polygonFeatures.length === 0
  ) {

    alert(
      'Export ได้เฉพาะ Polygon หรือ Rectangle เท่านั้น'
    );

    return null;

  }

  const exportGeojson = {
    type: 'FeatureCollection',
    features: polygonFeatures
  };

  return turf.truncate(
    exportGeojson,
    {
      precision: 10,
      coordinates: 2
    }
  );

}


// ====================
// EXPORT SHP
// ====================

const exportShpButton =
  document.getElementById(
    'export-shp'
  );

if (exportShpButton) {

  exportShpButton.addEventListener(
    'click',
    function () {

      const geojson =
        getDrawnPolygonGeoJSON();

      if (!geojson) {
        return;
      }

      shpwrite.download(
        geojson,
        {
          folder: 'SHP_Export',
          types: {
            polygon: 'parcel'
          }
        }
      );

    }
  );

}


// ====================
// EXPORT KML
// ====================

const exportKmlButton =
  document.getElementById(
    'export-kml'
  );

if (exportKmlButton) {

  exportKmlButton.addEventListener(
    'click',
    function () {

      if (
        typeof tokml === 'undefined'
      ) {

        alert(
          'ไม่พบ tokml กรุณาตรวจสอบ index.html'
        );

        return;

      }

      const geojson =
        getDrawnPolygonGeoJSON();

      if (!geojson) {
        return;
      }

      const kml =
        tokml(
          geojson,
          {
            name: 'name',
            description: 'description'
          }
        );

      const blob =
        new Blob(
          [kml],
          {
            type:
              'application/vnd.google-earth.kml+xml;charset=utf-8'
          }
        );

      downloadBlob(
        blob,
        'parcel.kml'
      );

    }
  );

}


// ====================
// EXPORT KMZ
// ====================

const exportKmzButton =
  document.getElementById(
    'export-kmz'
  );

if (exportKmzButton) {

  exportKmzButton.addEventListener(
    'click',
    async function () {

      if (
        typeof tokml === 'undefined'
      ) {

        alert(
          'ไม่พบ tokml กรุณาตรวจสอบ index.html'
        );

        return;

      }

      if (
        typeof JSZip === 'undefined'
      ) {

        alert(
          'ไม่พบ JSZip กรุณาตรวจสอบ index.html'
        );

        return;

      }

      const geojson =
        getDrawnPolygonGeoJSON();

      if (!geojson) {
        return;
      }

      const kml =
        tokml(
          geojson,
          {
            name: 'name',
            description: 'description'
          }
        );

      const zip =
        new JSZip();

      zip.file(
        'doc.kml',
        kml
      );

      const kmzBlob =
        await zip.generateAsync(
          {
            type: 'blob',
            compression: 'DEFLATE'
          }
        );

      downloadBlob(
        kmzBlob,
        'parcel.kmz'
      );

    }
  );

}

// ====================
// ATTRIBUTE TABLE
// ====================

function updateAttributeTable() {

  const tableBody =
    document.getElementById(
      'attribute-table-body'
    );

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = '';

  let index = 1;


  // ====================
  // LOOP DRAWINGS
  // ====================

  drawnItems.eachLayer(
    function (layer) {

      if (
        !(layer instanceof L.Polygon)
      ) {
        return;
      }

      const props =
        layer.feature &&
        layer.feature.properties
          ? layer.feature.properties
          : {};

      const geojson =
        layer.toGeoJSON();

      const area =
        turf.area(geojson);

      const areaText =
        formatThaiArea(area);


      // ====================
      // CREATE ROW
      // ====================

      const row =
        document.createElement('tr');

      row.innerHTML =

        '<td>' +
        (props.name || 'parcel ' + index) +
        '</td>' +

        '<td>' +
        (props.owner || '-') +
        '</td>' +

        '<td>' +
        (props.docno || '-') +
        '</td>' +

        '<td>' +
        areaText.thaiArea +
        '</td>' +

        '<td>' +

        '<button class="table-btn zoom-btn">' +
        'Zoom' +
        '</button> ' +

        '<button class="table-btn edit-btn">' +
        'Edit' +
        '</button>' +

        '</td>';


      // ====================
      // ZOOM BUTTON
      // ====================

      row
        .querySelector('.zoom-btn')
        .addEventListener(
          'click',
          function () {

            map.fitBounds(
              layer.getBounds()
            );

            bindAreaPopup(layer);

            setTimeout(function () {

              layer.openPopup();

            }, 200);

          }
        );


      // ====================
      // EDIT BUTTON
      // ====================

      row
        .querySelector('.edit-btn')
        .addEventListener(
          'click',
          async function () {

            const saved =
              await openParcelForm(layer);

            if (!saved) {
              return;
            }

            bindAreaPopup(layer);

            await saveDrawings();

            updateAttributeTable();

          }
        );


      // ====================
      // APPEND ROW
      // ====================

      tableBody.appendChild(row);

      index++;

    }
  );

}


// ====================
// SHOW ATTRIBUTE TABLE
// ====================

const showAttributeTableButton =
  document.getElementById(
    'show-attribute-table'
  );

if (showAttributeTableButton) {

  showAttributeTableButton.addEventListener(
    'click',
    function () {

      updateAttributeTable();

      document
        .getElementById(
          'attribute-table'
        )
        .style.display = 'block';

    }
  );

}


// ====================
// CLOSE ATTRIBUTE TABLE
// ====================

const closeAttributeTableButton =
  document.getElementById(
    'close-attribute-table'
  );

if (closeAttributeTableButton) {

  closeAttributeTableButton.addEventListener(
    'click',
    function () {

      document
        .getElementById(
          'attribute-table'
        )
        .style.display = 'none';

    }
  );

}

// ====================
// CLEAR ALL DRAWINGS
// ====================

const clearButton =
  document.getElementById(
    'clear-drawings'
  );

if (clearButton) {

  clearButton.addEventListener(
    'click',
    async function () {

      const confirmDelete =
        confirm(
          'ต้องการลบแปลงทั้งหมดใช่หรือไม่ ?'
        );

      if (!confirmDelete) {
        return;
      }

      drawnItems.clearLayers();

      snapGuideLayers.clearLayers();

      const deleteResult =
        await supabase
          .from('parcels')
          .delete()
          .not('id', 'is', null);

      if (deleteResult.error) {

        console.error(
          'CLEAR SUPABASE ERROR:',
          deleteResult.error
        );

        alert(
          'ลบข้อมูลไม่สำเร็จ'
        );

        return;

      }

      updateAttributeTable();

      alert(
        'ลบแปลงทั้งหมดเรียบร้อยแล้ว'
      );

    }
  );

}

// ====================
// EXPORT PDF A4
// ====================

const exportPdfButton =
  document.getElementById(
    'export-pdf'
  );

if (exportPdfButton) {

  exportPdfButton.addEventListener(
    'click',
    async function () {

      const fileName =
        prompt(
          'ตั้งชื่อไฟล์ PDF:',
          'parcel_map'
        );

      if (!fileName) {
        return;
      }


      // ====================
      // HIDE UI BEFORE EXPORT
      // ====================

      const hideElements =
        document.querySelectorAll(
          '.top-right-tools, .search-box, .attribute-table'
        );

      try {

        hideElements.forEach(
          function (element) {
            element.style.display =
              'none';
          }
        );

        map.invalidateSize();


        // ====================
        // REFRESH DRAWN LAYERS
        // ====================

        drawnItems.eachLayer(
          function (layer) {

            if (
              layer instanceof L.Polygon
            ) {
              bindAreaPopup(layer);
            }

            if (layer.redraw) {
              layer.redraw();
            }

          }
        );


        // ====================
        // WAIT MAP RENDER
        // ====================

        await new Promise(
          function (resolve) {
            setTimeout(resolve, 900);
          }
        );


        // ====================
        // CAPTURE MAP
        // ====================

        const mapElement =
          document.getElementById(
            'map'
          );

        const canvas =
          await html2canvas(
            mapElement,
            {
              useCORS: true,
              allowTaint: true,
              scale: 2,
              backgroundColor: '#ffffff'
            }
          );


        // ====================
        // SHOW UI AFTER CAPTURE
        // ====================

        hideElements.forEach(
          function (element) {
            element.style.display =
              '';
          }
        );


        // ====================
        // CREATE PDF
        // ====================

        const imageData =
          canvas.toDataURL(
            'image/png'
          );

        const { jsPDF } =
          window.jspdf;

        const pdf =
          new jsPDF(
            'landscape',
            'mm',
            'a4'
          );


        // ====================
        // ADD LOGO
        // ====================

        try {

          pdf.addImage(
            './Logo.png',
            'PNG',
            12,
            8,
            38,
            18
          );

        } catch (error) {

          console.warn(
            'โหลด logo ไม่สำเร็จ',
            error
          );

        }


        // ====================
        // ADD MAP IMAGE
        // ====================

        pdf.addImage(
          imageData,
          'PNG',
          8,
          30,
          281,
          165
        );


        // ====================
        // ADD EXPORT DATE
        // ====================

        pdf.setFontSize(9);

        pdf.text(
          'วันที่ Export: ' +
          new Date().toLocaleDateString(
            'th-TH'
          ),
          285,
          202,
          {
            align: 'right'
          }
        );


        // ====================
        // SAVE PDF
        // ====================

        pdf.save(
          fileName + '.pdf'
        );

      } catch (error) {

        hideElements.forEach(
          function (element) {
            element.style.display =
              '';
          }
        );

        console.error(
          'EXPORT PDF ERROR:',
          error
        );

        alert(
          'Export PDF ไม่สำเร็จ'
        );

      }

    }
  );

}

updateAttributeTable();

console.log(
  'WEB GIS READY'
);

// ====================
// LOGOUT
// ====================

const logoutBtnGIS =
  document.getElementById('logout-button');

if (logoutBtnGIS) {

  logoutBtnGIS.addEventListener(
    'click',
    async function () {

      await supabase.auth.signOut();

      window.location.href =
        './login.html';

    }
  );

}