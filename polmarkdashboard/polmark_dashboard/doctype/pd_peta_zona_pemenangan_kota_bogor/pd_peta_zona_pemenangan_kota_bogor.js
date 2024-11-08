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
const
  CONST_DEFAULT_PROVINCE_CODE = "32",
  CONST_DEFAULT_REGION_CODE = "3271",
  CONST_DEFAULT_REGION_GEOJSON = "Kota Bogor",
  CONST_DEFAULT_REGION_MAP_LEVEL = CONST_CITY_LEVEL;

let nationalMarkersGroup = null,
  provinceMarkersGroup = null,
  cityMarkersGroup = null,
  districtMarkersGroup = null,
  subDistrictMarkersGroup = null;

let nationalRoadshowMarkersGroup = null,
  provinceRoadshowMarkersGroup = null,
  cityRoadshowMarkersGroup = null,
  districtRoadshowMarkersGroup = null,
  subDistrictRoadshowMarkersGroup = null;

let currentMapLevel = 0,
  currentRegionName,
  currentRegionType,
  currentRegionCode;

let currentProvince = CONST_DEFAULT_PROVINCE_CODE,
  currentCity,
  currentDistrict,
  currentSubDistrict;

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

let countryDefaultView = [],
  provinceDefaultView = [],
  cityDefaultView = [],
  districtDefaultView = [],
  subDistrictDefaultView = [];

let locationLabel;
let isMapNameVisible = false,
  isRoadshowVisible = false;

let isNavigatingBack = false;
let mapLevelStack = [];
let mapRenderLevel = 0;
let mapTitleName = "";

let navigateSource = "Geojson";

let mapInstance,
  tileLayer;

let infoBoxTooltipId = "info-box-kota-bogor";

