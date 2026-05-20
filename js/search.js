export function initSearch(

  map,
  searchableLayers

) {

  let searchMarker = null;

  document
    .getElementById(
      'searchInput'
    )
    .addEventListener(
      'keydown',
      async function(e) {

        if (
          e.key !== 'Enter'
        ) {
          return;
        }

        const keyword =
          e.target.value
            .trim();

        if (!keyword) {
          return;
        }

        // SEARCH KML

        let foundLayer = null;

        for (
          let i = 0;
          i < searchableLayers.length;
          i++
        ) {

          const layer =
            searchableLayers[i];

          const props =
            layer.feature.properties;

          for (
            const key
            in props
          ) {

            const value =
              String(props[key])
                .toLowerCase();

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

          if (foundLayer) {
            break;
          }

        }

        // FOUND KML

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

          foundLayer.openPopup();

          return;

        }

        // SEARCH PLACE

        try {

          const response =
            await fetch(

              'https://nominatim.openstreetmap.org/search?format=json&q='
              +
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

          // REMOVE OLD

          if (
            searchMarker
          ) {

            map.removeLayer(
              searchMarker
            );

          }

          // NEW MARKER

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

        catch(error) {

          console.error(error);

        }

      }
    );

}