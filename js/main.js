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
);

const googleHybrid = L.tileLayer(
  'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  {
    attribution: 'Google Hybrid',
    maxZoom: 22
  }
).addTo(map);

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

    await supabase
      .from('parcels')
      .delete()
      .neq('id', 0);

    const features = [];

    drawnItems.eachLayer(function (layer) {

      if (!(layer instanceof L.Polygon)) return;

      const geojson =
        layer.toGeoJSON();

      const props =
        layer.feature &&
        layer.feature.properties
          ? layer.feature.properties
          : {};

      const area =
        turf.area(geojson);

      features.push({
        name: props.name || '',
        owner: props.owner || '',
        note: props.note || '',
        area_sqm: area,
        geojson: geojson
      });

    });

    if (features.length > 0) {

      const { error } =
        await supabase
          .from('parcels')
          .insert(features);

      if (error) {
        console.error(error);
      }

    }

  } catch (error) {

    console.error(error);

  }

}

async function loadDrawings() {

  try {

    const {
      data,
      error
    } = await supabase
      .from('parcels')
      .select('*');

    if (error) {
      console.error(error);
      return;
    }

    drawnItems.clearLayers();
    snapGuideLayers.clearLayers();

    data.forEach(function (item) {

      const layer =
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
                  name: item.name,
                  owner: item.owner,
                  note: item.note
                }
              };

              drawnItems.addLayer(layer);

              snapGuideLayers.addLayer(layer);

              if (
                layer instanceof L.Polygon
              ) {
                bindAreaPopup(layer);
              }

            }
          }
        );

    });

    updateAttributeTable();

  } catch (error) {

    console.error(error);

  }

}

// ====================
// PARCEL INFO
// ====================

function inputParcelInfo(layer) {
  const oldProps =
    layer.feature && layer.feature.properties
      ? layer.feature.properties
      : {};

  const parcelName =
    prompt(
      'ชื่อแปลง:',
      oldProps.name || 'parcel'
    );

  const owner =
    prompt(
      'ผู้ขอเช่า/สถานะ:',
      oldProps.owner || ''
    );

  const note =
    prompt(
      'หมายเหตุ:',
      oldProps.note || ''
    );

  layer.feature = {
    type: 'Feature',
    properties: {
      name: parcelName || 'parcel',
      owner: owner || '',
      note: note || ''
    },
    geometry: null
  };
}

// ====================
// POPUP AREA
// ====================

