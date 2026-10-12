import { apiRequest } from '../../api';
import { SubmitDemoRequestPayload, SubmitDemoRequestResponse } from './types';

export const submit = (payload: SubmitDemoRequestPayload): Promise<SubmitDemoRequestResponse> =>
  apiRequest('/public/demo-requests', 'POST', payload);
