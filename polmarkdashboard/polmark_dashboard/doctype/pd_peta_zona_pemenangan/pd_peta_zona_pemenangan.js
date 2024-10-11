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

const indonesiaDefaultView = [-2.5489, 118.0149];
const CONST_WORLD_LEVEL = 0,
      CONST_COUNTRY_LEVEL = 1,
      CONST_PROVINCE_LEVEL = 2,
      CONST_CITY_LEVEL = 3,
      CONST_DISTRICT_LEVEL = 4,
      CONST_SUBDISTRICT_LEVEL = 5;

// Define available maps
const maps = [
  { name: 'DKI Jakarta', code: '31', area: 'DKI Jakarta', level: CONST_PROVINCE_LEVEL, prev: '' },
  { name: 'Jawa Barat', code: '32', area: 'Jawa Barat', level: CONST_PROVINCE_LEVEL, prev: '' },
  { name: 'Kalimantan Tengah', code: '62', area: 'Kalimantan Tengah', level: CONST_PROVINCE_LEVEL, prev: '' },
  { name: 'Sumatera Utara', code: '12', area: 'Sumatera Utara', level: CONST_PROVINCE_LEVEL, prev: '' },
  { name: 'Kabupaten Bekasi', code: '3216', area: 'Kabupaten Bekasi', level: CONST_CITY_LEVEL, prev: '' },
  { name: 'Kota Bogor', code: '3271', area: 'Kota Bogor', level: CONST_CITY_LEVEL, prev: '' },
  { name: 'Kota Bandung', code: '3273', area: 'Kota Bandung', level: CONST_CITY_LEVEL, prev: '' },
  { name: 'Kota Balikpapan', code: '6471', area: 'Kota Balikpapan', level: CONST_CITY_LEVEL, prev: 'Kalimantan Timur' },
  { name: 'Kota Medan', code: '1271', area: 'Kota Medan', level: CONST_CITY_LEVEL, prev: '' }
];

let infoBoxTooltipId = "info-box-nasional";
let mapInstance,
    tileLayer;
    
