'use strict';

PhonicsApp.directive('tryOperation', function () {
  return {
    templateUrl: 'templates/try-operation.html',
    restrict: 'E',
    replace: true,
    scope: {
      operation: '='
    },
    link: function postLink(scope) {
      // FIXME: fix this insanity!
      var rootScope = scope.$parent.$parent.$parent.$parent;

      scope.httpProtorcol = 'HTTP/1.1';
      scope.paramModels = {};
      scope.hasBody = scope.$parent.operation.parameters.some(function (parameter) {
        return parameter.in === 'body';
      });
      scope.generateUrl = generateUrl;
      scope.makeCall = makeCall;
      scope.getContentTypeHeaders = getContentTypeHeaders;
      scope.xhrInProgress = false;
      scope.getHeaderParams = getHeaderParams;

      function getHeaderParams() {
        var headerParams = {};
        scope.$parent.operation.parameters.filter(function (parameter) {
          if (parameter.in === 'header' && scope.paramModels[parameter.name]) {
            headerParams[parameter.name] = scope.paramModels[parameter.name];
          }
        });
        return headerParams;
      }


      function getContentTypeHeaders() {
        if (scope.$parent.operation.consumes) {
          return scope.$parent.operation.consumes;
        } else {
          return rootScope.consumes;
        }
      }

      function generateUrl () {
        var host = rootScope.host;
        var path = scope.$parent.$parent.pathName;
        var pathTemplate = _.template(path);
        var pathParams = scope.$parent.operation.parameters.reduce(function (pathParams, parameter) {
          if (parameter.in === 'path') {
            pathParams[parameter.name] = scope.paramModels[parameter.name];
          }
          return pathParams;
        }, {});
        var queryParams =  scope.$parent.operation.parameters.reduce(function (queryParams, parameter) {
          if (parameter.in === 'query' && scope.paramModels[parameter.name]) {
            queryParams[parameter.name] = scope.paramModels[parameter.name];
          }
          return queryParams;
        }, {});
        var queryParamsStr = $.param(queryParams);


        return host + pathTemplate(pathParams) + (queryParamsStr ? '?' + queryParamsStr : '');
      }

      function makeCall() {
        scope.response = null;
        scope.xhrInProgress = true;
        scope.failed = false;

        $.ajax({
          url: scope.generateUrl(),
          type: scope.$parent.operationName,
          headers: _.extend({
            'Content-Type': scope.contentType
          }, getHeaderParams())
        })

        .fail(function () {
          scope.failed = true;
        })

        .always(function (results, status, resp) {
          scope.results = results;
          if (!resp) {
            scope.responseText = '';
            scope.xhrInProgress = false;
            scope.$digest();
            return;
          }

          var text;
          try {
            text = JSON.stringify(
              JSON.parse(resp.responseText),
            null, 2);
          } catch (e) {
            text = resp.responseText;
          }
          if (text && text.indexOf('<?xml') === 0) {
            scope.responseText = $('<div/>').text(text).html();
          } else {
            scope.responseText = text;
          }

          scope.response = resp;
          scope.xhrInProgress = false;
          scope.$digest();
        });
      }
    }
  };
});
