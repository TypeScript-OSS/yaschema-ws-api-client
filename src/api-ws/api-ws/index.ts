import _ from 'lodash';
import type { Schema, ValidationMode } from 'yaschema';
import type { OptionalIfPossiblyUndefined } from 'yaschema-api';
import type { AnyCommands, AnyQuery, GenericWsApi, WsApi } from 'yaschema-ws-api';
import { genericCommandSchema } from 'yaschema-ws-api';

import { triggerOnCommandRequestValidationErrorHandler } from '../../config/on-command-request-validation-error';
import { triggerOnCommandResponseValidationErrorHandler } from '../../config/on-command-response-validation-error';
import { getDefaultRequestValidationMode, getDefaultResponseValidationMode } from '../../config/validation-mode';
import type { WsApiConnectionChangeHandler } from '../types/WsApiConnectionChangeHandler';
import type { WsApiErrorHandler } from '../types/WsApiErrorHandler';
import type { WsApiMessageReceiptHandler } from '../types/WsApiMessagReceiptHandler';
import type { WsApiRequestors } from '../types/WsApiRequestors';
import type { WsApiResponseHandlers } from '../types/WsApiResponseHandlers';
import { generateWsRequirementsFromApiWsRequest } from './generate-ws-requirements-from-api-ws-request';

export interface ApiWsOptions<RequestCommandsT extends AnyCommands, QueryT extends AnyQuery> {
  /**
   * Override the configured request validation mode.
   *
   * @see `setDefaultRequestValidationMode`
   */
  requestValidationMode?: ValidationMode;
  /**
   * Override the configured response validation mode.
   *
   * Hard validation is always performed on responses statuses, regardless of this setting.
   *
   * @see `setDefaultResponseValidationMode`
   */
  responseValidationMode?: ValidationMode;

  onConnect?: WsApiConnectionChangeHandler<RequestCommandsT, QueryT>;
  onDisconnect?: WsApiConnectionChangeHandler<RequestCommandsT, QueryT>;
  onMessage?: WsApiMessageReceiptHandler<RequestCommandsT, QueryT>;
  onError?: WsApiErrorHandler<RequestCommandsT, QueryT>;
}

/** Uses a WebSocket to access the specified API */
export const apiWs = async <RequestCommandsT extends AnyCommands, ResponseCommandsT extends AnyCommands, QueryT extends AnyQuery>(
  api: WsApi<RequestCommandsT, ResponseCommandsT, QueryT>,
  req: OptionalIfPossiblyUndefined<'query', QueryT>,
  responseHandlers: Partial<WsApiResponseHandlers<RequestCommandsT, ResponseCommandsT, QueryT>>,
  {
    requestValidationMode = getDefaultRequestValidationMode(),
    responseValidationMode = getDefaultResponseValidationMode(),
    ...eventHandlers
  }: ApiWsOptions<RequestCommandsT, QueryT> = {}
): Promise<{ ws: WebSocket; output: WsApiRequestors<RequestCommandsT> }> => {
  const query = req.query as QueryT;

  const { url } = await generateWsRequirementsFromApiWsRequest(api, { validationMode: requestValidationMode, query });

  const ws = new WebSocket(url);

  const output = (Object.entries(api.schemas.requests) as Array<[keyof RequestCommandsT & string, Schema]>).reduce(
    (out, [requestCommandName, requestCommand]) => {
      out[requestCommandName] = async (value) => {
        if (ws.readyState !== WebSocket.OPEN) {
          // Ignoring output attempts when the WebSocket isn't open
          return;
        }

        const commandSerializationResult = await requestCommand.serializeAsync(value, { validation: requestValidationMode });
        if (commandSerializationResult.error !== undefined) {
          if (requestValidationMode === 'hard') {
            triggerOnCommandRequestValidationErrorHandler({
              api: api as any as GenericWsApi,
              command: requestCommandName,
              res: value,
              invalidPart: 'body',
              validationError: commandSerializationResult.error
            });
            return;
          }
        }

        const genericRequest = genericCommandSchema.serialize(
          { command: requestCommandName, body: commandSerializationResult.serialized },
          { okToMutateInputValue: true, validation: 'hard' }
        );
        if (genericRequest.error !== undefined) {
          console.warn(`Failed to serialize request for command ${requestCommandName}, which shouldn't happen:`, genericRequest.error);
          return;
        }

        ws.send(JSON.stringify(genericRequest.serialized));
      };
      return out;
    },
    {} as Partial<WsApiRequestors<RequestCommandsT>>
  ) as WsApiRequestors<RequestCommandsT>;

  ws.onerror = () => {
    ws.close();
  };

  ws.onclose = () => {
    ws.onerror = null;
    ws.onclose = null;
    ws.onopen = null;
    ws.onmessage = null;

    eventHandlers.onDisconnect?.({ ws, query, output });
  };

  ws.onopen = () => {
    eventHandlers.onConnect?.({ ws, query, output });
  };

  ws.onmessage = async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    eventHandlers.onMessage?.({ ws, query: query as QueryT, output, message: data });

    if (typeof data !== 'string') {
      return;
    }

    let json: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      json = JSON.parse(data);
    } catch (e) {
      if (e instanceof Error) {
        eventHandlers.onError?.({ ws, query, output, error: e });
      }
      return;
    }

    const genericResponse = genericCommandSchema.deserialize(json, { okToMutateInputValue: true, validation: 'hard' });
    if (genericResponse.error !== undefined) {
      eventHandlers.onError?.({ ws, query, output, error: new Error(genericResponse.error) });
      return;
    }

    const responseCommandName = genericResponse.deserialized.command as keyof ResponseCommandsT & string;
    const responseCommand = api.schemas.responses[responseCommandName];
    if (responseCommand === undefined) {
      eventHandlers.onError?.({ ws, query, output, error: new Error(`No definition found for command ${responseCommandName}`) });
      return;
    }

    const commandDeserializationResult = await responseCommand.deserializeAsync(genericResponse.deserialized.body, {
      okToMutateInputValue: true,
      validation: responseValidationMode
    });
    if (commandDeserializationResult.error !== undefined) {
      triggerOnCommandResponseValidationErrorHandler({
        api: api as any as GenericWsApi,
        command: responseCommandName,
        req: commandDeserializationResult.deserialized as ResponseCommandsT[typeof responseCommandName]['valueType'],
        rawData: data,
        invalidPart: 'body',
        validationError: commandDeserializationResult.error
      });
      if (responseValidationMode === 'hard') {
        return;
      }
    }

    const responseHandler = responseHandlers[responseCommandName];
    await responseHandler?.({
      ws,
      query,
      input: commandDeserializationResult.deserialized as ResponseCommandsT[typeof responseCommandName]['valueType'],
      output
    });
  };

  return { ws, output };
};
