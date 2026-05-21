// ====================
// LAYER STYLE
// ====================

function getLayerStyle(layerName) {

  const styles = {

    'KM_RAILWAY_47': {
      color: '#0077ff',
      weight: 2,
      fillColor: '#f7f300',
      fillOpacity: 0.35
    },

    'KM_RAILWAY_48': {
      color: '#0077ff',
      weight: 2,
      fillColor: '#f7f300',
      fillOpacity: 0.35
    },

    'R.O.W': {
      color: '#ff0404',
      weight: 2,
      fillColor: '#ff0404',
      fillOpacity: 0.15
    },

    'Kohnkaen': {
      color: '#f9a825',
      weight: 2,
      fillColor: '#f9a825',
      fillOpacity: 0.15
    },

    'แปลงที่มีสัญญาเช่า': {
      color: '#54ff04',
      weight: 1,
      fillColor: '#54ff04',
      fillOpacity: 0.2
    },

    'เส้นทางประธาน': {
      color: '#111111',
      weight: 3,
      fillColor: '#111111',
      fillOpacity: 0.05
    }

  };

  return styles[layerName] || {
    color: '#333333',
    weight: 2,
    fillColor: '#333333',
    fillOpacity: 0.15
  };

}


// ====================
// POPUP CONTENT
// ====================

function buildPopupContent(feature, layerName) {

  let popup =
    '<b>' + layerName + '</b><br>';

  if (!feature.properties) {
    return popup + 'No data';
  }

  for (const key in feature.properties) {

    const value =
      feature.properties[key];

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      continue;
    }

    popup +=
      '<b>' +
      key +
      '</b>: ' +
      value +
      '<br>';

  }

  return popup;

}


// ====================
// REGISTER FEATURE
// ====================

function registerFeature(
  feature,
  layer,
  searchableLayers,
  layerName
) {

  searchableLayers.push(layer);

  layer.bindPopup(
    buildPopupContent(
      feature,
      layerName
    )
  );

}


// ====================
// LOAD KML
// ====================

export async function loadKMLLayer(
  map,
  layerControl,
  searchableLayers,
  url,
  layerName
) {

  try {

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        'โหลดไฟล์ไม่ได้: ' + url
      );
    }

    let kmlText = '';

    if (url.endsWith('.kmz')) {

      const arrayBuffer =
        await response.arrayBuffer();

      const zip =
        await JSZip.loadAsync(
          arrayBuffer
        );

      const kmlFile =
        Object.keys(zip.files).find(
          function (name) {
            return name.endsWith('.kml');
          }
        );

      if (!kmlFile) {
        throw new Error(
          'ไม่พบ KML ใน KMZ: ' + layerName
        );
      }

      kmlText =
        await zip
          .file(kmlFile)
          .async('string');

    } else {

      kmlText =
        await response.text();

    }

    const parser =
      new DOMParser();

    const kml =
      parser.parseFromString(
        kmlText,
        'text/xml'
      );

    const geojson =
      toGeoJSON.kml(kml);

    if (
      !geojson.features ||
      geojson.features.length === 0
    ) {
      console.warn(
        'ไม่มีข้อมูล geometry:',
        layerName
      );
      return;
    }

    const layer =
      L.geoJSON(
        geojson,
        {
          style: getLayerStyle(layerName),

          pointToLayer: function (
            feature,
            latlng
          ) {
            return L.circleMarker(
              latlng,
              {
                radius: 6,
                fillColor: 'yellow',
                color: 'red',
                weight: 2,
                fillOpacity: 1
              }
            );
          },

          onEachFeature: function (
            feature,
            layer
          ) {
            registerFeature(
              feature,
              layer,
              searchableLayers,
              layerName
            );
          }
        }
      );

    //layer.addTo(map);

    layerControl.addOverlay(
      layer,
      layerName
    );

    console.log(
      'โหลด KML สำเร็จ:',
      layerName
    );

  } catch (error) {

    console.error(
      'LOAD KML ERROR:',
      layerName,
      error
    );

  }

}


// ====================
// LOAD SHAPEFILE
// ====================

export async function loadShapefileLayer(
  map,
  layerControl,
  searchableLayers,
  url,
  layerName
) {

  try {

    const geojson =
      await shp(url);

    if (
      !geojson.features ||
      geojson.features.length === 0
    ) {
      console.warn(
        'ไม่มีข้อมูล geometry:',
        layerName
      );
      return;
    }

    const layer =
      L.geoJSON(
        geojson,
        {
          style: getLayerStyle(layerName),

          pointToLayer: function (
            feature,
            latlng
          ) {
            return L.circleMarker(
              latlng,
              {
                radius: 6,
                fillColor: 'yellow',
                color: 'blue',
                weight: 2,
                fillOpacity: 1
              }
            );
          },

          onEachFeature: function (
            feature,
            layer
          ) {
            registerFeature(
              feature,
              layer,
              searchableLayers,
              layerName
            );
          }
        }
      );

    //layer.addTo(map);

    layerControl.addOverlay(
      layer,
      layerName
    );

    console.log(
      'โหลด SHP สำเร็จ:',
      layerName
    );

  } catch (error) {

    console.error(
      'LOAD SHP ERROR:',
      layerName,
      error
    );

  }

}