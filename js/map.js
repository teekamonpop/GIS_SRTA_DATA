// ====================
// CREATE MAP
// ====================

export function createMap(CONFIG) {

  const map =
    L.map(
      'map',
      {
        zoomControl: false,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      }
    ).setView(
      CONFIG.center,
      CONFIG.zoom
    );


  // ====================
  // ZOOM CONTROL
  // ====================

  L.control.zoom({
    position: 'topleft'
  }).addTo(map);


  // ====================
  // BASEMAP
  // ====================

  const openStreetMap =
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; OpenStreetMap',
        maxZoom: 22
      }
    );

  const googleMap =
    L.tileLayer(
      'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        attribution:
          'Google Map',
        maxZoom: 22
      }
    );

  const googleSatellite =
    L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      {
        attribution:
          'Google Satellite',
        maxZoom: 22
      }
    );

  const googleHybrid =
    L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        attribution:
          'Google Hybrid',
        maxZoom: 22
      }
    ).addTo(map);

  const esriSatellite =
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Esri',
        maxZoom: 22
      }
    );


  // ====================
  // BASEMAP CONTROL
  // ====================

  const baseMaps = {

    'OpenStreetMap':
      openStreetMap,

    'Google Map':
      googleMap,

    'Google Satellite':
      googleSatellite,

    'Google Hybrid':
      googleHybrid,

    'Esri Satellite':
      esriSatellite

  };


  // ====================
  // LAYER CONTROL
  // ====================

  const layerControl =
    L.control.layers(
      baseMaps,
      {},
      {
        position: 'bottomright',
        collapsed: false
      }
    ).addTo(map);


  // ====================
  // FIX MAP SIZE
  // ====================

  window.addEventListener(
    'load',
    function () {

      map.invalidateSize();

      setTimeout(function () {
        map.invalidateSize();
      }, 300);

    }
  );


  // ====================
  // RETURN
  // ====================

  return {

    map,
    layerControl

  };

}