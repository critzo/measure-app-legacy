// Measure.app

angular.module('Measure', ['ionic', 'gettext', 'ngSanitize', 'ngCsv',
		'ngCordova', 'highcharts-ng', 'Measure.controllers',
		'Measurement.filters', 'Measure.services', 'Measure.support'],
		function ($provide) {
	// Prevent Angular from sniffing for the history API
	// since it's not supported in packaged apps.
	$provide.decorator('$window', function($delegate) {
		$delegate.history.pushState = null;
		return $delegate;
	});
})

.constant('CLIENT_APPLICATION', 'Measure.app')
.constant('CLIENT_VERSION', '0.1-alpha')
.constant('ENVIRONMENT_CAPABILITIES', {
	'iOS': {
		'schedulingSupported': false,
		'sharingSupported': true,
		'connectionInformation': true
	},
	'Android': {
		'schedulingSupported': false,
		'sharingSupported': true,
		'connectionInformation': true
	},
	'ChromeApp': {
		'schedulingSupported': true,
		'sharingSupported': false,
		'connectionInformation': false
	},
	'Browser': {
		'schedulingSupported': false,
		'sharingSupported': false,
		'connectionInformation': false
	}
})

.value('MeasureConfig', {
	'environmentType': undefined,
	'enviromentCapabilities': undefined,
})

.config( ['$compileProvider', function( $compileProvider ) {
	if (window.chrome && chrome.app && chrome.app.runtime) {
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
	}
}])

.run(function($ionicPlatform) {
	$ionicPlatform.ready(function() {
		if (window.cordova && window.cordova.plugins.Keyboard) {
			cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
		}
		if (window.StatusBar) {
			StatusBar.styleDefault();
		}
	});
})

.run(function ($ionicPlatform, MeasureConfig, ENVIRONMENT_CAPABILITIES) {
	if (window.chrome && chrome.runtime && chrome.runtime.id) {
		MeasureConfig.environmentType = 'ChromeApp';
	}
    $ionicPlatform.ready(function() {
		 if (MeasureConfig.environmentType === undefined && typeof(device) !== 'undefined') {
			switch(device.platform) {
				case 'iOS':
					MeasureConfig.environmentType = 'iOS';
					break;
				case 'Android':
					MeasureConfig.environmentType = 'Android';
					break;
				case 'Browser':
					MeasureConfig.environmentType = 'Browser';
					break;
				default:
					// We don't know anything about the current environment
					// so we fall back onto only what the browser can handle.
					MeasureConfig.environmentType = 'Browser';
					break;
			}
		}
		
		if (ENVIRONMENT_CAPABILITIES.hasOwnProperty(MeasureConfig.environmentType) === true) {
			MeasureConfig.enviromentCapabilities = ENVIRONMENT_CAPABILITIES[MeasureConfig.environmentType];
		} else {
			MeasureConfig.enviromentCapabilities = ENVIRONMENT_CAPABILITIES['Browser'];
		}
    });
})

.value('DialogueMessages', {
	'historyReset': {
		title: 'Confirm Reset',
		template: 'This action will permanently removal all stored results and cannot be undone. Are you sure?'
	}
})

/*

.run(function ($ionicPlatform, MeasureConfig, SettingsService, gettextCatalog) {
		MeasureConfig.currentLanguage = SettingsService.currentSettings.applicationLanguage.code;
		gettextCatalog.setCurrentLanguage(MeasureConfig.currentLanguage);
})                ScheduleService.schedule();

*/

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider

  .state('app', {
    url: "/app",
    abstract: true,
    templateUrl: "templates/menu.html",
  })
  
  .state('app.settings', {
    url: "/settings",
    views: {
      'menuContent': {
        templateUrl: "templates/settings.html",
        controller: 'SettingsCtrl'
      }
    },
  })

  .state('app.history', {
    url: "/history",
    views: {
      'menuContent': {
        templateUrl: "templates/history.html",
        controller: 'HistoryCtrl'
      }
    }
  })

  .state('app.measure', {
    url: "/measure",
    views: {
      'menuContent': {
        templateUrl: "templates/measure.html",
        controller: 'MeasureCtrl'
      }
    }
  })

  .state('app.about', {
    url: "/information/about",
    views: {
      'menuContent': {
        templateUrl: "templates/static/about.html"
      }
    }
  })

  .state('app.privacy', {
    url: "/information/privacy",
    views: {
      'menuContent': {
        templateUrl: "templates/static/privacy.html"
      }
    }
  })

  .state('app.measurementRecord', {
      url: "/measurement/:measurementId",
      views: {
        'menuContent': {
          templateUrl: "templates/measurementrecord.html",
          controller: 'RecordCtrl'
        }
      }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/measure');
})
