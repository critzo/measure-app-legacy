angular.module('Measure.controllers.Measurement', [])

.controller('MeasureCtrl', function($scope, $interval, $ionicPopup, $ionicLoading,
		MeasurementService, SettingsService, $rootScope,
		MLabService, accessInformation, HistoryService, DialogueMessages,
		progressGaugeService, MeasureConfig, connectionInformation) {


	$ionicLoading.show({
		templateUrl: 'templates/modals/findingServer.html',
		animation: 'fade-in',
		showBackdrop: true,
		maxWidth: 200,
		showDelay: 200
	});

	var updateMLabServer = function () {
		var metroSelection = SettingsService.currentSettings.metroSelection;
		if (metroSelection === undefined || typeof(metroSelection) === 'object') {
			console.log(metroSelection);
			metroSelection = 'automatic';
		}
		MLabService.findServer(SettingsService.currentSettings.metroSelection).then(
			function(mlabAnswer) {
				$scope.mlabInformation = mlabAnswer;
				$scope.mlabInformation.metroSelection = SettingsService.currentSettings.metroSelection;
				$ionicLoading.hide();
			},
			function () {
				console.log("MlabNSLookupException");
			}
		);
	}
	accessInformation.getAccessInformation().then(
		function (accessInformationResponse) {
			$scope.accessInformation = accessInformationResponse;
		}
	);
	
	updateMLabServer();
	
	$rootScope.$on('settings:changed', function(event, args) {
		if (args.name == 'metroSelection') {
			console.log('Found new Metro server selection');
			updateMLabServer();
		}
	});
	$rootScope.$on('measurement:background', function(event, args) {
		if (args.testStatus === 'onstart') {
			$scope.currentState = 'Running Background Test';
			$scope.currentRate = undefined;
			progressGaugeService.gaugeComplete();
			driveInteractions('start_scheduled', progressGaugeService, $interval);
		} else if (args.testStatus === 'complete') {
			$scope.currentState = 'Completed Background Test';
			$scope.currentRate = undefined;
			progressGaugeService.gaugeReset();
			driveInteractions('finish_scheduled', progressGaugeService, $interval);
		}
	});

	$scope.MeasureConfig = MeasureConfig;
	$scope.measurementState = MeasurementService.state;
	$scope.historyState = HistoryService.state;

	$scope.currentState = undefined;
	$scope.currentRate = undefined;

	$scope.progressGaugeConfig = progressGaugeService.gaugeConfig;
	$scope.progressGaugeState = progressGaugeService.gaugeStatus;

	$scope.connectionInformation = connectionInformation.current();

	$scope.interactionHover = function (mouseIn) {
		interactionElement = document.getElementsByClassName('interactionIcon')[0];
		
		if (interactionElement.classList.contains('testCompleted')) {
			if (mouseIn === true) {
				interactionElement.src = 'img/interactions/reload.svg';
			} else {
				interactionElement.src = 'img/interactions/okay.svg';
			}
		}
	};

	$scope.startNDT = function() {
		var measurementRecord = {
			  'timestamp': Date.now(),
			  'hidden': false,
			  'metadata': {},
			  'snapLog': {'s2cRate': [], 'c2sRate': []},
			  'results': {},
			  'accessInformation': undefined,
			  'connectionInformation': undefined,
			  'mlabInformation': undefined
		};
		var interactionState, timeoutPromise;
		if (MeasurementService.state.testSemaphore === true) {
			return;
		}

		if ($scope.mlabInformation === undefined) {
			intervalPromise = $interval(function () {
				if ($scope.mlabInformation !== undefined) {
					$interval.cancel(intervalPromise);
					$scope.startNDT();
				}
			}, 100);
			return;
		}
		
		$scope.currentState = 'Starting';
		$scope.currentRate = undefined;
		progressGaugeService.gaugeReset();
		driveInteractions('start_test', progressGaugeService, $interval);

		MeasurementService.start($scope.mlabInformation.fqdn, 3001, '/ndt_protocol', 200)
			.then(
			  function (passedResults) {
				progressGaugeService.gaugeComplete();
				$scope.currentState = 'Complete';

				measurementRecord.results = passedResults;
				measurementRecord.accessInformation = $scope.accessInformation;
				measurementRecord.connectionInformation = $scope.connectionType;
				measurementRecord.mlabInformation = $scope.mlabInformation;

				HistoryService.add(measurementRecord);
			  }, function (passedError) {
					progressGaugeService.gaugeError();
					$ionicPopup.show(DialogueMessages.measurementFailure);
					$scope.currentState = undefined;
					$scope.currentRate = undefined;
			  }, function (deferredNotification) {
					var testStatus = deferredNotification.testStatus,
						passedResults = deferredNotification.passedResults;
					
					if (interactionState !== testStatus) {
						interactionState = testStatus;
						driveInteractions(testStatus, progressGaugeService, $interval);
					}
					
					if (testStatus === 'interval_c2s') {
						$scope.currentState = 'Upload';
						$scope.currentRate = passedResults.c2sRate;
						measurementRecord.snapLog.c2sRate.push(passedResults.c2sRate);
					} else if (testStatus === 'interval_s2c') {
						$scope.currentState = 'Download';
						$scope.currentRate = passedResults.s2cRate;
						measurementRecord.snapLog.s2cRate.push(passedResults.s2cRate);
					}
			  }
			);
	  };
});

