// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

// Global variable
const CONST_INDONESIA_DEFAULT_VIEW = [-2.5489, 118.0149];
const CONST_WORLD_LEVEL = 0,
  CONST_COUNTRY_LEVEL = 1,
  CONST_PROVINCE_LEVEL = 2,
  CONST_CITY_LEVEL = 3,
  CONST_DISTRICT_LEVEL = 4,
  CONST_SUBDISTRICT_LEVEL = 5;
const CONST_DEFAULT_REGION_CODE = "6471",
  CONST_DEFAULT_REGION_GEOJSON = "Kota Balikpapan",
  CONST_DEFAULT_REGION_MAP_LEVEL = CONST_CITY_LEVEL;

let infoBoxTooltipId = "info-box-kota-balikpapan";
let mapInstance,
  tileLayer;

let nationalMarkersGroup = null,
  provinceMarkersGroup = null,
  cityMarkersGroup = null,
  districtMarkersGroup = null,
  subDistrictMarkersGroup = null;

let currentMapLevel = 0,
  currentRegionName,
  currentRegionType,
  currentRegionCode;

let parentMapLevel = 0,
  parentRegionName,
  parentRegionType,
  parentRegionCode;

let lastMapLevel = 0,
  lastMapTitleName,
  lastGeojson,
  lastProvinceCode,
  lastProvinceName,
  lastCityCode,
  lastCityName,
  lastDistrictCode,
  lastDistrictName,
  lastSubDistrictCode,
  lastSubDistrictName;

let
  countryDefaultView = [],
  provinceDefaultView = [],
  cityDefaultView = [],
  districtDefaultView = [],
  subDistrictDefaultView = [];

let locationLabel;
let areLabelsVisible = false;

let isNavigatingBack = false;
let mapLevelStack = [];
let mapRenderLevel = 0;
let mapTitleName = "";

let navigateSource = "Geojson";

