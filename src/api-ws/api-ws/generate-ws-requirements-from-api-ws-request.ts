import type { ValidationMode } from 'yaschema';
import type { AnyQuery, ApiRoutingContext, OptionalIfPossiblyUndefined } from 'yaschema-api';
import { anyReqQuerySchema, getUrlBaseForRouteType } from 'yaschema-api';
import type { AnyCommands, GenericWsApi, WsApi } from 'yaschema-ws-api';

import { triggerOnRequestValidationErrorHandler } from '../../config/on-request-validation-error.js';
import { makeQueryString } from '../../internal-utils/make-query-string.js';

export class WsRequirementsError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/** Generates the requirements needed to create the WebSocket.  If the request shouldn't be made because of an error, this throws a
 * `WsRequirementsError` */
export const generateWsRequirementsFromApiWsRequest = async <
  RequestCommandsT extends AnyCommands,
  ResponseCommandsT extends AnyCommands,
  QueryT extends AnyQuery
>(
  api: WsApi<RequestCommandsT, ResponseCommandsT, QueryT>,
  {
    validationMode,
    query,
    context
  }: { validationMode: ValidationMode; context?: ApiRoutingContext } & OptionalIfPossiblyUndefined<'query', QueryT>
): Promise<{ url: URL }> => {
  const reqQuery = await (api.schemas.connection?.query ?? anyReqQuerySchema).serializeAsync((query ?? {}) as QueryT, {
    validation: validationMode
  });

  if (validationMode !== 'none') {
    if (reqQuery.error !== undefined) {
      triggerOnRequestValidationErrorHandler({
        api: api as any as GenericWsApi,
        req: { query },
        invalidPart: 'query',
        validationError: reqQuery.error
      });
      if (validationMode === 'hard') {
        throw new WsRequirementsError(`Request query validation error: ${reqQuery.error}`);
      }
    }
  }

  const queryString = makeQueryString(reqQuery.serialized as AnyQuery);
  const constructedUrl = `${api.url}${queryString.length > 0 ? '?' : ''}${queryString}`;

  const urlBase = getUrlBaseForRouteType(api.routeType, { context });
  const url = new URL(constructedUrl, urlBase.length === 0 ? undefined : urlBase);

  return { url };
};
