angular.module('Measure.controllers.History', [])

.controller('HistoryCtrl', function($scope, $rootScope, $interval, MeasureConfig, HistoryService,
		SharingService, historicalDataChartService) {

	$scope.MeasureConfig = MeasureConfig;
        $scope.series = [ "download", "upload" ];
        $scope.data = { "series": "download" };

        $scope.refreshData = function refreshData() {
          historicalDataChartService.populateData($scope.data.series);
          HistoryService.get().then(function(historicalData) {
            $scope.historicalData = historicalData;
          });
        };
        
	$scope.historicalDataChartConfig = historicalDataChartService.config;
	$scope.shareCSV = SharingService.shareCSV;
	$scope.hideMeasurement = HistoryService.hide;
	/*
		Wait until after interface is draw to populate data for UX experience,
		and then poll recentSamples to reflect changes as the user interacts
		with the app.
	*/
	$rootScope.$on('history:measurement:change', $scope.refreshData);
        $scope.refreshData();
});