frappe.ui.form.on("PD Peta Zona Pemenangan Kota Balikpapan", {
  onload: function (frm) {
    // 
  },
  refresh(frm) {
    if (frm.doc.region) {
      frappe.require('/assets/polmarkdashboard/css/overrides.css');
      $('.page-head').hide();
      frm.set_df_property("map_html", "hidden", frm.is_new() ? 1 : 0);
      frm.set_df_property('region', 'hidden', (frm.doc.region) ? 1 : 0); // Hide the field
      frm.set_df_property('region_type', 'hidden', (frm.doc.region) ? 1 : 0);
      frm.set_df_property('standard', 'hidden', (frm.doc.standard) ? 1 : 0);
    }
    
    setTimeout(function () {
      // Check if the map is already initialized
      if (!window.map) {
        $('.container').css('width', '100%');
        frm.events.render_map(frm);
      }
    }, 100);  // Delay to ensure DOM is loaded
  },
  render_map: function (frm) {
    // Set a unique container ID for the map (important if dealing with multiple forms)
    const mapContainerId = "map_" + frm.doc.name;

    // Render the HTML for the map container inside the HTML wrapper field
    frm.fields_dict.map_html.$wrapper.html(`
      <div id="custom-map-container">
        <div id="${mapContainerId}" style="height: 90vh; position: relative;">
          <div id="loading-indicator" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none;">
              <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading...</span>
              </div>
              <p>Loading map data...</p>
          </div>
        </div>
        <div id="${infoBoxTooltipId}" class="info-box"></div>
      </div>
    `);

    // Initialize the map after rendering the HTML
    initializeMap(mapContainerId, frm);

    // ALL FUNCTIONS
    function initializeMap(mapContainerId, frmInstance) {
      // Clear the map instance if it exists
      let mapContainer = L.DomUtil.get(mapContainerId);
      if (mapContainer._leaflet_id) {
        mapContainer._leaflet_id = null; // Reset the map container
      }

      // Initialize the Leaflet map
      mapInstance = L.map(mapContainerId, {
        zoomControl: false
      }).setView(CONST_INDONESIA_DEFAULT_VIEW, 5);

      // Add tile layer to the map
      tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Map data &copy; Thinkspedia",
      }).addTo(mapInstance);

      mapInstance.invalidateSize(); // Ensures the map resizes to the correct dimensions
      window.map = mapInstance;

      const { region, region_level, region_type, region_name } = frmInstance.doc;
      const tooltipBoxId = "#" + infoBoxTooltipId;

      mapTitleName = `${region_name}`;

      initializeMarkersGroup();
      addBackButtonControl();
      addFullScreenControl();
      addMapTitleLabel(mapTitleName);
      addLegend();
      addShowHideLayer();
      addTableZonasiContainer();
      addShowTableZonasiLayerControl();

      mapInstance.on('zoomend', function () {
        showHideBackButtonControl(currentMapLevel);
      });

      tileLayer.on('load', function () {
        checkIfMapReady();
      });

      // Initially load the province map
      loadCityMap(CONST_DEFAULT_REGION_CODE, CONST_DEFAULT_REGION_GEOJSON);
    }

    /* Functions */
    function initializeMarkersGroup() {
      nationalMarkersGroup = L.layerGroup();
      provinceMarkersGroup = L.layerGroup();
      cityMarkersGroup = L.layerGroup();
      districtMarkersGroup = L.layerGroup();
      subDistrictMarkersGroup = L.layerGroup();

      nationalMarkersGroup.name = "National";
      provinceMarkersGroup.name = "Province";
      cityMarkersGroup.name = "City";
      districtMarkersGroup.name = "District";
      subDistrictMarkersGroup.name = "SubDistrict";
    }

    function checkIfMapReady() {
      if (tileLayer.isLoading()) {
        return; // Still loading
      }

      window.map.invalidateSize();
      // Map is fully rendered and ready
    }

    function addTableZonasiContainer() {
      // Create a right-top container dynamically
      var infoContainer = L.DomUtil.create('div', 'info-container');
      infoContainer.id = 'info-container';

      // Append the container to the body (or map container)
      mapInstance.getContainer().appendChild(infoContainer);

      // By default, hide the info container
      infoContainer.style.display = 'none';
    }

    function addShowTableZonasiLayerControl() {
      const showTableLayerControl = L.control({ position: "topright" });
      showTableLayerControl.onAdd = () => {
        const customButton = L.DomUtil.create(
          "button",
          "leaflet-bar leaflet-control custom-button"
        );
        customButton.id = "toggle-table-info-button";
        customButton.innerHTML = `<i class="fas fa-user-group"></i> &nbsp;&nbsp;<span>Table Zonasi</span>`;
        customButton.style.fontSize = "16px";
        customButton.style.backgroundColor = "#063970";
        customButton.style.color = "#fff";

        // Add the event handler for the button click
        customButton.onclick = function () {
          toggleShowTableContainer();
        };

        return customButton;
      };
      showTableLayerControl.addTo(mapInstance);
    }

    function addBackButtonControl() {
      // First, check if an existing back button is present, and remove it
      let existingBackButton = document.querySelector(".back-button");
      if (existingBackButton) {
        existingBackButton.remove();
      }

      const backButton = L.Control.extend({
        options: {
          position: "topleft",
        },
        onAdd: function () {
          let button = L.DomUtil.create(
            "button",
            "leaflet-bar leaflet-control leaflet-control-custom back-button kab-bekasi"
          );

          button.style.backgroundColor = "#000";
          button.style.fontSize = "14px";
          button.style.color = "#fff";
          button.style.padding = "8px";
          button.style.cursor = "pointer";
          button.title = "Back to previous level";
          button.style.display = "none";

          button.innerHTML = "<strong>&larr; Back</strong>"; // Button content

          // Add click event to trigger goBack function
          button.onclick = function () {
            goBack();
          };

          return button;
        },
      });

      mapInstance.addControl(new backButton());
    }

    function addLegend() {
      const legendControl = L.control({ position: "bottomleft" });

      legendControl.onAdd = () => {
        const div = L.DomUtil.create("div", "info legend");
        div.id = 'info-legend';
        div.style.display = 'block';

        const zones = ["ZONA 1", "ZONA 2", "ZONA 3"];
        div.innerHTML = zones
          .map((zone) => `<i style="background:${getColor(zone)}"></i> ${zone}`)
          .join("<br>");
        return div;
      };
      legendControl.addTo(mapInstance);
    }

    function addShowHideLayer() {
      const showHideLabelControl = L.control({ position: "topleft" });
      showHideLabelControl.onAdd = () => {
        const container = L.DomUtil.create('div', 'map-list-button leaflet-control');
        container.style.position = 'relative';
        container.style.marginTop = "3px";

        // create the button
        const button = L.DomUtil.create(
          "button",
          "custom-button",
          container
        );
        // Add some style and text to the control button
        button.innerHTML = `<i class="fas fa-map-marker-alt"></i>`;
        button.style.width = '100%';
        button.style.border = "none";
        button.style.backgroundColor = "transparent";

        // Add the event handler for the button click
        button.onclick = function () {
          if (areLabelsVisible) {
            if (parseInt(currentMapLevel) === CONST_COUNTRY_LEVEL)
              mapInstance.removeLayer(nationalMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_PROVINCE_LEVEL)
              mapInstance.removeLayer(provinceMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_CITY_LEVEL)
              mapInstance.removeLayer(cityMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_DISTRICT_LEVEL)
              mapInstance.removeLayer(districtMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_SUBDISTRICT_LEVEL)
              mapInstance.removeLayer(subDistrictMarkersGroup);
          } else {
            if (parseInt(currentMapLevel) === CONST_COUNTRY_LEVEL)
              mapInstance.addLayer(nationalMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_PROVINCE_LEVEL)
              mapInstance.addLayer(provinceMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_CITY_LEVEL)
              mapInstance.addLayer(cityMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_DISTRICT_LEVEL)
              mapInstance.addLayer(districtMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_SUBDISTRICT_LEVEL)
              mapInstance.addLayer(subDistrictMarkersGroup);
          }
          // map.removeLayer(cityMarkersGroup);
          areLabelsVisible = !areLabelsVisible; // Toggle the state
        };

        return container;
      };
      showHideLabelControl.addTo(mapInstance);
    }

    function getColor(zone) {
      const colors = {
        "ZONA 1": "#A70000",
        "ZONA 2": "#ffff99",
        "ZONA 3": "#4d7f17",
      };

      return colors[zone];
    }

    function applyStyle(feature) {
      let getZoneColor;

      if (feature.properties.zonasi) {
        getZoneColor = getColor(feature.properties.zonasi);
      } else {
        getZoneColor = feature.properties.color;
      }

      return {
        weight: 2,
        opacity: 1,
        color: "#21130d",
        fillColor: getZoneColor,
        fillOpacity: 0.7,
        dashArray: '2, 6'
      };
    }

    function renderMap(level, geoJsondata) {
      // Clear the existing map layers (e.g., when navigating to a new level)
      mapInstance.eachLayer(function (layer) {
        if (layer instanceof L.GeoJSON || layer instanceof L.Marker) {
          mapInstance.removeLayer(layer);
        }
      });

      resetMarkerGroup();
      setDefaultView(level);
      showHideBackButtonControl(level);

      let markersGroup = getMarkersGroup(level);
      lastGeojson = CONST_DEFAULT_REGION_GEOJSON;

      // Add new GeoJSON layer for the current level
      const layerGroup = L.geoJSON(geoJsondata, {
        style: applyStyle,
        onEachFeature: function (feature, layer) {
          parentRegionType = feature.properties.parent_type;
          parentRegionName = feature.properties.parent_name;
          parentRegionCode = feature.properties.parent_code;

          const marker = L.marker(layer.getBounds().getCenter(), {
            icon: L.divIcon({
              className: `map-area-label`,
              html: `<div class="peta-label-content"><span class="peta-label-text glow">${feature.properties.name}</span></div>`,
            }),
          });

          markersGroup.addLayer(marker);

          layer.bindTooltip(`
            <b>${feature.properties.name}</b>
            <br><b>KK</b>: ${numberFormat(feature.properties.jml_kk)}
            <br><b>DPT</b>: ${numberFormat(feature.properties.jml_dpt)}
            `,
            {
              permanent: false,
              direction: 'top',
              className: 'custom-tooltip'
            }
          );

          layer.on({
            click: function () {
              currentMapLevel = parseInt(feature.properties.region_level);
              currentRegionCode = parseInt(feature.properties.region_code);
              currentRegionName = feature.properties.region_name;

              // showHideDataBoxTooltip(true);
              if (currentMapLevel === CONST_CITY_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;
                lastCityCode = feature.properties.city_code;
                lastCityName = feature.properties.city_name;

                loadCityMap(feature.properties.region_code, CONST_DEFAULT_REGION_GEOJSON);
              } else if (currentMapLevel === CONST_DISTRICT_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;
                lastCityCode = feature.properties.city_code;
                lastCityName = feature.properties.city_name;
                lastDistrictCode = feature.properties.district_code;
                lastDistrictName = feature.properties.district_name;

                loadDistrictMap(feature.properties.region_code, CONST_DEFAULT_REGION_GEOJSON);
              } else if (currentMapLevel === CONST_SUBDISTRICT_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;
                lastCityCode = feature.properties.city_code;
                lastCityName = feature.properties.city_name;
                lastDistrictCode = feature.properties.district_code;
                lastDistrictName = feature.properties.district_name;
                lastSubDistrictCode = feature.properties.sub_district_code;
                lastSubDistrictName = feature.properties.sub_district_name;
                
                loadSubDistrictMap(feature.properties.region_code, CONST_DEFAULT_REGION_GEOJSON);
              }
            },
          });

          layer.on("mouseover", function (e) {
            // showDataTooltip(feature.properties);

            e.target.setStyle({
              weight: 3,
              color: "#fff",
              // fillOpacity: 0.7,
            });
          });

          layer.on("mouseout", function (e) {
            // showHideDataBoxTooltip(false);

            e.target.setStyle({
              weight: 2,
              color: "#21130d",
              // fillOpacity: 0.5,
            });
          });
        },
      }).addTo(mapInstance);

      const bounds = layerGroup.getBounds();
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds);
      } else {
        console.error("Bounds are not valid");
        mapInstance.setView(CONST_INDONESIA_DEFAULT_VIEW, 5);
      }

      // NOTE: remark the statement below because we need to set hide for default
      // markersGroup.addTo(mapInstance);

      if (!currentRegionCode) currentRegionCode = parentRegionCode;
      if (!currentRegionName) currentRegionName = parentRegionName;

      if (!isNavigatingBack) {
        // Only push to stack when moving forward
        if (
          mapLevelStack.length === 0 ||
          mapLevelStack[mapLevelStack.length - 1] !== level
        ) {
          mapLevelStack.push(level);
        }
      } else {
        isNavigatingBack = false; // Reset the back navigation flag

        // reset regionCode
        currentRegionCode = parentRegionCode;
        currentRegionName = parentRegionName;
      }

      fetchTableData(currentMapLevel, currentRegionCode, lastGeojson);
      setLocationLabel(`${currentRegionName}`);
    }

    function fetchTableData(level, regionCode, geojsonName) {
      let url;

      geojsonName = toCamelCase(geojsonName);

      if (regionCode) {
        url = `polmarkdashboard.api.geojson.get_tabular_data?region=${geojsonName}&region_level=${mapRenderLevel}&region_code=${regionCode}`;
      } else {
        url = `polmarkdashboard.api.geojson.get_tabular_data?region=${geojsonName}&region_level=${mapRenderLevel}`;
      }

      frappe.call({
        method: url,
        args: {
          // any parameters you need to pass
        },
        callback: function (response) {
          if (response.message) {
            data = response.message;
            renderTable(level, data);
          }
        },
      });
    }

    function loadMap(regionCode, regionName, currentLevel, parentLevel, renderLevel) {
      currentMapLevel = parseInt(currentLevel);
      parentMapLevel = parentLevel;
      mapRenderLevel = renderLevel;
      lastMapLevel = currentMapLevel;

      regionName = toCamelCase(regionName);

      let url;

      if (regionCode) {
        url = `polmarkdashboard.api.geojson.get_geojson_data_by_region?region=${regionName}&region_level=${mapRenderLevel}&region_code=${regionCode}`;
      } else {
        url = `polmarkdashboard.api.geojson.get_geojson_data_by_region?region=${regionName}&region_level=${mapRenderLevel}`;
      }

      showHideLoadingIndicator(true);

      fetchGeoJsonData(url)
        .then((geoJson) => {
          if (!geoJson || geoJson.features.length === 0) {
            console.error(`No valid data found`);
            mapInstance.setView(CONST_INDONESIA_DEFAULT_VIEW, 5);
            return;
          }

          // Fetch and render GeoJSON data
          renderMap(currentMapLevel, geoJson);
        })
        .catch((error) => {
          console.error(`Error fetching:`, error);
          mapInstance.setView(CONST_INDONESIA_DEFAULT_VIEW, 5);
        });
    }

    function loadNationalMap() {
      loadMap(null, "Indonesia", CONST_COUNTRY_LEVEL, CONST_WORLD_LEVEL, CONST_PROVINCE_LEVEL);
    }

    function loadProvinceMap(regionCode, geojson) {
      loadMap(regionCode, geojson, CONST_PROVINCE_LEVEL, CONST_COUNTRY_LEVEL, CONST_CITY_LEVEL);
    }

    function loadCityMap(regionCode, geojson) {
      loadMap(regionCode, geojson, CONST_CITY_LEVEL, CONST_PROVINCE_LEVEL, CONST_DISTRICT_LEVEL);
    }

    function loadDistrictMap(regionCode, geojson) {
      loadMap(regionCode, geojson, CONST_DISTRICT_LEVEL, CONST_CITY_LEVEL, CONST_SUBDISTRICT_LEVEL);
    }

    function loadSubDistrictMap(regionCode, geojson) {
      loadMap(regionCode, geojson, CONST_SUBDISTRICT_LEVEL, CONST_DISTRICT_LEVEL, CONST_SUBDISTRICT_LEVEL);
    }

    function goBack() {
      if (mapLevelStack.length > 1) {
        mapLevelStack.pop(); // Remove the current level
        const previousLevel = mapLevelStack[mapLevelStack.length - 1]; // Get the previous level

        // Set the flag to indicate that we are navigating back
        isNavigatingBack = true;

        if (previousLevel === CONST_PROVINCE_LEVEL) {
          loadProvinceMap(lastProvinceCode, CONST_DEFAULT_REGION_GEOJSON);
        } else if (previousLevel === CONST_CITY_LEVEL) {
          loadCityMap(lastCityCode, CONST_DEFAULT_REGION_GEOJSON);
        } else if (previousLevel === CONST_DISTRICT_LEVEL) {
          loadDistrictMap(lastDistrictCode, CONST_DEFAULT_REGION_GEOJSON);
        } else if (previousLevel === CONST_SUBDISTRICT_LEVEL) {
          loadDistrictMap(lastSubDistrictCode, CONST_DEFAULT_REGION_GEOJSON);
        }
      }
    }

    function setDefaultView(level) {
      if (parseInt(level) === CONST_COUNTRY_LEVEL) {
        countryDefaultView = mapInstance.getCenter();
      } else if (parseInt(level) === CONST_PROVINCE_LEVEL) {
        provinceDefaultView = mapInstance.getCenter();
      } else if (parseInt(level) === CONST_CITY_LEVEL) {
        cityDefaultView = mapInstance.getCenter();
      } else if (parseInt(level) === CONST_DISTRICT_LEVEL) {
        districtDefaultView = mapInstance.getCenter();
      } else if (parseInt(level) === CONST_SUBDISTRICT_LEVEL) {
        subDistrictDefaultView = mapInstance.getCenter();
      }
    }

    function showHideLoadingIndicator(isShow = true) {
      $("#loading-indicator").css('display', (isShow) ? 'block' : 'none');
    }

    function showHideBackButtonControl(level) {
      let isShow = parseInt(level) > CONST_DEFAULT_REGION_MAP_LEVEL;
      document.querySelector(".back-button").style.display = isShow ? "block" : "none";
    }

    function toggleShowTableContainer() {
      var infoContainer = document.getElementById('info-container');  // Get the container by ID
      var button = document.getElementById('toggle-table-info-button');  // Get the button by ID

      if (infoContainer.style.display === 'none') {
        infoContainer.style.display = 'block';  // Show the container
        // button.innerHTML = 'Hide Table';  // Update button text
      } else {
        infoContainer.style.display = 'none';  // Hide the container
        // button.innerHTML = 'Show Table';  // Update button text
      }
    }

    function getMarkersGroup(level) {
      const markerGroups = {
        1: nationalMarkersGroup,
        2: provinceMarkersGroup,
        3: cityMarkersGroup,
        4: districtMarkersGroup,
        5: subDistrictMarkersGroup,
      };

      return markerGroups[parseInt(level)];
    }

    function getDefaultMapView(level) {
      const defaultViews = {
        2: indonesiaDefaultView,
        3: cityDefaultView,
        4: districtDefaultView,
        5: subDistrictDefaultView,
      };

      return defaultViews[parseInt(level)];
    }

    function addFullScreenControl() {
      mapInstance.addControl(new L.Control.Fullscreen());
      mapInstance.on('fullscreenchange', function () {
        if (mapInstance.isFullscreen()) {
          console.log('entered fullscreen');
        } else {
          console.log('exited fullscreen');
        }
      });
    }

    function addMapTitleLabel(name) {
      locationLabel = L.control({ position: "topcenter" });
      locationLabel.onAdd = function (mapInstance) {
        let div = L.DomUtil.create("div", "location-label-container");
        div.innerHTML = `<span class="map-title">${name}</span>`;
        return div;
      };
      locationLabel.addTo(mapInstance);
    }

    function setLocationLabel(name) {
      if (locationLabel && locationLabel.getContainer()) {
        locationLabel.getContainer().innerHTML = `<span class="map-title">${name}</span>`;
      }
    }

    function resetMarkerGroup() {
      provinceMarkersGroup.clearLayers();
      cityMarkersGroup.clearLayers();
      districtMarkersGroup.clearLayers();
      subDistrictMarkersGroup.clearLayers();
    }

    // Function to calculate the centroid for a Polygon (in case some features are Polygons)
    function getCentroid(coordinates) {
      let totalLat = 0,
        totalLng = 0,
        totalPoints = 0;
      coordinates[0].forEach(([lng, lat]) => {
        totalLng += lng;
        totalLat += lat;
        totalPoints++;
      });
      return totalPoints ? [totalLat / totalPoints, totalLng / totalPoints] : null;
    }

    function getMultiPolygonCentroid(coordinates) {
      let totalLat = 0,
        totalLng = 0,
        totalPoints = 0;
      coordinates.forEach((polygon) => {
        polygon[0].forEach(([lng, lat]) => {
          totalLng += lng;
          totalLat += lat;
          totalPoints++;
        });
      });
      return totalPoints ? [totalLat / totalPoints, totalLng / totalPoints] : null;
    }

    function showLabelMarker(map, feature) {
      const centroid =
        feature.geometry.type === "MultiPolygon"
          ? getMultiPolygonCentroid(feature.geometry.coordinates)
          : getCentroid(feature.geometry.coordinates);

      if (centroid) {
        const markerLabel = L.divIcon({
          className: "province-label",
          html: `<div class="peta-label-content"><span class="peta-label-text">${feature.properties.name}</span></div>`,
        });
        L.marker(centroid, { icon: markerLabel }).addTo(map);
      } else {
        console.error("Invalid centroid for feature:", feature.properties.name);
      }
    }

    function renderTable(level, data) {
      let table = '<div class="table-wrapper">';
      table +=
        `<div style="padding-bottom: 12px">
      <button id="close-info-container" class="close-button">
        <i class="fa-solid fa-circle-xmark"></i>
        &nbsp;<span>Close</span>
      </button>
    </div>
    <table>`;
      table += "<thead><tr>";

      if (parseInt(level) == CONST_COUNTRY_LEVEL) {
        table += `
      <th>PROV</th>
    `;
      } else if (parseInt(level) == CONST_PROVINCE_LEVEL) {
        table += `
      <th>PROV</th>
      <th>KABKOTA</th>
    `;
      } else if (parseInt(level) == CONST_CITY_LEVEL) {
        table += `
      <th>PROV</th>
      <th>KABKOTA</th>
      <th>KEC</th>
    `;
      } else if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
        table += `
      <th>PROV</th>
      <th>KABKOTA</th>
      <th>KEC</th>
      <th>DESA</th>
    `;
      }

      table += `
    <th style="text-align: right">TPS</th>
    <th style="text-align: right">PEND</th>
    <th style="text-align: right">KK</th>
    <th style="text-align: right">PEMILIH 2024</th>
    <th style="text-align: right">CDE</th>
    <th style="text-align: right">PEMILIH /KK</th>
    <th style="text-align: right">PEMILIH PEREMPUAN</th>
    <th style="text-align: right">PEMILIH MUDA</th>
    <th style="text-align: center">ZONASI</th>
  `;

      table += "</tr></thead><tbody>";

      // Populate the table with data
      data.forEach((item) => {
        table += "<tr>";

        let voterData = "";

        if (parseInt(level) == CONST_COUNTRY_LEVEL) {
          table += `
      <td>${item.province_name}</td>
    `;
        } else if (parseInt(level) == CONST_PROVINCE_LEVEL) {
          table += `
      <td>${item.province_name}</td>
      <td>${item.city_name}</td>
    `;
        } else if (parseInt(level) == CONST_CITY_LEVEL) {
          table += `
      <td>${item.province_name}</td>
      <td>${item.city_name}</td>
      <td>${item.district_name}</td>
    `;
        } else if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
          table += `
      <td>${item.province_name}</td>
      <td>${item.city_name}</td>
      <td>${item.district_name}</td>
      <td>${item.sub_district_name}</td>
    `;
        }

        table += `
    <td style="text-align: right">${numberFormat(item.num_tps)}</td>
    <td style="text-align: right">${numberFormat(item.num_citizen)}</td>
    <td style="text-align: right">${numberFormat(item.num_family)}</td>
    <td style="text-align: right">${numberFormat(item.num_voter)}</td>
    <td style="text-align: right">${numberFormat(item.num_cde)}</td>
    <td style="text-align: right">${numberFormat(item.num_voter_per_family)}</td>
    <td style="text-align: right">${numberFormat(item.num_voter_women)}</td>
    <td style="text-align: right">${numberFormat(item.num_voter_young)}</td>
    <td style="text-align: center">${item.zone}</td>
    </tr>
      `;
      });

      table += "</tbody></table></div>";

      var infoContainer = document.getElementById('info-container');

      if (infoContainer) {
        infoContainer.innerHTML = table;
      }

      // Get the close button element
      var closeButton = document.getElementById('close-info-container');

      // Add event listener to close the container when clicked
      closeButton.addEventListener('click', function () {
        // Hide the info-container by setting its display to 'none'
        infoContainer.style.display = 'none';
      });
    }

    function fetchGeoJsonData(endpoint, params = {}) {
      return new Promise((resolve, reject) => {
        frappe.call({
          method: endpoint,
          args: params,
          callback(r) {
            r.message ? resolve(r.message) : reject("No data found");
          },
          error: reject,
        });
      });
    }

    function numberFormat(number) {
      if (!isNaN(number)) {
        let [main, decimal] = number.toString().split(".");
        main = main.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return decimal ? `${main},${decimal}` : main;
      }
      return number;
    };

    function toCamelCase(str) {
      if (typeof str !== 'string') return str; // Return if not a string

      return str.split(' ').map(function (word) {
        // Only capitalize words that have 3 or more characters
        if (word.length < 4) {
          return word.toUpperCase(); // Keep it in uppercase
        }
        // Capitalize the first letter and make the rest lowercase
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
    };
  }
});
