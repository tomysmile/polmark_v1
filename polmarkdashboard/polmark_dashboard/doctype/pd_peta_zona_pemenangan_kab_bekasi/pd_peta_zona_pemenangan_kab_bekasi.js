// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

// Global variable
let infoBoxTooltipId = "info-box-kota-kab-bekasi";

frappe.ui.form.on("PD Peta Zona Pemenangan Kab Bekasi", {
  refresh(frm) {
    frm.set_df_property("map_html", "hidden", frm.is_new() ? 1 : 0);
    frm.set_df_property('region', 'hidden', (frm.doc.region) ? 1 : 0); // Hide the field
    frm.set_df_property('region_type', 'hidden', (frm.doc.region) ? 1 : 0);
    frm.set_df_property('standard', 'hidden', (frm.doc.region) ? 1 : 0);
    frm.events.render_map(frm);
  },
  onload: function (frm) {
    //
  },
  render_map: function (frm) {
    // Set a unique container ID for the map (important if dealing with multiple forms)
    const mapContainerId = "map_" + frm.doc.name;

    // Render the HTML for the map container inside the HTML wrapper field
    frm.fields_dict.map_html.$wrapper.html(`
      <div id="custom-map-container">
        <div id="${mapContainerId}" style="height: 80vh; position: relative;">
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
    frm.events.initialize_map(mapContainerId, frm);
  },
  initialize_map: function (mapContainerId, frmInstance) {
    const indonesiaDefaultView = [-2.5489, 118.0149];

    let provinceMarkersGroup = null,
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
      lastProvinceCode,
      lastCityCode,
      lastDistrictCode,
      lastSubDistrictCode;

    let defaultRegionType = null,
      defaultRegionCode = null,
      defaultRegionName = null,
      defaultMapLevel = 0;

    let provinceDefaultView = [],
      cityDefaultView = [],
      districtDefaultView = [],
      subDistrictDefaultView = [];

    const CONST_COUNTRY_LEVEL = 1,
      CONST_PROVINCE_LEVEL = 2,
      CONST_CITY_LEVEL = 3,
      CONST_DISTRICT_LEVEL = 4,
      CONST_SUBDISTRICT_LEVEL = 5;

    let locationLabel;
    let areLabelsVisible = false; // default is to hide the map name label

    // Clear the map instance if it exists
    let mapContainer = L.DomUtil.get(mapContainerId);
    if (mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null; // Reset the map container
    }

    // Initialize the Leaflet map
    let mapInstance = L.map(mapContainerId, {
      zoomControl: false
    }).setView(indonesiaDefaultView, 5);

    // Add tile layer to the map
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "Map data &copy; OpenStreetMap contributors",
    }).addTo(mapInstance);

    const { region, region_level, region_type, region_name } = frmInstance.doc;

    const tooltipBoxId = "#" + infoBoxTooltipId;

    // Stack to store map levels (e.g., 'province', 'city', 'district')
    let mapLevelStack = [];
    let mapRenderLevel = 0;
    let mapTitleName = "";
    let isNavigatingBack = false;

    defaultMapLevel = parseInt(region_level);
    defaultRegionType = region_type;
    defaultRegionName = region_name;
    defaultRegionCode = region;

    provinceMarkersGroup = L.layerGroup();
    cityMarkersGroup = L.layerGroup();
    districtMarkersGroup = L.layerGroup();
    subDistrictMarkersGroup = L.layerGroup();

    provinceMarkersGroup.name = "Province";
    cityMarkersGroup.name = "City";
    districtMarkersGroup.name = "District";
    subDistrictMarkersGroup.name = "SubDistrict";

    mapTitleName = `${region_type} ${region_name}`;

    addBackButtonControl();
    addFullScreenControl();
    addMapTitleLabel(mapTitleName);
    addLegend();
    addShowHideLayer();
    addTableZonasiContainer();
    addShowTableZonasiLayerControl();
    // addMapSelectionContainer();

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
        mapList.innerHTML = `
            <div class="map-item" onclick="loadMap('DKI Jakarta')">Peta DKI Jakarta</div>
            <div class="map-item" onclick="loadMap('Jawa Barat')">Peta Jawa Barat</div>
            <div class="map-item" onclick="loadMap('Kota Bogor')">Peta Kota Bogor</div>
        `;
        mapList.style.display = 'none'; // Hide map list by default

        // Add click event to toggle the map list
        button.addEventListener('click', () => {
          if (mapList.style.display === 'none') {
            mapList.style.display = 'block'; // Show the map list
          } else {
            mapList.style.display = 'none'; // Hide the map list
          }
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
      const legend = L.control({ position: "bottomleft" });
      legend.onAdd = () => {
        const div = L.DomUtil.create("div", "info legend");
        const zones = ["ZONA 1", "ZONA 2", "ZONA 3"];
        div.innerHTML = zones
          .map((zone) => `<i style="background:${getColor(zone)}"></i> ${zone}`)
          .join("<br>");
        return div;
      };
      legend.addTo(mapInstance);
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
            if (parseInt(currentMapLevel) === CONST_PROVINCE_LEVEL)
              mapInstance.removeLayer(provinceMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_CITY_LEVEL)
              mapInstance.removeLayer(cityMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_DISTRICT_LEVEL)
              mapInstance.removeLayer(districtMarkersGroup);
            else if (parseInt(currentMapLevel) === CONST_SUBDISTRICT_LEVEL)
              mapInstance.removeLayer(subDistrictMarkersGroup);
          } else {
            if (parseInt(currentMapLevel) === CONST_PROVINCE_LEVEL)
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

      // Add new GeoJSON layer for the current level
      const layerGroup = L.geoJSON(geoJsondata, {
        style: applyStyle,
        onEachFeature: function (feature, layer) {
          parentRegionType = feature.properties.parent_type;
          parentRegionName = feature.properties.parent_name;
          parentRegionCode = feature.properties.parent_code;

          const marker = L.marker(layer.getBounds().getCenter(), {
            icon: L.divIcon({
              className: `${region_type}-label`,
              html: `<div class="peta-label-content"><span class="peta-label-text">${feature.properties.name}</span></div>`,
            }),
          });

          markersGroup.addLayer(marker);

          layer.bindTooltip(`
            <b>${feature.properties.name}</b>
            <br><b>KK</b>: ${frappe.utils.numberFormat(feature.properties.jml_kk)}
            <br><b>DPT</b>: ${frappe.utils.numberFormat(feature.properties.jml_dpt)}
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
              showHideDataBoxTooltip(true);

              if (parseInt(level) === CONST_PROVINCE_LEVEL) {
                loadCityMap(feature.properties.region_code); // Load cities for the province
                lastProvinceCode = feature.properties.province_code;
                lastCityCode = feature.properties.city_code;
              } else if (parseInt(level) === CONST_CITY_LEVEL) {
                loadDistrictMap(feature.properties.region_code); // Load districts for the city
                lastProvinceCode = feature.properties.province_code;
                lastCityCode = feature.properties.city_code;
                lastDistrictCode = feature.properties.district_code;
              } else if (parseInt(level) === CONST_DISTRICT_LEVEL) {
                lastProvinceCode = feature.properties.province_code;
                lastCityCode = feature.properties.city_code;
                lastDistrictCode = feature.properties.district_code;
                lastSubDistrictCode = feature.properties.sub_district_code;

                showHideDataBoxTooltip(false);
              }
            },
          });

          layer.on("mouseover", function (e) {
            // showDataTooltip(feature.properties);

            e.target.setStyle({
              weight: 3,
              color: "#666",
              // fillOpacity: 0.7,
            });
          });

          layer.on("mouseout", function (e) {
            // hideDataTooltip();

            e.target.setStyle({
              weight: 2,
              color: "#fff",
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

      fetchTableData(currentMapLevel, parentRegionCode);
      setLocationLabel(`${parentRegionName}`);
    }

    function loadMap(region_code, currentLevel, parentLevel, renderLevel) {
      currentMapLevel = parseInt(currentLevel);
      parentMapLevel = parentLevel;
      mapRenderLevel = renderLevel;
      lastMapLevel = currentMapLevel;

      const url = `polmarkdashboard.api.geojson.get_geojson_data_by_region?region=Kabupaten Bekasi&region_level=${mapRenderLevel}&region_code=${region_code}`;

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

    function loadProvinceMap(region_code) {
      loadMap(region_code, CONST_PROVINCE_LEVEL, CONST_COUNTRY_LEVEL, CONST_CITY_LEVEL);
    }

    function loadCityMap(region_code) {
      loadMap(region_code, CONST_CITY_LEVEL, CONST_PROVINCE_LEVEL, CONST_DISTRICT_LEVEL);
    }

    function loadDistrictMap(region_code) {
      loadMap(region_code, CONST_DISTRICT_LEVEL, CONST_CITY_LEVEL, CONST_SUBDISTRICT_LEVEL);
    }

    function goBack() {
      if (mapLevelStack.length > 1) {
        mapLevelStack.pop(); // Remove the current level
        const previousLevel = mapLevelStack[mapLevelStack.length - 1]; // Get the previous level

        // Set the flag to indicate that we are navigating back
        isNavigatingBack = true;

        setLocationLabel(lastMapTitleName);

        // Load the appropriate map based on the previous level
        if (previousLevel === CONST_PROVINCE_LEVEL) {
          loadProvinceMap(lastProvinceCode); // Load province level
        } else if (previousLevel === CONST_CITY_LEVEL) {
          loadCityMap(lastCityCode); // Load city level for the last province
        } else if (previousLevel === CONST_DISTRICT_LEVEL) {
          loadDistrictMap(lastDistrictCode); // Load district level for the last city
        }
      }
    }

    function setDefaultView(level) {
      if (parseInt(level) === CONST_PROVINCE_LEVEL) {
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

    function getColor(zone) {
      const colors = {
        "ZONA 1": "#A70000",
        "ZONA 2": "#ffff99",
        "ZONA 3": "#4d7f17",
      };
      return colors[zone] || "#ffffff";
    }

    function applyStyle(feature) {
      return {
        fillColor: getColor(feature.properties.zonasi),
        weight: 2,
        opacity: 1,
        color: "#fff",
        fillOpacity: 0.7,
      };
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

    function showDataTooltip(data) {
      let cityInfo = "";
      let districtInfo = "";

      if (parseInt(data.region_level) === CONST_CITY_LEVEL) {
        cityInfo = `
          <tr>
            <td>Kecamatan</td>
            <td>${data.jml_kec}</td>
          </tr>
        `;
      } else if (parseInt(data.region_level) === CONST_DISTRICT_LEVEL) {
        districtInfo = `
          <tr>
            <td>Kelurahan</td>
            <td>${data.jml_kel}</td>
          </tr>
          <tr>
            <td>Desa</td>
            <td>${data.jml_desa}</td>
          </tr>
        `;
      }

      const generalInfo = `
        <tr>
          <td>Nama</td>
          <td>${data.region_name}</td>
        </tr>
        <tr>
          <td>Status</td>
          <td>${data.region_type}</td>
        </tr>
        ${cityInfo}
        ${districtInfo}
        <tr>
          <td>TPS</td>
          <td>${frappe.utils.numberFormat(data.jml_tps)}</td>
        </tr>
        <tr>
          <td>Penduduk</td>
          <td>${frappe.utils.numberFormat(data.jml_pend)}</td>
        </tr>
        <tr>
          <td>DPT</td>
          <td>${frappe.utils.numberFormat(data.jml_dpt)}</td>
        </tr>
        <tr>
          <td>KK</td>
          <td>${frappe.utils.numberFormat(data.jml_kk)}</td>
        </tr>
        <tr>
          <td>CDE</td>
          <td>${frappe.utils.numberFormat(data.jml_cde)}</td>
        </tr>
        <tr>
          <td>Pemilih /KK</td>
          <td>${frappe.utils.numberFormat(data.jml_dpt_perkk)}</td>
        </tr>
        <tr>
          <td>Pemilih Perempuan</td>
          <td>${frappe.utils.numberFormat(data.jml_dpt_perempuan)}</td>
        </tr>
        <tr>
          <td>Pemilih Muda</td>
          <td>${frappe.utils.numberFormat(data.jml_dpt_muda)}</td>
        </tr>
        <tr>
          <td>ZONA</td>
          <td>${data.zonasi}</td>
        </tr>
      `;

      $(tooltipBoxId).html(`
        <table class="info-table">
          <tbody>
          ${generalInfo}
          </tbody>
        </table>
      `);
      $(tooltipBoxId).css('display', 'block');
    }

    function hideDataTooltip() {
      $(tooltipBoxId).css('display', 'none');
    }

    function showHideDataBoxTooltip(isShow = true) {
      $(tooltipBoxId).css('display', isShow ? "block" : "none");
    }

    function renderTable(level, data) {
      let table = '<div class="table-wrapper">';
      table +=
        `<div style="padding-bottom: 12px">
          <button id="close-info-container" class="close-button">
            <i class="fa-solid fa-circle-xmark"></i>
            &nbsp;<span>Close Table</span>
          </button>
        </div>
        <table>`;
      table += "<thead><tr>";

      if (parseInt(level) == CONST_PROVINCE_LEVEL) {
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

        if (parseInt(level) == CONST_PROVINCE_LEVEL) {
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
				<td>${frappe.utils.numberFormat(item.num_tps)}</td>
				<td>${frappe.utils.numberFormat(item.num_citizen)}</td>
				<td>${frappe.utils.numberFormat(item.num_family)}</td>
				<td>${frappe.utils.numberFormat(item.num_voter)}</td>
				<td>${frappe.utils.numberFormat(item.num_cde)}</td>
				<td>${frappe.utils.numberFormat(item.num_voter_per_family)}</td>
				<td>${frappe.utils.numberFormat(item.num_voter_women)}</td>
				<td>${frappe.utils.numberFormat(item.num_voter_young)}</td>
				<td>${item.zone}</td>
				</tr>
				  `;
      });

      table += "</tbody></table></div>";

      // Insert the table into the HTML field
      frmInstance.fields_dict.data_table_wrapper.$wrapper.html(table);

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

    function fetchTableData(level, region) {
      const url = `polmarkdashboard.api.geojson.get_tabular_data?region=Kabupaten Bekasi&region_level=${mapRenderLevel}&region_code=${region}`;

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

    // Initially load the province map
    loadCityMap(region);
  },
});
