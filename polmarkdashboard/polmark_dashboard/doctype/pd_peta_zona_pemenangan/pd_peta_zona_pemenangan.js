// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

// Global variable
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
  lastSubDistrictName,
  defaultMapLevel = 0;

let countryDefaultView = [],
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
let mapDefaultGeojson = "Indonesia";

const indonesiaDefaultView = [-2.5489, 118.0149];
const CONST_WORLD_LEVEL = 0,
  CONST_COUNTRY_LEVEL = 1,
  CONST_PROVINCE_LEVEL = 2,
  CONST_CITY_LEVEL = 3,
  CONST_DISTRICT_LEVEL = 4,
  CONST_SUBDISTRICT_LEVEL = 5;

// Define available maps
const maps = [
  { name: 'DKI Jakarta', code: '31', area: 'DKI Jakarta', level: CONST_PROVINCE_LEVEL, prev: '', include_dpthp: false, include_relawan: false, include_spanduk: false },
  { name: 'Jawa Barat', include_dpthp: true, code: '32', area: 'Jawa Barat', level: CONST_PROVINCE_LEVEL, prev: '', include_relawan: false, include_spanduk: false },
  { name: 'Kalimantan Tengah', code: '62', area: 'Kalimantan Tengah', level: CONST_PROVINCE_LEVEL, prev: '', include_dpthp: false, include_relawan: false, include_spanduk: false },
  { name: 'Sumatera Utara', code: '12', area: 'Sumatera Utara', level: CONST_PROVINCE_LEVEL, prev: '', include_dpthp: false, include_relawan: false, include_spanduk: false },
  { name: 'Kabupaten Bekasi', code: '3216', area: 'Kabupaten Bekasi', level: CONST_CITY_LEVEL, prev: '', include_dpthp: false, include_relawan: false, include_spanduk: false },
  { name: 'Kota Bekasi', code: '3275', area: 'Kota Bekasi', level: CONST_CITY_LEVEL, prev: '', include_dpthp: false, include_relawan: false, include_spanduk: false },
  { name: 'Kota Bogor', code: '3271', area: 'Kota Bogor', level: CONST_CITY_LEVEL, prev: '', include_dpthp: true, include_relawan: false, include_spanduk: false },
  { name: 'Kota Bandung', code: '3273', area: 'Kota Bandung', level: CONST_CITY_LEVEL, prev: '', include_dpthp: true, include_relawan: true, include_relawan_partisipasi: true, include_spanduk: true },
  { name: 'Kota Balikpapan', code: '6471', area: 'Kota Balikpapan', level: CONST_CITY_LEVEL, prev: 'Kalimantan Timur', include_dpthp: false, include_relawan: false, include_spanduk: false },
  { name: 'Kota Medan', code: '1271', area: 'Kota Medan', level: CONST_CITY_LEVEL, prev: '', include_dpthp: true, include_relawan: true, include_relawan_partisipasi: false, include_spanduk: false }
];

let infoBoxTooltipId = "info-box-nasional";
let mapInstance,
  tileLayer;

