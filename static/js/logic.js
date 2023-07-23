let newYorkCoords = [40.73, -74.0059];
let mapZoomLevel = 12;

let streetMap = L.tileLayer(
  `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`,
  {
    attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`,
  }
);

// Initialize the layers
let layers = {
  COMING_SOON: new L.LayerGroup(),
  EMPTY: new L.LayerGroup(),
  LOW: new L.LayerGroup(),
  NORMAL: new L.LayerGroup(),
  OUT_OF_ORDER: new L.LayerGroup(),
};

// Create the map with the layers
let map = L.map("map-id", {
  center: newYorkCoords,
  zoom: mapZoomLevel,
  layers: [
    layers.COMING_SOON,
    layers.EMPTY,
    layers.LOW,
    layers.NORMAL,
    layers.OUT_OF_ORDER,
  ],
});

// Add "streetmap" to the map
streetMap.addTo(map);

// Create an overlays object to add to the layer control
let overlays = {
  "Coming Soon": layers.COMING_SOON,
  "Empty Stations": layers.EMPTY,
  "Low Stations": layers.LOW,
  "Healthy Stations": layers.NORMAL,
  "Out of Order": layers.OUT_OF_ORDER,
};

// Create a control for the layers, add the overlays to it
L.control
  .layers(null, overlays, {
    collapsed: false,
  })
  .addTo(map);

// Create a legend
let info = L.control({
  position: "bottomright",
});

// When the layer control is added, insert a div with the class of "legend"
info.onAdd = function () {
  let div = L.DomUtil.create("div", "legend");
  div.style.backgroundColor = "white";
  div.style.padding = "5px";
  return div;
};

// Add the info legend to the map
info.addTo(map);

// Initialize an object that contains icons for each layer group
let icons = {
  COMING_SOON: L.ExtraMarkers.icon({
    icon: "ion-settings",
    iconColor: "white",
    markerColor: "yellow",
    shape: "star",
  }),
  EMPTY: L.ExtraMarkers.icon({
    icon: "ion-android-bicycle",
    iconColor: "white",
    markerColor: "red",
    shape: "circle",
  }),
  OUT_OF_ORDER: L.ExtraMarkers.icon({
    icon: "ion-minus-circled",
    iconColor: "white",
    markerColor: "blue-dark",
    shape: "penta",
  }),
  LOW: L.ExtraMarkers.icon({
    icon: "ion-android-bicycle",
    iconColor: "white",
    markerColor: "orange",
    shape: "circle",
  }),
  NORMAL: L.ExtraMarkers.icon({
    icon: "ion-android-bicycle",
    iconColor: "white",
    markerColor: "green",
    shape: "circle",
  }),
};

// Perform an API call to the Citi Bike station information endpoint
d3.json("https://gbfs.citibikenyc.com/gbfs/en/station_information.json").then(
  function (infoRes) {
    // When this API call completes, perform another call to the Citi Bike station status endpoint
    d3.json("https://gbfs.citibikenyc.com/gbfs/en/station_status.json").then(
      function (statusRes) {
        let updatedAt = infoRes.last_updated;
        let stationStatus = statusRes.data.stations;
        let stationInfo = infoRes.data.stations;

        // Create an object to keep the number of markers in each layer.
        let stationCount = {
          COMING_SOON: 0,
          EMPTY: 0,
          LOW: 0,
          NORMAL: 0,
          OUT_OF_ORDER: 0,
        };
        let stationStatusCode;

        // Loop through the stations
        for (let i = 0; i < stationInfo.length; i++) {
          // Create a new station object with poperties of both station objects.
          let station = Object.assign({}, stationInfo[i], stationStatus[i]);

          // If a station is listed but not installed, it's coming soon.
          if (!station.is_installed) {
            stationStatusCode = "COMING_SOON";
          }
          // If a station has no available bikes, it's empty
          else if (!station.num_bikes_available) {
            stationStatusCode = "EMPTY";
          }
          // If a station is installed but isn't renting, it's out of order
          else if (station.is_installed && !station.is_renting) {
            stationStatusCode = "OUT_OF_ORDER";
          }
          // If a station has less than 5 bikes, it's status is low
          else if (station.num_bikes_available < 5) {
            stationStatusCode = "LOW";
          }
          // Otherwise, the station is normal.
          else {
            stationStatusCode = "NORMAL";
          }

          // Update the station count
          stationCount[stationStatusCode]++;
          // Create a new marker with the appropriate icon and coordinates
          let newMarker = L.marker([station.lat, station.lon], {
            icon: icons[stationStatusCode],
          });
          // Add the new marker to the appropriate layer
          newMarker.addTo(layers[stationStatusCode]);

          // Bind a popup to the marker that will dislay on being clicked. This will be rendered as HTML
          newMarker.bindPopup(
            station.name +
              "<br> Capacity: " +
              station.capacity +
              "<br>" +
              station.num_bikes_available +
              " Bikes Available"
          );
        }
        // Call the update legend function
        updateLegend(updatedAt, stationCount);
      }
    );
  }
);
// Update the legend's innerHTML with the last updated time and station count.
function updateLegend(time, stationCount) {
  document.querySelector(".legend").innerHTML = [
    "<p>Updated: " + moment.unix(time).format("h:mm:ss A") + "</p>",
    "<p class='out-of-order'>Out of Order Stations: " +
      stationCount.OUT_OF_ORDER +
      "</p>",
    "<p class='coming-soon'>Stations Coming Soon: " +
      stationCount.COMING_SOON +
      "</p>",
    "<p class='empty'>Empty Stations: " + stationCount.EMPTY + "</p>",
    "<p class='low'>Low Stations: " + stationCount.LOW + "</p>",
    "<p class='healthy'>Healthy Stations: " +
      stationCount.NORMAL +
      "</p>",
  ].join("");
}