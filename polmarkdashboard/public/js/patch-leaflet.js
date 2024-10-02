L.Map.include({
	_initControlPos: function () {
		var corners = (this._controlCorners = {}),
			l = "leaflet-",
			container = (this._controlContainer = L.DomUtil.create(
				"div",
				l + "control-container",
				this._container
			));

		function createCorner(vSide, hSide) {
			var className = l + vSide + " " + l + hSide;

			corners[vSide + hSide] = L.DomUtil.create("div", className, container);
		}

		createCorner("top", "left");
		createCorner("top", "right");
		createCorner("bottom", "left");
		createCorner("bottom", "right");

		createCorner("top", "center");
		createCorner("middle", "center");
		createCorner("middle", "left");
		createCorner("middle", "right");
		createCorner("bottom", "center");
	},
});