frappe.ui.form.on("PD Peta Zona Pemenangan", {
  onload: function (frm) {
    //
  },
  refresh(frm) {
    frappe.require('/assets/polmarkdashboard/css/overrides.css');
    $('.page-head').hide();

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
    const mapContainerId = "leaflet-map";

    // Render the HTML for the map container inside the HTML wrapper field
    frm.fields_dict.map_html.$wrapper.html(`
      <div id="custom-map-container">
        <div id="${mapContainerId}" style="width:100%; height: 92vh; position: relative;">
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
      }).setView(indonesiaDefaultView, 5);

      // Add tile layer to the map
      tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Map data &copy; Thinkspedia",
      }).addTo(mapInstance);

      mapInstance.invalidateSize(); // Ensures the map resizes to the correct dimensions
      window.map = mapInstance;

      // document.getElementById('leaflet-map').style.height = window.innerHeight + 'px';

      defaultMapLevel = CONST_COUNTRY_LEVEL;

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

      mapTitleName = mapDefaultGeojson;

      addBackButtonControl();
      addFullScreenControl();
      addMapTitleLabel(mapTitleName);
      addLegend();
      addShowHideLayer();
      addShowTableZonasiLayerControl();
      addMapSelectionContainer();

      mapInstance.on('zoomend', function () {
        showHideBackButtonControl(currentMapLevel);
      });

      tileLayer.on('load', function () {
        checkIfMapReady();
      });

      // Initially load the province map
      loadNationalMap();
    }

    function checkIfMapReady() {
      if (tileLayer.isLoading()) {
        return; // Still loading
      }

      window.map.invalidateSize();

      // Map is fully rendered and ready
      let isShow = parseInt(currentMapLevel) > CONST_COUNTRY_LEVEL;
      $("#info-legend").css('display', (isShow) ? 'block' : 'none');
    }

    function addMapSelectionContainer() {
      // Custom Control for Map List Button
      const mapListMapControl = L.control({ position: "topleft" });
      mapListMapControl.onAdd = () => {
        const container = L.DomUtil.create('div', 'map-list-button leaflet-control info-button-container');
        container.style.position = 'relative';
        container.style.marginTop = "3px";

        // Create the button
        const button = L.DomUtil.create(
          "button",
          "custom-button",
          container);
        button.innerHTML = '<i class="octicon octicon-globe"></i>';
        button.setAttribute('title', 'Pilih Peta Zona');
        button.style.width = '100%'; // Full width
        button.style.border = "none";
        button.style.backgroundColor = "transparent";

        // Create a div for the map list
        const mapList = L.DomUtil.create('div', 'map-list', container);
        mapList.style.display = 'none'; // Hide map list by default

        // Create map items
        maps.forEach(mapItem => {
          const item = L.DomUtil.create('div', 'map-item', mapList);
          item.innerHTML = mapItem.name;
          item.style.cursor = 'pointer';

          // Attach event listener to load map on click
          item.addEventListener('click', () => {

            // set the navigation source coming from MapList, otherwise from Geojson
            navigateSource = "MapList";
            mapDefaultGeojson = mapItem.name;

            if (mapItem.level === CONST_PROVINCE_LEVEL) {
              loadProvinceMap(mapItem.code, mapItem.area);
            } else if (mapItem.level === CONST_CITY_LEVEL) {
              loadCityMap(mapItem.code, mapItem.area);
            }
            mapList.style.display = "none";
          });
        });

        // Add click event to toggle the map list
        button.addEventListener('click', () => {
          mapList.style.display = mapList.style.display === 'none' ? 'block' : 'none';
        });

        return container;
      };

      mapListMapControl.addTo(mapInstance);
    }

    function addShowTableZonasiLayerControl() {
      // Create a right-top container dynamically
      var infoContainer = L.DomUtil.create('div', 'info-container zonasi');
      infoContainer.id = 'info-container-zonasi';

      // Append the container to the body (or map container)
      mapInstance.getContainer().appendChild(infoContainer);

      // By default, hide the info container
      infoContainer.style.display = 'none';

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
          toggleShowTableContainer('info-container-zonasi');
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
        console.log("Existing back button removed");
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
        const container = L.DomUtil.create('div', 'map-list-button leaflet-control info-button-container');
        container.style.position = 'relative';
        container.style.marginTop = "3px";

        const defaultTitle = "Tampilkan Nama Wilayah";

        // create the button
        const button = L.DomUtil.create(
          "button",
          "custom-button",
          container
        );
        // Add some style and text to the control button
        button.innerHTML = `<i class="octicon octicon-location"></i>`;
        button.setAttribute('title', defaultTitle);
        button.style.width = '100%';
        button.style.border = "none";
        button.style.backgroundColor = "transparent";

        // Add the event handler for the button click
        button.onclick = function () {
          if (areLabelsVisible) {
            button.setAttribute('title', defaultTitle);
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
            title = "Sembunyikan Nama Wilayah"
            button.setAttribute('title', title);
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

        // Prevent map interaction when clicking on the control
        L.DomEvent.disableClickPropagation(button);

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
      }

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
      let activeGeojson = "Indonesia"; // default geojson

      // Add new GeoJSON layer for the current level
      const layerGroup = L.geoJSON(geoJsondata, {
        style: applyStyle,
        onEachFeature: function (feature, layer) {
          parentRegionType = feature.properties.parent_type;
          parentRegionName = feature.properties.parent_name;
          parentRegionCode = feature.properties.parent_code;

          if (currentMapLevel === 1) {
            geojson = "Indonesia";
          } else {
            if (navigateSource == "MapList") {
              geojson = mapDefaultGeojson;
            } else {
              geojson = feature.properties.province_name;

              if (currentMapLevel >= CONST_CITY_LEVEL) {
                // check for KOTA BALIKPAPAN
                const foundMap = maps.find(map => map.code === feature.properties.city_code);
                if (foundMap && foundMap.name === "Kota Balikpapan") {
                  geojson = foundMap.name;
                }
              }
            }
          }

          lastGeojson = geojson;

          const marker = getMapLabelMarker(feature);
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

              // showHideDataBoxTooltip(true);
              if (currentMapLevel === CONST_COUNTRY_LEVEL) {
                // reset navigateSource back to geojson
                navigateSource = "Geojson";
                lastGeojson = "Indonesia";
                activeGeojson = "Indonesia";

                loadNationalMap();
              } else if (currentMapLevel === CONST_PROVINCE_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;

                activeGeojson = lastProvinceName;
                lastGeojson = activeGeojson;

                if (navigateSource == "MapList") {
                  geojson = mapDefaultGeojson;
                }
                loadProvinceMap(feature.properties.region_code, activeGeojson);
              } else if (currentMapLevel === CONST_CITY_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;
                lastCityCode = feature.properties.city_code;
                lastCityName = feature.properties.city_name;

                const foundMap = maps.find(map => map.code === feature.properties.region_code);
                let geojson = foundMap ? foundMap.area : lastProvinceName;

                if (foundMap && foundMap.name === "Kota Balikpapan") {
                  geojson = foundMap.name;
                }

                activeGeojson = geojson;
                lastGeojson = activeGeojson;

                if (navigateSource == "MapList") {
                  geojson = mapDefaultGeojson;
                }

                loadCityMap(feature.properties.region_code, activeGeojson);
              } else if (currentMapLevel === CONST_DISTRICT_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;
                lastCityCode = feature.properties.city_code;
                lastCityName = feature.properties.city_name;
                lastDistrictCode = feature.properties.district_code;
                lastDistrictName = feature.properties.district_name;

                if (navigateSource == "MapList") {
                  geojson = mapDefaultGeojson;
                }

                activeGeojson = geojson;
                lastGeojson = activeGeojson;

                loadDistrictMap(feature.properties.region_code, activeGeojson);
              } else if (currentMapLevel === CONST_SUBDISTRICT_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;
                lastCityCode = feature.properties.city_code;
                lastCityName = feature.properties.city_name;
                lastDistrictCode = feature.properties.district_code;
                lastDistrictName = feature.properties.district_name;
                lastSubDistrictCode = feature.properties.sub_district_code;
                lastSubDistrictName = feature.properties.sub_district_name;

                // since nothing happened in sub_district
                currentMapLevel = CONST_DISTRICT_LEVEL;
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
        mapInstance.setView(indonesiaDefaultView, 5);
      }

      // NOTE: remark the statement below because we need to set hide for default
      // markersGroup.addTo(mapInstance);

      fetchTableData(currentMapLevel, parentRegionCode, lastGeojson);
      setLocationLabel(`${parentRegionName}`);
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
            renderTable(geojsonName, level, data);
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
        url = `polmarkdashboard.api.geojson.get_geojson_data?region=${regionName}&region_level=${mapRenderLevel}`;
      }

      showHideLoadingIndicator(true);

      fetchGeoJsonData(url)
        .then((geoJson) => {
          if (!geoJson || geoJson.features.length === 0) {
            console.log('URL: ', url);
            console.error(`No valid data found`);
            mapInstance.setView(indonesiaDefaultView, 5);
            return;
          }

          // Fetch and render GeoJSON data
          renderMap(currentMapLevel, geoJson);
        })
        .catch((error) => {
          console.error(`Error fetching:`, error);
          mapInstance.setView(indonesiaDefaultView, 5);
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

    function goBack() {
      if (mapLevelStack.length > 1) {
        mapLevelStack.pop(); // Remove the current level
        const previousLevel = mapLevelStack[mapLevelStack.length - 1]; // Get the previous level

        // Set the flag to indicate that we are navigating back
        isNavigatingBack = true;

        // Load the appropriate map based on the previous level
        if (previousLevel === CONST_COUNTRY_LEVEL) {
          // reset navigateSource back to Geojson
          navigateSource = "Geojson";
          lastGeojson = "Indonesia";
          activeGeojson = "";
          loadNationalMap();
        } else if (previousLevel === CONST_PROVINCE_LEVEL) {
          loadProvinceMap(lastProvinceCode, lastProvinceName); // Load province level
          // loadProvinceMap(lastProvinceCode, lastGeojson);
        } else if (previousLevel === CONST_CITY_LEVEL) {
          // loadCityMap(lastCityCode, lastCityName); // Load city level for the last province
          loadCityMap(lastCityCode, lastGeojson);
        } else if (previousLevel === CONST_DISTRICT_LEVEL) {
          // loadDistrictMap(lastDistrictCode, lastDistrictName); // Load district level for the last city
          loadDistrictMap(lastDistrictCode, lastGeojson);
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
      let isShow = parseInt(level) > defaultMapLevel;
      document.querySelector(".back-button").style.display = isShow ? "block" : "none";
    }

    function toggleShowTableContainer(elementId) {
      var infoContainer = document.getElementById(elementId);  // Get the container by ID
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

    function getMultiPolygonCentroid(multiCoordinates) {
      let totalLat = 0,
        totalLng = 0,
        totalPoints = 0;
      multiCoordinates.forEach((polygon) => {
        polygon[0].forEach(([lng, lat]) => {
          totalLng += lng;
          totalLat += lat;
          totalPoints++;
        });
      });
      return totalPoints ? [totalLat / totalPoints, totalLng / totalPoints] : null;
    }

    function getMapLabelMarker(feature) {
      const centroid =
        feature.geometry.type === "MultiPolygon"
          ? getMultiPolygonCentroid(feature.geometry.coordinates)
          : getCentroid(feature.geometry.coordinates);

      // NOTES: if you have access to layer, then you can use below code as well
      // const centroid = layer.getBounds().getCenter();

      if (centroid) {
        const markerLabel = L.divIcon({
          className: "map-area-label",
          html: `<div class="peta-label-content"><span class="peta-label-text glow">${feature.properties.name}</span></div>`,
        });

        return L.marker(centroid, { icon: markerLabel });
        // return L.circleMarker(centroid, {
        //   radius: 5, // Size of the dot
        //   fillColor: "#ff7800",
        //   color: "#000",
        //   weight: 1,
        //   opacity: 1,
        //   fillOpacity: 0.8
        // });
      } else {
        console.error("Invalid centroid for feature:", feature.properties.name);
      }

      return;
    }

    function generateZonasiTable(geojsonName, level, data) {
      const mapReferenceItem = maps.find(map => map.name === geojsonName);
      const isShowDPTHP = (mapReferenceItem) ? mapReferenceItem.include_dpthp : false;

      let tableHead = `
      <thead>
      <tr>`;

      let tableHeadGeneric = `
        <th>TPS</th>
        <th>PEND</th>
        <th>KK</th>
        <th>DPT</th>
        <th>CDE</th>
        <th>PEMILIH /KK</th>
        <th>PEMILIH PEREMPUAN</th>
        <th>PEMILIH MUDA</th>
      `;

      if (parseInt(level) == CONST_COUNTRY_LEVEL) {
        tableHead += `<th>PROV</th>`;
      }

      if (parseInt(level) >= CONST_PROVINCE_LEVEL) {
        tableHead += `<th>KOTA</th>`;
      }

      if (parseInt(level) >= CONST_CITY_LEVEL) {
        tableHead += `<th>KEC</th>`;
      }

      if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
        tableHead += `<th>DESA</th>`;
      }

      tableHead += tableHeadGeneric;

      // if above COUNTRY_LEVEL then show ZONASI
      if (parseInt(level) > CONST_COUNTRY_LEVEL) {
        tableHead += `<th>ZONASI</th>`;
      }

      if (isShowDPTHP) {
        tableHead += `
        <th>DPTHP</th>
        <th>DPTHP /KK</th>
        <th>DPTHP PEREMPUAN</th>
        `;
      }

      tableHead += `
      </tr></thead>`;

      let tbody = ``;

      // Populate the table with data
      data.forEach((item) => {
        tbody += "<tr>";

        if (parseInt(level) == CONST_COUNTRY_LEVEL) {
          tbody += `<td>${item.province_name}</td>`;
        }

        if (parseInt(level) >= CONST_PROVINCE_LEVEL) {
          tbody += `<td>${item.city_name}</td>`;
        }

        if (parseInt(level) >= CONST_CITY_LEVEL) {
          tbody += `<td>${item.district_name}</td>`;
        }

        if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
          tbody += `<td>${item.sub_district_name}</td>`;
        }

        tbody += `
          <td style="text-align: right">${numberFormat(item.num_tps)}</td>
          <td style="text-align: right">${numberFormat(item.num_citizen)}</td>
          <td style="text-align: right">${numberFormat(item.num_family)}</td>
          <td style="text-align: right">${numberFormat(item.num_voter)}</td>
          <td style="text-align: right">${numberFormat(item.num_cde)}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_per_family)}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_women)}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_young)}</td>
        `;

        // if above COUNTRY_LEVEL then show ZONASI
        if (parseInt(level) > CONST_COUNTRY_LEVEL) {
          tbody += `<td style="text-align: center">${item.zone}</td>`;
        }

        if (isShowDPTHP) {
          tbody += `
            <td style="text-align: right">${numberFormat(item.num_voter_dpthp2)}</td>
            <td style="text-align: right">${numberFormat(item.num_voter_per_family_dpthp2)}</td>
            <td style="text-align: right">${numberFormat(item.num_voter_women_dpthp2)}</td>
          `;
        }

        tbody += `</tr>`;
      });

      let table = `
      <table class="table-sticky">
        ${tableHead}
        <tbody>${tbody}</tbody>
      </table>`;

      return `<div class="tabZonasi">${table}</div>`;
    }

    function generateRelawanTable(geojsonName, level, data) {
      const mapReferenceItem = maps.find(map => map.name === geojsonName);
      const isShowRelawan = (mapReferenceItem) ? mapReferenceItem.include_relawan : false;
      const isShowRelawanPartisipasi = (mapReferenceItem) ? mapReferenceItem.include_relawan_partisipasi : false;

      let tableHead = `
      <thead>
      <tr>`;

      if (parseInt(level) >= CONST_PROVINCE_LEVEL) {
        tableHead += `<th>KOTA</th>`;
      }

      if (parseInt(level) >= CONST_CITY_LEVEL) {
        tableHead += `<th>KEC</th>`;
      }

      if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
        tableHead += `<th>DESA</th>`;
      }

      tableHead += `
      <th>ZONASI</th>
      <th>DPTHP PEREMPUAN</th>
      <th>RELAWAN</th>
      <th>TARGET SUARA</th>
      `;

      if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
        tableHead += `
          <th>TARGET KK TERKUNJUNGI</th>
          <th>PEMILIH TERKUNJUNGI</th>
          <th>% TARGET SUARA</th>`;

        if (isShowRelawanPartisipasi) {
          tableHead += `<th>PARTISIPASI = 80%</th>`;
        }
      }

      tableHead += `
      </tr></thead>`;

      let tbody = ``;

      // Populate the table with data
      data.forEach((item) => {
        tbody += "<tr>";

        if (parseInt(level) >= CONST_PROVINCE_LEVEL) {
          tbody += `<td>${item.city_name}</td>`;
        }

        if (parseInt(level) >= CONST_CITY_LEVEL) {
          tbody += `<td>${item.district_name}</td>`;
        }

        if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
          tbody += `<td>${item.sub_district_name}</td>`;
        }

        tbody += `
          <td style="text-align: center">${item.zone}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_women_dpthp2)}</td>
          <td style="text-align: right">${numberFormat(item.volunteer)}</td>
          <td style="text-align: right">${numberFormat(item.target_voter)}</td>`;

        if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
          tbody += `
              <td style="text-align: right">${numberFormat(item.target_visited_kk)}</td>
              <td style="text-align: right">${numberFormat(item.visited_voter)}</td>
              <td style="text-align: right">${numberFormat(item.percentage_target_voter)}</td>`;

          if (isShowRelawanPartisipasi) {
            tbody += `<td style="text-align: right">${numberFormat(item.partisipasi_80)}</td>`;
          }
        }

        tbody += `</tr>`;
      });

      let table = `
      <table class="table-sticky">
        ${tableHead}
        <tbody>${tbody}</tbody>
      </table>`;

      return `<div class="tabRelawan">${table}</div>`;
    }

    function generateSpandukTable(geojsonName, level, data) {
      let tableHead = `
      <thead>
      <tr>`;

      if (parseInt(level) >= CONST_PROVINCE_LEVEL) {
        tableHead += `<th>KOTA</th>`;
      }

      if (parseInt(level) >= CONST_CITY_LEVEL) {
        tableHead += `<th>KEC</th>`;
      }

      if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
        tableHead += `<th>DESA</th>`;
      }

      tableHead += `
      <th>ZONASI</th>
      <th>DPTHP2</th>
      <th>TARGET SUARA</th>
      <th>JUMLAH SPANDUK</th>
      <th>JUMLAH BALIHO</th>
      `;

      tableHead += `
      </tr></thead>`;

      let tbody = ``;

      // Populate the table with data
      data.forEach((item) => {
        tbody += "<tr>";

        if (parseInt(level) >= CONST_PROVINCE_LEVEL) {
          tbody += `<td>${item.city_name}</td>`;
        }

        if (parseInt(level) >= CONST_CITY_LEVEL) {
          tbody += `<td>${item.district_name}</td>`;
        }

        if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
          tbody += `<td>${item.sub_district_name}</td>`;
        }

        tbody += `
          <td>${item.zone}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_dpthp2)}</td>
          <td style="text-align: right">${numberFormat(item.target_voter)}</td>
          <td style="text-align: right">${numberFormat(item.total_spanduk)}</td>
          <td style="text-align: right">${numberFormat(item.total_baliho)}</td>
        </tr>`;
      });

      let table = `
      <table class="table-sticky">
        ${tableHead}
        <tbody>${tbody}</tbody>
      </table>`;

      return `<div class="tabSpanduk">${table}</div>`;
    }

    function renderTable(geojsonName, level, data) {
      let tableZonasi = generateZonasiTable(geojsonName, level, data);
      let tableRelawan = generateRelawanTable(geojsonName, level, data);
      let tableSpanduk = generateSpandukTable(geojsonName, level, data);

      const mapReferenceItem = maps.find(map => map.name === geojsonName);
      const isShowRelawan = (mapReferenceItem) ? mapReferenceItem.include_relawan : false;
      const isShowSpanduk = (mapReferenceItem) ? mapReferenceItem.include_spanduk : false;

      let container = '<div class="tab-container-wrapper">';
      container +=
        `<div style="padding-bottom: 11px">
          <button id="close-info-container" class="close-button">
            <i class="fa-solid fa-circle-xmark"></i>
            &nbsp;<span>Close</span>
          </button>
        </div>
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item">
            <a class="nav-link active" id="zone-tab" data-toggle="tab" data-tab="zone" role="tab">ZONASI</a>
          </li>
          <li class="nav-item" style="display: ${(isShowRelawan) ? 'block' : 'none'}">
            <a class="nav-link" id="relawan-tab" data-toggle="tab" data-tab="relawan" role="tab">RELAWAN</a>
          </li>
          <li class="nav-item" style="display: ${(isShowSpanduk) ? 'block' : 'none'}">
            <a class="nav-link" id="spanduk-tab" data-toggle="tab" data-tab="spanduk" role="tab">SPANDUK</a>
          </li>
        </ul>
        <div class="tab-content">
          <div class="tab-pane fade show active" id="zone" role="tabpanel" aria-labelledby="zone-tab">
            ${tableZonasi}
          </div>
          <div class="tab-pane fade" id="relawan" role="tabpanel" aria-labelledby="relawan-tab">
            ${tableRelawan}
          </div>
          <div class="tab-pane fade" id="spanduk" role="tabpanel" aria-labelledby="spanduk-tab">
            ${tableSpanduk}
          </div>
        </div>
      </div>`;

      var infoContainer = document.getElementById('info-container-zonasi');

      if (infoContainer) {
        infoContainer.innerHTML = '';
        infoContainer.innerHTML = container;
      }

      // Handle tab switching
      document.querySelectorAll('.nav-link').forEach(tabLink => {
        tabLink.addEventListener('click', function (e) {
          e.preventDefault(); // Prevent any default behavior

          // Remove active class from all tabs
          document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

          // Hide all tab content
          document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));

          // Add active class to the clicked tab and show corresponding content
          const targetTab = this.getAttribute('data-tab');
          document.getElementById(targetTab).classList.add('show', 'active');
          this.classList.add('active');
        });
      });

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
