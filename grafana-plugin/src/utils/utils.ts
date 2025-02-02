import { AppEvents } from '@grafana/data';
import { config } from '@grafana/runtime';
import { AxiosError } from 'axios';
import { sentenceCase } from 'change-case';
// @ts-ignore
import appEvents from 'grafana/app/core/app_events';
import { isArray, concat, every, isEmpty, isObject, isPlainObject, flatMap, map, keys } from 'lodash-es';

import { isNetworkError } from 'network/network';

import { CLOUD_VERSION_REGEX, PLUGIN_ID } from './consts';

export class KeyValuePair<T = string | number> {
  key: T;
  value: string;

  constructor(key: T, value: string) {
    this.key = key;
    this.value = value;
  }
}

export const formatBackendError = (payload: string | Record<string, unknown>) =>
  typeof payload === 'string'
    ? payload
    : Object.keys(payload)
        .map((key) => `${sentenceCase(key)}: ${payload[key]}`)
        .join('\n');

export function showApiError(error: any) {
  if (isNetworkError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
    const text = formatBackendError(error.response.data);
    openErrorNotification(text);
  }
  throw error;
}

export function refreshPageError(error: AxiosError) {
  if (isNetworkError(error) && error.response?.status === 502) {
    const payload = error.response.data;
    const text = `Try to refresh the page. ${payload}`;
    openErrorNotification(text);
  }

  throw error;
}

export function throttlingError(response: Response) {
  if (response.ok) {
    return;
  }
  if (response?.status === 429) {
    const seconds = Number(response?.headers['retry-after']);
    const minutes = Math.floor(seconds / 60);
    const text =
      'Too many requests, please try again in ' +
      (minutes > 0 ? `${Math.floor(seconds / 60)} minutes.` : `${seconds} seconds.`);
    openErrorNotification(text);
  } else {
    // TODO: check if it works ok
    if (response?.statusText === '') {
      openErrorNotification(
        'Grafana OnCall is unable to verify your phone number due to incorrect number or verification service being unavailable.'
      );
    } else {
      openErrorNotification(response?.statusText);
    }
  }
}

export function openNotification(message: React.ReactNode) {
  appEvents.emit(AppEvents.alertSuccess, [message]);
}

export function openErrorNotification(message: string) {
  appEvents.emit(AppEvents.alertError, [message]);
}

export function openWarningNotification(message: string) {
  appEvents.emit(AppEvents.alertWarning, [message]);
}

export function getPaths(obj?: any, parentKey?: string): string[] {
  let result: any;
  if (isArray(obj)) {
    let idx = 0;
    result = flatMap(obj, function (obj) {
      return getPaths(obj, (parentKey || '') + '[' + idx++ + ']');
    });
  } else if (isPlainObject(obj)) {
    result = flatMap(keys(obj), function (key) {
      return map(getPaths(obj[key], key), function (subkey) {
        return (parentKey ? parentKey + '.' : '') + subkey;
      });
    });
  } else {
    result = [];
  }
  return concat(result, parentKey || []);
}

export function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

export function isUseProfileExtensionPointEnabled(): boolean {
  const { major, minor } = getGrafanaVersion();
  const isRequiredGrafanaVersion = major > 10 || (major === 10 && minor >= 3);

  return isRequiredGrafanaVersion;
}

function isFieldEmpty(value: any): boolean {
  if (isObject(value)) {
    return isEmpty(value);
  }
  return value === '' || value === null || value === undefined;
}

export const allFieldsEmpty = (obj: any) => every(obj, isFieldEmpty);

export const isMobile = window.matchMedia('(max-width: 768px)').matches;

export function getGrafanaVersion(): { major?: number; minor?: number; patch?: number } {
  const regex = /^([1-9]?[0-9]*)\.([1-9]?[0-9]*)\.([1-9]?[0-9]*)/;
  const match = config.buildInfo.version.match(regex);

  if (match) {
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
    };
  }

  return {};
}

export const isCurrentGrafanaVersionEqualOrGreaterThan = ({
  minMajor,
  minMinor = 0,
  minPatch = 0,
}: {
  minMajor: number;
  minMinor?: number;
  minPatch?: number;
}) => {
  const { major, minor, patch } = getGrafanaVersion();
  return (
    major > minMajor ||
    (major === minMajor && minor > minMinor) ||
    (major === minMajor && minor === minMinor && patch >= minPatch)
  );
};

export const getIsRunningOpenSourceVersion = () => !CLOUD_VERSION_REGEX.test(config.apps[PLUGIN_ID]?.version);

export const getIsExternalServiceAccountFeatureAvailable = () =>
  isCurrentGrafanaVersionEqualOrGreaterThan({ minMajor: 10, minMinor: 3 }) &&
  config.featureToggles.externalServiceAccounts;