frappe.ui.form.on("PD Peta Zona Pemenangan Kota Bogor", {
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
      addShowTableZonasiLayerControl();

      mapInstance.on('zoomend', function () {
        showHideBackButtonControl(currentMapLevel);
        hideMapOptionCheckboxes();
      });

      tileLayer.on('load', function () {
        checkIfMapReady();
      });

      // Initially load the province map
      loadCityMap(CONST_DEFAULT_REGION_CODE, CONST_DEFAULT_REGION_GEOJSON);
    }

    /* Functions */
    function initializeMarkersGroup() {
      // initialize map label markers
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

      // initialize roadshow markers
      nationalRoadshowMarkersGroup = L.layerGroup();
      provinceRoadshowMarkersGroup = L.layerGroup();
      cityRoadshowMarkersGroup = L.layerGroup();
      districtRoadshowMarkersGroup = L.layerGroup();
      subDistrictRoadshowMarkersGroup = L.layerGroup();

      nationalRoadshowMarkersGroup.name = "National";
      provinceRoadshowMarkersGroup.name = "Province";
      cityRoadshowMarkersGroup.name = "City";
      districtRoadshowMarkersGroup.name = "District";
      subDistrictRoadshowMarkersGroup.name = "SubDistrict";
    }

    function checkIfMapReady() {
      if (tileLayer.isLoading()) {
        return; // Still loading
      }

      // Map is fully rendered and ready
    }

    function addShowTableZonasiLayerControl() {
      // Create a right-top container dynamically
      var infoContainer = L.DomUtil.create('div', 'info-container zonasi');
      infoContainer.id = 'info-container-zonasi';

      // Append the container to the body (or map container)
      mapInstance.getContainer().appendChild(infoContainer);

      // By default, hide the info container
      infoContainer.style.display = 'none';
      infoContainer.style.width = "80%";

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
        const container = L.DomUtil.create('div', 'map-list-button leaflet-control show-hide-layer');
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
          showMapOptionCheckboxes();
        };

        // Prevent map interaction when clicking on the control
        L.DomEvent.disableClickPropagation(button);

        return container;
      };

      showHideLabelControl.addTo(mapInstance);
    }

    function hideMapOptionCheckboxes() {
      // Check if the checkboxes already exist
      var existingContainer = document.querySelector('.checkbox-container');

      if (existingContainer) {
        // If the checkboxes are already created, just toggle their visibility
        existingContainer.style.display = 'none';
        return;
      }
    }

    function showMapOptionCheckboxes() {
      // Check if the checkboxes already exist
      var existingContainer = document.querySelector('.checkbox-container');

      if (existingContainer) {
        // If the checkboxes are already created, just toggle their visibility
        existingContainer.style.display = existingContainer.style.display === 'none' ? 'block' : 'none';
        return;
      }

      // Create checkbox container
      var checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'checkbox-container';

      var title = document.createElement('div')
      title.innerHTML = `<span>Tampilkan</span>`;
      title.style.paddingBottom = "12px";
      title.style.fontWeight = "bold";

      checkboxContainer.appendChild(title);

      // Example checkboxes
      var checkboxes = [
        { id: 'showMapLabel', label: 'Nama Wilayah' },
        { id: 'showRoadshow', label: 'Roadshow' }
      ];

      checkboxes.forEach(function (checkbox) {
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = checkbox.id;

        if (checkbox.id == 'showMapLabel') {
          isMapNameVisible = getIsMapNameVisibility();
          input.checked = isMapNameVisible;
        } else if (checkbox.id == 'showRoadshow') {
          isRoadshowVisible = getIsRoadshowVisibility();
          input.checked = isRoadshowVisible;
        }

        input.onchange = function () {
          if (this.checked) {
            handleCheckboxChange(checkbox.id, true);
          } else {
            handleCheckboxChange(checkbox.id, false);
          }
        };

        var label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = checkbox.label;

        checkboxContainer.appendChild(input);
        checkboxContainer.appendChild(label);
        checkboxContainer.appendChild(document.createElement('br'));
      });

      // Style the checkbox container to appear next to the button
      checkboxContainer.style.position = 'absolute';
      checkboxContainer.style.top = '0'; // Align with the button
      checkboxContainer.style.left = '35px'; // Position right to the button (adjust as needed)
      checkboxContainer.style.backgroundColor = 'white';
      checkboxContainer.style.padding = '10px';
      checkboxContainer.style.border = '1px solid #ccc';
      checkboxContainer.style.borderRadius = '5px';
      checkboxContainer.style.zIndex = '1000';

      // Append the checkbox container to the map
      document.querySelector('.show-hide-layer').appendChild(checkboxContainer);
    }

    function handleCheckboxChange(checkboxId, isChecked) {
      if (checkboxId === 'showMapLabel') {
        setIsMapNameVisibility(isChecked);
        updateMapAreaMarkers();
      } else if (checkboxId === 'showRoadshow') {
        setIsRoadshowVisibility(isChecked);
        updateRoadshowMarkers();
      }
    }

    function setIsMapNameVisibility(isVisible) {
      storageName = "isMapNameVisible-" + CONST_DEFAULT_REGION_CODE;
      localStorage.setItem(storageName, isVisible);
    }

    function setIsRoadshowVisibility(isVisible) {
      storageName = "isRoadshowVisible-" + CONST_DEFAULT_REGION_CODE;
      localStorage.setItem(storageName, isVisible);
    }

    function getIsMapNameVisibility() {
      isMapNameVisible = false;
      storageName = "isMapNameVisible-" + CONST_DEFAULT_REGION_CODE;
      if (localStorage.getItem(storageName) === "true") {
        isMapNameVisible = true;
      }
      return isMapNameVisible;
    }

    function getIsRoadshowVisibility() {
      isRoadshowVisible = false;
      storageName = "isRoadshowVisible-" + CONST_DEFAULT_REGION_CODE;
      if (localStorage.getItem(storageName) === "true") {
        isRoadshowVisible = true;
      }
      return isRoadshowVisible;
    }

    function updateMapAreaMarkers() {
      isMapNameVisible = getIsMapNameVisibility();

      if (!isMapNameVisible) {
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
    }

    function updateRoadshowMarkers() {
      isRoadshowVisible = getIsRoadshowVisibility();

      if (!isRoadshowVisible) {
        if (parseInt(currentMapLevel) === CONST_COUNTRY_LEVEL)
          mapInstance.removeLayer(nationalRoadshowMarkersGroup);
        else if (parseInt(currentMapLevel) === CONST_PROVINCE_LEVEL)
          mapInstance.removeLayer(provinceRoadshowMarkersGroup);
        else if (parseInt(currentMapLevel) === CONST_CITY_LEVEL)
          mapInstance.removeLayer(cityRoadshowMarkersGroup);
        else if (parseInt(currentMapLevel) === CONST_DISTRICT_LEVEL)
          mapInstance.removeLayer(districtRoadshowMarkersGroup);
        else if (parseInt(currentMapLevel) === CONST_SUBDISTRICT_LEVEL)
          mapInstance.removeLayer(subDistrictRoadshowMarkersGroup);
      } else {
        if (parseInt(currentMapLevel) === CONST_COUNTRY_LEVEL)
          mapInstance.addLayer(nationalRoadshowMarkersGroup);
        else if (parseInt(currentMapLevel) === CONST_PROVINCE_LEVEL)
          mapInstance.addLayer(provinceRoadshowMarkersGroup);
        else if (parseInt(currentMapLevel) === CONST_CITY_LEVEL)
          mapInstance.addLayer(cityRoadshowMarkersGroup);
        else if (parseInt(currentMapLevel) === CONST_DISTRICT_LEVEL)
          mapInstance.addLayer(districtRoadshowMarkersGroup);
        else if (parseInt(currentMapLevel) === CONST_SUBDISTRICT_LEVEL)
          mapInstance.addLayer(subDistrictRoadshowMarkersGroup);
      }
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

    function groupRoadshows(roadshows, level, grouping = true) {
      const sortActivitiesByDate = (activities) =>
        activities.sort((a, b) => new Date(a.activity_date) - new Date(b.activity_date));

      if (level === CONST_CITY_LEVEL) {
        // Group by city_code
        const grouped = roadshows.reduce((acc, item) => {
          const cityCode = item.city_code;
          const cityName = item.city_name;
          const roadshowActivity = item.roadshow_activity;
          const totalData = item.total_data;

          if (!acc[cityCode]) {
            acc[cityCode] = {
              level: CONST_CITY_LEVEL,
              name: cityName,
              region_code: cityCode,
              total_data: 0,
              activity_count: 0,
              activities: [],
              roadshow_activities: [],
              last_level: false,
            };
          }

          // Find the activity in the activities array
          const activityEntry = acc[cityCode].activities.find(act => act.name === roadshowActivity);
          if (activityEntry) {
            // If activity already exists, increment the count
            activityEntry.count += 1;
            activityEntry.total_data += totalData;
          } else {
            // If activity doesn't exist, add a new entry
            acc[cityCode].activities.push({ name: roadshowActivity, count: 1, total_data: totalData });
          }

          acc[cityCode].total_data += item.total_data;
          acc[cityCode].activity_count += 1;
          acc[cityCode].roadshow_activities.push({
            activity_date: item.activity_date,
            district_name: item.district_name,
            sub_district_name: item.sub_district_name,
            rw: item.rw,
            activity: item.roadshow_activity,
            total_data: item.total_data
          });
          return acc;
        }, {});

        // Sort roadshow_activities by activity_date in each grouped entry
        Object.values(grouped).forEach(entry => {
          entry.roadshow_activities = sortActivitiesByDate(entry.roadshow_activities);
          entry.activities.sort((a, b) => {
            // Primary sort by count, secondary sort by total_data
            if (b.count === a.count) {
              return b.total_data - a.total_data;
            }
            return b.count - a.count;
          });
        });

        return grouped;

      } else if (level === CONST_DISTRICT_LEVEL) {
        // Group by district_code
        const grouped = roadshows.reduce((acc, item) => {
          const districtCode = item.district_code;
          const districtName = item.district_name;
          const roadshowActivity = item.roadshow_activity;
          const totalData = item.total_data;

          if (!acc[districtCode]) {
            acc[districtCode] = {
              level: CONST_DISTRICT_LEVEL,
              name: districtName,
              region_code: districtCode,
              total_data: 0,
              activity_count: 0,
              activities: [],
              uniqueSubDistricts: new Set(),
              roadshow_activities: [],
              last_level: false,
            };
          }

          // Find the activity in the activities array
          const activityEntry = acc[districtCode].activities.find(act => act.name === roadshowActivity);
          if (activityEntry) {
            // If activity already exists, increment the count
            activityEntry.count += 1;
            activityEntry.total_data += totalData;
          } else {
            // If activity doesn't exist, add a new entry
            acc[districtCode].activities.push({ name: roadshowActivity, count: 1, total_data: totalData });
          }

          acc[districtCode].total_data += item.total_data;
          acc[districtCode].activity_count += 1;
          acc[districtCode].uniqueSubDistricts.add(item.sub_district_name);
          acc[districtCode].roadshow_activities.push({
            activity_date: item.activity_date,
            district_name: item.district_name,
            sub_district_name: item.sub_district_name,
            rw: item.rw,
            activity: item.roadshow_activity,
            total_data: item.total_data
          });
          return acc;
        }, {});

        // Sort roadshow_activities by activity_date in each grouped entry
        Object.values(grouped).forEach(entry => {
          entry.roadshow_activities = sortActivitiesByDate(entry.roadshow_activities);
          entry.activities.sort((a, b) => {
            // Primary sort by count, secondary sort by total_data
            if (b.count === a.count) {
              return b.total_data - a.total_data;
            }
            return b.count - a.count;
          });
        });

        Object.keys(grouped).forEach(district => {
          grouped[district].total_sub_district_participated = grouped[district].uniqueSubDistricts.size;
          delete grouped[district].uniqueSubDistricts;  // Remove Set after counting
        });

        return grouped;
      } else if (level === CONST_SUBDISTRICT_LEVEL) {
        if (grouping) {
          // Group by sub_district_code
          const grouped = roadshows.reduce((acc, item) => {
            const subDistrictCode = item.sub_district_code;
            const subDistrictName = item.sub_district_name;
            const roadshowActivity = item.roadshow_activity;
            const totalData = item.total_data;

            if (!acc[subDistrictCode]) {
              acc[subDistrictCode] = {
                level: CONST_SUBDISTRICT_LEVEL,
                name: subDistrictName,
                region_code: subDistrictCode,
                total_data: 0,
                activity_count: 0,
                activities: [],
                roadshow_activities: [],
                last_level: false,
              };
            }

            // Find the activity in the activities array
            const activityEntry = acc[subDistrictCode].activities.find(act => act.name === roadshowActivity);
            if (activityEntry) {
              // If activity already exists, increment the count
              activityEntry.count += 1;
              activityEntry.total_data += totalData;
            } else {
              // If activity doesn't exist, add a new entry
              acc[subDistrictCode].activities.push({ name: roadshowActivity, count: 1, total_data: totalData });
            }

            acc[subDistrictCode].total_data += item.total_data;
            acc[subDistrictCode].activity_count += 1;
            acc[subDistrictCode].roadshow_activities.push({
              activity_date: item.activity_date,
              district_name: item.district_name,
              sub_district_name: item.sub_district_name,
              rw: item.rw,
              activity: item.roadshow_activity,
              total_data: item.total_data
            });
            return acc;
          }, {});

          // Sort roadshow_activities by activity_date in each grouped entry
          Object.values(grouped).forEach(entry => {
            entry.roadshow_activities = sortActivitiesByDate(entry.roadshow_activities);
            entry.activities.sort((a, b) => {
              // Primary sort by count, secondary sort by total_data
              if (b.count === a.count) {
                return b.total_data - a.total_data;
              }
              return b.count - a.count;
            });
          });

          return grouped;
        } else {
          // Add region_code property and include rw, activity_date in roadshow_activities, then sort
          const grouped = mergeRoadshowsByCoordinates(roadshows);

          Object.values(grouped).forEach(entry => {
            entry.roadshow_activities = sortActivitiesByDate(entry.roadshow_activities);
          });

          return grouped;
        }
      } else {
        throw new Error("Invalid level provided. Please use level 3, 4, or 5.");
      }
    }

    // Helper to format output for levels 3 and 4
    function formatGroupedResult(groupedData) {
      return Object.values(groupedData);
    }

    function mergeGeojsonWithRoadshows(geoJson, roadshows) {
      geoJson.features.forEach(feature => {
        const regionCode = feature.properties.region_code;
        // Find all matching roadshow data for the region code
        const matchingRoadshows = roadshows.filter(
          roadshow => roadshow.region_code === regionCode
        );
        // If there are matching roadshows, add them to the feature
        if (matchingRoadshows.length > 0) {
          feature.properties["roadshows"] = matchingRoadshows;
        }
      });
    }

    function mergeRoadshowsByCoordinates(roadshows) {
      // Separate items with coordinates from those without
      const mergedData = [];
      const itemsWithCoordinates = [];

      roadshows.forEach(item => {
        if (item.garis_bujur === null || item.garis_bujur === '') {
          // Check if a group for this city and district exists
          const existingGroup = mergedData.find(
            group => group.city_code === item.city_code && group.district_code === item.district_code
          );

          if (existingGroup) {
            // Add to existing group
            existingGroup.total_data += item.total_data;
            existingGroup.activity_count += 1;
            existingGroup.roadshow_activities.push({
              activity_date: item.activity_date,
              sub_district_name: item.sub_district_name,
              rw: item.rw,
              activity: item.roadshow_activity,
              total_data: item.total_data,
            });
          } else {
            // Create a new group
            mergedData.push({
              level: CONST_SUBDISTRICT_LEVEL,
              last_level: true,
              name: item.sub_district_name,
              city_code: item.city_code,
              district_code: item.district_code,
              region_code: item.sub_district_code,
              total_data: item.total_data,
              activity_count: 1,
              roadshow_activities: [
                {
                  activity_date: item.activity_date,
                  sub_district_name: item.sub_district_name,
                  rw: item.rw,
                  activity: item.roadshow_activity,
                  total_data: item.total_data,
                }
              ],
              garis_bujur: null,
              garis_lintang: null
            });
          }
        } else {
          //
          // Push items with coordinates as they are
          itemsWithCoordinates.push({
            ...item,
            level: CONST_SUBDISTRICT_LEVEL,
            last_level: true,
            name: item.sub_district_name,
            region_code: item.sub_district_code,
            activity_count: 1,
            roadshow_activities: [
              {
                activity_date: item.activity_date,
                sub_district_name: item.sub_district_name,
                rw: item.rw,
                activity: item.roadshow_activity,
                total_data: item.total_data,
              }
            ]
          });
        }
      });

      return [...mergedData, ...itemsWithCoordinates];
    }

    function renderMapLabelMarkers(markerGroup, feature, mapLayer) {
      /* Map Markers */
      const marker = getMapLabelMarker(feature);
      markerGroup.addLayer(marker);
      mapLayer.bindTooltip(`
        <b>${feature.properties.name}</b>
        <br><b>KK</b>: ${numberFormat(feature.properties.jml_kk)}
        <br><b>DPT</b>: ${numberFormat(feature.properties.jml_dpt)}
        `,
        {
          permanent: false,
          direction: 'top',
          className: 'custom-tooltip'
        });
    }

    function getRoadshowActivityContent(roadshow) {
      // console.log('roadshow: ', roadshow);
      const last_level = roadshow.last_level;
      const roadshowActivities = roadshow.roadshow_activities;
      const chartId = `chart-${roadshow.region_code}`;

      let most_activities_body = '';
      
      if (roadshow.level <= CONST_SUBDISTRICT_LEVEL && !last_level && roadshowActivities.length > 0) {
        most_activities_body = `<tr>
          <td>Aktivitas Terbanyak</td>
          <td>:</td>
          <td><strong>${roadshow.activities[0].name}</strong> (Data: ${numberFormat(roadshow.activities[0].total_data)})</td>
        </tr>`
      }

      const roadshowInfoContent = `
        <table>
        <tr>
          <td style="width: 30%">Jumlah Aktivitas</td>
          <td style="width: 4px">:</td>
          <td>${roadshow.activity_count}</td>
        </tr>
        <tr>
          <td>Total Data</td>
          <td>:</td>
          <td>${numberFormat(roadshow.total_data)}</td>
        </tr>
        ${most_activities_body}
        </table>`;

      let body = '';
      for (let activity of roadshowActivities) {
        body += `
            <tr>
              <td>${activity.activity_date}</td>
              <td>${activity.sub_district_name}</td>
              <td>${activity.rw}</td>
              <td><b>${activity.activity}</b></td>
              <td style="text-align: right">${activity.total_data}</td>
            </tr>`;
      }
      const content = `
          <div><h3 class="popup-title">${roadshow.name}</h3></div>
          <div class="popup-content">${roadshowInfoContent}</div>
          <div id="${chartId}"></div>
          <div class="table-wrapper">
            <table>
              <thead>
              <tr>
                <th style="width: 95px; text-align: left;">Tanggal</th>
                <th>Kelurahan</th>
                <th style="width: 40px;">RW</th>
                <th>Aktivitas</th>
                <th style="width: 55px; text-align: right">Total Data</th>
              </tr>
              </thead>
              <tbody>${body}</tbody>
            </table>
          </div>`;

      return content;
    }

    function getRoadshowActivityChart(roadshowItem) {
      if (roadshowItem.roadshow_activities.length > 1) {
        const chartId = `chart-${roadshowItem.region_code}`;  // Match the chart container ID
        new frappe.Chart(`#${chartId}`, {
          data: {
            labels: roadshowItem.roadshow_activities.map(item => item.activity_date),
            datasets: [
              {
                name: "Total Data",
                chartType: "line",
                values: roadshowItem.roadshow_activities.map(item => item.total_data)
              }
            ]
          },
          type: 'axis-mixed',  // Chart type
          height: 150,
          colors: ["#ffa3ef", "#ffa3ef", "light-blue"],
          axisOptions: {
            xIsSeries: true,
            xAxisMode: "tick",
          },
          barOptions: {
            stacked: true,
            spaceRatio: 0.5
          },
          tooltipOptions: {
            formatTooltipX: (d) => (d + "").toUpperCase(),
            formatTooltipY: (d) => d + " pts"
          }
        });
      } else {
        console.log("Not enough data to display chart");
      }
    }

    function renderRoadshowMarkers(roadshowMarkersGroup, feature, mapLayer, level) {
      /* Map Markers */
      if (feature.properties && feature.properties.roadshows &&
        feature.properties.roadshows.length > 0) {

        for (let roadshowItem of feature.properties.roadshows) {
          const roadshowContent = getRoadshowActivityContent(roadshowItem);
          let coordinates = null;

          if (parseInt(level) == CONST_SUBDISTRICT_LEVEL) {
            if (roadshowItem.garis_lintang && roadshowItem.garis_bujur) {
              coordinates = [roadshowItem.garis_lintang, roadshowItem.garis_bujur];
            }
          }

          const text = numberFormat(roadshowItem.total_data);
          const roadshowMarker = getPulseMarker(feature, text, coordinates);
          roadshowMarker.bindPopup(roadshowContent, {
            permanent: false,
            direction: 'top',
            className: 'popup-roadshow',
            closeButton: false
          });
          roadshowMarker.on('popupopen', () => {
            //
            getRoadshowActivityChart(roadshowItem);
          });

          roadshowMarkersGroup.addLayer(roadshowMarker);
        }
      }
    }

    function renderMap(level, geoJsondata) {
      // Clear the existing map layers (e.g., when navigating to a new level)
      mapInstance.eachLayer(function (layer) {
        if (layer instanceof L.GeoJSON || layer instanceof L.Marker) {
          mapInstance.removeLayer(layer);
        }
      });

      resetMapNameMarkerGroup();
      resetRoadshowMarkerGroup();
      setDefaultView(level);
      showHideBackButtonControl(level);

      let mapAreaMarkersGroup = getMapAreaMarkersGroup(level);
      let roadshowMarkersGroup = getRoadshowMarkersGroup(level);

      lastGeojson = CONST_DEFAULT_REGION_GEOJSON;

      // Add new GeoJSON layer for the current level
      const layerGroup = L.geoJSON(geoJsondata, {
        style: applyStyle,
        onEachFeature: function (feature, layer) {
          parentRegionType = feature.properties.parent_type;
          parentRegionName = feature.properties.parent_name;
          parentRegionCode = feature.properties.parent_code;

          renderMapLabelMarkers(mapAreaMarkersGroup, feature, layer);
          renderRoadshowMarkers(roadshowMarkersGroup, feature, layer, level);

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

    function fetchRoadshowData(geojsonName, level, regionCode) {
      return new Promise((resolve, reject) => {
        const apiUrl = `polmarkdashboard.api.map.roadshow`;
        const params = {
          region: geojsonName,
          level: level,
          region_code: regionCode
        };

        // return fetchAPI(apiUrl, params);
        fetchAPI(apiUrl, params)
          .then((data) => {
            resolve(data);
          })
          .catch((error) => {
            reject(error)
          });
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

      if (currentMapLevel == CONST_PROVINCE_LEVEL) {
        currentProvince = regionCode;
      } else if (currentMapLevel == CONST_CITY_LEVEL) {
        currentCity = regionCode;
      } else if (currentMapLevel == CONST_DISTRICT_LEVEL) {
        currentDistrict = regionCode;
      } else if (currentMapLevel == CONST_SUBDISTRICT_LEVEL) {
        currentSubDistrict = regionCode;
      }

      currentRegionType = currentMapLevel;
      currentRegionCode = regionCode;

      fetchAPI(url)
        .then((geoJson) => {
          if (!geoJson || geoJson.features.length === 0) {
            console.error(`No valid data found`);
            mapInstance.setView(CONST_INDONESIA_DEFAULT_VIEW, 5);
            return;
          }

          additionalData = [];
          geoJson["extra"] = additionalData;

          fetchRoadshowData(regionName, currentMapLevel, regionCode)
            .then((roadshowData) => {
              if (roadshowData) {
                additionalData.push({ item: 'roadshow', data: roadshowData });
              }

              let roadshows = [];

              if (currentMapLevel < CONST_SUBDISTRICT_LEVEL) {
                roadshows = formatGroupedResult(groupRoadshows(roadshowData, mapRenderLevel));
              } else if (currentMapLevel == CONST_SUBDISTRICT_LEVEL && mapRenderLevel == CONST_SUBDISTRICT_LEVEL) {
                roadshows = groupRoadshows(roadshowData, mapRenderLevel, false);
              }

              mergeGeojsonWithRoadshows(geoJson, roadshows);

              // Fetch and render GeoJSON data
              renderMap(currentMapLevel, geoJson);

              updateMapAreaMarkers();
              updateRoadshowMarkers();
            });
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

        resetRoadshowMarkerGroup();

        if (previousLevel === CONST_PROVINCE_LEVEL) {
          loadProvinceMap(lastProvinceCode, CONST_DEFAULT_REGION_GEOJSON);
        } else if (previousLevel === CONST_CITY_LEVEL) {
          loadCityMap(lastCityCode, CONST_DEFAULT_REGION_GEOJSON);
        } else if (previousLevel === CONST_DISTRICT_LEVEL) {
          loadDistrictMap(lastDistrictCode, CONST_DEFAULT_REGION_GEOJSON);
        } else if (previousLevel === CONST_SUBDISTRICT_LEVEL) {
          loadSubDistrictMap(lastSubDistrictCode, CONST_DEFAULT_REGION_GEOJSON);
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

    function getMapAreaMarkersGroup(level) {
      const markerGroups = {
        1: nationalMarkersGroup,
        2: provinceMarkersGroup,
        3: cityMarkersGroup,
        4: districtMarkersGroup,
        5: subDistrictMarkersGroup,
      };

      return markerGroups[parseInt(level)];
    }

    function getRoadshowMarkersGroup(level) {
      const markers = {
        1: nationalRoadshowMarkersGroup,
        2: provinceRoadshowMarkersGroup,
        3: cityRoadshowMarkersGroup,
        4: districtRoadshowMarkersGroup,
        5: subDistrictRoadshowMarkersGroup,
      };

      return markers[parseInt(level)];
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

    function resetMapNameMarkerGroup() {
      nationalMarkersGroup.clearLayers();
      provinceMarkersGroup.clearLayers();
      cityMarkersGroup.clearLayers();
      districtMarkersGroup.clearLayers();
      subDistrictMarkersGroup.clearLayers();
    }

    function resetRoadshowMarkerGroup() {
      nationalRoadshowMarkersGroup.clearLayers();
      provinceRoadshowMarkersGroup.clearLayers();
      cityRoadshowMarkersGroup.clearLayers();
      districtRoadshowMarkersGroup.clearLayers();
      subDistrictRoadshowMarkersGroup.clearLayers();
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
      } else {
        console.error("Invalid centroid for feature:", feature.properties.name);
      }

      return;
    }

    function getPulseMarker(feature, text, coordinates = null) {
      let centroid = [];

      if (feature && !coordinates) {
        centroid = feature.geometry.type === "MultiPolygon"
          ? getMultiPolygonCentroid(feature.geometry.coordinates)
          : getCentroid(feature.geometry.coordinates);
      } else {
        centroid = coordinates;
      }

      if (centroid) {
        const icon = L.divIcon({
          className: 'leaflet-block-marker',  // Custom class for styling
          html: `<div class="marker-rectangle">${text}<div class="marker-arrow"></div></div>`,
          iconSize: [30, 30]  // Set the size of the icon
        });

        const pulseMarker = L.marker(centroid, {
          icon: icon
        });

        return pulseMarker;
      } else {
        console.error("Invalid centroid for feature:", feature.properties.name);
      }

      return;
    }

    function generateZonasiTable(level, data) {
      let tableHead = `
      <thead>
      <tr>`;

      if (parseInt(level) >= CONST_PROVINCE_LEVEL) {
        tableHead += `
          <th>DAPIL DPR RI</th>
          <th>KAB/ KOTA</th>`;
      }

      if (parseInt(level) >= CONST_CITY_LEVEL) {
        tableHead += `<th>KEC</th>`;
      }

      if (parseInt(level) >= CONST_DISTRICT_LEVEL) {
        tableHead += `<th>DESA</th>`;
      }

      tableHead += `
                <th style="text-align: right">TPS</th>
                <th style="text-align: right">PEND</th>
                <th style="text-align: right">KK</th>
                <th style="text-align: right">PEMILIH 2024</th>
                <th style="text-align: right">CDE</th>
                <th style="text-align: right">PEMILIH /KK</th>
                <th style="text-align: right">PEMILIH MUDA</th>
                <th style="text-align: right">PEMILIH PEREMPUAN</th>
                <th style="text-align: right">DPTHP</th>
                <th style="text-align: right">DPTHP PEMILIH PEREMPUAN</th>
                <th style="text-align: right">DPTHP PEMILIH /KK</th>
                <th>ZONASI</th>
              `;

      tableHead += `
      </tr></thead>`;

      let tbody = ``;

      // Populate the table with data
      data.forEach((item) => {
        tbody += "<tr>";

        if (parseInt(level) >= CONST_PROVINCE_LEVEL) {
          tbody += `
            <td>${item.dapil_dpr_ri}</td>
            <td>${item.city_name}</td>`;
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
          <td style="text-align: right">${numberFormat(item.num_voter_young)}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_women)}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_dpthp2)}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_women_dpthp2)}</td>
          <td style="text-align: right">${numberFormat(item.num_voter_per_family_dpthp2)}</td>
          <td style="text-align: center">${item.zone}</td>
        </tr>`;
      });

      let table = `
      <table>
        ${tableHead}
        <tbody>${tbody}</tbody>
      </table>`;

      return `<div class="tabZonasi">${table}</div>`;
    }

    function renderTable(level, data) {
      let tableZonasi = generateZonasiTable(level, data);
      let table = `
      <div class="table-wrapper">;
        <div style="padding-bottom: 12px">
          <button id="close-info-container" class="close-button">
            <i class="fa-solid fa-circle-xmark"></i>
            &nbsp;<span>Close</span>
          </button>
        </div>
        ${tableZonasi}
      </div>`;

      var infoContainer = document.getElementById('info-container-zonasi');

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

    function fetchAPI(endpoint, params = {}) {
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
