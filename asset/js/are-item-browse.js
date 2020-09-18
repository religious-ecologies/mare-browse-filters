(function($) {
    var baseDomain = 'http://localhost/omeka-s-2/api/';
        
    $(document).ready(function() {        
        var filterSubmitButton = $('.filter-submit');
        // Chosen select population, taken from Omeka's admin.js
      
        $('.chosen-select').chosen(chosenOptions);

        // Along with CSS, this fixes a known bug where a Chosen dropdown at the
        // bottom of the page breaks layout.
        // @see https://github.com/harvesthq/chosen/issues/155#issuecomment-173238083
        $(document).on('chosen:showing_dropdown', '.chosen-select', function(e) {
            var chosenContainer = $(e.target).next('.chosen-container');
            var dropdown = chosenContainer.find('.chosen-drop');
            var dropdownTop = dropdown.offset().top - $(window).scrollTop();
            var dropdownHeight = dropdown.height();
            var viewportHeight = $(window).height();
            if (dropdownTop + dropdownHeight > viewportHeight) {
                chosenContainer.addClass('chosen-drop-up');
            }
        });
        
        $(document).on('chosen:hiding_dropdown', '.chosen-select', function(e) {
            $(e.target).next('.chosen-container').removeClass('chosen-drop-up');
        });
        
        $(document).on('change', '.chosen-select', function() {
            var filterSelected = $(this).find(':selected');
            var filterLabel = filterSelected.text();
            var filterId = filterSelected.val();
            var propertiesIndex = $('#are-filters').data('properties-index');
            if (filterId > 0) {
                updateFilterSelect($(this), filterId, filterLabel, propertiesIndex);
            }
        });
        
        $(document).on('click', '.clear-filter', function() {
            var selectedFilters = $('#selected-filters');
            var filterLink = $(this).prev('a');
            var filterId = filterLink.data('filter-id');
            var filterResourceType = filterLink.data('resource-type');
            var filterContainer = $('.filter-select[data-resource-type="' + filterResourceType + '"]');
            var selectedFiltersCategory = $('#selected-filters div[data-resource-type="' + filterResourceType + '"]');
            filterContainer.find('option[value="' + filterId + '"]').attr('disabled', false);
            filterContainer.find('.chosen-select').trigger('chosen:updated');
            filterLink.parents('li').remove();
            if (selectedFiltersCategory.find('li').length == 0) {
              selectedFiltersCategory.addClass('empty');
              if (selectedFilters.find('li').length == 0) {
                selectedFilters.addClass('empty');
              }
            }
        });
        
        // Check for active filters
        
        $('.filter-data').each(function() {
            var filterData = $(this);
            if (filterData.data('activeIds') !== "") {
                applyActiveFilters(filterData);
            }
        });
    });
    
    var populateChildFilter = function(resourceType, parentResourceType, heading, filterId, resourceTemplateId) {
        if ($('.filter-select[data-property-id="' + filterId + '"]').length > 0) {
          return;
        }
        var newFilterSelect = $('[data-resource-type="template"]').clone();
        var newFilterSelectInput = newFilterSelect.find('select');
        var parentPropertyId = $('.filter-data[data-resource-type="' + resourceType + '"]').data('parent-property-id');

        var filterParam = 'property[0][type]=res&property[0][property]=' + parentPropertyId + '&property[0][text]=' + filterId;

        newFilterSelect.attr('data-resource-type', resourceType);
        newFilterSelect.attr('data-property-id', filterId); 
        $('.filter-select[data-resource-type="' + parentResourceType + '"]').after(newFilterSelect);
        newFilterSelectInput.addClass('chosen-select').chosen(chosenOptions);
        
        var apiSearchUrl = baseDomain + 'items?' + filterParam + '&per_page=1000&resource_template_id[]=' + resourceTemplateId;
        console.log(apiSearchUrl);
        newFilterSelect.addClass('child');
        newFilterSelect.find('h4').text(heading);
        newFilterSelect.attr('data-updated', 'true');
        $.get(apiSearchUrl, function(data) {
            $.each(data, function() {
                var newOption = $('<option value="' + this['o:id'] + '">' + this['dcterms:title'][0]['@value'] + '</option>');
                if ($('.filter-link[data-filter-id="' + this['o:id'] + '"]').length > 0) {
                  newOption.attr('disabled', true);
                }
                newFilterSelectInput.append(newOption);
                newFilterSelectInput.trigger('chosen:updated');
            });
        });
    };
    
    var updateFilterSelect = function(chosenSelect, filterId, filterLabel, propertiesIndex, resourceTemplateId) {
        var filterContainer = chosenSelect.parents('.filter-select');
        var resourceTemplateId = filterContainer.data('resource-template-id');
        
        if (filterContainer.hasClass('child')) {
          addSelectedFilter(propertiesIndex, filterId, filterContainer.data('resource-type'), filterLabel);           
        }

        if (chosenSelect.parents('[data-resource-type="mare:denominationFamily"]').length > 0) {
          populateChildFilter('mare:denomination', 'mare:denominationFamily', filterLabel, filterId, resourceTemplateId);
        }
        
        if (chosenSelect.parents('[data-resource-type="mare:stateTerritory"]').length > 0) {
          populateChildFilter('mare:county', 'mare:stateTerritory', filterLabel, filterId, resourceTemplateId);
        }
        var filterSelected = chosenSelect.find('[value="' + filterId + '"]');
        filterSelected.attr('disabled', true);
        
        chosenSelect.val('').trigger('chosen:updated');          
    };
    
    var addSelectedFilter = function(propertiesIndex, filterId, resourceType, filterLabel) {
        var selectedFilters = $('#selected-filters');
        var resourceTypeFilters = $('#selected-filters div[data-resource-type="' + resourceType + '"]');
        var filterLink = $(selectedFilters.data('filterLinkTemplate'));
        var filterAnchor = filterLink.find('.filter-link');
        var filterInput = filterLink.find('.mare-value');
        filterLink.data('index', propertiesIndex);
        filterAnchor.text(filterLabel);
        filterAnchor.attr({
          'data-filter-id': filterId,
          'data-resource-type': resourceType
        });
        filterInput.attr('name', resourceType.replace(':', '_') + '[]');
        filterInput.val(filterId);
        filterLink.appendTo(resourceTypeFilters.find('.filters'));
        resourceTypeFilters.removeClass('empty');
        selectedFilters.removeClass('empty');
    };
    
    var applyActiveFilters = function(filterData) {
      var filterActivePropertyData = filterData.data('activeIds');
      if (!filterActivePropertyData) {
        return;
      }
      var propertyId = filterData.data('propertyId');
      var resourceType = filterData.data('resourceType');
      var parentResourceType = filterData.data('parentResourceType');
      if (typeof(filterActivePropertyData) == 'string') {
        var activePropertyIds = filterActivePropertyData.split(',');
      } else {
        var activePropertyIds = [filterActivePropertyData];
      }
      $.each(activePropertyIds, function(index, value) {
        var filterOption = $('.filter-select option[value="' + value + '"]');
        var propertiesIndex = $('#are-filters').data('properties-index');
        if (filterOption.length == 0) {
          $.get(baseDomain + 'items/' + value, function(data) {
            var filterLabel = data['o:title'];
            var parentFilterLabel = data[parentResourceType][0]['display_title'];
            filterId = data[parentResourceType][0]['value_resource_id'];
            addSelectedFilter(propertiesIndex, value, resourceType, filterLabel);
          });
        }
      });
    };
    
})(jQuery)