frappe.ui.form.on("PD Peta Zona Pemenangan", {
  onload: function (frm) {
    // Adding custom CSS
    frappe.require('/assets/polmarkdashboard/css/overrides.css');
  },
  refresh(frm) {
    $('.page-head').hide();
    frm.set_df_property("map_html", "hidden", frm.is_new() ? 1 : 0);
    frm.set_df_property('standard', 'hidden', (frm.doc.standard) ? 1 : 0);
    frm.events.render_map(frm);
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
      }).setView(indonesiaDefaultView, 5);

      // Add tile layer to the map
      tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Map data &copy; Thinkspedia",
      }).addTo(mapInstance);

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

      mapTitleName = 'Indonesia';

      addBackButtonControl();
      addFullScreenControl();
      addMapTitleLabel(mapTitleName);
      addLegend();
      addShowHideLayer();
      addTableZonasiContainer();
      addShowTableZonasiLayerControl();
      addMapSelectionContainer();

      mapInstance.on('zoomend', function () {
        showHideBackButtonControl(currentMapLevel);
      });

      mapInstance.on('fullscreenchange', function () {
        if (mapInstance.isFullscreen()) {
          console.log('entered fullscreen');
        } else {
          console.log('exited fullscreen');
        }
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

      // Map is fully rendered and ready
      let isShow = parseInt(currentMapLevel) > CONST_COUNTRY_LEVEL;
      $("#info-legend").css('display', (isShow) ? 'block' : 'none');
    }

    function addMapSelectionContainer() {
      // Custom Control for Map List Button
      const mapListMapControl = L.control({ position: "topleft" });
      mapListMapControl.onAdd = () => {
        const container = L.DomUtil.create('div', 'map-list-button leaflet-control');
        container.style.position = 'relative';
        container.style.marginTop = "3px";

        // Create the button
        const button = L.DomUtil.create(
          "button",
          "custom-button",
          container);
        button.innerHTML = '<i class="fas fa-globe"></i>'; // Button label
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

          // console.log('features: ', feature.properties);
          parentRegionType = feature.properties.parent_type;
          parentRegionName = feature.properties.parent_name;
          parentRegionCode = feature.properties.parent_code;

          const foundMap = maps.find(map => map.code === feature.properties.parent_code);
          const geojson = foundMap ? foundMap.area : ((currentMapLevel === 1) ? 'Indonesia' : lastGeojson);
          lastGeojson = geojson;

          console.log('currentMapLevel: ', currentMapLevel);
          console.log('lastGeojson: ', lastGeojson);

          const marker = L.marker(layer.getBounds().getCenter(), {
            icon: L.divIcon({
              className: `map-area-label`,
              html: `<div class="peta-label-content"><span class="peta-label-text">${feature.properties.name}</span></div>`,
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

              console.log('currentMapLevel: ', currentMapLevel);

              // showHideDataBoxTooltip(true);
              if (currentMapLevel === CONST_COUNTRY_LEVEL) {
                loadNationalMap();
              } else if (currentMapLevel === CONST_PROVINCE_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;

                const foundMap = maps.find(map => map.code === feature.properties.region_code);
                const geojson = foundMap ? foundMap.area : lastProvinceName;

                console.log(`[Province] Province Name: ${feature.properties.region_name}, 
                  Region Code: ${feature.properties.region_code},
                  LastGeoJson: ${lastGeojson},
                  Geojson: ${geojson},
                  currentMapLevel: ${currentMapLevel},
                  foundMap: ${foundMap},
                  `);

                activeGeojson = geojson;
                lastGeojson = activeGeojson;

                loadProvinceMap(feature.properties.region_code, activeGeojson);
              } else if (currentMapLevel === CONST_CITY_LEVEL) {
                // TODO: Anomaly disini
                // Hanya Kota dibawah ini yang memiliki Geojson: 
                // - Kota Bogor, Kota Bandung, Kota Balikpapan, Kota Medan
                // Sisanya harus menggunakan Geojson dari Provinsi nya
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;
                lastCityCode = feature.properties.city_code;
                lastCityName = feature.properties.city_name;

                const foundMap = maps.find(map => map.code === feature.properties.region_code);
                const geojson = foundMap ? foundMap.area : lastProvinceName;

                console.log(`[City] City Name: ${feature.properties.region_name}, 
                  Region Code: ${feature.properties.region_code},
                  LastGeoJson: ${lastGeojson},
                  Geojson: ${geojson},
                  currentMapLevel: ${currentMapLevel},
                  foundMap: ${foundMap},
                  `);

                activeGeojson = geojson;
                lastGeojson = activeGeojson;

                // if (foundMap && foundMap.prev) {
                //   console.log('foundMap prev: ', foundMap.prev);
                // }

                loadCityMap(feature.properties.region_code, activeGeojson);

              } else if (currentMapLevel === CONST_DISTRICT_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastProvinceName = feature.properties.province_name;
                lastCityCode = feature.properties.city_code;
                lastCityName = feature.properties.city_name;
                lastDistrictCode = feature.properties.district_code;
                lastDistrictName = feature.properties.district_name;

                const foundMap = maps.find(map => map.code === feature.properties.region_code);
                let geojson = foundMap ? foundMap.area : lastProvinceName;

                console.log(`[District] District Name: ${feature.properties.region_name}, 
                  Region Code: ${feature.properties.region_code},
                  LastGeoJson: ${lastGeojson},
                  Geojson: ${geojson},
                  currentMapLevel: ${currentMapLevel},
                  foundMap: ${foundMap}
                  `);

                if (lastGeojson === "Kota Balikpapan") {
                  console.log('lastGeoJson xyz: ', lastGeojson);
                  geojson = lastGeojson;
                  // const foundDistrictMap = maps.find(map => map.name === feature.properties.region_name);
                  // if (foundDistrictMap) {
                  //   activeGeojson = foundDistrictMap.prev;
                  // }
                }

                activeGeojson = geojson;
                lastGeojson = activeGeojson;

                // if (foundMap && foundMap.prev) {
                //   console.log('foundMap prev: ', foundMap.prev);
                // }

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

                const foundMap = maps.find(map => map.code === feature.properties.region_code);
                const geojson = foundMap ? foundMap.area : lastProvinceName;

                console.log(`[District] District Name: ${feature.properties.region_name}, 
                  Region Code: ${feature.properties.region_code},
                  LastGeoJson: ${lastGeojson},
                  Geojson: ${geojson}
                  `);

                // showHideDataBoxTooltip(false);
              }

              // console.log('feature.properties: ', feature.properties);
              // frappe.msgprint(`name: ${feature.properties.name}`);
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

      console.log('fetchTable url: ', url);

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
        url = `polmarkdashboard.api.geojson.get_geojson_data?region=${regionName}&region_level=${mapRenderLevel}`;
      }

      console.log('url: ', url);

      showHideLoadingIndicator(true);

      fetchGeoJsonData(url)
        .then((geoJson) => {
          if (!geoJson || geoJson.features.length === 0) {
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

        setLocationLabel(lastMapTitleName);

        // Load the appropriate map based on the previous level
        if (previousLevel === CONST_COUNTRY_LEVEL) {
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
      mapInstance.on("enterFullscreen", () => console.log("Entered fullscreen mode"));
      mapInstance.on("exitFullscreen", () => console.log("Exited fullscreen mode"));
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
      <th>DAPIL DPRRI</th>
      <th>KABKOTA</th>
    `;
      } else if (parseInt(level) == CONST_CITY_LEVEL) {
        table += `
      <th>PROV</th>
      <th>DAPIL DPRRI</th>
      <th>KABKOTA</th>
      <th>KEC</th>
    `;
      } else if (parseInt(level) == CONST_DISTRICT_LEVEL) {
        table += `
      <th>PROV</th>
      <th>DAPIL DPRRI</th>
      <th>KABKOTA</th>
      <th>KEC</th>
      <th>DESA</th>
    `;
      }

      table += `
    <th>TPS</th>
    <th>PEND</th>
    <th>KK</th>
    <th>PEMILIH 2024</th>
    <th>CDE</th>
    <th>PEMILIH /KK</th>
    <th>PEMILIH PEREMPUAN</th>
    <th>PEMILIH MUDA</th>
    <th>ZONASI</th>
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
      <td>${item.dapil_dpr_ri}</td>
      <td>${item.city_name}</td>
    `;
        } else if (parseInt(level) == CONST_CITY_LEVEL) {
          table += `
      <td>${item.province_name}</td>
      <td>${item.dapil_dpr_ri}</td>
      <td>${item.city_name}</td>
      <td>${item.district_name}</td>
    `;
        } else if (parseInt(level) == CONST_DISTRICT_LEVEL) {
          table += `
      <td>${item.province_name}</td>
      <td>${item.dapil_dpr_ri}</td>
      <td>${item.city_name}</td>
      <td>${item.district_name}</td>
      <td>${item.sub_district_name}</td>
    `;
        }

        table += `
    <td>${numberFormat(item.num_tps)}</td>
    <td>${numberFormat(item.num_citizen)}</td>
    <td>${numberFormat(item.num_family)}</td>
    <td>${numberFormat(item.num_voter)}</td>
    <td>${numberFormat(item.num_cde)}</td>
    <td>${numberFormat(item.num_voter_per_family)}</td>
    <td>${numberFormat(item.num_voter_women)}</td>
    <td>${numberFormat(item.num_voter_young)}</td>
    <td>${item.zone}</td>
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
