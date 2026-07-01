import { CONFIG } from "./config.js";

import { loadKMLLayer, loadShapefileLayer } from "./layers.js";

// ====================
// CUSTOM APP POPUP
// ====================

function ensureAppPopup() {
  if (document.getElementById("srta-app-popup")) {
    return;
  }

  const style = document.createElement("style");

  style.textContent = `
    #srta-app-popup {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.52);
      backdrop-filter: blur(3px);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    #srta-app-popup.is-open {
      opacity: 1;
      visibility: visible;
    }

    #srta-app-popup .srta-popup-card {
      width: min(430px, 100%);
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.7);
      border-radius: 22px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
      transform: translateY(14px) scale(0.97);
      transition: transform 0.22s ease;
      font-family: "Sarabun", sans-serif;
    }

    #srta-app-popup.is-open .srta-popup-card {
      transform: translateY(0) scale(1);
    }

    #srta-app-popup .srta-popup-topbar {
      height: 7px;
      background: #7f1d1d;
    }

    #srta-app-popup.success .srta-popup-topbar {
      background: #15803d;
    }

    #srta-app-popup.warning .srta-popup-topbar {
      background: #d97706;
    }

    #srta-app-popup.error .srta-popup-topbar {
      background: #b91c1c;
    }

    #srta-app-popup .srta-popup-content {
      padding: 28px 28px 24px;
      text-align: center;
    }

    #srta-app-popup .srta-popup-icon {
      width: 68px;
      height: 68px;
      margin: 0 auto 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fef2f2;
      color: #991b1b;
      font-size: 32px;
      font-weight: 800;
    }

    #srta-app-popup.success .srta-popup-icon {
      background: #ecfdf5;
      color: #15803d;
    }

    #srta-app-popup.warning .srta-popup-icon {
      background: #fffbeb;
      color: #d97706;
    }

    #srta-app-popup.error .srta-popup-icon {
      background: #fef2f2;
      color: #b91c1c;
    }

    #srta-app-popup .srta-popup-title {
      margin: 0 0 10px;
      color: #111827;
      font-size: 23px;
      font-weight: 800;
    }

    #srta-app-popup .srta-popup-message {
      margin: 0;
      color: #4b5563;
      font-size: 16px;
      line-height: 1.7;
      white-space: pre-line;
      word-break: break-word;
    }

    #srta-app-popup .srta-popup-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 0 28px 26px;
    }

    #srta-app-popup .srta-popup-cancel {
      min-width: 110px;
      height: 44px;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      background: #ffffff;
      color: #374151;
      font-family: "Sarabun", sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    #srta-app-popup .srta-popup-cancel:hover {
      background: #f3f4f6;
      transform: translateY(-1px);
    }

    #srta-app-popup .srta-popup-ok {
      min-width: 130px;
      height: 44px;
      border: 0;
      border-radius: 12px;
      background: #7f1d1d;
      color: #ffffff;
      font-family: "Sarabun", sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(127, 29, 29, 0.25);
      transition: transform 0.15s ease, background 0.15s ease;
    }

    #srta-app-popup .srta-popup-ok:hover {
      background: #651515;
      transform: translateY(-1px);
    }

    #srta-app-popup.success .srta-popup-ok {
      background: #15803d;
      box-shadow: 0 8px 20px rgba(21, 128, 61, 0.22);
    }

    #srta-app-popup.warning .srta-popup-ok {
      background: #d97706;
      box-shadow: 0 8px 20px rgba(217, 119, 6, 0.22);
    }

    #srta-app-popup.error .srta-popup-ok {
      background: #b91c1c;
      box-shadow: 0 8px 20px rgba(185, 28, 28, 0.22);
    }
  `;

  document.head.appendChild(style);

  const popup = document.createElement("div");

  popup.id = "srta-app-popup";

  popup.innerHTML = `
    <div
      class="srta-popup-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="srta-popup-title"
    >
      <div class="srta-popup-topbar"></div>

      <div class="srta-popup-content">
        <div class="srta-popup-icon">i</div>
        <h3
          id="srta-popup-title"
          class="srta-popup-title"
        >
          แจ้งเตือน
        </h3>
        <p class="srta-popup-message"></p>
      </div>

      <div class="srta-popup-actions">
        <button
          type="button"
          class="srta-popup-cancel"
          style="display:none;"
        >
          ยกเลิก
        </button>

        <button
          type="button"
          class="srta-popup-ok"
        >
          ตกลง
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  popup._confirmResolver = null;

  const closePopup = function (result = false) {
    popup.classList.remove("is-open");

    const cancelButton = popup.querySelector(".srta-popup-cancel");

    if (cancelButton) {
      cancelButton.style.display = "none";
    }

    if (popup._confirmResolver) {
      const resolver = popup._confirmResolver;

      popup._confirmResolver = null;

      resolver(result);
    }
  };

  popup.querySelector(".srta-popup-ok").addEventListener("click", function () {
    closePopup(true);
  });

  popup
    .querySelector(".srta-popup-cancel")
    .addEventListener("click", function () {
      closePopup(false);
    });

  popup.addEventListener("click", function (event) {
    if (event.target === popup) {
      closePopup(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && popup.classList.contains("is-open")) {
      closePopup(false);
    }
  });
}

function showAppPopup(message, title = "", type = "") {
  ensureAppPopup();

  const popup = document.getElementById("srta-app-popup");

  const messageText = String(message ?? "");

  if (!type) {
    if (/สำเร็จ|เรียบร้อย/i.test(messageText)) {
      type = "success";
    } else if (/ไม่สำเร็จ|ผิดพลาด|error|ไม่สามารถ/i.test(messageText)) {
      type = "error";
    } else {
      type = "warning";
    }
  }

  if (!title) {
    if (type === "success") {
      title = "ดำเนินการสำเร็จ";
    } else if (type === "error") {
      title = "เกิดข้อผิดพลาด";
    } else {
      title = "แจ้งเตือน";
    }
  }

  const iconMap = {
    success: "✓",
    warning: "!",
    error: "×",
  };

  popup.className = type;

  popup.querySelector(".srta-popup-icon").textContent = iconMap[type] || "i";

  popup.querySelector(".srta-popup-title").textContent = title;

  popup.querySelector(".srta-popup-message").textContent = messageText;

  popup.classList.add("is-open");

  setTimeout(function () {
    const okButton = popup.querySelector(".srta-popup-ok");

    if (okButton) {
      okButton.focus();
    }
  }, 50);
}

async function showConfirmPopup(message, title = "ยืนยันการทำรายการ") {
  ensureAppPopup();

  const popup = document.getElementById("srta-app-popup");

  const cancelButton = popup.querySelector(".srta-popup-cancel");

  popup.className = "warning";

  popup.querySelector(".srta-popup-icon").textContent = "?";

  popup.querySelector(".srta-popup-title").textContent = title;

  popup.querySelector(".srta-popup-message").textContent = String(
    message ?? "",
  );

  if (cancelButton) {
    cancelButton.style.display = "inline-flex";

    cancelButton.style.alignItems = "center";

    cancelButton.style.justifyContent = "center";
  }

  popup.classList.add("is-open");

  return await new Promise(function (resolve) {
    popup._confirmResolver = resolve;

    setTimeout(function () {
      if (cancelButton) {
        cancelButton.focus();
      }
    }, 50);
  });
}

// ====================
// SUPABASE
// ====================

const SUPABASE_URL = "https://fuvnqxiwiniigabzaejg.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dm5xeGl3aW5paWdhYnphZWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjMxNjEsImV4cCI6MjA5NDg5OTE2MX0.7AECH9EkMjGHFZYh6SIrpVo1ulWrf_SK5Ui-AYpCdNg";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ====================
// LOGIN CHECK
// ====================

async function requireLogin() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    window.location.href = "./login.html";
  }
}

requireLogin();

// ====================
// CURRENT PROJECT
// ====================

const urlParams = new URLSearchParams(window.location.search);

const currentProjectId = urlParams.get("project_id");

console.log("CURRENT PROJECT ID:", currentProjectId);

// ====================
// CREATE MAP
// ====================

const map = L.map("map", {
  zoomControl: false,
  zoomAnimation: true,
  fadeAnimation: true,
  markerZoomAnimation: true,
}).setView([13.7563, 100.5018], 6);

// ====================
// FIX MAP SIZE
// ====================

window.addEventListener("load", function () {
  map.invalidateSize();

  setTimeout(function () {
    map.invalidateSize();
  }, 300);
});

// ====================
// ZOOM CONTROL
// ====================

L.control
  .zoom({
    position: "topleft",
  })
  .addTo(map);

// ====================
// SRTA LAYER PANEL - IMAGE STYLE
// ====================

// ====================
// BASEMAP
// ====================

const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap",
  maxZoom: 22,
});

const googleMap = L.tileLayer(
  "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  {
    attribution: "Google Map",
    maxZoom: 22,
  },
);

const googleSatellite = L.tileLayer(
  "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  {
    attribution: "Google Satellite",
    maxZoom: 22,
  },
).addTo(map);

const googleHybrid = L.tileLayer(
  "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  {
    attribution: "Google Hybrid",
    maxZoom: 22,
  },
);

const esriSatellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Esri",
    maxZoom: 22,
  },
);

// ====================
// DEPARTMENT OF LAND WMS
// ====================

const dolWmsLayer = L.tileLayer.wms("https://ms.longdo.com/mapproxy/service", {
  layers: "dol",
  format: "image/png",
  transparent: true,
  version: "1.1.1",
  attribution: "Department of Land WMS / Longdo",
});

// ====================
// LAYER CONTROL
// ====================

const baseMaps = {
  OpenStreetMap: osm,
  "Google Map": googleMap,
  "Google Satellite": googleSatellite,
  "Google Hybrid": googleHybrid,
  "Esri Satellite": esriSatellite,
};

const overlayMaps = {
  "Department of Land WMS": dolWmsLayer,
};
window.SRTA_BASEMAPS = baseMaps;

window.SRTA_OVERLAYS = overlayMaps;

const layerControl = L.control
  .layers(baseMaps, overlayMaps, {
    position: "bottomright",
    collapsed: false,
  })
  .addTo(map);

window.layerControl = layerControl;

// ====================
// SRTA LAYER PANEL - IMAGE STYLE
// ====================

// ====================
// SEARCHABLE LAYERS
// ====================

const searchableLayers = [];

// ====================
// LOAD KML
// ====================

for (const kmlFile of CONFIG.kmlFiles) {
  loadKMLLayer(map, layerControl, searchableLayers, kmlFile.path, kmlFile.name);
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
    shpFile.name,
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
    squareMeters: squareMeters.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }),

    thaiArea: rai + " ไร่ - " + ngan + " งาน - " + wa.toFixed(2) + " วา",
  };
}


// ====================
// OFFICIAL / ORIGINAL AREA
// ====================

function parseAreaNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();

  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getOfficialAreaFromProperties(properties) {
  const props = properties || {};
  const normalized = {};

  Object.keys(props).forEach(function (key) {
    const normalizedKey = String(key)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    normalized[normalizedKey] = {
      key: key,
      value: props[key],
    };
  });

  const preferredKeys = [
    "officialareasqm",
    "sumarea",
    "areasqm",
    "shapearea",
    "shapeareasqm",
    "gisarea",
    "cadarea",
  ];

  for (const preferredKey of preferredKeys) {
    const match = normalized[preferredKey];

    if (!match) {
      continue;
    }

    const area = parseAreaNumber(match.value);

    if (area !== null) {
      return {
        area: area,
        fieldName: match.key,
      };
    }
  }

  return {
    area: null,
    fieldName: null,
  };
}

function getLayerAreaInfo(layer) {
  const calculatedArea = turf.area(layer.toGeoJSON());
  const officialArea = parseAreaNumber(layer._officialAreaSqm);
  const source = layer._areaSource || "WEB_CALCULATED";

  return {
    officialArea: officialArea,
    calculatedArea: calculatedArea,
    displayArea: officialArea !== null ? officialArea : calculatedArea,
    source: officialArea !== null ? source : "WEB_CALCULATED",
    isOfficial: officialArea !== null,
  };
}

function getAreaSourceLabel(source) {
  const value = String(source || "");

  if (value === "DWG") return "ไฟล์ DWG ต้นฉบับ";
  if (value === "WEB_DRAW") return "วาดบนหน้าเว็บ";
  if (value === "WEB_CALCULATED") return "คำนวณจากรูปแปลงบนเว็บ";
  if (value.startsWith("SHP:")) return "ฟิลด์ " + value.slice(4) + " จาก Shapefile";
  if (value.startsWith("KML:")) return "ฟิลด์ " + value.slice(4) + " จาก KML/KMZ";

  return value || "คำนวณจากรูปแปลงบนเว็บ";
}

// ====================
// DISTANCE FORMAT
// ====================

function formatDistance(meters) {
  if (meters >= 1000) {
    return (
      (meters / 1000).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " กิโลเมตร"
    );
  }

  return (
    meters.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " เมตร"
  );
}

function calculatePolylineDistance(latlngs) {
  let distance = 0;

  for (let i = 0; i < latlngs.length - 1; i++) {
    distance += latlngs[i].distanceTo(latlngs[i + 1]);
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

layerControl.addOverlay(drawnItems, "เครื่องมือวัด / พื้นที่ที่วาด");

window.drawnItems = drawnItems;

// ====================
// UPLOAD PARCEL DOCUMENT
// ====================

function cleanFileName(fileName) {
  const extension = fileName.includes(".")
    ? "." + fileName.split(".").pop().toLowerCase()
    : "";

  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return (baseName || "document") + extension;
}

async function uploadParcelDocument(file, projectId, documentType) {
  if (!file) {
    return null;
  }

  const safeFileName = cleanFileName(file.name);

  const uniqueName = Date.now() + "_" + safeFileName;

  const filePath = projectId + "/" + documentType + "/" + uniqueName;

  const { data, error } = await supabase.storage
    .from("parcel-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("UPLOAD DOCUMENT ERROR:", documentType, error);

    throw error;
  }

  return data.path;
}

// ====================
// COVER PHOTO
// ====================

async function compressCoverPhoto(
  file,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.78,
) {
  return await new Promise(function (resolve, reject) {
    const image = new Image();

    const objectUrl = URL.createObjectURL(file);

    image.onload = function () {
      try {
        let width = image.naturalWidth;

        let height = image.naturalHeight;

        const scale = Math.min(1, maxWidth / width, maxHeight / height);

        width = Math.round(width * scale);

        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");

        canvas.width = width;

        canvas.height = height;

        const context = canvas.getContext("2d");

        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          function (blob) {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              reject(new Error("ไม่สามารถบีบอัดรูปภาพได้"));

              return;
            }

            resolve(blob);
          },
          "image/webp",
          quality,
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);

        reject(error);
      }
    };

    image.onerror = function () {
      URL.revokeObjectURL(objectUrl);

      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    };

    image.src = objectUrl;
  });
}

async function uploadParcelCoverPhoto(file, projectId) {
  if (!file) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("ไฟล์รูปปกต้องเป็นรูปภาพเท่านั้น");
  }

  const compressedBlob = await compressCoverPhoto(file);

  const filePath =
    projectId +
    "/cover/" +
    Date.now() +
    "_" +
    Math.random().toString(36).slice(2, 8) +
    ".webp";

  const { data, error } = await supabase.storage
    .from("parcel-photos")
    .upload(filePath, compressedBlob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/webp",
    });

  if (error) {
    console.error("UPLOAD COVER PHOTO ERROR:", error);

    throw error;
  }

  return data.path;
}

// ====================
// AUTO SAVE
// ====================

async function saveDrawings() {
  try {
    if (!currentProjectId) {
      console.warn("ไม่มี project_id ระบบจะไม่บันทึกแปลงเข้า Project");
      return;
    }

    const polygonLayers = [];

    drawnItems.eachLayer(function (layer) {
      if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        polygonLayers.push(layer);
      }
    });

    if (polygonLayers.length === 0) {
      console.warn("ไม่มี polygon สำหรับ save");
      return;
    }

    const features = [];

    for (const layer of polygonLayers) {
      const geojson = layer.toGeoJSON();

      const props =
        layer.feature && layer.feature.properties
          ? layer.feature.properties
          : {};

      const documentFiles = layer._documentFiles || {};

      const oldDocumentPaths = layer._documentPaths || {};

      const newCoverPhotoFile = layer._coverPhotoFile || null;

      const oldCoverPhotoPath = layer._coverPhotoPath || null;

      const coverPhotoPath = newCoverPhotoFile
        ? await uploadParcelCoverPhoto(newCoverPhotoFile, currentProjectId)
        : oldCoverPhotoPath;

      layer._coverPhotoPath = coverPhotoPath;

      layer._coverPhotoFile = null;

      const jointRecordPath = documentFiles.joint_record
        ? await uploadParcelDocument(
            documentFiles.joint_record,
            currentProjectId,
            "joint_record",
          )
        : oldDocumentPaths.joint_record_path || null;

      const td3Path = documentFiles.td3
        ? await uploadParcelDocument(documentFiles.td3, currentProjectId, "td3")
        : oldDocumentPaths.td3_path || null;

      const td8Path = documentFiles.td8
        ? await uploadParcelDocument(documentFiles.td8, currentProjectId, "td8")
        : oldDocumentPaths.td8_path || null;

      const jointPlanPath = documentFiles.joint_plan
        ? await uploadParcelDocument(
            documentFiles.joint_plan,
            currentProjectId,
            "joint_plan",
          )
        : oldDocumentPaths.joint_plan_path || null;

      const relatedDoc1Path = documentFiles.related_doc_1
        ? await uploadParcelDocument(
            documentFiles.related_doc_1,
            currentProjectId,
            "related_doc_1",
          )
        : oldDocumentPaths.related_doc_1_path || null;

      const relatedDoc2Path = documentFiles.related_doc_2
        ? await uploadParcelDocument(
            documentFiles.related_doc_2,
            currentProjectId,
            "related_doc_2",
          )
        : oldDocumentPaths.related_doc_2_path || null;

      const relatedDoc3Path = documentFiles.related_doc_3
        ? await uploadParcelDocument(
            documentFiles.related_doc_3,
            currentProjectId,
            "related_doc_3",
          )
        : oldDocumentPaths.related_doc_3_path || null;

      layer._documentPaths = {
        joint_record_path: jointRecordPath,
        td3_path: td3Path,
        td8_path: td8Path,
        joint_plan_path: jointPlanPath,
        related_doc_1_path: relatedDoc1Path,
        related_doc_2_path: relatedDoc2Path,
        related_doc_3_path: relatedDoc3Path,
      };

      layer._documentFiles = {};

      const calculatedArea = turf.area(geojson);
      const officialArea = parseAreaNumber(layer._officialAreaSqm);
      const displayArea = officialArea !== null ? officialArea : calculatedArea;
      const areaSource =
        officialArea !== null
          ? layer._areaSource || "ORIGINAL_FILE"
          : layer._areaSource || "WEB_CALCULATED";

      layer._calculatedAreaSqm = calculatedArea;

      features.push({
        project_id: currentProjectId,
        parcel_name: props.name || "",
        owner: props.owner || "",
        note: props.note || "",
        docno: props.docno || "",
        area_sqm: displayArea,
        official_area_sqm: officialArea,
        calculated_area_sqm: calculatedArea,
        area_source: areaSource,
        geojson: geojson,
        cover_photo_path: coverPhotoPath,

        joint_record_path: jointRecordPath,
        td3_path: td3Path,
        td8_path: td8Path,
        joint_plan_path: jointPlanPath,
        related_doc_1_path: relatedDoc1Path,
        related_doc_2_path: relatedDoc2Path,
        related_doc_3_path: relatedDoc3Path,
      });
    }

    const deleteResult = await supabase
      .from("survey_project_parcels")
      .delete()
      .eq("project_id", currentProjectId);

    if (deleteResult.error) {
      console.error("DELETE PROJECT PARCEL ERROR:", deleteResult.error);
      return;
    }

    const insertResult = await supabase
      .from("survey_project_parcels")
      .insert(features);

    if (insertResult.error) {
      console.error("INSERT PROJECT PARCEL ERROR:", insertResult.error);

      showAppPopup("บันทึกข้อมูลแปลงไม่สำเร็จ");

      return;
    }

    console.log("SAVE PROJECT PARCEL SUCCESS:", features.length);
  } catch (error) {
    console.error("SAVE DRAWINGS ERROR:", error);

    showAppPopup("บันทึกแปลงหรือเอกสารไม่สำเร็จ");
  }
}

// ====================
// LOAD DRAWINGS
// ====================

async function loadDrawings() {
  try {
    if (!currentProjectId) {
      console.warn("ไม่มี project_id จึงไม่โหลดแปลงของโครงการ");
      updateAttributeTable();
      return;
    }

    const { data, error } = await supabase
      .from("survey_project_parcels")
      .select("*")
      .eq("project_id", currentProjectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("LOAD PROJECT DRAWINGS ERROR:", error);
      return;
    }

    drawnItems.clearLayers();
    snapGuideLayers.clearLayers();

    const loadedLayers = [];

    (data || []).forEach(function (item) {
      if (!item.geojson) {
        return;
      }

      L.geoJSON(item.geojson, {
        style: {
          color: "#00bcd4",
          weight: 3,
          opacity: 1,
          fillColor: "#00bcd4",
          fillOpacity: 0.18,
        },

        onEachFeature: function (feature, layer) {
          layer.feature = {
            type: "Feature",
            properties: {
              name: item.parcel_name || "",
              owner: item.owner || "",
              note: item.note || "",
              docno: item.docno || "",
            },
            geometry: feature.geometry,
          };

          layer._parcelId = item.id;

          layer._officialAreaSqm = parseAreaNumber(item.official_area_sqm);
          layer._calculatedAreaSqm = parseAreaNumber(item.calculated_area_sqm);
          layer._areaSource =
            item.area_source ||
            (layer._officialAreaSqm !== null
              ? "ORIGINAL_FILE"
              : "WEB_CALCULATED");

          layer._coverPhotoPath = item.cover_photo_path || null;

          layer._coverPhotoFile = null;

          layer._documentPaths = {
            joint_record_path: item.joint_record_path || null,
            td3_path: item.td3_path || null,
            td8_path: item.td8_path || null,
            joint_plan_path: item.joint_plan_path || null,
            related_doc_1_path: item.related_doc_1_path || null,
            related_doc_2_path: item.related_doc_2_path || null,
            related_doc_3_path: item.related_doc_3_path || null,
          };

          layer._documentFiles = {};

          drawnItems.addLayer(layer);
          snapGuideLayers.addLayer(layer);
          loadedLayers.push(layer);

          if (layer instanceof L.Polygon) {
            bindAreaPopup(layer);

            layer.on("click", function () {
              bindAreaPopup(layer);

              setTimeout(function () {
                layer.openPopup();
              }, 100);
            });
          }
        },
      });
    });

    updateAttributeTable();

    if (loadedLayers.length > 0) {
      const group = L.featureGroup(loadedLayers);

      map.fitBounds(group.getBounds(), {
        padding: [60, 60],
        maxZoom: 19,
      });
    }

    setTimeout(function () {
      map.invalidateSize();
    }, 250);

    console.log("LOAD PROJECT DRAWINGS SUCCESS:", loadedLayers.length);
  } catch (error) {
    console.error("LOAD PROJECT DRAWINGS CATCH ERROR:", error);
  }
}

// ====================
// PARCEL INFO
// ====================

function openParcelForm(layer) {
  return new Promise(function (resolve) {
    const modal = document.getElementById("parcel-form-modal");

    const nameInput = document.getElementById("parcel-name");

    const ownerInput = document.getElementById("parcel-owner");

    const docnoInput = document.getElementById("parcel-docno");

    const noteInput = document.getElementById("parcel-note");

    const jointRecordInput = document.getElementById("parcel-joint-record");

    const td3Input = document.getElementById("parcel-td3");

    const td8Input = document.getElementById("parcel-td8");

    const jointPlanInput = document.getElementById("parcel-joint-plan");

    const relatedDoc1Input = document.getElementById("parcel-related-doc-1");

    const relatedDoc2Input = document.getElementById("parcel-related-doc-2");

    const relatedDoc3Input = document.getElementById("parcel-related-doc-3");

    const coverPhotoInput = document.getElementById("parcel-cover-photo");

    const saveButton = document.getElementById("parcel-save");

    const cancelButton = document.getElementById("parcel-cancel");

    const oldProps =
      layer.feature && layer.feature.properties ? layer.feature.properties : {};

    nameInput.value = oldProps.name || "";

    ownerInput.value = oldProps.owner || "";

    docnoInput.value = oldProps.docno || "";

    noteInput.value = oldProps.note || "";

    if (coverPhotoInput) {
      coverPhotoInput.value = "";
    }

    modal.style.display = "flex";

    function closeForm(result) {
      modal.style.display = "none";

      saveButton.onclick = null;
      cancelButton.onclick = null;

      resolve(result);
    }

    saveButton.onclick = function () {
      layer.feature = {
        type: "Feature",
        properties: {
          name: nameInput.value || "parcel",
          owner: ownerInput.value || "",
          docno: docnoInput.value || "",
          note: noteInput.value || "",
        },
        geometry: null,
      };

      layer._documentFiles = {
        joint_record: jointRecordInput.files[0] || null,

        td3: td3Input.files[0] || null,

        td8: td8Input.files[0] || null,

        joint_plan: jointPlanInput.files[0] || null,

        related_doc_1: relatedDoc1Input.files[0] || null,

        related_doc_2: relatedDoc2Input.files[0] || null,

        related_doc_3: relatedDoc3Input.files[0] || null,
      };

      layer._coverPhotoFile =
        coverPhotoInput && coverPhotoInput.files[0]
          ? coverPhotoInput.files[0]
          : null;

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

function buildParcelPopupContent(layer) {
  const areaInfo = getLayerAreaInfo(layer);
  const areaText = formatThaiArea(areaInfo.displayArea);
  const props =
    layer.feature && layer.feature.properties ? layer.feature.properties : {};

  return (
    '<div class="parcel-popup">' +
    "<h3>" +
    (props.name || "พื้นที่แปลง") +
    "</h3>" +
    "<table>" +
    "<tr>" +
    "<td><b>เจ้าของ</b></td>" +
    "<td>" +
    (props.owner || "-") +
    "</td>" +
    "</tr>" +
    "<tr>" +
    "<td><b>เลขเอกสาร</b></td>" +
    "<td>" +
    (props.docno || "-") +
    "</td>" +
    "</tr>" +
    "<tr>" +
    "<td><b>พื้นที่</b></td>" +
    "<td>" +
    areaText.thaiArea +
    "</td>" +
    "</tr>" +
    "<tr>" +
    "<td><b>ตารางเมตร</b></td>" +
    "<td>" +
    areaText.squareMeters +
    "</td>" +
    "</tr>" +
    "</table>" +
    '<div style="margin-top:8px;">' +
    (props.note || "-") +
    "</div>" +
    "</div>"
  );
}

// ====================
// BIND POPUP
// ====================

function bindAreaPopup(layer) {
  const popupContent = buildParcelPopupContent(layer);

  layer.bindPopup(popupContent, {
    maxWidth: 320,
  });
}

// ====================
// DRAW CONTROL
// ====================

const drawControl = new L.Control.Draw({
  position: "topleft",

  draw: {
    polygon: {
      shapeOptions: {
        color: "#00bcd4",
        weight: 3,
        opacity: 1,
        fillColor: "#00bcd4",
        fillOpacity: 0.18,
      },
    },

    rectangle: {
      shapeOptions: {
        color: "#4caf50",
        weight: 3,
        opacity: 1,
        fillColor: "#4caf50",
        fillOpacity: 0.18,
      },
    },

    polyline: {
      shapeOptions: {
        color: "#ff9800",
        weight: 5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      },
    },

    circle: false,
    marker: true,
    circlemarker: false,
  },

  edit: {
    featureGroup: drawnItems,
    remove: true,
  },
});

map.addControl(drawControl);

loadDrawings();

// ====================
// SNAP FINISHED POLYGON
// ====================

function snapLayerToExisting(layer, snapDistancePx = 40) {
  if (!(layer instanceof L.Polygon)) return;

  const currentLatLngs = layer.getLatLngs()[0];

  const guidePoints = [];

  drawnItems.eachLayer(function (guideLayer) {
    if (guideLayer === layer || !(guideLayer instanceof L.Polygon)) return;

    const guideLatLngs = guideLayer.getLatLngs()[0];

    guideLatLngs.forEach(function (latlng) {
      guidePoints.push(latlng);
    });
  });

  if (guidePoints.length === 0) return;

  const snappedLatLngs = currentLatLngs.map(function (latlng) {
    let nearestPoint = null;
    let nearestDistance = Infinity;

    const point = map.latLngToLayerPoint(latlng);

    guidePoints.forEach(function (guideLatLng) {
      const guidePoint = map.latLngToLayerPoint(guideLatLng);

      const distance = point.distanceTo(guidePoint);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = guideLatLng;
      }
    });

    if (nearestDistance <= snapDistancePx && nearestPoint) {
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

map.on(L.Draw.Event.CREATED, async function (event) {
  const layer = event.layer;

  const layerType = event.layerType;

  // ====================
  // ADD TO MAP
  // ====================

  drawnItems.addLayer(layer);

  snapGuideLayers.addLayer(layer);

  if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
    layer._officialAreaSqm = null;
    layer._areaSource = "WEB_DRAW";
  }

  // ====================
  // SNAP POLYGON
  // ====================

  if (layerType === "polygon") {
    snapLayerToExisting(layer, 100);
  }

  // ====================
  // PARCEL FORM
  // ====================

  if (layerType === "polygon" || layerType === "rectangle") {
    const saved = await openParcelForm(layer);

    if (!saved) {
      drawnItems.removeLayer(layer);

      snapGuideLayers.removeLayer(layer);

      return;
    }
  }

  // ====================
  // MARKER POPUP
  // ====================

  if (layerType === "marker") {
    const latlng = layer.getLatLng();

    layer.bindPopup(
      "<b>พิกัดตำแหน่ง</b><br>" +
        "Latitude: " +
        latlng.lat.toFixed(6) +
        "<br>" +
        "Longitude: " +
        latlng.lng.toFixed(6),
    );

    setTimeout(function () {
      layer.openPopup();
    }, 200);
  }

  // ====================
  // POLYLINE POPUP
  // ====================

  if (layerType === "polyline") {
    const distance = calculatePolylineDistance(layer.getLatLngs());

    layer.bindPopup("<b>ระยะทางที่วัด</b><br>" + formatDistance(distance));

    setTimeout(function () {
      layer.openPopup();
    }, 200);
  }

  // ====================
  // POLYGON POPUP
  // ====================

  if (layer instanceof L.Polygon) {
    bindAreaPopup(layer);

    layer.on("click", function () {
      bindAreaPopup(layer);

      setTimeout(function () {
        layer.openPopup();
      }, 100);
    });

    setTimeout(function () {
      layer.openPopup();
    }, 300);
  }

  // ====================
  // SAVE + UPDATE
  // ====================

  await saveDrawings();

  updateAttributeTable();
});

// ====================
// DRAW EDIT / DELETE SAVE
// ====================

map.on("draw:edited", async function (event) {
  event.layers.eachLayer(function (layer) {
    if (layer instanceof L.Polygon) {
      bindAreaPopup(layer);
    }
  });

  await saveDrawings();

  updateAttributeTable();
});

map.on("draw:deleted", async function () {
  snapGuideLayers.clearLayers();

  drawnItems.eachLayer(function (layer) {
    snapGuideLayers.addLayer(layer);
  });

  await saveDrawings();

  updateAttributeTable();
});

// ====================
// POPUP REFRESH WHEN CLICK
// ====================

drawnItems.on("click", function (event) {
  const layer = event.layer;

  if (layer instanceof L.Polygon) {
    bindAreaPopup(layer);
    layer.openPopup();
  }
});

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

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    enableMapInteraction();
  }
});

map.on("draw:drawstop", enableMapInteraction);

map.on("draw:editstop", enableMapInteraction);

map.on("draw:deletestop", enableMapInteraction);

// ====================
// CURRENT LOCATION
// ====================

let currentLocationMarker = null;
let currentAccuracyCircle = null;

const locateButton = document.getElementById("locate-button");

if (locateButton) {
  locateButton.addEventListener("click", function () {
    if (!navigator.geolocation) {
      showAppPopup("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }

    locateButton.textContent = "กำลังค้นหา...";

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude;

        const lng = position.coords.longitude;

        const accuracy = position.coords.accuracy;

        if (currentLocationMarker) {
          map.removeLayer(currentLocationMarker);
        }

        if (currentAccuracyCircle) {
          map.removeLayer(currentAccuracyCircle);
        }

        currentLocationMarker = L.marker([lat, lng]).addTo(map);

        currentAccuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.12,
          weight: 2,
        }).addTo(map);

        currentLocationMarker.bindPopup(
          "<b>ตำแหน่งปัจจุบัน</b><br>" +
            "Latitude: " +
            lat.toFixed(6) +
            "<br>" +
            "Longitude: " +
            lng.toFixed(6) +
            "<br>" +
            "ความแม่นยำ: " +
            accuracy.toFixed(0) +
            " เมตร",
        );

        map.setView([lat, lng], 18);

        currentLocationMarker.openPopup();

        locateButton.textContent = "ตำแหน่งฉัน";
      },

      function (error) {
        console.error("GPS ERROR:", error);

        showAppPopup("ไม่สามารถดึงตำแหน่งได้");

        locateButton.textContent = "ตำแหน่งฉัน";
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

// ====================
// SEARCH
// ====================

let searchMarker = null;

const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("keydown", async function (event) {
    if (event.key !== "Enter") {
      return;
    }

    const keyword = event.target.value.trim().toLowerCase();

    if (!keyword) {
      return;
    }

    // ====================
    // SEARCH IN MAP LAYERS
    // ====================

    let foundLayer = null;

    for (const layer of searchableLayers) {
      if (!layer.feature || !layer.feature.properties) {
        continue;
      }

      const props = layer.feature.properties;

      for (const key in props) {
        const value = String(props[key]).toLowerCase();

        if (value.includes(keyword)) {
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
      if (foundLayer.getLatLng) {
        map.setView(foundLayer.getLatLng(), 18);
      } else if (foundLayer.getBounds) {
        map.fitBounds(foundLayer.getBounds());
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
      const response = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&q=" +
          encodeURIComponent(keyword),
      );

      const results = await response.json();

      if (!results || results.length === 0) {
        showAppPopup("ไม่พบข้อมูล");

        return;
      }

      const place = results[0];

      const lat = parseFloat(place.lat);

      const lon = parseFloat(place.lon);

      map.setView([lat, lon], 16);

      if (searchMarker) {
        map.removeLayer(searchMarker);
      }

      searchMarker = L.marker([lat, lon]).addTo(map);

      searchMarker.bindPopup(place.display_name);

      setTimeout(function () {
        searchMarker.openPopup();
      }, 200);
    } catch (error) {
      console.error("SEARCH ERROR:", error);
    }
  });
}

// ====================
// DWG IMPORT (CLOSED POLYLINE -> GEOJSON)
// ====================

const DWG_LIBRARY_VERSION = "0.7.7";

const DWG_LIBRARY_BASE =
  "https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@" +
  DWG_LIBRARY_VERSION;

let dwgLibraryPromise = null;
let dwgReaderPromise = null;

async function loadDwgLibrary() {
  if (!dwgLibraryPromise) {
    dwgLibraryPromise = import(
      DWG_LIBRARY_BASE + "/dist/libredwg-web.js"
    );
  }

  return await dwgLibraryPromise;
}

async function getDwgReader() {
  if (!dwgReaderPromise) {
    dwgReaderPromise = (async function () {
      const dwgLibrary = await loadDwgLibrary();

      return await dwgLibrary.LibreDwg.create(
        DWG_LIBRARY_BASE + "/wasm",
      );
    })();
  }

  return await dwgReaderPromise;
}

function isFiniteCadPoint(point) {
  return (
    point &&
    Number.isFinite(Number(point.x)) &&
    Number.isFinite(Number(point.y))
  );
}

function pointsAreEqual(pointA, pointB, tolerance = 1e-7) {
  if (!isFiniteCadPoint(pointA) || !isFiniteCadPoint(pointB)) {
    return false;
  }

  return (
    Math.abs(Number(pointA.x) - Number(pointB.x)) <= tolerance &&
    Math.abs(Number(pointA.y) - Number(pointB.y)) <= tolerance
  );
}

function isClosedDwgPolyline(entity) {
  const vertices = Array.isArray(entity.vertices) ? entity.vertices : [];

  if (vertices.length < 3) {
    return false;
  }

  const polylineFlag = Number(entity.flag || 0);

  // LibreDWG Web บางไฟล์ DWG 2018+ คืนค่า Closed ของ LWPOLYLINE
  // เป็นบิต 512 แทนบิต 1 แม้ AutoCAD จะแสดง Closed = Yes
  const closedByFlag =
    (polylineFlag & 1) === 1 ||
    (entity.type === "LWPOLYLINE" && (polylineFlag & 512) === 512);

  const closedByCoordinates = pointsAreEqual(
    vertices[0],
    vertices[vertices.length - 1],
  );

  return closedByFlag || closedByCoordinates;
}

function interpolateBulgeSegment(start, end, bulge) {
  const x1 = Number(start.x);
  const y1 = Number(start.y);
  const x2 = Number(end.x);
  const y2 = Number(end.y);
  const safeBulge = Number(bulge || 0);

  if (!Number.isFinite(safeBulge) || Math.abs(safeBulge) < 1e-10) {
    return [[x1, y1]];
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const chordLength = Math.hypot(dx, dy);

  if (chordLength < 1e-10) {
    return [[x1, y1]];
  }

  const includedAngle = 4 * Math.atan(safeBulge);
  const radius =
    (chordLength * (1 + safeBulge * safeBulge)) /
    (4 * Math.abs(safeBulge));

  const midpointX = (x1 + x2) / 2;
  const midpointY = (y1 + y2) / 2;
  const halfChord = chordLength / 2;
  const centerOffset = Math.sqrt(
    Math.max(0, radius * radius - halfChord * halfChord),
  );
  const normalX = -dy / chordLength;
  const normalY = dx / chordLength;
  const direction = safeBulge >= 0 ? 1 : -1;
  const centerX = midpointX + normalX * centerOffset * direction;
  const centerY = midpointY + normalY * centerOffset * direction;
  const startAngle = Math.atan2(y1 - centerY, x1 - centerX);

  const segmentCount = Math.max(
    4,
    Math.ceil(Math.abs(includedAngle) / (Math.PI / 18)),
  );

  const points = [];

  for (let index = 0; index < segmentCount; index++) {
    const ratio = index / segmentCount;
    const angle = startAngle + includedAngle * ratio;

    points.push([
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle),
    ]);
  }

  return points;
}

function extractClosedPolylineCoordinates(entity) {
  const rawVertices = (entity.vertices || []).filter(isFiniteCadPoint);

  if (rawVertices.length < 3) {
    return [];
  }

  const vertices = [...rawVertices];

  if (pointsAreEqual(vertices[0], vertices[vertices.length - 1])) {
    vertices.pop();
  }

  if (vertices.length < 3) {
    return [];
  }

  const coordinates = [];

  for (let index = 0; index < vertices.length; index++) {
    const currentVertex = vertices[index];
    const nextVertex = vertices[(index + 1) % vertices.length];
    const segmentPoints = interpolateBulgeSegment(
      currentVertex,
      nextVertex,
      currentVertex.bulge,
    );

    coordinates.push(...segmentPoints);
  }

  coordinates.push([...coordinates[0]]);

  return coordinates;
}

async function detectDwgCoordinateMode(coordinates) {
  const allAreLongitudeLatitude = coordinates.every(function (coordinate) {
    return (
      coordinate[0] >= -180 &&
      coordinate[0] <= 180 &&
      coordinate[1] >= -90 &&
      coordinate[1] <= 90
    );
  });

  if (allAreLongitudeLatitude) {
    return {
      type: "WGS84",
      zone: null,
    };
  }

  const looksLikeUtm = coordinates.every(function (coordinate) {
    return (
      coordinate[0] >= 100000 &&
      coordinate[0] <= 900000 &&
      coordinate[1] >= 0 &&
      coordinate[1] <= 10000000
    );
  });

  if (!looksLikeUtm) {
    return {
      type: "UNKNOWN",
      zone: null,
    };
  }

  const zoneAnswer = await window.SRTAAppPopup.prompt(
    "ไฟล์ DWG ใช้พิกัด UTM Zone ใด? พิมพ์ 47 หรือ 48",
    "47",
    "กำหนดระบบพิกัด",
  );

  if (zoneAnswer === null) {
    return {
      type: "CANCELLED",
      zone: null,
    };
  }

  const zone = Number(String(zoneAnswer).trim());

  if (zone !== 47 && zone !== 48) {
    throw new Error("กรุณาระบุ UTM Zone เป็น 47 หรือ 48 เท่านั้น");
  }

  return {
    type: "UTM",
    zone: zone,
  };
}

function utmToLongitudeLatitude(easting, northing, zoneNumber) {
  const semiMajorAxis = 6378137;
  const eccentricitySquared = 0.00669438;
  const scaleFactor = 0.9996;

  const x = Number(easting) - 500000;
  let y = Number(northing);

  // ระบบนี้รองรับประเทศไทยซึ่งอยู่ซีกโลกเหนือ
  const longitudeOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const eccentricityPrimeSquared =
    eccentricitySquared / (1 - eccentricitySquared);
  const meridionalArc = y / scaleFactor;
  const mu =
    meridionalArc /
    (semiMajorAxis *
      (1 -
        eccentricitySquared / 4 -
        (3 * eccentricitySquared * eccentricitySquared) / 64 -
        (5 * Math.pow(eccentricitySquared, 3)) / 256));

  const e1 =
    (1 - Math.sqrt(1 - eccentricitySquared)) /
    (1 + Math.sqrt(1 - eccentricitySquared));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) *
      Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

  const n1 =
    semiMajorAxis /
    Math.sqrt(1 - eccentricitySquared * Math.sin(phi1) ** 2);
  const t1 = Math.tan(phi1) ** 2;
  const c1 = eccentricityPrimeSquared * Math.cos(phi1) ** 2;
  const r1 =
    (semiMajorAxis * (1 - eccentricitySquared)) /
    Math.pow(1 - eccentricitySquared * Math.sin(phi1) ** 2, 1.5);
  const d = x / (n1 * scaleFactor);

  const latitudeRadians =
    phi1 -
    ((n1 * Math.tan(phi1)) / r1) *
      (d * d / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * eccentricityPrimeSquared) *
          Math.pow(d, 4)) /
          24 +
        ((61 +
          90 * t1 +
          298 * c1 +
          45 * t1 * t1 -
          252 * eccentricityPrimeSquared -
          3 * c1 * c1) *
          Math.pow(d, 6)) /
          720);

  const longitudeRadians =
    (d -
      ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6 +
      ((5 -
        2 * c1 +
        28 * t1 -
        3 * c1 * c1 +
        8 * eccentricityPrimeSquared +
        24 * t1 * t1) *
        Math.pow(d, 5)) /
        120) /
    Math.cos(phi1);

  return [
    longitudeOrigin + (longitudeRadians * 180) / Math.PI,
    (latitudeRadians * 180) / Math.PI,
  ];
}

function convertDwgCoordinatesToWgs84(coordinates, coordinateMode) {
  if (coordinateMode.type === "WGS84") {
    return coordinates.map(function (coordinate) {
      return [Number(coordinate[0]), Number(coordinate[1])];
    });
  }

  if (coordinateMode.type === "UTM") {
    return coordinates.map(function (coordinate) {
      return utmToLongitudeLatitude(
        coordinate[0],
        coordinate[1],
        coordinateMode.zone,
      );
    });
  }

  throw new Error(
    "ไม่สามารถระบุระบบพิกัดของ DWG ได้ กรุณาใช้ WGS84 หรือ UTM Zone 47/48",
  );
}


function calculateClosedCadPolylineArea(entity) {
  const rawVertices = (entity.vertices || []).filter(isFiniteCadPoint);

  if (rawVertices.length < 3) {
    return null;
  }

  const vertices = [...rawVertices];

  if (pointsAreEqual(vertices[0], vertices[vertices.length - 1])) {
    vertices.pop();
  }

  if (vertices.length < 3) {
    return null;
  }

  let signedDoubleArea = 0;
  let signedArcArea = 0;

  for (let index = 0; index < vertices.length; index++) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const x1 = Number(start.x);
    const y1 = Number(start.y);
    const x2 = Number(end.x);
    const y2 = Number(end.y);

    signedDoubleArea += x1 * y2 - x2 * y1;

    const bulge = Number(start.bulge || 0);

    if (Number.isFinite(bulge) && Math.abs(bulge) > 1e-12) {
      const chordLength = Math.hypot(x2 - x1, y2 - y1);
      const theta = 4 * Math.atan(bulge);
      const radius =
        (chordLength * (1 + bulge * bulge)) /
        (4 * Math.abs(bulge));

      signedArcArea += 0.5 * radius * radius * (theta - Math.sin(theta));
    }
  }

  const area = Math.abs(signedDoubleArea / 2 + signedArcArea);

  return Number.isFinite(area) && area > 0 ? area : null;
}

function getDwgEntityArea(entity) {
  const candidateValues = [
    entity.area,
    entity.Area,
    entity.areaValue,
    entity.area_value,
  ];

  for (const candidate of candidateValues) {
    const area = parseAreaNumber(candidate);

    if (area !== null) {
      return area;
    }
  }

  return calculateClosedCadPolylineArea(entity);
}

async function readDwgAsGeoJSON(file) {
  const dwgLibrary = await loadDwgLibrary();
  const dwgReader = await getDwgReader();
  const fileBuffer = await file.arrayBuffer();
  let dwgPointer = null;

  try {
    dwgPointer = dwgReader.dwg_read_data(
      fileBuffer,
      dwgLibrary.Dwg_File_Type.DWG,
    );

    if (!dwgPointer) {
      throw new Error("ไม่สามารถอ่านโครงสร้างไฟล์ DWG ได้");
    }

    const database = dwgReader.convert(dwgPointer);
    const entities = Array.isArray(database.entities)
      ? database.entities
      : [];

    const closedPolylines = entities.filter(function (entity) {
      return (
        (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE2D") &&
        !entity.isInPaperSpace &&
        isClosedDwgPolyline(entity)
      );
    });

    if (closedPolylines.length === 0) {
      throw new Error("ไม่พบ Closed Polyline ใน Model Space ของไฟล์ DWG");
    }

    if (closedPolylines.length > 1) {
      throw new Error(
        "พบ Closed Polyline มากกว่า 1 แปลง กรุณาให้ไฟล์มีรูปแปลงเดียว",
      );
    }

    const selectedPolyline = closedPolylines[0];
    const originalDwgArea = getDwgEntityArea(selectedPolyline);

    const cadCoordinates = extractClosedPolylineCoordinates(
      selectedPolyline,
    );

    if (cadCoordinates.length < 4) {
      throw new Error("Closed Polyline มีจุดไม่เพียงพอสำหรับสร้าง Polygon");
    }

    const coordinateMode = await detectDwgCoordinateMode(cadCoordinates);

    if (coordinateMode.type === "CANCELLED") {
      return null;
    }

    const wgs84Coordinates = convertDwgCoordinatesToWgs84(
      cadCoordinates,
      coordinateMode,
    );

    const feature = {
      type: "Feature",
      properties: {
        name: file.name.replace(/\.dwg$/i, ""),
        source: "DWG",
        layer: selectedPolyline.layer || "",
        official_area_sqm: originalDwgArea,
        area_source: "DWG",
      },
      geometry: {
        type: "Polygon",
        coordinates: [wgs84Coordinates],
      },
    };

    // ตรวจรูปทรงหลังแปลงพิกัดก่อนส่งเข้า Leaflet
    if (typeof turf !== "undefined" && turf.kinks) {
      const kinkResult = turf.kinks(feature);

      if (kinkResult.features && kinkResult.features.length > 0) {
        console.warn("DWG POLYGON HAS SELF INTERSECTIONS:", kinkResult);
      }
    }

    return {
      type: "FeatureCollection",
      features: [feature],
    };
  } finally {
    if (dwgPointer) {
      try {
        dwgReader.dwg_free(dwgPointer);
      } catch (freeError) {
        console.warn("FREE DWG MEMORY ERROR:", freeError);
      }
    }
  }
}

// ====================
// IMPORT PARCEL FILE
// ====================

const importParcelButton = document.getElementById("import-parcel-file");

const importParcelInput = document.getElementById("import-parcel-input");

function addImportedGeoJSONToProject(geojson, sourceFileName) {
  const importedLayers = [];

  L.geoJSON(geojson, {
    style: {
      color: "#ff3b30",
      weight: 3,
      opacity: 1,
      fillColor: "#ff3b30",
      fillOpacity: 0.25,
    },

    onEachFeature: function (feature, layer) {
      const geometryType = feature.geometry ? feature.geometry.type : "";

      if (geometryType !== "Polygon" && geometryType !== "MultiPolygon") {
        return;
      }

      const properties = feature.properties || {};
      const originalAreaResult = getOfficialAreaFromProperties(properties);
      const sourceExtension = sourceFileName.split(".").pop().toLowerCase();
      const explicitOfficialArea = parseAreaNumber(
        properties.official_area_sqm,
      );
      const officialArea =
        explicitOfficialArea !== null
          ? explicitOfficialArea
          : originalAreaResult.area;

      let areaSource = properties.area_source || "";

      if (!areaSource && officialArea !== null) {
        if (sourceExtension === "zip") {
          areaSource = "SHP:" + (originalAreaResult.fieldName || "AREA");
        } else if (sourceExtension === "kml" || sourceExtension === "kmz") {
          areaSource = "KML:" + (originalAreaResult.fieldName || "AREA");
        } else if (sourceExtension === "dwg") {
          areaSource = "DWG";
        }
      }

      layer.feature = {
        type: "Feature",

        properties: {
          name:
            properties.name ||
            properties.NAME ||
            properties.Name ||
            sourceFileName.replace(/\.(kml|kmz|zip|dwg)$/i, ""),

          owner: properties.owner || properties.OWNER || "",

          docno: properties.docno || properties.DOCNO || "",

          note:
            properties.description || properties.note || properties.NOTE || "",
        },

        geometry: feature.geometry,
      };

      layer._officialAreaSqm = officialArea;
      layer._calculatedAreaSqm = turf.area(feature);
      layer._areaSource =
        officialArea !== null ? areaSource || "ORIGINAL_FILE" : "WEB_CALCULATED";

      layer._documentFiles = {};
      layer._documentPaths = {};

      drawnItems.addLayer(layer);
      snapGuideLayers.addLayer(layer);

      bindAreaPopup(layer);

      layer.on("click", function () {
        bindAreaPopup(layer);

        setTimeout(function () {
          layer.openPopup();
        }, 100);
      });

      importedLayers.push(layer);
    },
  });

  return importedLayers;
}

async function finishImportedLayers(importedLayers, fileTypeLabel) {
  if (importedLayers.length === 0) {
    showAppPopup("ไฟล์ " + fileTypeLabel + " นี้ไม่มี Polygon สำหรับนำเข้า");

    return false;
  }

  const importedGroup = L.featureGroup(importedLayers);

  map.fitBounds(importedGroup.getBounds(), {
    padding: [60, 60],
    maxZoom: 19,
  });

  updateAttributeTable();

  await saveDrawings();

  showAppPopup(
    "นำเข้า " +
      fileTypeLabel +
      " และบันทึกเข้าโครงการสำเร็จ " +
      importedLayers.length +
      " แปลง",
  );

  return true;
}

if (importParcelButton && importParcelInput) {
  importParcelButton.addEventListener("click", function () {
    importParcelInput.value = "";

    importParcelInput.accept = ".kml,.kmz,.zip,.dwg";

    importParcelInput.click();
  });

  importParcelInput.addEventListener("change", async function () {
    const file = importParcelInput.files[0];

    if (!file) {
      return;
    }

    if (!currentProjectId) {
      showAppPopup("กรุณาเปิด Web GIS ผ่านโครงการก่อนนำเข้าไฟล์");

      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();

    console.log("IMPORT FILE:", file.name, file.type, file.size);

    try {
      let geojson = null;
      let fileTypeLabel = "";

      if (extension === "kml") {
        const kmlText = await file.text();

        const parser = new DOMParser();

        const kmlDocument = parser.parseFromString(kmlText, "text/xml");

        const parseError = kmlDocument.querySelector("parsererror");

        if (parseError) {
          showAppPopup("ไฟล์ KML ไม่ถูกต้องหรืออ่านไม่ได้");

          return;
        }

        geojson = toGeoJSON.kml(kmlDocument);

        fileTypeLabel = "KML";
      } else if (extension === "kmz") {
        if (typeof JSZip === "undefined") {
          showAppPopup("ไม่พบ JSZip กรุณาตรวจสอบ index.html");

          return;
        }

        const arrayBuffer = await file.arrayBuffer();

        const zip = await JSZip.loadAsync(arrayBuffer);

        const kmlFileNames = Object.keys(zip.files).filter(function (fileName) {
          return (
            !zip.files[fileName].dir && fileName.toLowerCase().endsWith(".kml")
          );
        });

        if (kmlFileNames.length === 0) {
          showAppPopup("ไม่พบไฟล์ KML ภายใน KMZ");

          return;
        }

        const preferredKmlName =
          kmlFileNames.find(function (fileName) {
            return fileName.toLowerCase().endsWith("doc.kml");
          }) || kmlFileNames[0];

        console.log("KMZ INNER KML:", preferredKmlName);

        const kmlText = await zip.files[preferredKmlName].async("text");

        const parser = new DOMParser();

        const kmlDocument = parser.parseFromString(kmlText, "text/xml");

        const parseError = kmlDocument.querySelector("parsererror");

        if (parseError) {
          showAppPopup("ไฟล์ KML ภายใน KMZ ไม่ถูกต้อง");

          return;
        }

        geojson = toGeoJSON.kml(kmlDocument);

        fileTypeLabel = "KMZ";
      } else if (extension === "zip") {
        if (typeof shp === "undefined") {
          showAppPopup("ไม่พบไลบรารี Shapefile กรุณาตรวจสอบ index.html");

          return;
        }

        const arrayBuffer = await file.arrayBuffer();

        const shpResult = await shp(arrayBuffer);

        if (Array.isArray(shpResult)) {
          const allFeatures = [];

          shpResult.forEach(function (item) {
            if (item && Array.isArray(item.features)) {
              allFeatures.push(...item.features);
            }
          });

          geojson = {
            type: "FeatureCollection",
            features: allFeatures,
          };
        } else {
          geojson = shpResult;
        }

        fileTypeLabel = "Shapefile";
      } else if (extension === "dwg") {
        showAppPopup(
          "กำลังอ่านไฟล์ DWG กรุณารอสักครู่",
          "กำลังนำเข้า DWG",
          "warning",
        );

        geojson = await readDwgAsGeoJSON(file);

        if (!geojson) {
          return;
        }

        fileTypeLabel = "DWG";
      } else {
        showAppPopup(
          "รองรับเฉพาะไฟล์ KML, KMZ, Shapefile ZIP และ DWG",
        );

        return;
      }

      if (!geojson || !geojson.features || geojson.features.length === 0) {
        showAppPopup("ไม่พบข้อมูลพื้นที่ในไฟล์ " + fileTypeLabel);

        return;
      }

      const polygonFeatures = geojson.features.filter(function (feature) {
        return (
          feature.geometry &&
          (feature.geometry.type === "Polygon" ||
            feature.geometry.type === "MultiPolygon")
        );
      });

      if (polygonFeatures.length === 0) {
        showAppPopup(
          "ไม่พบ Polygon สำหรับนำเข้า",
          "ไม่พบข้อมูลแปลง",
          "warning",
        );

        return;
      }

      let totalArea = 0;

      polygonFeatures.forEach(function (feature) {
        try {
          totalArea += turf.area(feature);
        } catch (error) {
          console.warn("CALCULATE IMPORT AREA ERROR:", error);
        }
      });

      const previewMessage =
        "พบทั้งหมด " + polygonFeatures.length + " แปลง ต้องการนำเข้าหรือไม่";

      const confirmedImport = await showConfirmPopup(
        previewMessage,
        "ยืนยันการนำเข้า",
      );

      if (!confirmedImport) {
        return;
      }

      const importedLayers = addImportedGeoJSONToProject(geojson, file.name);

      await finishImportedLayers(importedLayers, fileTypeLabel);
    } catch (error) {
      console.error("IMPORT PARCEL ERROR:", error);

      showAppPopup(
        "นำเข้าไฟล์ไม่สำเร็จ: " +
          (error && error.message ? error.message : "ไม่ทราบสาเหตุ"),
      );
    }
  });
}

// ====================
// DOWNLOAD HELPER
// ====================

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

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
  const geojson = drawnItems.toGeoJSON();

  if (!geojson.features || geojson.features.length === 0) {
    showAppPopup("กรุณาวาดแปลงก่อน Export");

    return null;
  }

  const polygonFeatures = geojson.features.filter(function (feature) {
    return (
      feature.geometry &&
      (feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon")
    );
  });

  if (polygonFeatures.length === 0) {
    showAppPopup("Export ได้เฉพาะ Polygon หรือ Rectangle เท่านั้น");

    return null;
  }

  const exportGeojson = {
    type: "FeatureCollection",
    features: polygonFeatures,
  };

  return turf.truncate(exportGeojson, {
    precision: 10,
    coordinates: 2,
  });
}

// ====================
// EXPORT SHP
// ====================

const exportShpButton = document.getElementById("export-shp");

if (exportShpButton) {
  exportShpButton.addEventListener("click", function () {
    const geojson = getDrawnPolygonGeoJSON();

    if (!geojson) {
      return;
    }

    shpwrite.download(geojson, {
      folder: "SHP_Export",
      types: {
        polygon: "parcel",
      },
    });
  });
}

// ====================
// EXPORT KML
// ====================

const exportKmlButton = document.getElementById("export-kml");

if (exportKmlButton) {
  exportKmlButton.addEventListener("click", function () {
    if (typeof tokml === "undefined") {
      showAppPopup("ไม่พบ tokml กรุณาตรวจสอบ index.html");

      return;
    }

    const geojson = getDrawnPolygonGeoJSON();

    if (!geojson) {
      return;
    }

    const kml = tokml(geojson, {
      name: "name",
      description: "description",
    });

    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml;charset=utf-8",
    });

    downloadBlob(blob, "parcel.kml");
  });
}

// ====================
// EXPORT KMZ
// ====================

const exportKmzButton = document.getElementById("export-kmz");

if (exportKmzButton) {
  exportKmzButton.addEventListener("click", async function () {
    if (typeof tokml === "undefined") {
      showAppPopup("ไม่พบ tokml กรุณาตรวจสอบ index.html");

      return;
    }

    if (typeof JSZip === "undefined") {
      showAppPopup("ไม่พบ JSZip กรุณาตรวจสอบ index.html");

      return;
    }

    const geojson = getDrawnPolygonGeoJSON();

    if (!geojson) {
      return;
    }

    const kml = tokml(geojson, {
      name: "name",
      description: "description",
    });

    const zip = new JSZip();

    zip.file("doc.kml", kml);

    const kmzBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
    });

    downloadBlob(kmzBlob, "parcel.kmz");
  });
}

// ====================
// ATTRIBUTE TABLE
// ====================

function updateAttributeTable() {
  const tableBody = document.getElementById("attribute-table-body");

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = "";

  let index = 1;

  // ====================
  // LOOP DRAWINGS
  // ====================

  drawnItems.eachLayer(function (layer) {
    if (!(layer instanceof L.Polygon)) {
      return;
    }

    const props =
      layer.feature && layer.feature.properties ? layer.feature.properties : {};

    const areaInfo = getLayerAreaInfo(layer);
    const areaText = formatThaiArea(areaInfo.displayArea);

    // ====================
    // CREATE ROW
    // ====================

    const row = document.createElement("tr");

    row.innerHTML =
      "<td>" +
      (props.name || "parcel " + index) +
      "</td>" +
      "<td>" +
      (props.owner || "-") +
      "</td>" +
      "<td>" +
      (props.docno || "-") +
      "</td>" +
      "<td>" +
      areaText.thaiArea +
      "</td>" +
      "<td>" +
      '<button class="table-btn zoom-btn">' +
      "Zoom" +
      "</button> " +
      '<button class="table-btn edit-btn">' +
      "Edit" +
      "</button>" +
      "</td>";

    // ====================
    // ZOOM BUTTON
    // ====================

    row.querySelector(".zoom-btn").addEventListener("click", function () {
      map.fitBounds(layer.getBounds());

      bindAreaPopup(layer);

      setTimeout(function () {
        layer.openPopup();
      }, 200);
    });

    // ====================
    // EDIT BUTTON
    // ====================

    row.querySelector(".edit-btn").addEventListener("click", async function () {
      const attributeTable = document.getElementById("attribute-table");

      if (attributeTable) {
        attributeTable.style.display = "none";
      }

      if (!map.hasLayer(drawnItems)) {
        map.addLayer(drawnItems);
      }

      if (!drawnItems.hasLayer(layer)) {
        drawnItems.addLayer(layer);
      }

      layer.setStyle({
        color: "#ff3b30",
        weight: 4,
        opacity: 1,
        fillColor: "#ff3b30",
        fillOpacity: 0.28,
      });

      map.invalidateSize();

      if (layer.getBounds && layer.getBounds().isValid()) {
        map.fitBounds(layer.getBounds(), {
          padding: [120, 120],
          maxZoom: 20,
          animate: true,
          duration: 0.8,
        });
      }

      setTimeout(function () {
        bindAreaPopup(layer);
        layer.openPopup();
      }, 850);

      const saved = await openParcelForm(layer);

      if (!saved) {
        layer.setStyle({
          color: "#00bcd4",
          weight: 3,
          opacity: 1,
          fillColor: "#00bcd4",
          fillOpacity: 0.18,
        });

        return;
      }

      bindAreaPopup(layer);

      await saveDrawings();

      layer.setStyle({
        color: "#00bcd4",
        weight: 3,
        opacity: 1,
        fillColor: "#00bcd4",
        fillOpacity: 0.18,
      });

      updateAttributeTable();
    });

    // ====================
    // APPEND ROW
    // ====================

    tableBody.appendChild(row);

    index++;
  });
}

// ====================
// SHOW ATTRIBUTE TABLE
// ====================

const showAttributeTableButton = document.getElementById(
  "show-attribute-table",
);

if (showAttributeTableButton) {
  showAttributeTableButton.addEventListener("click", function () {
    updateAttributeTable();

    document.getElementById("attribute-table").style.display = "block";
  });
}

// ====================
// CLOSE ATTRIBUTE TABLE
// ====================

const closeAttributeTableButton = document.getElementById(
  "close-attribute-table",
);

if (closeAttributeTableButton) {
  closeAttributeTableButton.addEventListener("click", function () {
    document.getElementById("attribute-table").style.display = "none";
  });
}

// ====================
// CLEAR ALL DRAWINGS
// ====================

const clearButton = document.getElementById("clear-drawings");

if (clearButton) {
  clearButton.addEventListener("click", async function () {
    const confirmDelete = await showConfirmPopup(
      "ต้องการลบแปลงทั้งหมดของโครงการนี้ใช่หรือไม่ ?",
      "ยืนยันการลบแปลง",
    );

    if (!confirmDelete) {
      return;
    }

    if (!currentProjectId) {
      showAppPopup("ไม่พบรหัสโครงการ จึงไม่สามารถลบแปลงได้");
      return;
    }

    drawnItems.clearLayers();

    snapGuideLayers.clearLayers();

    const deleteResult = await supabase
      .from("survey_project_parcels")
      .delete()
      .eq("project_id", currentProjectId);

    if (deleteResult.error) {
      console.error("CLEAR SUPABASE ERROR:", deleteResult.error);

      showAppPopup("ลบข้อมูลไม่สำเร็จ");

      return;
    }

    updateAttributeTable();

    showAppPopup("ลบแปลงทั้งหมดเรียบร้อยแล้ว");
  });
}

// ====================
// EXPORT PDF A4
// ====================

const exportPdfButton = document.getElementById("export-pdf");

if (exportPdfButton) {
  exportPdfButton.addEventListener("click", async function () {
    const fileName = await window.SRTAAppPopup.prompt(
      "กรุณาตั้งชื่อไฟล์ PDF",
      "parcel_map",
      "Export แผนที่เป็น PDF",
    );

    if (!fileName) {
      return;
    }

    // ====================
    // HIDE UI BEFORE EXPORT
    // ====================

    const hideElements = document.querySelectorAll(
      ".top-right-tools, .search-box, .attribute-table",
    );

    try {
      hideElements.forEach(function (element) {
        element.style.display = "none";
      });

      map.invalidateSize();

      // ====================
      // REFRESH DRAWN LAYERS
      // ====================

      drawnItems.eachLayer(function (layer) {
        if (layer instanceof L.Polygon) {
          bindAreaPopup(layer);
        }

        if (layer.redraw) {
          layer.redraw();
        }
      });

      // ====================
      // WAIT MAP RENDER
      // ====================

      await new Promise(function (resolve) {
        setTimeout(resolve, 900);
      });

      // ====================
      // CAPTURE MAP
      // ====================

      const mapElement = document.getElementById("map");

      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: "#ffffff",
      });

      // ====================
      // SHOW UI AFTER CAPTURE
      // ====================

      hideElements.forEach(function (element) {
        element.style.display = "";
      });

      // ====================
      // CREATE PDF
      // ====================

      const imageData = canvas.toDataURL("image/png");

      const { jsPDF } = window.jspdf;

      const pdf = new jsPDF("landscape", "mm", "a4");

      // ====================
      // ADD LOGO
      // ====================

      try {
        pdf.addImage("./Logo.png", "PNG", 12, 8, 38, 18);
      } catch (error) {
        console.warn("โหลด logo ไม่สำเร็จ", error);
      }

      // ====================
      // ADD MAP IMAGE
      // ====================

      pdf.addImage(imageData, "PNG", 8, 30, 281, 165);

      // ====================
      // ADD EXPORT DATE
      // ====================

      pdf.setFontSize(9);

      pdf.text(
        "วันที่ Export: " + new Date().toLocaleDateString("th-TH"),
        285,
        202,
        {
          align: "right",
        },
      );

      // ====================
      // SAVE PDF
      // ====================

      pdf.save(fileName + ".pdf");
    } catch (error) {
      hideElements.forEach(function (element) {
        element.style.display = "";
      });

      console.error("EXPORT PDF ERROR:", error);

      showAppPopup("Export PDF ไม่สำเร็จ");
    }
  });
}

updateAttributeTable();
// ====================
// CUSTOM LAYER PANEL
// ====================

function setupCustomLayerPanel() {
  const panel = document.getElementById("layerPanel");

  if (!panel) {
    console.warn("ไม่พบ layerPanel");
    return;
  }

  panel.addEventListener("change", function (event) {
    const input = event.target;

    if (!input.dataset.layerName) {
      return;
    }

    const layerName = input.dataset.layerName;

    if (input.type === "radio") {
      const baseMaps = window.SRTA_BASEMAPS;

      Object.values(baseMaps).forEach(function (baseLayer) {
        map.removeLayer(baseLayer);
      });

      map.addLayer(baseMaps[layerName]);

      console.log("เปลี่ยนแผนที่พื้นฐาน:", layerName);
      return;
    }

    if (input.type === "checkbox") {
      let targetLayer = null;

      if (layerName === "เครื่องมือวัด / พื้นที่ที่วาด") {
        targetLayer = window.drawnItems;
      } else {
        targetLayer = window.SRTA_LAYER_STORE[layerName];
        if (!window.SRTA_LAYER_STORE) {
          window.SRTA_LAYER_STORE = {};
        }

        window.SRTA_LAYER_STORE["Department of Land WMS"] = dolWmsLayer;
      }

      if (!targetLayer) {
        console.warn("ไม่พบ layer:", layerName);
        return;
      }

      if (input.checked) {
        map.addLayer(targetLayer);
      } else {
        map.removeLayer(targetLayer);
      }

      console.log("toggle layer:", layerName, input.checked);
    }
  });
}

setTimeout(setupCustomLayerPanel, 3000);
console.log("WEB GIS READY");

// ====================
// LOGOUT
// ====================

const logoutBtnGIS = document.getElementById("logout-button");

if (logoutBtnGIS) {
  logoutBtnGIS.addEventListener("click", async function () {
    await supabase.auth.signOut();

    window.location.href = "./login.html";
  });
}

const backBtn = document.getElementById("back-project-btn");

if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "./project-survey.html";
  });
}
