<?php

namespace MareBrowseFilters;

use Doctrine\ORM\QueryBuilder;

use Omeka\Module\AbstractModule;
use Zend\EventManager\Event;
use Zend\Mvc\MvcEvent;
use Zend\EventManager\SharedEventManagerInterface;


class Module extends AbstractModule {
    public function getConfig()
    {
        return include __DIR__ . '/config/module.config.php';
    }
  
    public function attachListeners(SharedEventManagerInterface $sharedEventManager) {
        $sharedEventManager->attach(
            'Omeka\Api\Adapter\ItemAdapter',
            'api.search.query',
            [$this, 'buildInQuery']
        );
        $sharedEventManager->attach(
            'Omeka\Controller\Site\Item',
            'view.browse.before',
            [$this, 'addBrowseFilters']
        );
        $sharedEventManager->attach(
            'Omeka\Controller\Site\Page',
            'view.layout',
            [$this, 'addLocationDenominationJs']
        );
    }

    public function buildInQuery(Event $event) {
        $serviceLocator = $this->getServiceLocator();
        $qb = $event->getParam('queryBuilder');
        $adapter = $event->getTarget();
        $query = $event->getParam('request')->getContent();
                
        if (isset($query['mare_denomination']) && is_array($query['mare_denomination'])) {
            $hasDenominationProperties = $adapter->getPropertyByTerm('mare:denomination')->getId();
    
            $lookupIds = $query['mare_denomination']; 
            $alias = $adapter->createAlias();        
            $qb->innerJoin('omeka_root.values', $alias, 'WITH', $qb->expr()->eq("$alias.property", $hasDenominationProperties));
            $qb->andWhere($qb->expr()->in(
                "$alias.valueResource",
                $adapter->createNamedParameter($qb, $lookupIds)
            ));
        }
        
        if (isset($query['mare_county']) && is_array($query['mare_county'])) {
            $hasCountyProperties = $adapter->getPropertyByTerm('mare:county')->getId();
    
            $lookupIds = $query['mare_county'];
            $alias = $adapter->createAlias();        
            $qb->innerJoin('omeka_root.values', $alias, 'WITH', $qb->expr()->eq("$alias.property", $hasCountyProperties));
            $qb->andWhere($qb->expr()->in(
                "$alias.valueResource",
                $adapter->createNamedParameter($qb, $lookupIds)
            ));
        }
    }
    
    public function addBrowseFilters(Event $event) {
        $services = $this->getServiceLocator();
        if (!$services->get('Omeka\Status')->isSiteRequest()) {
            return;
        }

        $view = $event->getTarget();
        $api = $view->api();

        if (isset($view->itemSet)) {
          return;
        }

        $resourceTemplates = $api->search('resource_templates')->getContent();
        $itemSetSearch = $api->search('item_sets', [
          'search' => 'States/Territories, 1926',
        ])->getContent();
        array_shift($resourceTemplates);
        $resourceTemplateIds = [];
        $stateTerritoryItemSetId = $itemSetSearch[0]->id();
        foreach($resourceTemplates as $resourceTemplate) {
          $resourceTemplateIds[$resourceTemplate->label()] = $resourceTemplate->id();
        }

        $denominationFamilies = $api->search('items', ['resource_template_id' => $resourceTemplateIds['ARDA Religious Group Family']])->getContent();
        $denominationProperty = $api->search('properties', ['term' => 'mare:ardaReligiousGroupFamily', 'limit' => 1])->getContent();
        $denominationFamilyPropertyId = $denominationProperty{0}->id();

        $stateTerritories = $api->search('items', ['item_set_id' => $stateTerritoryItemSetId])->getContent();
        $stateTerritoriesProperty = $api->search('properties', ['term' => 'mare:stateTerritory', 'limit' => 1])->getContent();
        $stateTerritoriesPropertyId = $stateTerritoriesProperty{0}->id();

        $singleDenominationProperty = $api->search('properties', ['term' => 'mare:denomination'])->getContent(); 
        $countyProperty = $api->search('properties', ['term' => 'mare:county'])->getContent();
        $singleDenominationPropertyId = $singleDenominationProperty{0}->id();
        $countyPropertyId = $countyProperty{0}->id();

        $query = $view->params()->fromQuery();
        $arePropertyIds = [$denominationFamilyPropertyId, $stateTerritoriesPropertyId, $singleDenominationPropertyId, $countyPropertyId];
        $areCurrentFilters = [];
        $index = 0;
        foreach ($query as $key => $value) {
            if (($value != null) && (strpos($key, 'mare') !== false)) {
                $areCurrentFilters[$key] = $value;                    
            }
        }
        
        $view->headLink()->prependStylesheet($view->assetUrl('vendor/chosen-js/chosen.min.css', 'Omeka'));
        $view->headScript()->prependFile($view->assetUrl('vendor/chosen-js/chosen.jquery.min.js', 'Omeka'));
        $view->headScript()->prependFile($view->assetUrl('js/chosen-options.js', 'Omeka'));
        $view->headScript()->prependFile($view->assetUrl('js/are-item-browse.js', 'MareBrowseFilters'));
        echo $view->partial('common/are-filters', [
          'resourceTemplateIds' => $resourceTemplateIds,
          'denominationFamilyPropertyId' => $denominationFamilyPropertyId,
          'denominationFamilies' => $denominationFamilies,
          'stateTerritoriesPropertyId' => $stateTerritoriesPropertyId,
          'stateTerritories' => $stateTerritories,
          'singleDenominationPropertyId' => $singleDenominationPropertyId,
          'countyPropertyId' => $countyPropertyId,
          'areCurrentFilters' => $areCurrentFilters,
          'stateTerritoryItemSetId' => $stateTerritoryItemSetId
        ]);
    }
    
    public function addLocationDenominationJs(Event $event) {
        $view = $event->getTarget();
        $view->headScript()->appendFile($view->assetUrl('js/are-remember-location.js', 'MareBrowseFilters'));        
    }
}
?>