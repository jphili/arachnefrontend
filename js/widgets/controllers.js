'use strict';

/* Widget controllers */
angular.module('arachne.widgets.controllers', [])
   .controller('TocController', ['$scope', "$location", "$anchorScroll", "arachneSettings", function ($scope, $location, $anchorScroll, arachneSettings) {

      var tocElement = document.querySelector("con10t-toc");
      $scope.tocHeading = tocElement.getAttribute('toc-heading');

      var headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

      $scope.toc = [];

      for(var i = 0; i < headings.length; i++) {
         var headingID = headings[i].textContent.replace(/ /g, "_");
         var heading = {
            target: headingID,
            text: headings[i].textContent,
            depth: "con10t-toc-level-" + headings[i].tagName.charAt(1)
         };
         headings[i].id = headingID;
         $scope.toc.push(heading);
      }

      // Angular seems to do anchorScroll() directly on load. But without the scope initialized, the targets are not yet
      // existing. Therefore: Try a delayed anchorScroll() after the scope is initialized, if there is an existing hash.
      if($location.hash() != ""){
         $anchorScroll();
      }

      $scope.scrollTo = function(id){
         $location.hash(id);
         console.log("Hash onclick: " + $location.hash());
         $anchorScroll();
      }
   }])
;