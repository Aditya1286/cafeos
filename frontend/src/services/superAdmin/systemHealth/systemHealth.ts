import { apiRequest } from '../../api';
import { GetSystemHealthResponse } from './types';

export const get = (): Promise<GetSystemHealthResponse> => apiRequest('/admin/system/health');
