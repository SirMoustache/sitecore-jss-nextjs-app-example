export type Params = Record<string, string>;

export interface PathMatch {
  path: string;
  pathname: string;
  params: Params;
}

type PathPattern = string | { path: string; caseSensitive?: boolean; end?: boolean };

function invariant(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}

function safelyDecodeURIComponent(value: string, paramName: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch (error) {
    console.warn(
      false,
      `The value for the URL param "${paramName}" will not be decoded because` +
        ` the string "${value}" is a malformed URL segment. This is probably` +
        ` due to a bad percent encoding (${error}).`
    );

    return value;
  }
}

export function matchPath(pattern: PathPattern, pathname: string): PathMatch | null {
  if (typeof pattern === 'string') {
    pattern = { path: pattern };
  }

  const { path, caseSensitive = false, end = true } = pattern;
  const [matcher, paramNames] = compilePath(path, caseSensitive, end);
  const match = pathname.match(matcher);

  if (!match) return null;

  const matchedPathname = match[1];
  const values = match.slice(2);
  const params = paramNames.reduce((memo, paramName, index) => {
    memo[paramName] = safelyDecodeURIComponent(values[index], paramName);
    return memo;
  }, {} as Params);

  return { path, pathname: matchedPathname, params };
}

function compilePath(path: string, caseSensitive: boolean, end: boolean): [RegExp, string[]] {
  const keys: string[] = [];
  let source =
    '^(' +
    path
      .replace(/^\/*/, '/') // Make sure it has a leading /
      .replace(/\/?\*?$/, '') // Ignore trailing / and /*, we'll handle it below
      .replace(/[\\.*+^$?{}|()[\]]/g, '\\$&') // Escape special regex chars
      .replace(/:(\w+)/g, (_: string, key: string) => {
        keys.push(key);
        return '([^\\/]+)';
      }) +
    ')';

  if (path.endsWith('*')) {
    if (path.endsWith('/*')) {
      source += '\\/?'; // Don't include the / in params['*']
    }
    keys.push('*');
    source += '(.*)';
  } else if (end) {
    source += '\\/?';
  }

  if (end) source += '$';

  const flags = caseSensitive ? undefined : 'i';
  const matcher = new RegExp(source, flags);

  return [matcher, keys];
}

export function generatePath(path: string, params: Params = {}): string {
  return path
    .replace(/:(\w+)/g, (_, key) => {
      invariant(params[key] != null, `Missing ":${key}" param`);
      return params[key];
    })
    .replace(/\/*\*$/, (_) => (params['*'] == null ? '' : params['*'].replace(/^\/*/, '/')));
}
