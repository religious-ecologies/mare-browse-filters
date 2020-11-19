(function($) {
  var baseDomain = '//localhost';
  var basePath = '/religious-ecologies/s/census-1926/mare/partial/';
  var baseUrl = baseDomain + basePath;
  var denominationFamilyFilterUrl = baseUrl + 'denomination-families-nav';
  var denominationFilterUrl = baseUrl + 'denominations-nav?denomination-family-id=';
  var denominationUrl = baseUrl + 'denomination?denomination-id=';
  var denominationSchedulesUrl = baseUrl + 'denomination-schedules?denomination-id=';
  var locationFamilyFilterUrl = baseUrl + 'states-territories-nav';
  var locationFilterUrl = baseUrl + 'counties-nav?state-territory-id=';
  var locationUrl = baseUrl + 'county?county-id=';
  var locationSchedulesUrl = baseUrl + 'county-schedules?county-id=';

  $(document).ready(function() {  
      var denominations = $('body').hasClass('denominations');
      var locations = $('body').hasClass('locations');
      if (denominations || locations) {
        var filterContainer = $('#are-filters');
        var filteredContentContainer = $('.are-filtered-content');
        var areFamilyFilterUrl = (denominations) ? denominationFamilyFilterUrl : locationFamilyFilterUrl;
        var areFilterUrl = (denominations) ? denominationFilterUrl : locationFilterUrl;
        var areContentUrl = (denominations) ? denominationUrl : locationUrl;
        var areSchedulesUrl = (denominations) ? denominationSchedulesUrl : locationSchedulesUrl; 
        
        // Populate the filters with ajax 
        $.get(areFamilyFilterUrl, function(data) {
            filterContainer.html(data);
        })
          .done(function() {
            $('#are-filters li').addClass('are-family').wrapInner('<a href="#" class="are-filter-link"></a>');            
            openCurrentView();
          });
          
        filterContainer.on('click', '.are-family > a', function(e) {
          e.preventDefault();
          var familyId = $(this).parent('.are-family').data('itemId');
          expandFamilyTree(familyId);
        });
        
        filterContainer.on('click', '.are-filter', function(e) {
          e.preventDefault();
          var filterId = $(this).data('item-id');
          $.get(areContentUrl + filterId, function(data) {
            filteredContentContainer.html(data);
          })
            .done(function() {
                $.get(areSchedulesUrl + filterId, function(data) {
                  var schedules = data;
                  filteredContentContainer.append(schedules);
                })
                  .done(function() {  
                    setupScheduleLinks();
                  });              
            });
        });
        
        filteredContentContainer.on('click', '.schedule-list .omeka-pagination a', function(e) {
          e.preventDefault();
          $.get($(this).attr('href'), function(data) {
              $('.schedule-list').replaceWith($(data));
          })
            .done(function() {
              setupScheduleLinks();
            });
        });

        $(document).on('click', '.are-filter-link', function(e) {
          e.preventDefault();
          buildFilterUrl($(this));
        });
        
        window.addEventListener('popstate', function(event) {
          openCurrentView();
        });

        var createFilter = function(filterLi,filterId) {
          var filterUrl = areFilterUrl + filterId;
          return $.get(filterUrl, function(data) {
            filterLi.append(data);
          })
            .done(function() {
              $('#are-filters li li').addClass('are-filter').wrapInner('<a href="#" class="are-filter-link"></a>');
            });
        };
        
        var setupScheduleLinks = function() {
          $('.schedule-list .pagination a, a.schedule-link').each(function() {
            var scheduleLink = $(this);
            var originalHref = scheduleLink.attr('href');
            scheduleLink.attr('href', baseDomain + originalHref);
          });
        }

        var expandFamilyTree = function(filterId) {
            var areFilter = $('.are-family[data-item-id=' + filterId + ']');
            areFilter.toggleClass('collapse');
            var defer = $.Deferred();
            if (!areFilter.hasClass('populated')) {
              areFilter.addClass('populated');
              createFilter(areFilter, areFilter.data('item-id')).then(function() {
                  defer.resolve();
              });
            } else {
              defer.resolve();
            }
            return defer.promise();
        };
                
        var openCurrentView = function() {
            var urlParams = new URLSearchParams(window.location.search);
            var family = urlParams.get('denominationFamily') || urlParams.get('stateTerritory');
            if (family) {
                return expandFamilyTree(family).then(function() {
                  var filter = urlParams.get('counties') || urlParams.get('denominations');
                  if (filter) {
                      $('.are-filter[data-item-id="' + filter + '"] a').click();
                  }
                });
            }
        };
        
        var formatNavParam = function(navstring) {
          var formattedString = navstring.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
          formattedString = formattedString.replace('Nav', '');
          return formattedString;
        };
        
        var buildFilterUrl = function(filterLink) {
          var filterFamilyString, filterFamilyId, filterFamilyLi, filterFamilyType, filterString, filterUrl;
          filterFamily = filterFamilyId = filterFamilyLi = filterFamilyType = filterString = filterUrl = '';

          var filterLi = filterLink.parent('li');
          var filterId = filterLi.data('itemId');

          if (filterLi.hasClass('are-filter')) {
            filterType = filterLi.parent('ul').attr('class');	
            filterString = '&' + formatNavParam(filterType) + '=' + filterId;

            filterFamilyLi = filterLink.parents('.are-family');
            filterFamilyId = filterFamilyLi.data('itemId');
            filterFamilyType = filterFamilyLi.parent('ul').attr('id');
          } else {
            filterFamilyType = filterLi.parent('ul').attr('id');
            filterFamilyId = filterId;
          }
          filterFamilyString = '?' + formatNavParam(filterFamilyType) + '=' + filterFamilyId;
          filterUrl = filterFamilyString + filterString;
          history.replaceState({filterId: filterId}, '', filterUrl);
        }
        
      }
    }); 
})(jQuery)