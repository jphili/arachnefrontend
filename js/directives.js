'use strict';

/* Directives */
angular.module('arachne.directives', [])

	.directive('arEntityTitle', function() {
		return {
			scope: { entity: '=' },
			templateUrl: 'partials/directives/ar-entity-title.html'
		}
	})

	.directive('arSearchNav', function() {
		return {
			templateUrl: 'partials/directives/ar-search-nav.html'
		}
	})

	.directive('arImg', ['arachneSettings', '$http', function(arachneSettings, $http) {
		return {
			scope: {
				imgId: '@',
				imgWidth: '@',
				imgHeight: '@'
			},
			restrict: 'A',
			link: function(scope, element, attrs) {

				scope.loadImg = function() {
					var img = element[0];
					if (scope.imgId) {
						var img = element[0];
						var imgUri = arachneSettings.dataserviceUri + "/image/";
						if (scope.imgWidth) {
							imgUri += "width/" + scope.imgId + "?width=" + scope.imgWidth;
						} else {
							imgUri += "height/" + scope.imgId + "?height=" + scope.imgHeight;
						}
						$http.get(imgUri, { responseType: 'arraybuffer' })
							.success(function(data) {
								var blob = new Blob([data], {type: 'image/jpeg'});
	            				img.src = window.URL.createObjectURL(blob);
							}).error(function(result) {
								img.src = 'img/imagePlaceholder.png';
								if (scope.imgWidth) img.width = scope.imgWidth;
								if (scope.imgHeight) img.height = scope.imgHeight;
							}
						);
					} else {
						img.src = 'img/imagePlaceholder.png';
						if (scope.imgWidth) img.width = scope.imgWidth;
						if (scope.imgHeight) img.height = scope.imgHeight;
					}
				};

				if (element[0].tagName == 'IMG') {
					scope.loadImg();
				} else {
					console.log("Warning: ar-img directive used on a non img element!");
				}

				scope.$watch('imgId', function() {
					scope.loadImg();
				})

			}
		}
	}])

	.directive('arImageslider', [function(){
		return {
			scope: { entity: '=', currentQuery: '=' },
			templateUrl: 'partials/directives/ar-imageslider.html',
			link: function(scope, element, attrs) {

				var thumbRow = angular.element(angular.element(element.children()[0]).children()[0]).children()[2];
				var sliderRow = angular.element(element.children()[0]).children()[0];

				scope.currentImgNo = 0;
				scope.offset = 0;
				scope.max = 50;

				scope.pageThumbsLeft = function() {
					var rowRect = sliderRow.getBoundingClientRect();
					var offset = scope.offset - rowRect.width;
					if (offset > 0) {
						scope.offset = offset;
					} else {
						scope.offset = 0;
					}
				};

				scope.pageThumbsRight = function() {
					var rowRect = sliderRow.getBoundingClientRect();
					var offset = scope.offset + rowRect.width;
					scope.max = thumbRow.getBoundingClientRect().width - rowRect.width;
					if (offset < scope.max) {
						scope.offset = offset;
					} else {
						scope.offset = scope.max;
					}
				};

				scope.setImage = function(imgNo) {
					scope.currentImgNo = imgNo;
					var rowRect = sliderRow.getBoundingClientRect();
					var thumbEl = angular.element(thumbRow).find('img')[imgNo];
					var thumbRect = thumbEl.getBoundingClientRect();
					var relOffset = thumbRect.left - rowRect.left;
					if (relOffset < 0) {
						scope.offset += relOffset;
					} else if (relOffset + thumbRect.width > rowRect.width) {
						scope.offset += relOffset + thumbRect.width - rowRect.width;
					}
				};

			}
		}
	}])

	.directive('arImagegrid', ['arachneSettings', '$http', '$sce', '$window', function(arachneSettings, $http, $sce, $window) {
		return {
			scope: {
				cells: '=',
				columns: '@',
				margin: '@',
				hideTitle: '@',
				complete: '=?'
			},
			templateUrl: 'partials/directives/ar-imagegrid.html',
			
			link: function(scope, element, attrs) {

				scope.loadImage = function(cell) {
        			cell.img = new Image();
					cell.img.addEventListener("load", function() {
						// custom event handlers need to be wrapped in $apply
						scope.$apply(function() {
							cell.complete = true;
							scope.resizeRow(cell.row);
						});
					});
					cell.img.addEventListener("error", function() {
						scope.$apply(function() {
							cell.complete = true;
							cell.img = scope.placeholder;
							scope.resizeRow(cell.row);
						});
					});
					$http.get(cell.imgUri, { responseType: 'blob' })
						.success(function(data) {
							var blob = new Blob([data], {type: 'image/jpeg'});
            				cell.img.src = window.URL.createObjectURL(blob);
						}).error(function(response) {
							cell.img.src = scope.placeholder.src;
						});
				};

				scope.resizeRow = function(row) {

					// only resize if every cell in the row is complete
					for (var i=0; i < row.length; i++) {
						if(!row[i].complete) return;
					}

					var imagesWidth = 0;
					var maxHeight = 0;

					for (var i=0; i < row.length; i++) {
						imagesWidth += row[i].img.naturalWidth;
					}

					var columns = scope.columns;
					var totalWidth = element[0].clientWidth - 1;
					totalWidth -= columns * scope.margin * 2;
					// fill rows with fewer columns
					if (row.length < columns) {
						imagesWidth += (columns - row.length) * (totalWidth / columns)
					}
					var scalingFactor = totalWidth / imagesWidth;

					for (var i=0; i < row.length; i++) {
						row[i].width = row[i].img.naturalWidth * scalingFactor;
						if (scalingFactor > 1) {
							row[i].imgWidth = row[i].img.naturalWidth;
						} else {
							row[i].imgWidth = row[i].width;
						}
						var height;
						if (scalingFactor > 1) {
							height = row[i].img.naturalHeight;
						} else {
							height = row[i].img.naturalHeight * scalingFactor;
						}
						if (height > maxHeight) maxHeight = height;
					}

					for (var i=0; i < row.length; i++) {
						row[i].height = maxHeight;
					}

					row.complete = true;
					for (var i = 0; i < scope.grid.length; i++) {
						if (!scope.grid[i].complete) {
							scope.complete = false;
							break;
						} else {
							scope.complete = true;
						}
					}

				};

				angular.element($window).bind('resize', function() {
					scope.$apply(function() {
						scope.complete = false;
						for (var i = 0; i < scope.grid.length; i++) {
							var row = scope.grid[i];
							row.complete = false;
							scope.resizeRow(row);
						}
					});
				});

			},

			controller: function($scope) {

				$scope.placeholder = new Image();
				$scope.placeholder.src = 'img/imagePlaceholder.png';
				$scope.complete = false;

				$scope.$watch('cells', function(newCells, oldCells) {

					if (typeof newCells == 'undefined' || !newCells) return;

					var columns = $scope.columns;
					var rows = Math.ceil($scope.cells.length / columns);
					$scope.grid = new Array(rows);
					for (var i = 0; i < rows; i++) {
						$scope.grid[i] = new Array(columns);
						for (var k = 0; k < columns; k++) {
							if (i*columns+k >= $scope.cells.length) break;
							var index = i * columns + k;
							var cell = $scope.cells[index];
							$scope.grid[i][k] = cell;
							cell.row = $scope.grid[i];
							$scope.grid[i].complete = false;
							if (typeof cell.imgUri == 'undefined') {
								cell.imgUri = $scope.placeholder.src;
							}
							$scope.loadImage(cell);
						}
					}
					
				});
			
			}
		}
	}])

	.directive('arImagegridCell', ['$sce', function($sce) {
		return {
			scope: {
				href: '@', img: '=', cellTitle: '@', cellSubtitle: '@', cellLabel: '@', imgUri: '@',
				cellWidth: '@', imgWidth: '@', cellHeight: '@', cellMargin: '@', hideTitle: '@'
			},
			templateUrl: 'partials/directives/ar-imagegrid-cell.html'
		}
	}])

	.directive('arFacetBrowser', ['Entity', '$location', function(Entity, $location) {
		return {

			scope: { query: '=', facetName: '@', contextSize: '=' },
			templateUrl: 'partials/directives/ar-facet-browser.html',

			link: function(scope, element, attrs) {

				scope.entities = [];
				scope.facetValues = [];
				scope.facetQueries = [];

				Entity.query(scope.query.toFlatObject(), function(data) {
					scope.contextSize = data.size;
					for (var i = 0; i < data.facets.length; i++) {
						if (scope.facetName == data.facets[i].name) {
							scope.facetValues = data.facets[i].values;
							for (var k = 0; k < scope.facetValues.length; k++) {
								scope.facetQueries[k] = scope.query.addFacet(scope.facetName, scope.facetValues[k].value);
								// ugly exception for sorting book pages when showing contexts of a book
								if (scope.facetValues[k].value == 'Buchseiten' && scope.query.q.lastIndexOf('connectedEntities', 0) === 0) {
									scope.facetQueries[k] = scope.facetQueries[k].setParam('sort','subtitle');
								}
							}
						}
					}
				});

				scope.loadEntities = function(facetValueNo) {
					var facetQuery = scope.facetQueries[facetValueNo];
					facetQuery.limit = 100;
					Entity.query(facetQuery.toFlatObject(), function(data) {
						scope.entities[facetValueNo] = data.entities;
					});
				};

			}

		}
	}])

	.directive('arActiveFacets', function() {
		return {
			scope: {
				route: '@',
				currentQuery: '=',
				hiddenFacets: '='
			},
			templateUrl: 'partials/directives/ar-active-facets.html',
			link: function(scope) {
				var facets = scope.currentQuery.facets || [];

				if (scope.hiddenFacets) {
					facets = facets.filter(function(facet) {
						for (var i = 0; i < scope.hiddenFacets.length; i++) {
							var hiddenFacet = scope.hiddenFacets[i];
							if ((hiddenFacet.key == facet.key) && (hiddenFacet.value == facet.value)) {
								return false;
							}
						}
						return true;
					});
				}

				scope.facets = facets;
			}
		}
	})

	.directive('threedimensional', ['$window', '$q', function ($window, $q) {
		return {
		
			restrict: 'A',
			
			link: function (scope, element, attrs) { // function content is optional
				// in this example, it shows how and when the promises are resolved
				var load_script = function() {
					var paths = [
						"lib/3d/three.js/three.min.js",
						"lib/3d/three.js/Detector.js",
						"lib/3d/three.js/controls/ArachneTrackballControls.js",
						"lib/3d/three.js/controls/ArachneFirstPersonControls.js",
						"lib/3d/three.js/loaders/ArachneOBJLoader.js",
						"lib/3d/three.js/loaders/ArachneMTLLoader.js",        
						"lib/3d/three.js/loaders/ArachneOBJMTLLoader.js",
						"lib/3d/three.js/loaders/ArachneSTLLoader.js",
						//"lib/3d/three.js/Stats.js",        
						"lib/3d/threex/THREEx.screenshot.js",
						"lib/3d/threex/THREEx.FullScreen.js",
						//"lib/3d/libs/heartcode-canvasloader-min.js",
						//"lib/3d/libs/dat.gui.min.js",
						"lib/3d/viewer.js"
					];

					var pathsCount = paths.length
					var loadingIndex = 0;

					var listener = function () {
						loadingIndex++;
						if(loadingIndex<pathsCount) {
							var scriptTag = document.createElement('script'); // use global document since Angular's $document is weak
							scriptTag.src = paths[loadingIndex];
							document.body.appendChild(scriptTag);

							scriptTag.addEventListener('load', listener, false);
						} else {
							initialize();
						}
					}

					var newScriptTag = document.createElement('script'); // use global document since Angular's $document is weak
					newScriptTag.src = paths[loadingIndex];
					document.body.appendChild(newScriptTag);
					newScriptTag.addEventListener('load', listener, false);
				};
				
				var lazyLoadApi = function(key) {

					var deferred = $q.defer();
					$window.initialize = function () {
						deferred.resolve();
					};
					// thanks to Emil Stenström: http://friendlybit.com/js/lazy-loading-asyncronous-javascript/
					if ($window.attachEvent) {
						$window.attachEvent('onload', load_script);
					} else {
						if (document.readyState === "complete") {
							load_script();
						} else {
							$window.addEventListener('load', load_script, false);
						}
						
					}

					return deferred.promise;
				};


				if ($window.THREE) {
					console.log('lazyloading-libs: libs ALREADY loaded');
					init();
				} else {
					lazyLoadApi().then(function () {
						console.log('lazyloading-libs: promise resolved');
						if ($window.THREE) {
							console.log('lazyloading-libs:  loaded');
						} else {
							console.log('lazyloading-libs:  not loaded');
						}
					}, function () {
						console.log('lazyloading-libs: promise rejected');
					});
				}
			}
		}
	}])

	.directive('entitymap', ['$location', '$filter', function($location, $filter) {
	return {
		restrict: 'A',
		scope: {
			found:"=",
			depo:"="
		},
		link: function(scope, element, attrs) {


			var map = L.map('entitymap').setView([40, -10], 3);

			var layer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				maxZoom: 18,
				minZoom: 3
			});
			
			map.addLayer(layer);
			map.trackResize = true;	
			L.Icon.Default.imagePath = 'img';

			var foundMarker = null;
			var depoMarker = null;

			var loadMarkers = function() {

				var group = new L.featureGroup();

				if(scope.found){
					var item = scope.found[0];
					var coordsString = item.substring(item.indexOf("[", 1)+1, item.length - 1);
					var coords = coordsString.split(',');
					var facetI18n = $filter('transl8')("facet_fundort");
					var title = "<b>" + item.substring(0, item.indexOf("[", 1)) + "</b><br/>";
					var text = item.substring(0, item.indexOf("[", 1)) + " ";
					// Popup-Title auf Karte für Suchergebnis
					title = '<h4 class="text-info centered">' + facetI18n + '</h4>' + title;
					text = facetI18n + ": " + text;
					
					foundMarker = L.marker(new L.LatLng(coords[0], coords[1]), { title: text });
					foundMarker.bindPopup(title);
					map.addLayer(foundMarker);
				}

				if(scope.depo){
					var item = scope.depo[0];
					var coordsString = item.substring(item.indexOf("[", 1)+1, item.length - 1);
					var coords = coordsString.split(',');
					var facetI18n = $filter('transl8')("facet_aufbewahrungsort");
					var title = "<b>" + item.substring(0, item.indexOf("[", 1)) + "</b><br/>";
					var text = item.substring(0, item.indexOf("[", 1)) + " ";
					// Popup-Title auf Karte für Suchergebnis
					title = '<h4 class="text-info centered">' + facetI18n + '</h4>' + title;
					text = facetI18n + ": " + text;
					
					depoMarker = new L.marker(new L.LatLng(coords[0], coords[1]), { title: text });
					depoMarker.bindPopup(title);
					map.addLayer(depoMarker);
				}

				if(!scope.depo)
					var mark = L.featureGroup([foundMarker]);
				else if(!scope.found)
					var mark = new L.featureGroup([depoMarker]);
				else {
					var mark = new L.featureGroup([foundMarker, depoMarker]);
				}
				map.fitBounds(mark.getBounds());
				//map.setZoom(8);

				map._onResize(); 
			}
			loadMarkers();

		}
	};
	}])

	// Shows a number of Place objects on a Leaflet map as MarkerClusters
	.directive('arPlacesMap', ['$location', '$compile', 'MapConfig', function($location, $compile, MapConfig) {
	return {
		restrict: 'A',
		scope: {
			places: '=',
			currentQuery: '=',
			searchFunction: '=',
			mapConfig: '=',
			clustered: '='
		},
		link: function(scope, element, attrs) {

			var selectFacetsAndCreateMarkers = function(markerClusterGroup, map) {

				markerClusterGroup = new L.MarkerClusterGroup({
					iconCreateFunction: function(cluster) {

						var markers = cluster.getAllChildMarkers();
						var entityCount = 0;
						for (var i = 0; i < markers.length; i++) {
							entityCount += markers[i].options.entityCount;
						}

						var childCount = cluster.getChildCount();

						var c = ' marker-cluster-';
						if (childCount < 10) {
							c += 'small';
						} else if (childCount < 100) {
							c += 'medium';
						} else {
							c += 'large';
						}

						return new L.DivIcon({ html: '<div><span>' + entityCount+ ' at ' + childCount + ' Places</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
					}
				});

				if(scope.places) {
					for(var i=0; i < scope.places.length; i++){
						var place = scope.places[i];

						if (place.hasCoordinates()) {
							// Dom-Element für Popup bauen und in Link-Funktion kompilieren
							var html = '<div ar-map-popup place="place"></div>';
							var linkFunction = $compile(angular.element(html));
							var newScope = scope.$new(true);
							newScope.place = place;

							// Marker-Objekt anlegen, mit DOM von ausgeführter Link-Funktion verknüpfen
							var marker = L.marker(new L.LatLng(place.location.lat, place.location.lon), { entityCount : place.entityCount });
							marker.bindPopup(linkFunction(newScope)[0]);
							if (scope.clustered) {
								markerClusterGroup.addLayer(marker);
							} else {
								map.addLayer(marker);
							}
						}
					}
				}

				map.addLayer(markerClusterGroup);
			}

			// gets overlays from mapConfig, returns an object with all overlays
			// ordered to their keys regardless of their previous ordering
			var extractOverlays = function() {
				var result = {}
				var overlays = scope.mapConfig.overlays;
				// overlays are either grouped at .groups
				if (overlays && overlays.groups) {
					for (var i = 0; i < overlays.groups.length; i++) {
						var group = overlays.groups[i];

						for (var j = 0; j < group.overlays.length; j++) {
							var overlay = group.overlays[j];
							result[overlay.key] = overlay;
						}
					}
				// or just listed directly
				} else if (overlays) {
					for (var i = 0; i < overlays.length; i++) {
						var overlay = overlays[i];
						result[overlay.key] = overlay;
					}
				}
				return result
			}

			// displays an overlay on the map
			var addOverlay = function(map, overlay) {
				if (overlay && overlay.type == 'wms') {
					var wms = L.tileLayer.wms(overlay.url, overlay.layerOptions);
					map.addLayer(wms);
				}
			}

			// initialise standard mapConfig, overwrite with values from scope.mapConfig
			// if present
			scope.mapConfig = new MapConfig().merge(scope.mapConfig);

			// contains all usable Overlays { overlay.key: overlay }
			var _overlays = extractOverlays();

			// the layer with markers (has to be recreated when places change)
			var markerClusterGroup = null;

			var lat = scope.currentQuery.lat || 40;
			var lng = scope.currentQuery.lng || -10;
			var zoom = scope.currentQuery.zoom || 3;

			var baselayerName = scope.currentQuery.baselayer || scope.mapConfig.defaultBaselayer;

			var map = L.map(element.attr('id'), { zoomControl: false }).setView([lat, lng], zoom);

			// register zoom level and central map position in the Query object
			// to always keep the current map position on reload
			map.on('moveend', function() {
				scope.currentQuery.zoom = map.getZoom();
				scope.currentQuery.lat = map.getCenter().lat;
				scope.currentQuery.lng = map.getCenter().lng;
			})

			var layerConfig = scope.mapConfig.baselayers[baselayerName];
			var baselayer = L.tileLayer(layerConfig.url, layerConfig.layerOptions);
			map.addLayer(baselayer);
			L.Icon.Default.imagePath = 'img';

			// which overlays (from _overlays) are to be created is given
			// by their keys in the URL
			var keys = scope.currentQuery.getArrayParam('overlays');
			for (var i = 0; i < keys.length; i++) {
				addOverlay(map, _overlays[keys[i]]);
			}

			selectFacetsAndCreateMarkers(markerClusterGroup, map);
		}
	};
	}])

	.directive('arMapMenu', ['$location', 'MapConfig', function($location, MapConfig) {
	return {
		restrict: 'A',
		scope: {
			resultSize: '=',
			mapfacet: '=',
			mapfacetNames: '=',
			currentQuery: '=',
			facets: '=',
			mapConfig: '='
		},
		templateUrl: 'partials/directives/ar-map-menu.html',
		link: function(scope, element, attrs) {

			// initialise standard mapConfig, overwrite with values from scope.mapConfig
			// if present
			scope.mapConfig = new MapConfig().merge(scope.mapConfig);

			var geofacets = ['facet_fundort', 'facet_aufbewahrungsort', 'facet_geo', 'facet_ort', 'facet_geogrid']

			scope.route = $location.path().slice(1);

			scope.go = function(path) {
				$location.url(path);
			};

			scope.toggleOverlay = function(key) {
				var keys = scope.currentQuery.getArrayParam('overlays');

				var idx = keys.indexOf(key);
				if (idx > -1) {
					keys.splice(idx, 1);
				} else {
					keys.push(key);
				}

				scope.go(scope.currentQuery.setParam('overlays', keys).toString());
			};

			scope.toggleBaselayer = function(key) {
				scope.go(scope.currentQuery.setParam('baselayer', key).toString());
			}

			scope.toggleLayerMenu = function() {
				scope.showLayerMenu = !scope.showLayerMenu;
			};

			scope.q = scope.currentQuery.q;
			scope.facetLimit = scope.currentQuery.fl;
			scope.baselayerKey = scope.currentQuery.baselayer || scope.mapConfig.defaultBaselayer;

			var keys = scope.currentQuery.getArrayParam('overlays');

			scope.selectedOverlays = {}
			for (var i = 0; i < keys.length; i++) {
				scope.selectedOverlays[keys[i]] = true;
			}

			scope.showLayerMenu = false;
			if (keys.length > 0) {
				scope.showLayerMenu = true;
			}

			var facetsHidden = geofacets;
			if (scope.menuFacetsDeny) {
				facetsHidden = facetsHidden.concat(scope.mapConfig.menuFacetsDeny);
			}

			// determine shown facets after facets are loaded
			scope.facetsShown = [];
			scope.$watch('facets', function(facets) {
				// facetsShown is either the ordered list defined in mapConfig.menuFacetsAllow
				if (facets && scope.mapConfig.menuFacetsAllow) {
					for (var i = 0; i < scope.mapConfig.menuFacetsAllow.length; i++) {
						var name = scope.mapConfig.menuFacetsAllow[i];
						var result = facets.filter(function (facet) {
							return (facet.name == name);
						});
						if (result[0]) {
							scope.facetsShown.push(result[0]);
						}
					}
				// or it is scope.facets pruned by everything in facetsHidden
				} else if(facets && facetsHidden) {
					scope.facetsShown = facets.filter(function (facet) {
						return (facetsHidden.indexOf(facet.name) == -1)
					});
				}
			});
		}
	};
	}])

	.directive('arMapMenuSearchInfo', ['searchService', 'placesService', function(searchService, placesService) {
	return {
		restrict: 'A',
		scope: {
			mapConfig: '='
		},
		templateUrl: 'partials/directives/ar-map-menu-search-info.html',
		link: function(scope) {
			placesService.getCurrentPlaces().then(function(places) {
				scope.entityCount = searchService.getSize();
				scope.placesCount = places.length;
			});
		}
	}
	}])

	.directive('arMapMenuSearchField', ['$location', 'searchService', function($location, searchService) {
	return {
		restrict: 'A',
		scope: {
			mapConfig: '=',
			q: '@?'
		},
		templateUrl: 'partials/directives/ar-map-menu-search-field.html',
		link: function(scope) {

			var route = $location.path().slice(1);
			var currentQuery = searchService.currentQuery();

			searchService.getCurrentPage().then(function() {
				scope.q = currentQuery.q
				if (!scope.q) {
					scope.q = '*';
				}
			});

			scope.go = function(q) {
				var path = '/' + route + currentQuery.setParam('q',q).toString();
				$location.url(path);
			};
		}
	}
	}])

	.directive('arMapMenuFacetSearch', ['$location', 'searchService', 'MapConfig', function($location, searchService, MapConfig) {
	return {
		restrict: 'A',
		scope: {
			mapConfig: '='
		},
		templateUrl: 'partials/directives/ar-map-menu-facet-search.html',
		link: function(scope) {

			scope.mapConfig = new MapConfig().merge(scope.mapConfig);
			scope.route = $location.path().slice(1)
			scope.entityCount = null;
			scope.facetsShown = [];

			searchService.getCurrentPage().then(function() {
				scope.entityCount = searchService.getSize();
				scope.currentQuery = searchService.currentQuery();

				// facetsShown is either the ordered list defined in mapConfig.menuFacetsAllow
				var facets = searchService.getFacets();
				if (facets && scope.mapConfig.menuFacetsAllow) {
					for (var i = 0; i < scope.mapConfig.menuFacetsAllow.length; i++) {
						var name = scope.mapConfig.menuFacetsAllow[i];
						var result = facets.filter(function (facet) {
							return (facet.name == name);
						});
						if (result[0]) {
							scope.facetsShown.push(result[0]);
						}
					}
				// or it is scope.facets pruned by everything in facetsHidden
				} else if(facets && facetsHidden) {
					scope.facetsShown = facets.filter(function (facet) {
						return (facetsHidden.indexOf(facet.name) == -1)
					});
				}
			});

			scope.go = function(facetName, facetValue) {
				var path = scope.currentQuery.addFacet(facetName,facetValue).removeParam('offset').toString()
				$location.url(path);
			};
		}
	}
	}])

	.directive('arMapMenuOverlays', ['$location', 'searchService', 'MapConfig', function($location, searchService, MapConfig) {
	return {
		restrict: 'A',
		scope: {
			overlays: '=',
			mapConfig: '='
		},
		templateUrl: 'partials/directives/ar-map-menu-overlays.html',
		link: function(scope) {

			var currentQuery = searchService.currentQuery();
			var keys = currentQuery.getArrayParam('overlays');

			scope.selectedOverlays = {};
			scope.mapConfig = new MapConfig().merge(scope.mapConfig);

			scope.toggleOverlay = function(key) {

				var idx = keys.indexOf(key);
				if (idx > -1) {
					keys.splice(idx, 1);
				} else {
					keys.push(key);
				}

				$location.url(currentQuery.setParam('overlays', keys).toString());
			};

			for (var i = 0; i < keys.length; i++) {
				scope.selectedOverlays[keys[i]] = true;
			}

		}
	}
	}])

	.directive('arMapMenuBaselayer', ['$location', 'searchService', function($location, searchService) {
	return {
		restrict: 'A',
		scope: {
			mapConfig: '='
		},
		templateUrl: 'partials/directives/ar-map-menu-baselayer.html',
		link: function(scope) {
			var currentQuery = searchService.currentQuery();

			scope.mapConfig = new MapConfig().merge(scope.mapConfig);
			scope.chosenBaselayer = currentQuery.baselayer || "osm";

			scope.toggleBaselayer = function(key) {
				$location.url(currentQuery.setParam('baselayer', key).toString());
			}
		}
	}
	}])

	.directive('arMapPopup', ['MapConfig', function(MapConfig) {
	return {
		restrict: 'A',
		scope: {
			place: '='
		},
		templateUrl: 'partials/directives/ar-map-popup.html',
		link: function(scope) {
			// do nothing for now
		}
	};
	}])

	.directive('zoomifyimg', ['arachneSettings', '$http', function(arachneSettings, $http) {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) 
			{
				/*
				 * L.TileLayer.Zoomify display Zoomify tiles with Leaflet
				 */
				L.TileLayer.Zoomify = L.TileLayer.extend({

					options: {
						continuousWorld: true,
						tolerance: 0.8
					},

					initialize: function (entityId, options) {
						options = L.setOptions(this, options);
						this._entityId = entityId;

						var imageSize = L.point(options.width, options.height),
							tileSize = options.tileSize;

						this._imageSize = [imageSize];
						this._gridSize = [this._getGridSize(imageSize)];

						while (parseInt(imageSize.x) > tileSize || parseInt(imageSize.y) > tileSize) {
							imageSize = imageSize.divideBy(2).floor();
							this._imageSize.push(imageSize);
							this._gridSize.push(this._getGridSize(imageSize));
						}

						this._imageSize.reverse();
						this._gridSize.reverse();

						this.options.maxZoom = this._gridSize.length - 1;
						var southWest = map.unproject([0, options.height], this.options.maxZoom);
						var northEast = map.unproject([options.width, 0], this.options.maxZoom);
						map.setMaxBounds(new L.LatLngBounds(southWest, northEast));

					},

					onAdd: function (map) {
						L.TileLayer.prototype.onAdd.call(this, map);
						var mapSize = map.getSize(),
							zoom = this._getBestFitZoom(mapSize),
							imageSize = this._imageSize[zoom],
							center = map.options.crs.pointToLatLng(L.point(imageSize.x/2, imageSize.y/2), zoom);

						map.setView(center, zoom, true);
					},

					_getGridSize: function (imageSize) {
						var tileSize = this.options.tileSize;
						return L.point(Math.ceil(imageSize.x / tileSize), Math.ceil(imageSize.y / tileSize));
					},

					_getBestFitZoom: function (mapSize) {
						var tolerance = this.options.tolerance,
							zoom = this._imageSize.length - 1,
							imageSize, zoom;

						while (zoom) {
							imageSize = this._imageSize[zoom];
							if (imageSize.x * tolerance < mapSize.x && imageSize.y * tolerance < mapSize.y) {
								return zoom;
							}			
							zoom--;
						}

						return zoom;
					},

					_tileShouldBeLoaded: function (tilePoint) {
						var gridSize = this._gridSize[this._map.getZoom()];
						return (tilePoint.x >= 0 && tilePoint.x < gridSize.x && tilePoint.y >= 0 && tilePoint.y < gridSize.y);
					},

					_addTile: function (tilePoint, container) {
						var tilePos = this._getTilePos(tilePoint),
							tile = this._getTile(),
							zoom = this._map.getZoom(),
							imageSize = this._imageSize[zoom],
							gridSize = this._gridSize[zoom],
							tileSize = this.options.tileSize;

						if (tilePoint.x === gridSize.x - 1) {
							tile.style.width = imageSize.x - (tileSize * (gridSize.x - 1)) + 'px';
						} 

						if (tilePoint.y === gridSize.y - 1) {
							tile.style.height = imageSize.y - (tileSize * (gridSize.y - 1)) + 'px';			
						} 

						L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome || L.Browser.android23);

						this._tiles[tilePoint.x + ':' + tilePoint.y] = tile;
						this._loadTile(tile, tilePoint);

						if (tile.parentNode !== this._tileContainer) {
							container.appendChild(tile);
						}
					},

					// override to use XHR instead of regular image loading
					_loadTile: function (tile, tilePoint) {
						tile._layer  = this;
						tile.onload  = this._tileOnLoad;
						tile.onerror = this._tileOnError;

						this._adjustTilePoint(tilePoint);
						var imgUri = this.getTileUrl(tilePoint);
						$http.get(imgUri, { responseType: 'arraybuffer' })
							.success(function(data) {
								var blob = new Blob([data], {type: 'image/jpeg'});
	            				tile.src = window.URL.createObjectURL(blob);
							}
						);

						this.fire('tileloadstart', {
							tile: tile,
							url: tile.src
						});
					},

					getTileUrl: function (tilePoint) {
						return arachneSettings.dataserviceUri + '/image/zoomify/' + this._entityId + '/' + this._map.getZoom() + '-' + tilePoint.x + '-' + tilePoint.y + '.jpg';
					},

					_getTileGroup: function (tilePoint) {
						var zoom = this._map.getZoom(),
							num = 0,
							gridSize;

						for (var z = 0; z < zoom; z++) {
							gridSize = this._gridSize[z];
							num += gridSize.x * gridSize.y; 
						}	

						num += tilePoint.y * this._gridSize[zoom].x + tilePoint.x;
						return Math.floor(num / 256);
					}

				});

				L.tileLayer.zoomify = function (entityId, options) {
					return new L.TileLayer.Zoomify(entityId, options);
				};
				var map = L.map(element[0]).setView([0,0], 0);
				L.tileLayer.zoomify(attrs.entityid, {
					width: scope.imageProperties.width,
					height: scope.imageProperties.height,
					tileSize : scope.imageProperties.tilesize,
					tolerance: 0.8
				}).addTo(map);

			}
		};
	}])
	.directive('autofillfix', ['$timeout', function ($timeout) {
			return {
				link: function(scope, elem, attrs) {
					// Fixes Chrome bug: https://groups.google.com/forum/#!topic/angular/6NlucSskQjY
					elem.prop('method', 'POST');

					// Fix autofill issues where Angular doesn't know about autofilled inputs
					if(attrs.ngSubmit) {
						$timeout(function() {

							elem.unbind('submit').bind('submit', function (e) {
								e.preventDefault();
								var arr = elem.find('input');
								if (arr.length > 0) {
									arr.triggerHandler('input').triggerHandler('change').triggerHandler('keydown');
									scope.$apply(attrs.ngSubmit);
								}
							});
						}, 0);
					}
				}
			};
 		}]
 	)
 	.directive('focusMe', function ($timeout) {    
	    return {    
	        link: function (scope, element, attrs, model) {                
	            $timeout(function () {
	                element[0].focus();
	            });
	        }
	    };
	});
