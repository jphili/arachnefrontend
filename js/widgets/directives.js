'use strict';

/* Widget directives */
angular.module('arachne.widgets.directives', [])
	.directive('con10tItem', function() {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				attrs.$observe('con10tItem', function(value) {
					element.attr("href", "http://arachne.dainst.org/entity/" + value);
				});
			}
		}
	})

	.directive('con10tSearchQuery', function() {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				
				attrs.$observe('con10tSearchQuery', function(value) {
					scope.q = value;
					updateHref();
				});

				attrs.$observe('con10tSearchFacet', function(value) {
					scope.fq = value;
					updateHref();
				});

				function updateHref() {
					var href = "http://arachne.dainst.org/search?q=" + scope.q;		
					if (scope.fq) href += "&fq=" + scope.fq;
					element.attr("href", href);
				}

			}
		}
	})

	.directive('con10tPage', function() {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				attrs.$observe('con10tPage', function(value) {
					element.attr("href", "http://arachne.dainst.org/project/" + value);
				});
			}
		}
	})

	.directive('con10tToc', ['$location', '$anchorScroll', function ($location, $anchorScroll) {
		return {
			restrict: 'E',
			scope: {
				tocHeading: '@'
			},
			templateUrl: 'partials/widgets/con10t-toc.html',
			link: function(scope, element, attrs) {
				var headings = document.querySelectorAll(".con10t-toc-entry");

				scope.toc = [];

				for(var i = 0; i < headings.length; i++) {
					var headingID = headings[i].textContent.replace(/ /g, "_");
					var heading = {
						target: headingID,
						text: headings[i].textContent,
						depth: "con10t-toc-item level-" + headings[i].tagName.charAt(1)
					};
					headings[i].id = headingID;
					scope.toc.push(heading);
				}

				// Angular seems to do anchorScroll() directly on load. But without the scope initialized, the targets are not yet
				// existing. Therefore: Try a delayed anchorScroll() after the scope is initialized, if there is an existing hash.
				if($location.hash() != ""){
                    $anchorScroll();
				}

				scope.scrollTo = function(id) {
                    $location.hash(id);
					$anchorScroll()
				}
			}
		};
	}])

	.directive('con10tCatalogTree', ['Catalog', '$filter', function(Catalog, $filter) {
		return {
			restrict: 'E',
			scope: {
				catalogId: '@',
				heading: '='
			},
			templateUrl: 'partials/widgets/con10t-catalog-tree.html',
			link: function(scope) {
				
				scope.catalog = Catalog.get({id:scope.catalogId});
				scope.isShown = {};
				
				scope.escapePath = function(path){
					return $filter('escapeSlashes')(path)
				};
				
				scope.toggleCollapse = function(label){
					scope.isShown[label] = !scope.isShown[label];
				};
				
				scope.checkIfShown = function(label){
					return scope.isShown[label]; // at first load -> undefined, so it gets hidden but: ugly?
				};

			}
		};
	}])

	.directive('con10tCatalogMap', ['searchService', function(searchService) {
		return {
			restrict: 'E',
			scope: {
				overlays: '=',
				mapConfig: '='
			},
			templateUrl: 'partials/widgets/con10t-catalog-map.html',
			link: function(scope) {
				// Add restrictions for facets to the search if defined in mapConfig
				var facets = scope.mapConfig.facetsSelect;

				if (facets) {
					var query = searchService.currentQuery();

					for (var i = 0; i < facets.length; i++) {
						var facet = facets[i];

						if (!query.hasFacet(facet.key)) {
							query.facets.push(facet);
						}
					}
				}
			}
		};
	}])

    .directive('con10tSearch', ['$location', '$filter', function($location, $filter) {

        return {
            restrict: 'E',
            templateUrl: 'partials/widgets/con10t-search.html',
			scope: {
				catalogId: '@',
				fq: '@'
			},
			link: function(scope, element, attrs) {
            scope.placeholder = attrs.searchPlaceholder;
            scope.slashRegex  = /\//g;

            if(!scope.placeholder)
               scope.placeholder = $filter('transl8')('ui_projectsearchplaceholder');

				scope.search = function() {
              	var url = "search/?q=";
					if(scope.catalogId != undefined && scope.catalogId != "")
						url += "catalogPaths:"+$filter('escapeSlashes')(scope.catalogId)+"+";

               if(scope.q != null && scope.q != "")
                  url += scope.q;
					else
						url += "*";

					if(scope.fq != undefined && scope.fq != "")
               {
                  var split = scope.fq.split(':');
                  url += '&fq='+split[0]+':"'+split[1]+'"';
               }
					$location.url(url);
				};
			}
        };
    }])
	.directive('con10tTree', ['Query', 'Entity', '$location', function(Query, Entity, $location){
        return {
           restrict: 'E',
           templateUrl: 'partials/widgets/con10t-tree.html',
           scope: {
           },
           link: function (scope, element, attrs) {
              scope.staticFacets = [];
              if(!attrs.fq)
                 return;

              var fq_facets = attrs.fq.split(',');
              for(var i = 0; i < fq_facets.length; i++)
              {
                 scope.staticFacets.push(fq_facets[i].split(':'));
              }
              scope.wildcardFacet = attrs.wildcardFacet;
              scope.hierarchyFacets  = []

              if(attrs.hierarchyFacets)
                 scope.hierarchyFacets = attrs.hierarchyFacets.split(',');

               // in the UI, the tree starts with the last provided static facet's name
              scope.treeRoot = [{name: scope.staticFacets[scope.staticFacets.length - 1][1], depth: 0, children:[], facet: null, parent: null, id: "0"}];
              scope.isShown = {};

              scope.getNodeChildren = function(node){
                 if(node.children != 0){
                    return;
                 }

                 var treeQuery = new Query();

                 for(var i = 0; i < scope.staticFacets.length; i++){
                    treeQuery = treeQuery.addFacet(scope.staticFacets[i][0], scope.staticFacets[i][1]);
                 }

                 var collectedFacets = this.collectAllFacets(node);

                 for(var i = 0; i < collectedFacets.length; i++){
                    treeQuery = treeQuery.addFacet(collectedFacets[i][0], collectedFacets[i][1]);
                 }

                 treeQuery.q = "*";
                 treeQuery.limit = 0;

                 // TODO implement sorting of facet values (when available in backend)

                 Entity.query(treeQuery.toFlatObject(), function(response) {
                    for(var  i = 0; i < response.facets.length; i++){
                       var currentResultFacet = response.facets[i];
                       // try to find custom hierarchy-facet or wildcard
                       if((scope.hierarchyFacets.length > 0 && currentResultFacet.name == (scope.hierarchyFacets[node.depth]))
                          || (scope.wildcardFacet && currentResultFacet.name.indexOf(scope.wildcardFacet) > -1)){
                          for(var j = 0; j < currentResultFacet.values.length; j++)
                          {
                          	var value = currentResultFacet.values[j].value;
                          	var child = {
                        		name: value, 
                        		depth: node.depth + 1,
                        		children:[],
                    			facet: [currentResultFacet.name, value],
                    			parent: node,
                    			id: node.id + "_" + j
                    		}
                            node.children.push(child);
                          }
                       }
                    }
                    if(node.children == 0){
                       node.isLeaf = true;
                    }
                    scope.isShown[node.id] = true;
                 });
              };

              scope.collectAllFacets = function(node){
                 var result = [];
                 if(node.parent != null){
                    result.push(node.facet);
                    result = result.concat(this.collectAllFacets(node.parent));
                    return result;
                 }
                 return result;
              };

              scope.toggleCollapse = function(node){
                 scope.isShown[node.id] = !scope.isShown[node.id];
                 if(scope.isShown[node.id]){
                    this.getNodeChildren(node)
                 }
              };
              scope.checkIfShown = function(node){
                 return scope.isShown[node.id]; // at first load -> undefined, so it gets hidden but: ugly?
              };

               scope.closeAll = function(){
                   for(var key in scope.isShown)
                       scope.isShown[key] = false;
               };

              scope.startFacetedSearch = function(node){
                 var facets = this.collectAllFacets(node);

                 facets = facets.concat(scope.staticFacets);

                 var url = "search/?q=*";

                 for(var i = 0; i < facets.length; i++){
                    url += "&fq="+facets[i][0]+':"'+facets[i][1]+'"';
                 }

                 $location.url(url);
              };
           }
        }
    }])
;
