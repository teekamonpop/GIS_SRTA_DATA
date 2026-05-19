function getLayerStyle(layerName) {
  const styles = {
    'KM_RAILWAY_47': {
      color: '#0077ff',
      weight: 2,
      fillColor: '#f7f300',
      fillOpacity: 100
    },

    'KM_RAILWAY_48': {
      color: '#0077ff',
      weight: 2,
      fillColor: '#f7f300',
      fillOpacity: 100
    },

    'R.O.W': {
      color: '#ff0404c6',
      weight: 2,
      fillColor: '#ff040466',
      fillOpacity: 0.15
    },

    'Kohnkaen': {
      color: '#f9a825',
      weight: 2,
      fillColor: '#f9a825',
      fillOpacity: 0.15
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
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('โหลดไฟล์ไม่ได้: ' + url);
    }

    let kmlText = '';

    if (url.endsWith('.kmz')) {
      const arrayBuffer = await response.arrayBuffer();

      const zip = await JSZip.loadAsync(arrayBuffer);

      const kmlFile = Object.keys(zip.files).find(
        name => name.endsWith('.kml')
      );

      if (!kmlFile) {
        throw new Error('ไม่พบ KML ใน KMZ: ' + layerName);
      }

      kmlText = await zip.file(kmlFile).async('string');
    } else {
      kmlText = await response.text();
    }

    const parser = new DOMParser();

    const kml = parser.parseFromString(
      kmlText,
      'text/xml'
    );

    const geojson = toGeoJSON.kml(kml);

    if (!geojson.features || geojson.features.length === 0) {
      console.warn('ไม่มีข้อมูล geometry:', layerName);
      return;
    }

    const layer = L.geoJSON(geojson, {
  style: getLayerStyle(layerName),

      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: 'yellow',
          color: 'red',
          weight: 2,
          fillOpacity: 1
        });
      },

      onEachFeature: function (feature, layer) {
        searchableLayers.push(layer);

        let popup = '';

        if (feature.properties) {
          for (const key in feature.properties) {
            popup +=
              '<b>' +
              key +
              '</b>: ' +
              feature.properties[key] +
              '<br>';
          }
        }

        layer.bindPopup(popup || 'No data');
      }
    });

    layerControl.addOverlay(
      layer,
      layerName
    );

    console.log('โหลด KML สำเร็จ:', layerName);
  } catch (error) {
    console.error(error);
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
    const geojson = await shp(url);

    if (!geojson.features || geojson.features.length === 0) {
      console.warn('ไม่มีข้อมูล geometry:', layerName);
      return;
    }

    const layer = L.geoJSON(geojson, {
  style: getLayerStyle(layerName),

      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: 'yellow',
          color: 'blue',
          weight: 2,
          fillOpacity: 1
        });
      },

      onEachFeature: function (feature, layer) {
        searchableLayers.push(layer);

        let popup = '';

        if (feature.properties) {
          for (const key in feature.properties) {
            popup +=
              '<b>' +
              key +
              '</b>: ' +
              feature.properties[key] +
              '<br>';
          }
        }

        layer.bindPopup(popup || 'No data');
      }
    });

    layerControl.addOverlay(
      layer,
      layerName
    );

    console.log('โหลด SHP สำเร็จ:', layerName);
  } catch (error) {
    console.error(error);
  }
}