function driveInteractions(newState, progressGaugeService, $interval) {
	var displayArea = document.getElementsByClassName('displayArea')[0];
	var	interactionElement,
		temporaryElement,
		previousElement;
	
	if (newState === 'start_test') {
		interactionElement = document.getElementsByClassName('interactionIcon')[0];
		interactionElement.src = 'img/interactions/waiting.svg';
		interactionElement.classList.add('spinIcon');
	} else if (newState === 'start_scheduled') {
		interactionElement = document.getElementsByClassName('interactionIcon')[0];
		interactionElement.src = 'img/interactions/hold.svg';
	 } else if (newState === 'finish_scheduled') {
		interactionElement = document.getElementsByClassName('interactionIcon')[0];
		interactionElement.src = 'img/interactions/okay.svg';
		interactionElement.classList.remove('removedIcon');
		interactionElement.classList.add('currentIcon');
		interactionElement.classList.add('testCompleted');
	 } else if (newState === 'interval_c2s') {
		interactionElement = document.getElementsByClassName('interactionIcon')[0];
		interactionElement.classList.remove('spinIcon');
		interactionElement.classList.remove('currentIcon');
		interactionElement.classList.add('removedIcon');

		temporaryElement = new Image();
		temporaryElement.src = 'img/interactions/up.svg';
	} else if (newState === 'interval_s2c') {
		previousElement = document.getElementsByClassName('currentIcon')[0];

		temporaryElement = new Image();
		temporaryElement.src = 'img/interactions/down.svg';
	} else if (newState === 'finished_all') {
		previousElement = document.getElementsByClassName('currentIcon')[0];

		interactionElement = document.getElementsByClassName('interactionIcon')[0];
		interactionElement.src = 'img/interactions/okay.svg';
		interactionElement.classList.remove('removedIcon');
		interactionElement.classList.add('currentIcon');
		interactionElement.classList.add('testCompleted');
	}
	
	if (temporaryElement !== undefined) {
		temporaryElement.classList.add('gaugeIcon');
		displayArea.appendChild(temporaryElement);
		temporaryElement.classList.add('currentIcon');
	}
	if (previousElement !== undefined) {
		previousElement.classList.remove('currentIcon');
		previousElement.classList.add('removedIcon');
		previousElement.parentNode.removeChild(previousElement);
	}


	var incrementalValue = incrementProgressMeter(newState);
	var testPeriod = 10000,
		intervalDelay = 100;
	var intervalCount;
	if (newState == 'running_s2c' || newState == 'running_c2s') {
		intervalCount = (testPeriod / intervalDelay);
		$interval(function () {
			progressGaugeService.incrementGauge(incrementalValue / intervalCount);
		}, intervalDelay, intervalCount);
	} else {
		progressGaugeService.incrementGauge(incrementalValue);
	}

}



function incrementProgressMeter(testStatus) {
    var testProgressIncrements = {
        'start': .02,

        'preparing_c2s': .06,
        'running_c2s': .40,
        'finished_c2s': .02,

        'preparing_s2c': .06,
        'running_s2c': .40,
        'finished_s2c': .01,

        'preparing_meta': .01,
        'finished_meta': .01,
		
        'finished_all': .01,
    }
    if (testProgressIncrements.hasOwnProperty(testStatus) === true) {
        return testProgressIncrements[testStatus];
    }
    return 0;
}
