export function createMap(
  CONFIG
) {

  // MAP

  const map =
    L.map(
      'map',
      {
        zoomControl: false
      }
    )
    .setView(
      CONFIG.center,
      CONFIG.zoom
    );

  // ZOOM

  L.control.zoom({
    position:
      'bottomleft'
  }).addTo(map);

  // OSM

  const osm =
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; OpenStreetMap'
      }
    ).addTo(map);

  // SATELLITE

  const satellite =
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri'
      }
    );

  // LAYER CONTROL

  const layerControl =
    L.control.layers(

      {
        "OpenStreetMap":
          osm,

        "Satellite":
          satellite
      },

      {},

      {
        position:
          'bottomright',

        collapsed:
          false
      }

    ).addTo(map);

  return {

    map,
    layerControl

  };

}