function bindAreaPopup(layer) {
  const geojson =
    layer.toGeoJSON();

  const area =
    turf.area(geojson);

  const areaText =
    formatThaiArea(area);

  layer.bindPopup(
    '<b>พื้นที่ที่วาด</b><br>' +
    areaText.squareMeters +
    ' ตารางเมตร<br>' +
    areaText.thaiArea
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
  function (event) {
    const layer = event.layer;

    if (
      event.layerType === 'polygon' ||
      event.layerType === 'rectangle'
    ) {
      inputParcelInfo(layer);
    }

    drawnItems.addLayer(layer);

    if (event.layerType === 'polygon') {
      snapLayerToExisting(layer, 100);
    }

    snapGuideLayers.addLayer(layer);

    if (event.layerType === 'marker') {
      const latlng = layer.getLatLng();

      const lat = latlng.lat.toFixed(6);

      const lng = latlng.lng.toFixed(6);

      layer.bindPopup(
        '<b>พิกัดตำแหน่ง</b><br>' +
        'Latitude: ' + lat +
        '<br>' +
        'Longitude: ' + lng
      ).openPopup();
    }

    if (event.layerType === 'polyline') {
      const latlngs =
        layer.getLatLngs();

      const distance =
        calculatePolylineDistance(latlngs);

      layer.bindPopup(
        '<b>ระยะทางที่วัด</b><br>' +
        formatDistance(distance)
      ).openPopup();
    }

    if (layer instanceof L.Polygon) {
      bindAreaPopup(layer);
      layer.openPopup();
    }

    saveDrawings();
    updateAttributeTable();
  }
);

// ====================
// DRAW EDIT / DELETE SAVE
// ====================

map.on(
  'draw:edited',
  function (event) {

    event.layers.eachLayer(
      function (layer) {

        if (layer instanceof L.Polygon) {
          bindAreaPopup(layer);
        }

      }
    );

    saveDrawings();
    updateAttributeTable();
  }
);

map.on(
  'draw:deleted',
  function () {
    snapGuideLayers.clearLayers();

    drawnItems.eachLayer(function (layer) {
      snapGuideLayers.addLayer(layer);
    });

    saveDrawings();
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
// FIX MAP STUCK
// ====================

document.addEventListener(
  'keydown',
  function (e) {
    if (e.key === 'Escape') {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }
);

map.on('draw:drawstop', function () {
  map.dragging.enable();
  map.doubleClickZoom.enable();
  map.scrollWheelZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();
});

map.on('draw:editstop', function () {
  map.dragging.enable();
  map.doubleClickZoom.enable();
  map.scrollWheelZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();
});

map.on('draw:deletestop', function () {
  map.dragging.enable();
  map.doubleClickZoom.enable();
  map.scrollWheelZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();
});

// ====================
// SEARCH
// ====================

let searchMarker = null;

document
  .getElementById('searchInput')
  .addEventListener(
    'keydown',
    async function (e) {
      if (e.key !== 'Enter') return;

      const keyword =
        e.target.value.trim();

      if (!keyword) return;

      let foundLayer = null;

      for (const layer of searchableLayers) {
        if (
          !layer.feature ||
          !layer.feature.properties
        ) continue;

        const props =
          layer.feature.properties;

        for (const key in props) {
          const value =
            String(props[key]).toLowerCase();

          if (
            value.includes(
              keyword.toLowerCase()
            )
          ) {
            foundLayer = layer;
            break;
          }
        }

        if (foundLayer) break;
      }

      if (foundLayer) {
        if (foundLayer.getLatLng) {
          map.setView(
            foundLayer.getLatLng(),
            18
          );
        } else if (foundLayer.getBounds) {
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
          encodeURIComponent(keyword)
        );

      const results =
        await response.json();

      if (results.length === 0) {
        alert('ไม่พบข้อมูล');
        return;
      }

      const place = results[0];

      const lat = parseFloat(place.lat);

      const lon = parseFloat(place.lon);

      map.setView(
        [lat, lon],
        16
      );

      if (searchMarker) {
        map.removeLayer(searchMarker);
      }

      searchMarker =
        L.marker([lat, lon]).addTo(map);

      searchMarker
        .bindPopup(place.display_name)
        .openPopup();
    }
  );

// ====================
// DOWNLOAD HELPER
// ====================

function downloadBlob(blob, filename) {
  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
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
    alert('กรุณาวาดแปลงก่อน Export');
    return null;
  }

  const polygonFeatures =
    geojson.features.filter(function (feature) {
      return (
        feature.geometry &&
        (
          feature.geometry.type === 'Polygon' ||
          feature.geometry.type === 'MultiPolygon'
        )
      );
    });

  if (polygonFeatures.length === 0) {
    alert('Export ได้เฉพาะ Polygon หรือ Rectangle เท่านั้น');
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
  document.getElementById('export-shp');

if (exportShpButton) {
  exportShpButton.addEventListener(
    'click',
    function () {
      const geojson =
        getDrawnPolygonGeoJSON();

      if (!geojson) return;

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
  document.getElementById('export-kml');

if (exportKmlButton) {
  exportKmlButton.addEventListener(
    'click',
    function () {
      if (typeof tokml === 'undefined') {
        alert('ไม่พบ tokml กรุณาตรวจสอบ index.html');
        return;
      }

      const geojson =
        getDrawnPolygonGeoJSON();

      if (!geojson) return;

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
            type: 'application/vnd.google-earth.kml+xml;charset=utf-8'
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
  document.getElementById('export-kmz');

if (exportKmzButton) {
  exportKmzButton.addEventListener(
    'click',
    async function () {
      if (typeof tokml === 'undefined') {
        alert('ไม่พบ tokml กรุณาตรวจสอบ index.html');
        return;
      }

      if (typeof JSZip === 'undefined') {
        alert('ไม่พบ JSZip กรุณาตรวจสอบ index.html');
        return;
      }

      const geojson =
        getDrawnPolygonGeoJSON();

      if (!geojson) return;

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
        await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE'
        });

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
    document.getElementById('attribute-table-body');

  if (!tableBody) return;

  tableBody.innerHTML = '';

  let index = 1;

  drawnItems.eachLayer(function (layer) {
    if (!(layer instanceof L.Polygon)) return;

    const props =
      layer.feature && layer.feature.properties
        ? layer.feature.properties
        : {};

    const geojson =
      layer.toGeoJSON();

    const area =
      turf.area(geojson);

    const areaText =
      formatThaiArea(area);

    const row =
      document.createElement('tr');

    row.innerHTML =
      '<td>' + (props.name || 'parcel ' + index) + '</td>' +
      '<td>' + (props.owner || '-') + '</td>' +
      '<td>' + areaText.thaiArea + '</td>' +
      '<td>' +
      '<button data-action="zoom">Zoom</button> ' +
      '<button data-action="edit">Edit</button>' +
      '</td>';

    row
      .querySelector('[data-action="zoom"]')
      .addEventListener('click', function () {
        map.fitBounds(layer.getBounds());

        bindAreaPopup(layer);

        layer.openPopup();
      });

    row
      .querySelector('[data-action="edit"]')
      .addEventListener('click', function () {
        inputParcelInfo(layer);

        bindAreaPopup(layer);

        saveDrawings();

        updateAttributeTable();
      });

    tableBody.appendChild(row);

    index++;
  });
}

const showAttributeTableButton =
  document.getElementById('show-attribute-table');

if (showAttributeTableButton) {
  showAttributeTableButton.addEventListener(
    'click',
    function () {
      updateAttributeTable();

      document
        .getElementById('attribute-table')
        .style.display = 'block';
    }
  );
}

const closeAttributeTableButton =
  document.getElementById('close-attribute-table');

if (closeAttributeTableButton) {
  closeAttributeTableButton.addEventListener(
    'click',
    function () {
      document
        .getElementById('attribute-table')
        .style.display = 'none';
    }
  );
}

// ====================
// CLEAR ALL DRAWINGS
// ====================

const clearButton =
  document.getElementById('clear-drawings');

if (clearButton) {
  clearButton.addEventListener(
    'click',
    function () {
      const confirmDelete =
        confirm('ลบแปลงทั้งหมด ?');

      if (!confirmDelete) return;

      drawnItems.clearLayers();
      snapGuideLayers.clearLayers();

      localStorage.removeItem(
        'webgis_drawings'
      );

      updateAttributeTable();
    }
  );
}

// ====================
// EXPORT PDF A4
// ====================

const exportPdfButton =
  document.getElementById('export-pdf');

if (exportPdfButton) {
  exportPdfButton.addEventListener(
    'click',
    async function () {
      const fileName =
        prompt(
          'ตั้งชื่อไฟล์ PDF:',
          'parcel_map'
        );

      if (!fileName) return;

      const hideElements =
        document.querySelectorAll(
          '.top-right-tools, .search-box, .attribute-table'
        );

      try {
        hideElements.forEach(function (el) {
          el.style.display = 'none';
        });

        map.invalidateSize();

        drawnItems.eachLayer(function (layer) {
          if (layer instanceof L.Polygon) {
            bindAreaPopup(layer);
          }

          if (layer.redraw) {
            layer.redraw();
          }
        });

        await new Promise(function (resolve) {
          setTimeout(resolve, 800);
        });

        const mapElement =
          document.getElementById('map');

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

        hideElements.forEach(function (el) {
          el.style.display = '';
        });

        const imageData =
          canvas.toDataURL('image/png');

        const { jsPDF } =
          window.jspdf;

        const pdf =
          new jsPDF(
            'landscape',
            'mm',
            'a4'
          );

        pdf.addImage(
          imageData,
          'PNG',
          8,
          30,
          281,
          165
        );

        try {
          const logoPath =
            './logo.png';

          pdf.addImage(
            logoPath,
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

        pdf.setFontSize(9);

        pdf.text(
          'วันที่ Export: ' +
          new Date().toLocaleDateString('th-TH'),
          285,
          202,
          {
            align: 'right'
          }
        );

        pdf.save(
          fileName + '.pdf'
        );
      } catch (error) {
        hideElements.forEach(function (el) {
          el.style.display = '';
        });

        console.error(error);

        alert('Export PDF ไม่สำเร็จ');
      }
    }
  );
}

updateAttributeTable();

console.log('WEB GIS READY');