// ====================
// INIT SEARCH
// ====================

export function initSearch(
  map,
  searchableLayers
) {

  let searchMarker = null;

  const searchInput =
    document.getElementById('searchInput');

  if (!searchInput) {
    console.warn(
      'ไม่พบช่องค้นหา: #searchInput'
    );
    return;
  }


  // ====================
  // SEARCH EVENT
  // ====================

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
      // SEARCH IN LOADED LAYERS
      // ====================

      const foundLayer =
        findLayerByKeyword(
          searchableLayers,
          keyword
        );

      if (foundLayer) {

        zoomToLayer(
          map,
          foundLayer
        );

        foundLayer.openPopup();

        return;

      }


      // ====================
      // SEARCH PLACE FROM NOMINATIM
      // ====================

      await searchPlaceFromNominatim(
        map,
        keyword,
        function (marker) {

          if (searchMarker) {
            map.removeLayer(searchMarker);
          }

          searchMarker = marker;

        }
      );

    }
  );

}


// ====================
// FIND LAYER BY KEYWORD
// ====================

function findLayerByKeyword(
  searchableLayers,
  keyword
) {

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

      if (value.includes(keyword)) {
        return layer;
      }

    }

  }

  return null;

}


// ====================
// ZOOM TO LAYER
// ====================

function zoomToLayer(
  map,
  layer
) {

  if (layer.getLatLng) {

    map.setView(
      layer.getLatLng(),
      18
    );

    return;

  }

  if (layer.getBounds) {

    map.fitBounds(
      layer.getBounds()
    );

  }

}


// ====================
// SEARCH PLACE FROM NOMINATIM
// ====================

async function searchPlaceFromNominatim(
  map,
  keyword,
  setSearchMarker
) {

  try {

    const response =
      await fetch(
        'https://nominatim.openstreetmap.org/search?format=json&q=' +
        encodeURIComponent(keyword)
      );

    const results =
      await response.json();

    if (!results || results.length === 0) {
      window.SRTAAppPopup.alert('ไม่พบข้อมูล');
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

    const marker =
      L.marker([lat, lon])
        .addTo(map);

    marker
      .bindPopup(place.display_name)
      .openPopup();

    setSearchMarker(marker);

  } catch (error) {

    console.error(
      'SEARCH ERROR:',
      error
    );

    window.SRTAAppPopup.alert(
      'ค้นหาไม่สำเร็จ กรุณาลองใหม่'
    );

  }

}