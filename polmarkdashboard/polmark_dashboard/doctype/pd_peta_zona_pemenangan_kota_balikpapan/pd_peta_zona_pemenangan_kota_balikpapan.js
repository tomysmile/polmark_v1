// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

// Global variable
let infoBoxTooltipId = "info-box-kota-balikpapan";

frappe.ui.form.on("PD Peta Zona Pemenangan Kota Balikpapan", {
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
        <div id="${mapContainerId}" style="height: 80vh; position: relative;"></div>
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
    let areLabelsVisible = true;

    // Clear the map instance if it exists
    let mapContainer = L.DomUtil.get(mapContainerId);
    if (mapContainer._leaflet_id) {
      mapContainer._leaflet_id = null; // Reset the map container
    }

    // Initialize the Leaflet map
    let mapInstance = L.map(mapContainerId).setView(indonesiaDefaultView, 5);

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

    addFullScreenControl();
    addBackButtonControl();
    addMapTitleLabel(mapTitleName);
    addLegend();
    addShowHideLayer();

    function addBackButtonControl() {
      // First, check if an existing back button is present, and remove it
      let existingBackButton = document.querySelector(".back-button");
      if (existingBackButton) {
        existingBackButton.remove();
        console.log("Existing back button removed");
      }

      const backButton = L.Control.extend({
        options: {
          position: "topright",
        },
        onAdd: function () {
          let container = L.DomUtil.create(
            "div",
            "leaflet-bar leaflet-control leaflet-control-custom back-button kota-balikpapan"
          );

          container.style.backgroundColor = "white";
          container.style.padding = "5px";
          container.style.cursor = "pointer";
          container.title = "Back to previous level";
          container.style.display = "none";

          container.innerHTML = "<strong>&larr; Back</strong>"; // Button content

          // Add click event to trigger goBack function
          container.onclick = function () {
            goBack(); // Trigger the back function
            // mapInstance.setView(getDefaultMapView(level), 5);
            container.style.display = "none";
          };

          return container;
        },
      });

      mapInstance.addControl(new backButton());
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
            showDataTooltip(feature.properties);

            e.target.setStyle({
              weight: 3,
              color: "#666",
              fillOpacity: 0.7,
            });
          });

          layer.on("mouseout", function (e) {
            hideDataTooltip();

            e.target.setStyle({
              weight: 1,
              color: "#3388ff",
              fillOpacity: 0.5,
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

      markersGroup.addTo(mapInstance);

      fetchTableData(currentMapLevel, parentRegionCode);
      setLocationLabel(`${parentRegionName}`);
    }

    function loadMap(region_code, currentLevel, parentLevel, renderLevel) {
      currentMapLevel = parseInt(currentLevel);
      parentMapLevel = parentLevel;
      mapRenderLevel = renderLevel;
      lastMapLevel = currentMapLevel;

      const url = `polmarkdashboard.api.geojson.get_geojson_data_by_region?region=Kota Balikpapan&region_level=${mapRenderLevel}&region_code=${region_code}`;

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

    function showHideBackButtonControl(level) {
      let isShow = parseInt(level) > defaultMapLevel;
      document.querySelector(".back-button").style.display = isShow ? "block" : "none";
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
        const div = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control leaflet-control-custom"
        );
        // Add some style and text to the control button
        div.innerHTML = `<i class="fas fa-map-marker-alt"></i>`;
        div.style.backgroundColor = "white";
        div.style.padding = "5px";
        div.style.cursor = "pointer";

        // Add the event handler for the button click
        div.onclick = function () {
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

        return div;
      };
      showHideLabelControl.addTo(mapInstance);
    }

    function resetMarkerGroup() {
      provinceMarkersGroup.clearLayers();
      cityMarkersGroup.clearLayers();
      districtMarkersGroup.clearLayers();
      subDistrictMarkersGroup.clearLayers();
    }



    function getColor(zone) {
      const colors = {
        "ZONA 1": "#ff9999",
        "ZONA 2": "#ffff99",
        "ZONA 3": "#99ff99",
      };
      return colors[zone] || "#ffffff";
    }

    function applyStyle(feature) {
      return {
        fillColor: getColor(feature.properties.zonasi),
        weight: 2,
        opacity: 1,
        color: "white",
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
      let table = '<div class="table-responsive">';
      table +=
        '<table class="table table-bordered table-striped table-hover table-sm" style="width: 100%;">';
      table += "<thead><tr>";

      if (parseInt(level) == CONST_PROVINCE_LEVEL) {
        table += `
				  <th>KD PROV</th>
				  <th>PROV</th>
				  <th>DAPIL DPRRI</th>
				  <th>KD KABKOTA</th>
				  <th>KABKOTA</th>
			  `;
      } else if (parseInt(level) == CONST_CITY_LEVEL) {
        table += `
				  <th>KD PROV</th>
				  <th>PROV</th>
				  <th>DAPIL DPRRI</th>
				  <th>KD KABKOTA</th>
				  <th>KABKOTA</th>
				  <th>KD KEC</th>
				  <th>KEC</th>
			  `;
      } else if (parseInt(level) == CONST_DISTRICT_LEVEL) {
        table += `
				  <th>KD PROV</th>
				  <th>PROV</th>
				  <th>DAPIL DPRRI</th>
				  <th>KD KABKOTA</th>
				  <th>KABKOTA</th>
				  <th>KD KEC</th>
				  <th>KEC</th>
				  <th>KD DESA</th>
				  <th>DESA</th>
			  `;
      }

      table += `
			  <th>STATUS</th>
			  <th>LEVEL</th>
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
					<td>${item.province_code}</td>
					<td>${item.province_name}</td>
					<td>${item.dapil_dpr_ri}</td>
					<td>${item.city_code}</td>
					<td>${item.city_name}</td>
				`;
        } else if (parseInt(level) == CONST_CITY_LEVEL) {
          table += `
					<td>${item.province_code}</td>
					<td>${item.province_name}</td>
					<td>${item.dapil_dpr_ri}</td>
					<td>${item.city_code}</td>
					<td>${item.city_name}</td>
					<td>${item.district_code}</td>
					<td>${item.district_name}</td>
				`;
        } else if (parseInt(level) == CONST_DISTRICT_LEVEL) {
          table += `
					<td>${item.province_code}</td>
					<td>${item.province_name}</td>
					<td>${item.dapil_dpr_ri}</td>
					<td>${item.city_code}</td>
					<td>${item.city_name}</td>
					<td>${item.district_code}</td>
					<td>${item.district_name}</td>
					<td>${item.sub_district_code}</td>
					<td>${item.sub_district_name}</td>
				`;
        }

        table += `
				<td>${item.region_type}</td>
				<td>${item.region_level}</td>
				<td>${item.num_citizen}</td>
				<td>${item.num_family}</td>
				<td>${item.num_voter}</td>
				<td>${item.num_cde}</td>
				<td>${item.num_voter_per_family}</td>
				<td>${item.num_voter_women}</td>
				<td>${item.num_voter_young}</td>
				<td>${item.zone}</td>
				</tr>
				  `;
      });

      table += "</tbody></table></div>";

      // Insert the table into the HTML field
      frmInstance.fields_dict.data_table_wrapper.$wrapper.html(table);
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
      const url = `polmarkdashboard.api.geojson.get_tabular_data?region=Kota Balikpapan&region_level=${mapRenderLevel}&region_code=${region}`;

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
